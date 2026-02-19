# API Endpoints Reference

Daftar endpoint API CS Commission System (MariaDB Backend).

## Base URL
- `http://localhost:3000/api`

## Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login (Email + Password) |
| GET | `/auth/profile` | Get current user info (JWT required) |
| POST | `/auth/change-password` | Update password (JWT required) |

## Omzet (Sales)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/omzet/create` | Record daily omzet |
| GET | `/omzet/by-date` | Filter omzet by date |
| GET | `/omzet/stats` | Monthly/Weekly stats |

## Commissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/commissions/calculate-by-date` | Trigger calculation |
| GET | `/commissions/by-user` | View own commissions |

## Withdrawals
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/withdrawals/create` | Request withdrawal |
| POST | `/withdrawals/approve` | Approve/Reject (Admin) |
| GET | `/withdrawals/balance` | Check current balance |

## Note
Semua endpoint (kecuali login) memerlukan header:
`Authorization: Bearer <JWT_TOKEN>`
