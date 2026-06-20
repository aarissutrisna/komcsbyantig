# API Endpoints Reference

Daftar lengkap endpoint API CS Commission System (MariaDB Backend).

**Base URL**: `http://localhost:3000/api` (dev) / `https://your-domain.com/api` (prod)

---

## Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login (Email + Password) | Public |
| GET | `/auth/profile` | Get current user info | JWT |
| POST | `/auth/change-password` | Update password | JWT |
| GET | `/auth/users` | List all users | Admin/HRD |
| POST | `/auth/users` | Create user | Admin |
| PUT | `/auth/users/:id` | Update user | Admin |
| DELETE | `/auth/users/:id` | Delete user | Admin |

## Branches

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/branches` | List all branches | JWT |
| POST | `/branches` | Create branch | Admin |
| PUT | `/branches/:id` | Update branch | Admin |
| DELETE | `/branches/:id` | Delete branch | Admin |

## Omzet (Sales)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/omzet/webhook/n8n` | Receive omzet from N8N | Webhook Secret |
| POST | `/omzet/import-historical` | Import historical omzet | Admin |
| POST | `/omzet/import-attendance` | Import attendance CSV | Admin |
| GET | `/omzet/by-date` | Filter omzet by date | JWT |
| GET | `/omzet/stats` | Monthly/Weekly stats | JWT |

## Commissions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/commissions/calculate-by-date` | Calculate commission by date | Admin |
| POST | `/commissions/calculate-by-branch` | Calculate by branch & period | Admin |
| POST | `/commissions/recalculate-all` | Recalculate all commissions | Admin |
| GET | `/commissions/by-user` | View own commissions | JWT |

## Withdrawals

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/withdrawals/create` | Request withdrawal | CS |
| POST | `/withdrawals/approve` | Approve/Reject | Admin |
| GET | `/withdrawals/balance` | Check current balance | JWT |

## Penugasan (CS Allocation)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/penugasan` | List assignments | JWT |
| POST | `/penugasan` | Create assignment | Admin/HRD |
| GET | `/penugasan/history` | Assignment history | JWT |
| GET | `/penugasan/allocations/:branchId` | Branch allocations | Admin/HRD |
| PUT | `/penugasan/allocations/:id` | Update allocation | Admin/HRD |

## Transfer Bonus

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/transfer-bonus` | Get transfer bonus data | JWT (all roles) |

## Settings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/settings/import-status` | Import status | Admin |
| GET | `/settings/scheduler` | Scheduler config | Admin |
| POST | `/settings/scheduler` | Update scheduler | Admin |
| GET | `/settings/webhook-transfer-bonus` | Webhook URL | JWT (all roles) |
| POST | `/settings/webhook-transfer-bonus` | Update webhook URL | Admin |
| GET | `/settings/bonus-transfer` | Bonus calculation settings | JWT (all roles) |
| POST | `/settings/bonus-transfer` | Update bonus settings | Admin |

## Targets

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/targets` | List targets | JWT |

## Mutasi (Branch History)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/mutasi/history` | All mutation history | JWT |
| GET | `/mutasi/history/:userId` | User mutation history | JWT |
| POST | `/mutasi` | Create mutation | Admin/HRD |
| GET | `/mutasi/affected-dates` | Affected dates | Admin/HRD |

## Omzet Analysis

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/omzet-analysis` | Analysis with filters | JWT |

## Stable Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/stable/health` | Health check | Public |

---

## Authentication

Semua endpoint (kecuali `/auth/login` dan `/omzet/webhook/n8n`) memerlukan header:
```
Authorization: Bearer <JWT_TOKEN>
```

### Webhook Authentication
Endpoint `/omzet/webhook/n8n` menggunakan secret token:
```
Authorization: Bearer <N8N_WEBHOOK_SECRET>
```

---

## Notes

- Token JWT memiliki expiry 7 hari
- Endpoint `/settings/bonus-transfer` dan `/transfer-bonus` dapat dibaca semua role
- Endpoint POST `/settings/*` hanya untuk Admin
- Semua operasi finansial menggunakan ACID transaction

---
**Last Updated**: 2026-06-20
