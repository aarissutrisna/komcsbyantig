# Documentation Index

Panduan lengkap untuk understanding dan mengoperasikan CS Commission System dengan N8N integration.

---

## 📚 Quick Navigation

### 🚀 Getting Started
**Choose your path**:
- **New Developer?** → Start with [README.md](#readme)
- **Want to understand N8N?** → Go to [README-N8N-WORKFLOW.md](#n8n-workflow)
- **Need to deploy?** → See [SETUP.md](#setup)
- **Want API examples?** → Check [EXAMPLE-REQUESTS.md](#api-examples)

---

## 📄 All Documentation Files

### README.md {#readme}
**Main project documentation**
- Tech stack overview
- System architecture diagram
- Quick start (5 minutes)
- Project structure
- All features explained
- API endpoints summary
- Security features
- Environment variables
- Troubleshooting

**When to read**: First time opening project
**Time**: 15-20 minutes

---

### README-N8N-WORKFLOW.md {#n8n-workflow}
**N8N Integration & Workflow Guide** ⭐ **MOST IMPORTANT**
- Complete workflow diagram
- N8N nodes explanation (7 nodes)
- 3 webhook configuration (UTM, JTJ, TSM)
- Data modes:
  - `daily` - Append new records
  - `update` - Revise with version tracking
  - `bulk` - Import historical data
- Database schema for N8N
- JSON payload examples
- Response formats
- Security best practices
- Batch processing (max 500 records/batch)
- Complete testing scenarios
- Error handling & troubleshooting
- Monitoring & audit trail
- Deployment checklist

**When to read**: Before integrating N8N or understanding data flow
**Time**: 30-40 minutes
**Length**: Comprehensive (400+ lines)

---

### MIGRATION-GUIDE.md {#migration}
**Backend Architecture: Edge Functions to Express**
- Conversion summary (4 functions → 4 routes)
- Endpoint mapping
- Service layer explanation
- Controller layer explanation
- Database changes
- Security considerations
- Migration benefits

**When to read**: Understanding backend structure or deploying
**Time**: 10-15 minutes

---

### SETUP.md {#setup}
**Production Deployment Guide**
- VPS requirements
- Step-by-step setup
- PostgreSQL configuration
- Nginx reverse proxy setup
- PM2 process manager
- SSL/HTTPS setup
- Backup strategy
- Monitoring setup
- Logging configuration

**When to read**: Ready to deploy to production
**Time**: 45-60 minutes (actual deployment may take 1-2 hours)

---

### EXAMPLE-REQUESTS.md {#api-examples}
**46+ cURL Testing Examples**
- Authentication examples
- Branch management
- User management
- Omzet CRUD operations
- Commission calculations
- N8N webhook testing
- All response formats
- Error scenarios

**When to read**: Testing APIs or integrating with frontend
**Time**: 20-30 minutes

---

### API-ENDPOINTS.md {#api-reference}
**Complete API Reference**
- All 25+ endpoints documented
- Request/response specs
- Status codes
- Error handling
- Rate limiting info
- Pagination details

**When to read**: Implementing API calls in frontend
**Time**: 15-20 minutes

---

### QUICK-START.md {#quick-start}
**5-Minute Setup for Development**
- Prerequisites check
- One-liner setup commands
- Login credentials
- First test request
- Common issues

**When to read**: Quick local dev setup
**Time**: 5-10 minutes

---

### EXAMPLE-REQUESTS.md {#requests}
**Real-world API call examples**
- Complete cURL commands
- Response examples
- All endpoints covered
- Error cases
- Success cases
- Postman guide

**When to read**: Testing before frontend integration
**Time**: 15-20 minutes

---

### schema.sql
**PostgreSQL Database Schema**
- Table definitions
- All columns & types
- Constraints & indexes
- Foreign key relationships
- Check constraints

**When to read**: Understanding data structure
**Time**: 10-15 minutes

---

### docs/DATABASE-SCHEMA.md {#db-schema}
**Database Architecture & AI Maintenance Protocol**
- Table definitions & relationships
- AI Maintenance Protocol (Mandatory for updates)
- SQL migration requirements

**When to read**: Modifying database or preparing for updates
**Time**: 10 minutes

---

### docs/UPDATE-HOOK-PROTOCOL.md {#hook-protocol}
**Production Update Hook standard** ⭐ **NEW**
- Instruction format: `--UPDATE_HOOK:DDMMYYYY>ACTION--`
- `ACTION` keywords: `NONEED`, `NPMINSTALL`, `DATABASE`
- Automated deployment bash examples

**When to read**: Setting up/debugging automated deployment script
**Time**: 5-10 minutes

---

## 🗺️ Reading Path by Role

### For Frontend Developer
1. **README.md** (5 min) - Understand the system
2. **QUICK-START.md** (5 min) - Set up locally
3. **EXAMPLE-REQUESTS.md** (10 min) - See API examples
4. **API-ENDPOINTS.md** (10 min) - Implement features

**Total**: ~30 minutes

---

### For Backend Developer
1. **README.md** (10 min) - System overview
2. **MIGRATION-GUIDE.md** (10 min) - Backend structure
3. **README-N8N-WORKFLOW.md** (30 min) - N8N workflow
4. **SETUP.md** (15 min) - Deployment
5. **schema.sql** (10 min) - Database

**Total**: ~75 minutes

---

### For DevOps/SRE
1. **SETUP.md** (45 min) - Production deployment
2. **README-N8N-WORKFLOW.md** (20 min) - N8N configuration
3. **docs/UPDATE-HOOK-PROTOCOL.md** (10 min) - **Automated deployment setup**
4. **README.md** (15 min) - Architecture overview
5. **docs/DATABASE-SCHEMA.md** (10 min) - Database setup

**Total**: ~90 minutes

---

### For Product Manager/Stakeholder
1. **README.md** (15 min) - Features & capabilities
2. **README-N8N-WORKFLOW.md** (20 min) - How data flows

**Total**: ~35 minutes

---

### For QA/Tester
1. **QUICK-START.md** (5 min) - Local setup
2. **EXAMPLE-REQUESTS.md** (20 min) - Test cases
3. **README-N8N-WORKFLOW.md** (20 min) - Workflow testing

**Total**: ~45 minutes

---

## 🎯 Documentation by Feature

### Authentication & Security
- **README.md** → Security Features section
- **SETUP.md** → Security section
- **README-N8N-WORKFLOW.md** → Security & Best Practices section

### N8N Integration
- **README-N8N-WORKFLOW.md** → Entire document
- **EXAMPLE-REQUESTS.md** → N8N webhook examples
- **SETUP.md** → N8N configuration section

### API Development
- **API-ENDPOINTS.md** → Complete reference
- **EXAMPLE-REQUESTS.md** → Real examples
- **MIGRATION-GUIDE.md** → Service/Controller layer

### Database
- **schema.sql** → All tables & columns
- **README-N8N-WORKFLOW.md** → Database schema section
- **SETUP.md** → PostgreSQL setup

### Deployment
- **SETUP.md** → Complete deployment guide
- **README.md** → Quick deployment section
- **README-N8N-WORKFLOW.md** → Deployment checklist

### Troubleshooting
- **README.md** → Troubleshooting section
- **README-N8N-WORKFLOW.md** → Monitoring & Troubleshooting section
- **SETUP.md** → Common issues section

---

## 📊 Document Statistics

| File | Lines | Purpose | Audience |
|------|-------|---------|----------|
| README.md | 450+ | Overview & quick start | All |
| README-N8N-WORKFLOW.md | 500+ | N8N workflow guide | Backend/DevOps |
| MIGRATION-GUIDE.md | 300+ | Backend architecture | Backend |
| SETUP.md | 400+ | Production deployment | DevOps/Backend |
| EXAMPLE-REQUESTS.md | 200+ | API testing | Frontend/QA |
| API-ENDPOINTS.md | 150+ | API reference | Frontend/Backend |
| QUICK-START.md | 80+ | 5-minute setup | All |
| schema.sql | 200+ | Database schema | Backend/DevOps |

**Total**: ~2100+ lines of documentation

---

## 🔍 How to Find Information

### "I need to..."

**...set up the project locally**
→ QUICK-START.md

**...understand the N8N workflow**
→ README-N8N-WORKFLOW.md (entire document)

**...test an API endpoint**
→ EXAMPLE-REQUESTS.md (curl examples)

**...deploy to production**
→ SETUP.md

**...understand how data flows**
→ README-N8N-WORKFLOW.md (Architecture section)

**...configure N8N webhooks**
→ README-N8N-WORKFLOW.md (N8N Workflow Detail section)

**...understand database structure**
→ schema.sql + README-N8N-WORKFLOW.md (Database Schema section)

**...troubleshoot an issue**
→ README.md (Troubleshooting) + README-N8N-WORKFLOW.md (Monitoring section)

**...integrate with frontend**
→ EXAMPLE-REQUESTS.md + API-ENDPOINTS.md

**...understand backend code**
→ MIGRATION-GUIDE.md + README.md

**...set up SSL/HTTPS**
→ SETUP.md (SSL/HTTPS section)

**...understand data modes (daily/update/bulk)**
→ README-N8N-WORKFLOW.md (Data Modes section)

---

## 💡 Key Concepts

### Data Modes
- **daily** - Append new sales records (default)
- **update** - Revise existing records with version tracking
- **bulk** - Import historical data (1000+ records)
- See: README-N8N-WORKFLOW.md → Data Modes section

### N8N Workflow
- 7 nodes: Webhook → Validate → Process → Database → Log → Response
- 3 webhooks for 3 branches (UTM, JTJ, TSM)
- Auto-triggers commission calculation
- See: README-N8N-WORKFLOW.md → N8N Workflow Detail

### API Authentication
- JWT for standard API calls (expires 7 days)
- x-api-key header for N8N webhooks (no JWT)
- See: README.md → Security Features

### Database Sync
- Data stored in PostgreSQL VPS (persistent)
- N8N is middleware only (not storage)
- Audit trail in n8n_sync_log table
- See: README-N8N-WORKFLOW.md → Database Schema

---

## 📞 Support & Questions

### If you have questions about...

**Frontend development**
→ See EXAMPLE-REQUESTS.md for API examples
→ Check README.md for tech stack

**Backend development**
→ See MIGRATION-GUIDE.md for structure
→ Check README.md for architecture

**N8N configuration**
→ See README-N8N-WORKFLOW.md (detailed guide with examples)

**Production deployment**
→ See SETUP.md (step-by-step guide)

**API endpoints**
→ See API-ENDPOINTS.md (complete reference)
→ See EXAMPLE-REQUESTS.md (real examples)

**Database**
→ See schema.sql (table definitions)
→ See README-N8N-WORKFLOW.md (database schema for N8N)

---

## ✅ Checklist for New Team Member

- [ ] Read README.md (15 min)
- [ ] Read README-N8N-WORKFLOW.md (30 min)
- [ ] Run QUICK-START.md (10 min)
- [ ] Test 3 API calls from EXAMPLE-REQUESTS.md (15 min)
- [ ] Ask questions in team chat
- [ ] Ready to code! ✨

**Total onboarding**: ~70 minutes

---

## 🎓 Learning Order for New Developers

### Level 1: Basics (30 min)
1. README.md - Overview
2. QUICK-START.md - Local setup

### Level 2: Understanding Data Flow (40 min)
3. README-N8N-WORKFLOW.md - N8N workflow
4. schema.sql - Database structure

### Level 3: Building Features (50 min)
5. API-ENDPOINTS.md - Available endpoints
6. EXAMPLE-REQUESTS.md - Real examples
7. MIGRATION-GUIDE.md - Backend structure

### Level 4: Deployment (45 min)
8. SETUP.md - Production setup
9. Troubleshooting sections

**Total**: ~165 minutes (~3 hours)

---

## 📝 Last Updated

- **README.md** - 2024-01-15
- **README-N8N-WORKFLOW.md** - 2024-01-15 (NEW)
- **MIGRATION-GUIDE.md** - 2024-01-15
- **SETUP.md** - 2024-01-15
- **EXAMPLE-REQUESTS.md** - 2024-01-15
- **API-ENDPOINTS.md** - 2024-01-15
- **QUICK-START.md** - 2024-01-15
- **schema.sql** - 2024-01-15
- **DOCUMENTATION-INDEX.md** - 2024-01-15 (THIS FILE)

---

**Happy coding! 🚀**

Questions? Check the relevant documentation file above.
Still stuck? Use Ctrl+F to search within documents.
