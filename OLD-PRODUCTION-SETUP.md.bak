# Production Setup Checklist

Dokumen ini berisi checklist akurat untuk production setup. No hallucination - hanya langkah yang benar-benar diperlukan.

## Pre-Deployment Verification

### ✓ Code Quality

- [ ] Run: `npm run typecheck` - No type errors
- [ ] Run: `npm run lint` - No critical errors
- [ ] No `console.log()` statements dalam production code
- [ ] No commented-out code
- [ ] `.env` file tidak di-commit (check `.gitignore`)

### ✓ Build Success

```bash
npm run build
```

- [ ] Build completes without errors
- [ ] `dist/` folder created
- [ ] `dist/index.html` exists
- [ ] Build size reasonable (~120 kB gzipped)

## Environment Setup

### ✓ Local Development

**For development dengan Supabase Cloud** (template):

```bash
# Copy template
cp .env.supabase .env

# Edit dengan Supabase Cloud credentials
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...
```

Run development:
```bash
npm run dev
```

Test:
- [ ] Login page loads
- [ ] Can login with test user
- [ ] Dashboard accessible
- [ ] No CORS errors in browser console

### ✓ VPS Production

**For production dengan self-hosted Supabase**:

1. Setup Supabase di VPS (lihat `SETUP-SELF-HOSTED.md`)

2. Get credentials:
   - Supabase Studio → Settings → API
   - Copy Project URL (misal: `http://vps-ip:8000`)
   - Copy anon key

3. Update `.env`:
   ```env
   VITE_SUPABASE_URL=http://your-vps-ip:8000
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

4. Build & deploy:
   ```bash
   npm run build
   scp -r dist/* username@vps:/var/www/komcs-app/
   ```

## Database Verification

### ✓ Supabase Setup

Pastikan sudah done:

- [ ] Supabase instance running (cloud atau self-hosted)
- [ ] Database migration applied
- [ ] Tabel ada: `branches`, `users`, `attendance_data`, `mutations`
- [ ] RLS enabled untuk semua tabel

### ✓ User Setup

Admin user:
- [ ] Created di Supabase Auth
- [ ] Inserted ke tabel `users` dengan role `admin`
- [ ] UUID match antara `auth.users` dan `users` table

Test user credentials:
- Email: Sesuai yang dibuat
- Password: Sesuai yang dibuat

## Frontend Verification

### ✓ Login Flow

```bash
npm run dev
```

Test dengan browser:
- [ ] Login page loads
- [ ] Error message jika credential salah
- [ ] Login successful dengan correct credentials
- [ ] Redirect ke dashboard
- [ ] No CORS errors in console

### ✓ Dashboard Access

Setelah login:
- [ ] Dashboard loads
- [ ] Navigation menu visible
- [ ] Data loads dari Supabase (check Network tab)
- [ ] No 401/403 auth errors

## VPS Deployment Verification

### ✓ Nginx Running

```bash
sudo systemctl status nginx
```

- [ ] Status: active (running)
- [ ] Config test: `sudo nginx -t` returns OK
- [ ] Listens on port 80/443

### ✓ Application Served

```bash
curl http://your-vps-ip
```

Should return HTML content.

### ✓ Static Files

Check dalam browser:
- [ ] JS files load (check Network tab)
- [ ] CSS applied (check style)
- [ ] Images display (jika ada)
- [ ] No 404 errors

### ✓ DNS & SSL (Cloudflare)

- [ ] Domain points to VPS IP
- [ ] SSL certificate valid (https works)
- [ ] No "Not Secure" warnings
- [ ] HTTPS redirect working

## Security Checklist

### ✓ Credentials

- [ ] `.env` file exists locally (not in Git)
- [ ] `.env.supabase` is template only (in Git)
- [ ] No hardcoded keys dalam source code
- [ ] No secrets dalam `dist/` folder

### ✓ Database Security

- [ ] RLS enabled untuk semua tabel
- [ ] Policies restrict unauthorized access
- [ ] Can only access own data (for user level)
- [ ] Admin can access all data

### ✓ Network Security

- [ ] HTTPS enabled via Cloudflare
- [ ] No HTTP traffic (redirect to HTTPS)
- [ ] Supabase credentials not visible in browser network requests

### ✓ Frontend Security

- [ ] No sensitive data dalam localStorage (check browser console)
- [ ] Authentication tokens handled securely
- [ ] XSS prevention (React built-in)

## Monitoring Checklist

### ✓ Logs

```bash
# Supabase logs
docker-compose logs -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

- [ ] No error logs
- [ ] Request logs show successful 200 responses
- [ ] No 5xx errors

### ✓ Performance

```bash
# Resource usage
docker stats
free -h
df -h
```

- [ ] Memory usage reasonable (~50-100 MB)
- [ ] CPU usage low
- [ ] Disk space available

### ✓ Uptime

- [ ] Services auto-restart on reboot
- [ ] Docker containers persist through restarts
- [ ] Nginx configured to start on boot

## Testing Checklist

### ✓ Functional Testing

1. **User Roles**
   - [ ] Login as Admin
   - [ ] Login as HRD
   - [ ] Login as CS
   - [ ] Each sees appropriate menu items

2. **Features**
   - [ ] Can view branches (Admin/HRD)
   - [ ] Can manage users (Admin)
   - [ ] Can input attendance (HRD)
   - [ ] Can input omzet (HRD)
   - [ ] Komisi calculated correctly

3. **Error Handling**
   - [ ] Invalid login shows error
   - [ ] Session timeout handled
   - [ ] Network error shows message
   - [ ] Database errors gracefully handled

### ✓ Cross-Browser Testing

Test dalam:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browser (iOS/Android)

### ✓ Responsive Design

- [ ] Desktop (1920px+) - full layout
- [ ] Tablet (768px) - adjusted layout
- [ ] Mobile (375px) - mobile-friendly

## Post-Deployment Tasks

### ✓ Monitoring

Set up monitoring:
- [ ] Check logs daily (first week)
- [ ] Monitor resource usage
- [ ] Get alerts for errors
- [ ] Check application is responding

### ✓ Backups

Database backups:
```bash
# Setup automated backup
docker-compose exec postgres pg_dump -U postgres postgres > backup_$(date +%Y%m%d).sql
```

- [ ] Backup script created
- [ ] Test restore from backup
- [ ] Backup stored safely

### ✓ Documentation

- [ ] Setup steps documented
- [ ] Team knows how to deploy updates
- [ ] Emergency procedures documented
- [ ] Contact info for support

## Rollback Plan

Jika ada issue:

1. **Frontend issue**
   ```bash
   # Revert to previous build
   scp -r dist_backup/* username@vps:/var/www/komcs-app/
   ```

2. **Database issue**
   ```bash
   # Restore from backup
   docker-compose exec -T postgres psql -U postgres < backup.sql
   ```

3. **Supabase issue**
   ```bash
   # Restart services
   docker-compose restart
   ```

## Go-Live Checklist

Final verification sebelum users akses:

- [ ] All checklist items above: DONE
- [ ] Team trained on operation
- [ ] Support team aware
- [ ] Monitoring setup
- [ ] Backups configured
- [ ] Emergency contacts documented

**Status**: Ready for Production ✓

---

## Post Go-Live

### Week 1
- [ ] Monitor error logs daily
- [ ] Check user feedback
- [ ] Verify performance
- [ ] Test backups work

### Monthly
- [ ] Review logs for issues
- [ ] Check updates available
- [ ] Verify backups completed
- [ ] Monitor resource usage
- [ ] Update security patches

### Quarterly
- [ ] Full security audit
- [ ] Performance tuning
- [ ] Documentation update
- [ ] Team training refresh
