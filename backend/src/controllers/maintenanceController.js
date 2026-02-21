import * as commissionsService from '../services/commissionsService.js';
import * as auditService from '../services/auditService.js';

/**
 * Stable endpoint for system recovery and recalculation.
 * Date-coded (210226) as per user request for stability and versioning.
 * Triggers a full recalculation of all commissions across all branches.
 */
export const reroll210226 = async (req, res) => {
    try {
        console.log('[MAINTENANCE] Initiating Stable Reroll 210226...');

        // Audit log for traceability
        await auditService.recordLog({
            userId: req.user?.id || 'SYSTEM_STABLE_210226',
            action: 'STABLE_REROLL_210226',
            entity: 'system',
            entityId: '210226',
            ipAddress: req.ip,
            details: {
                trigger: 'Manual Stable Endpoint',
                stable_id: '210226',
                initiator: req.user?.username || 'anonymous_stable_call'
            }
        }).catch(console.error);

        // Standard recalculation logic
        const result = await commissionsService.recalculateAllBranches();

        res.json({
            success: true,
            endpoint: 'stable-210226',
            timestamp: new Date().toISOString(),
            message: 'System recovery (reroll) successfully executed.',
            data: result
        });
    } catch (error) {
        console.error('[MAINTENANCE ERROR]', error);
        res.status(500).json({
            success: false,
            endpoint: 'stable-210226',
            error: error.message
        });
    }
};
