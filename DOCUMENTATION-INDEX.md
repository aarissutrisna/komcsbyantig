# Documentation Index

Panduan lengkap untuk memahami dan mengoperasikan CS Commission System dengan N8N integration.

---

## 📚 Quick Navigation

### 🚀 Getting Started
**Choose your path**:
- **New Developer?** → Start with [README.md](README.md)
- **Want to understand N8N?** → Go to [docs/N8N-GUIDE.md](docs/N8N-GUIDE.md)
- **Need to deploy?** → See [SETUP.md](SETUP.md)
- **Want API examples?** → Check [EXAMPLE-REQUESTS.md](EXAMPLE-REQUESTS.md)

---

## 📄 All Documentation Files

### Root Level

| File | Deskripsi | Audience |
|------|-----------|----------|
| [README.md](README.md) | Overview, tech stack, quick start | All |
| [API-ENDPOINTS.md](API-ENDPOINTS.md) | Complete API reference | Frontend/Backend |
| [EXAMPLE-REQUESTS.md](EXAMPLE-REQUESTS.md) | cURL examples for all endpoints | Frontend/QA |
| [SETUP.md](SETUP.md) | Production deployment guide | DevOps/Backend |
| [QUICK-START.md](QUICK-START.md) | 5-minute local setup | All |
| [ACCESS-CONTROL.md](ACCESS-CONTROL.md) | RBAC & access matrix | All |
| [HESTIACP-DEPLOYMENT.md](HESTIACP-DEPLOYMENT.md) | HestiaCP specific deployment | DevOps |
| [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md) | PostgreSQL to MariaDB migration | Backend |
| [N8N-QUICK-REFERENCE.md](N8N-QUICK-REFERENCE.md) | N8N webhook cheat sheet | Backend/DevOps |
| [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md) | This file - documentation index | All |

### Docs Folder

| File | Deskripsi | Audience |
|------|-----------|----------|
| [docs/README.md](docs/README.md) | Technical overview & architecture | All |
| [docs/API-REFERENCE.md](docs/API-REFERENCE.md) | Detailed API reference with auth | Frontend/Backend |
| [docs/FITUR-LENGKAP.md](docs/FITUR-LENGKAP.md) | Full features & business flow | Product/All |
| [docs/SITEMAP.md](docs/SITEMAP.md) | Navigation structure & routes | Frontend |
| [docs/SETUP-LOCAL.md](docs/SETUP-LOCAL.md) | Local development setup | All |
| [docs/SETUP-HESTIA.md](docs/SETUP-HESTIA.md) | HestiaCP deployment guide | DevOps |
| [docs/DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md) | Database schema & relationships | Backend |
| [docs/SECURITY-GUIDE.md](docs/SECURITY-GUIDE.md) | Security & hardening | DevOps/Backend |
| [docs/BACKUP-RESTORE.md](docs/BACKUP-RESTORE.md) | Backup & disaster recovery | DevOps |
| [docs/DEPLOYMENT-CHECKLIST.md](docs/DEPLOYMENT-CHECKLIST.md) | Pre-deployment checklist | DevOps |
| [docs/N8N-GUIDE.md](docs/N8N-GUIDE.md) | N8N integration guide | Backend/DevOps |
| [docs/webhook-transfer-bonus.md](docs/webhook-transfer-bonus.md) | Transfer bonus webhook docs | Backend |
| [docs/PAYROLL-INTEGRATION-PLAN.md](docs/PAYROLL-INTEGRATION-PLAN.md) | Payroll sync plan | Backend |
| [docs/UPDATE-HOOK-PROTOCOL.md](docs/UPDATE-HOOK-PROTOCOL.md) | Update hook protocol | DevOps |

---

## 🗺️ Reading Path by Role

### For Frontend Developer
1. **README.md** (5 min) - Understand the system
2. **QUICK-START.md** (5 min) - Set up locally
3. **EXAMPLE-REQUESTS.md** (10 min) - See API examples
4. **API-ENDPOINTS.md** (10 min) - Implement features

**Total**: ~30 minutes

### For Backend Developer
1. **README.md** (10 min) - System overview
2. **docs/DATABASE-SCHEMA.md** (10 min) - Database structure
3. **docs/API-REFERENCE.md** (15 min) - API details
4. **SETUP.md** (15 min) - Deployment
5. **docs/N8N-GUIDE.md** (10 min) - N8N integration

**Total**: ~60 minutes

### For DevOps/SRE
1. **SETUP.md** (45 min) - Production deployment
2. **docs/SETUP-HESTIA.md** (20 min) - HestiaCP specific
3. **docs/SECURITY-GUIDE.md** (10 min) - Security
4. **docs/BACKUP-RESTORE.md** (10 min) - Backup strategy
5. **docs/DEPLOYMENT-CHECKLIST.md** (5 min) - Pre-deploy checks

**Total**: ~90 minutes

### For Product Manager/Stakeholder
1. **README.md** (15 min) - Features & capabilities
2. **docs/FITUR-LENGKAP.md** (15 min) - Business flow
3. **ACCESS-CONTROL.md** (10 min) - Access control

**Total**: ~40 minutes

### For QA/Tester
1. **QUICK-START.md** (5 min) - Local setup
2. **EXAMPLE-REQUESTS.md** (20 min) - Test cases
3. **docs/SITEMAP.md** (10 min) - Navigation

**Total**: ~35 minutes

---

## 🎯 Documentation by Feature

### Authentication & Security
- **docs/SECURITY-GUIDE.md** → Security mechanisms
- **ACCESS-CONTROL.md** → RBAC matrix
- **SETUP.md** → Security section

### N8N Integration
- **docs/N8N-GUIDE.md** → Complete guide
- **docs/webhook-transfer-bonus.md** → Transfer bonus webhook
- **EXAMPLE-REQUESTS.md** → Webhook examples

### API Development
- **docs/API-REFERENCE.md** → Complete reference
- **EXAMPLE-REQUESTS.md** → Real examples
- **API-ENDPOINTS.md** → Endpoint list

### Database
- **docs/DATABASE-SCHEMA.md** → All tables & columns
- **schema_mariadb.sql** → SQL schema file
- **MIGRATION-GUIDE.md** → Migration from PostgreSQL

### Deployment
- **SETUP.md** → Complete deployment guide
- **docs/SETUP-HESTIA.md** → HestiaCP specific
- **HESTIACP-DEPLOYMENT.md** → Alternative Hestia guide
- **docs/DEPLOYMENT-CHECKLIST.md** → Pre-deploy checks

### Transfer Bonus Feature
- **docs/webhook-transfer-bonus.md** → Complete webhook docs
- **docs/FITUR-LENGKAP.md** → Feature description
- **EXAMPLE-REQUESTS.md** → API examples

### Troubleshooting
- **SETUP.md** → Common issues section
- **docs/BACKUP-RESTORE.md** → Recovery procedures

---

## 💡 Key Concepts

### Data Modes
- **daily** - Append new sales records (default)
- **update** - Revise existing records with version tracking
- **bulk** - Import historical data (1000+ records)
- See: docs/N8N-GUIDE.md

### N8N Workflow
- Webhook-based data push from N8N to backend
- Auto-triggers commission calculation
- See: docs/N8N-GUIDE.md

### API Authentication
- JWT for standard API calls (expires 7 days)
- Secret token for N8N webhooks (no JWT)
- See: docs/SECURITY-GUIDE.md

### Database
- MariaDB 11.4 (MySQL compatible)
- ACID transactions for financial operations
- See: docs/DATABASE-SCHEMA.md

### Bonus Calculation
- Formula: `(Total / Pembagi) × Pengali`
- Configurable via Admin Settings
- See: docs/webhook-transfer-bonus.md

---

## 📞 Support & Questions

### If you have questions about...

**Frontend development**
→ See EXAMPLE-REQUESTS.md for API examples
→ Check README.md for tech stack

**Backend development**
→ See docs/API-REFERENCE.md for structure
→ Check docs/DATABASE-SCHEMA.md for data model

**N8N configuration**
→ See docs/N8N-GUIDE.md (detailed guide with examples)
→ Check docs/webhook-transfer-bonus.md for transfer bonus

**Production deployment**
→ See SETUP.md (step-by-step guide)
→ Check docs/SETUP-HESTIA.md for HestiaCP

**API endpoints**
→ See API-ENDPOINTS.md (complete reference)
→ See EXAMPLE-REQUESTS.md (real examples)

**Database**
→ See docs/DATABASE-SCHEMA.md (table definitions)
→ Check schema_mariadb.sql (SQL schema)

---

## ✅ Checklist for New Team Member

- [ ] Read README.md (15 min)
- [ ] Read docs/FITUR-LENGKAP.md (15 min)
- [ ] Run QUICK-START.md (10 min)
- [ ] Test 3 API calls from EXAMPLE-REQUESTS.md (15 min)
- [ ] Ask questions in team chat
- [ ] Ready to code! ✨

**Total onboarding**: ~55 minutes

---

## 📝 Last Updated

All documentation files were last updated on **2026-06-20**.

---

**Happy coding! 🚀**
