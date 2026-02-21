import pool from '../config/database.js';

/**
 * Branch Scope Middleware - Multi-Branch Aware (Opsi B)
 *
 * For ADMIN: global access (no scope restriction)
 * For HRD: scoped to their branch_id from JWT
 * For CS: scoped to ALL branches they've ever been assigned to (cs_penugasan history)
 *         This means after a permanent mutation, they still see historical data.
 */
export const branchScopeMiddleware = async (req, res, next) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not found in request' });
    }

    // ADMIN has global access (no scope restriction)
    if (user.role === 'admin') {
        req.branchScope = null; // null = all branches
        return next();
    }

    // CS: Get all branches from penugasan history (multi-branch aware)
    if (user.role === 'cs') {
        try {
            const [rows] = await pool.execute(
                'SELECT DISTINCT cabang_id FROM cs_penugasan WHERE user_id = ?',
                [user.id]
            );

            if (rows.length > 0) {
                // Array of branch IDs they have ever been assigned to
                req.branchScope = rows.map(r => r.cabang_id);
            } else if (user.branchId) {
                // Fallback to JWT branch if no penugasan records exist
                req.branchScope = [user.branchId];
            } else {
                return res.status(403).json({
                    error: 'Forbidden: User CS belum memiliki penugasan cabang aktif'
                });
            }

            // CS is also scoped to their own user data
            req.userScope = user.id;
            return next();
        } catch (err) {
            console.error('[branchScopeMiddleware] DB error:', err);
            return res.status(500).json({ error: 'Internal error resolving branch scope' });
        }
    }

    // HRD: scoped to single branch_id from JWT
    if (!user.branchId) {
        return res.status(403).json({ error: 'Forbidden: User has no branch assigned' });
    }
    req.branchScope = user.branchId; // single string for HRD (backward compat)
    next();
};
