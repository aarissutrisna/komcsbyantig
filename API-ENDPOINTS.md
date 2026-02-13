# API Endpoints Documentation

Complete API reference untuk CS Commission System.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

All endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

Get token from `/auth/login` endpoint.

---

## Authentication Endpoints

### 1. Login
```
POST /auth/login
```

**Request:**
```json
{
  "email": "admin@commission.local",
  "password": "admin123456"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@commission.local",
    "role": "admin"
  }
}
```

**Error (401):**
```json
{
  "error": "Invalid password"
}
```

### 2. Get Profile
```
GET /auth/profile
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "admin@commission.local",
  "role": "admin",
  "branch_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-01T10:00:00Z"
}
```

### 3. Change Password
```
POST /auth/change-password
```

**Request:**
```json
{
  "oldPassword": "admin123456",
  "newPassword": "newpassword123456"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

---

## Branches Endpoints

### 1. List Branches
```
GET /branches
```

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Jakarta",
    "city": "Jakarta",
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Surabaya",
    "city": "Surabaya",
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  }
]
```

### 2. Create Branch (Admin only)
```
POST /branches
```

**Request:**
```json
{
  "name": "Medan",
  "city": "Medan"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Medan",
  "city": "Medan",
  "created_at": "2024-01-01T10:00:00Z"
}
```

### 3. Update Branch (Admin only)
```
PUT /branches/:id
```

**Request:**
```json
{
  "name": "Medan Updated",
  "city": "Medan"
}
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Medan Updated",
  "city": "Medan",
  "updated_at": "2024-01-01T11:00:00Z"
}
```

### 4. Delete Branch (Admin only)
```
DELETE /branches/:id
```

**Response (200):**
```json
{
  "message": "Branch deleted successfully"
}
```

---

## Users Endpoints

### 1. List Users (Admin/HRD only)
```
GET /users
```

**Query Parameters:**
- `role` (optional): Filter by role (admin, hrd, cs)
- `branch_id` (optional): Filter by branch

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@commission.local",
    "role": "admin",
    "branch_id": "550e8400-e29b-41d4-a716-446655440100",
    "created_at": "2024-01-01T10:00:00Z"
  }
]
```

### 2. Create User (Admin/HRD only)
```
POST /users
```

**Request:**
```json
{
  "email": "cs2@commission.local",
  "password": "cs123456",
  "role": "cs",
  "branch_id": "550e8400-e29b-41d4-a716-446655440100"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "email": "cs2@commission.local",
  "role": "cs",
  "branch_id": "550e8400-e29b-41d4-a716-446655440100"
}
```

### 3. Update User (Admin/HRD only)
```
PUT /users/:id
```

**Request:**
```json
{
  "role": "cs",
  "branch_id": "550e8400-e29b-41d4-a716-446655440101"
}
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "email": "cs2@commission.local",
  "role": "cs",
  "branch_id": "550e8400-e29b-41d4-a716-446655440101",
  "updated_at": "2024-01-01T11:00:00Z"
}
```

### 4. Delete User (Admin only)
```
DELETE /users/:id
```

**Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

### 5. Reset User Password (Admin only)
```
POST /users/:id/reset-password
```

**Request:**
```json
{
  "newPassword": "resetpassword123456"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

---

## Omzet (Sales) Endpoints

### 1. Create Omzet Record (HRD/CS only)
```
POST /omzet
```

**Request:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440003",
  "branch_id": "550e8400-e29b-41d4-a716-446655440100",
  "amount": 5000000,
  "date": "2024-01-15",
  "description": "Daily sales"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440200",
  "user_id": "550e8400-e29b-41d4-a716-446655440003",
  "branch_id": "550e8400-e29b-41d4-a716-446655440100",
  "amount": 5000000,
  "date": "2024-01-15",
  "description": "Daily sales",
  "created_at": "2024-01-15T10:00:00Z"
}
```

### 2. Get Omzet by Date (HRD/Admin)
```
GET /omzet/by-date?date=2024-01-15
```

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "user_id": "550e8400-e29b-41d4-a716-446655440003",
    "branch_id": "550e8400-e29b-41d4-a716-446655440100",
    "amount": 5000000,
    "date": "2024-01-15",
    "description": "Daily sales",
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

### 3. Get Omzet by Branch (HRD/Admin)
```
GET /omzet/by-branch?branch_id=550e8400-e29b-41d4-a716-446655440100&start_date=2024-01-01&end_date=2024-01-31
```

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "user_id": "550e8400-e29b-41d4-a716-446655440003",
    "branch_id": "550e8400-e29b-41d4-a716-446655440100",
    "amount": 5000000,
    "date": "2024-01-15",
    "description": "Daily sales"
  }
]
```

### 4. Get Omzet Statistics (Admin/HRD)
```
GET /omzet/stats?branch_id=550e8400-e29b-41d4-a716-446655440100&month=01&year=2024
```

**Response (200):**
```json
{
  "total_omzet": 25000000,
  "count": 5,
  "average": 5000000,
  "min": 4000000,
  "max": 6000000
}
```

---

## Commissions Endpoints

### 1. Calculate Commissions (Admin only)
```
POST /commissions/calculate
```

**Request:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440003",
  "period_start": "2024-01-01",
  "period_end": "2024-01-31"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440300",
  "user_id": "550e8400-e29b-41d4-a716-446655440003",
  "omzet_total": 25000000,
  "commission_amount": 1250000,
  "commission_percentage": 5.0,
  "status": "pending",
  "period_start": "2024-01-01",
  "period_end": "2024-01-31",
  "created_at": "2024-02-01T10:00:00Z"
}
```

### 2. Get Commissions by User (All roles)
```
GET /commissions/by-user?user_id=550e8400-e29b-41d4-a716-446655440003
```

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440300",
    "user_id": "550e8400-e29b-41d4-a716-446655440003",
    "omzet_total": 25000000,
    "commission_amount": 1250000,
    "commission_percentage": 5.0,
    "status": "pending",
    "period_start": "2024-01-01",
    "period_end": "2024-01-31"
  }
]
```

### 3. Get Commissions by Branch (HRD/Admin)
```
GET /commissions/by-branch?branch_id=550e8400-e29b-41d4-a716-446655440100&status=pending
```

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440300",
    "user_id": "550e8400-e29b-41d4-a716-446655440003",
    "branch_id": "550e8400-e29b-41d4-a716-446655440100",
    "omzet_total": 25000000,
    "commission_amount": 1250000,
    "status": "pending",
    "period_start": "2024-01-01",
    "period_end": "2024-01-31"
  }
]
```

### 4. Mark Commission as Paid (Admin only)
```
POST /commissions/mark-paid
```

**Request:**
```json
{
  "commission_id": "550e8400-e29b-41d4-a716-446655440300",
  "paid_date": "2024-02-05"
}
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440300",
  "status": "paid",
  "paid_date": "2024-02-05",
  "updated_at": "2024-02-05T10:00:00Z"
}
```

---

## Dashboard Endpoints

### 1. Dashboard Statistics (Admin only)
```
GET /dashboard/stats
```

**Response (200):**
```json
{
  "total_users": 10,
  "total_branches": 3,
  "total_omzet": 250000000,
  "total_commissions": 12500000,
  "pending_commissions": 5000000,
  "paid_commissions": 7500000,
  "top_performer": {
    "user_id": "550e8400-e29b-41d4-a716-446655440003",
    "email": "cs1@commission.local",
    "total_commission": 3000000
  }
}
```

### 2. Audit Log / Mutations (Admin only)
```
GET /dashboard/mutations?limit=50&offset=0
```

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440400",
    "table_name": "commissions",
    "record_id": "550e8400-e29b-41d4-a716-446655440300",
    "action": "UPDATE",
    "changes": {
      "status": ["pending", "paid"],
      "paid_date": [null, "2024-02-05"]
    },
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-02-05T10:00:00Z"
  }
]
```

### 3. Weekly Report (Admin/HRD)
```
GET /dashboard/weekly-report?week=1&year=2024
```

**Response (200):**
```json
{
  "week": 1,
  "year": 2024,
  "start_date": "2024-01-01",
  "end_date": "2024-01-07",
  "total_omzet": 35000000,
  "total_commission": 1750000,
  "by_branch": [
    {
      "branch_id": "550e8400-e29b-41d4-a716-446655440100",
      "branch_name": "Jakarta",
      "omzet": 20000000,
      "commission": 1000000
    }
  ]
}
```

### 4. Top Performers (Admin/HRD)
```
GET /dashboard/top-performers?limit=10&period=month
```

**Response (200):**
```json
[
  {
    "rank": 1,
    "user_id": "550e8400-e29b-41d4-a716-446655440003",
    "email": "cs1@commission.local",
    "total_omzet": 50000000,
    "total_commission": 2500000
  },
  {
    "rank": 2,
    "user_id": "550e8400-e29b-41d4-a716-446655440004",
    "email": "cs2@commission.local",
    "total_omzet": 45000000,
    "total_commission": 2250000
  }
]
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Email and password required"
}
```

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

Currently no rate limiting. Can be added per endpoint if needed.

## CORS

CORS enabled for all endpoints from configured origin.

---

**Total Endpoints**: 25+
**Authentication**: JWT (Bearer token)
**Response Format**: JSON
**API Version**: 1.0
