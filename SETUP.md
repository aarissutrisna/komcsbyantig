# Production Setup Guide - VPS Deployment

Complete guide untuk deploy aplikasi ke production VPS.

## VPS Requirements

- **OS**: Ubuntu 20.04 or later
- **RAM**: 2GB minimum
- **Disk**: 20GB minimum
- **CPU**: 1 vCPU minimum
- **Network**: Static IP, ports 80, 443, 3000 open

## Step 1: VPS Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Dependencies
```bash
sudo apt install -y \
  curl \
  git \
  postgresql \
  postgresql-contrib \
  nodejs \
  npm \
  nginx \
  certbot \
  python3-certbot-nginx
```

### 1.3 Verify Installations
```bash
node --version    # v16 or higher
npm --version     # v8 or higher
psql --version    # v12 or higher
nginx --version
```

## Step 2: PostgreSQL Setup

### 2.1 Start PostgreSQL
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2.2 Create Database
```bash
sudo -u postgres createdb cs_commission
```

### 2.3 Create DB User
```bash
sudo -u postgres psql
postgres=# CREATE USER cs_user WITH PASSWORD 'strong_password_here';
postgres=# GRANT ALL PRIVILEGES ON DATABASE cs_commission TO cs_user;
postgres=# \q
```

### 2.4 Load Schema
```bash
sudo -u postgres psql -d cs_commission -f schema.sql
```

Verify:
```bash
sudo -u postgres psql -d cs_commission -c "\dt"
```

## Step 3: Backend Setup

### 3.1 Clone Repository
```bash
cd /home/ubuntu
git clone your-repo.git cs-commission
cd cs-commission/backend
```

### 3.2 Install Dependencies
```bash
npm install --production
```

### 3.3 Configure Environment
```bash
cp .env.example .env
nano .env
```

Edit `.env`:
```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cs_commission
DB_USER=cs_user
DB_PASSWORD=strong_password_here
JWT_SECRET=your_super_secret_key_minimum_32_characters_long
JWT_EXPIRY=7d
CORS_ORIGIN=https://your-domain.com
```

### 3.4 Seed Database
```bash
npm run seed
```

### 3.5 Install PM2 Process Manager
```bash
sudo npm install -g pm2
pm2 start src/server.js --name "cs-commission-api"
pm2 startup
pm2 save
```

Verify:
```bash
pm2 status
pm2 logs cs-commission-api
```

## Step 4: Frontend Setup

### 4.1 Build Frontend
```bash
cd /home/ubuntu/cs-commission/frontend
npm install --production
npm run build
```

### 4.2 Copy to Nginx
```bash
sudo mkdir -p /var/www/cs-commission
sudo cp -r dist/* /var/www/cs-commission/
sudo chown -R www-data:www-data /var/www/cs-commission
```

## Step 5: Nginx Configuration

### 5.1 Create Nginx Config
```bash
sudo nano /etc/nginx/sites-available/cs-commission
```

Paste:
```nginx
upstream backend {
  server localhost:3000;
}

server {
  listen 80;
  server_name your-domain.com www.your-domain.com;

  root /var/www/cs-commission;
  index index.html index.htm;

  # Serve static files
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # API proxy
  location /api {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # SPA fallback - route to index.html
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Deny access to sensitive files
  location ~ /\. {
    deny all;
  }
}
```

### 5.2 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/cs-commission /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## Step 6: SSL/HTTPS with Certbot

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Auto-renewal:
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

Verify:
```bash
sudo certbot renew --dry-run
```

## Step 7: Verify Everything

### 7.1 Test Backend
```bash
curl http://localhost:3000/health
# Output: {"status":"ok","message":"Server is running"}
```

### 7.2 Test API
```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@commission.local","password":"admin123456"}'
```

### 7.3 Test Frontend
```bash
curl https://your-domain.com
# Should return index.html content
```

## Step 8: Backup & Monitoring

### 8.1 Database Backup (Daily)
```bash
sudo nano /home/ubuntu/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p $BACKUP_DIR
sudo -u postgres pg_dump cs_commission | gzip > $BACKUP_DIR/cs_commission_$TIMESTAMP.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete
```

```bash
chmod +x /home/ubuntu/backup-db.sh
```

Add to crontab:
```bash
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
```

### 8.2 Monitor PM2
```bash
pm2 monit
```

### 8.3 View Logs
```bash
pm2 logs cs-commission-api
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Security Hardening

### Firewall
```bash
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

### SSH Key
```bash
# Use SSH key instead of password
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519
# Add public key to VPS authorized_keys
```

### Disable Root Login
```bash
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
sudo systemctl restart ssh
```

## Maintenance

### Update Dependencies
```bash
cd /home/ubuntu/cs-commission/backend
npm update
pm2 restart cs-commission-api
```

### Restart Services
```bash
pm2 restart cs-commission-api
sudo systemctl restart nginx
```

### Check Disk Space
```bash
df -h
```

## Troubleshooting

**Backend not starting**
```bash
pm2 logs cs-commission-api
# Check .env file
# Check PostgreSQL connection
```

**Cannot connect to database**
```bash
# Check PostgreSQL running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U cs_user -d cs_commission
```

**Nginx 502 Bad Gateway**
```bash
# Check backend running
pm2 status

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

**SSL certificate issues**
```bash
sudo certbot certificates
sudo certbot renew -v
```

## Production Checklist

- [ ] Database backup strategy enabled
- [ ] PM2 configured to restart on reboot
- [ ] Firewall configured (UFW)
- [ ] SSL certificate installed and auto-renewal enabled
- [ ] Nginx reverse proxy working
- [ ] API authentication working
- [ ] Frontend SPA routing working
- [ ] Database credentials secured in .env (not in git)
- [ ] JWT_SECRET strong and unique
- [ ] CORS_ORIGIN set to domain only
- [ ] Logs monitoring setup
- [ ] Database backups automated
- [ ] Performance monitoring enabled (pm2 monit)

---

**Production URL**: https://your-domain.com
**API URL**: https://your-domain.com/api
**Admin Login**: admin@commission.local / admin123456
