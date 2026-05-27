# Payroll & Fingerprint Integration Plan (Sync Protocol)

This document outlines the agreed-upon technical standards for synchronizing the **KOMCS (Commission)** system with the **Payroll & Fingerspot** system.

> [!IMPORTANT]
> This integration is slated for implementation once the Payroll system reaches production level and the Fingerprint device (W230N) is fully configured.

## 1. User Identification & Mapping
- **Primary Key**: `NIK` (Nomor Induk Karyawan) serves as the global unique identifier.
- **Username Mapping**: `username` in KOMCS should map to `nik` in Payroll.
- **Fingerprint lookup**: `fingerspot_id` (numeric) stores the Enroll ID from the device.

### Role Mapping
| KOMCS Role | Payroll Role | Logic |
| :--- | :--- | :--- |
| `super_admin` | `superadmin` | System-wide full access |
| `admin` | `admin` | Branch-level operations |
| `hrd` | `hrd` | Payroll & attendance management |
| `cs` | `cs` | Eligible for both Daily Salary & Commission |
| (N/A) | `karyawan` | Daily Salary only (non-commission) |

## 2. Attendance & Multiplier Calculations
- **Scale**: Final presence factors must be normalized to `0`, `0.5`, or `1.0`.
- **Hierarchy of Truth**:
  1. `manual_presence` (Admin/HRD override) - **Highest Priority**
  2. `fingerprint_presence` (Automated evaluation from machine) - **Baseline**
- **Formula**: `final_presence = manual_presence ?? fingerprint_presence`

## 3. Data Synchronization Protocol
- **Entry Point**: All new employee registrations should ideally originate from the **Payroll** system.
- **Real-time Sync**: CRUD operations (Create, Update, Deactivate) in Payroll must trigger equivalent updates in the KOMCS database.
- **Data Integrity**: Deletion follows a "Soft Delete" or "Resign (Lock)" logic if historical records (commission/mutations) exist.

## 4. Implementation Steps (Phased)
1. **Phase 1**: Ensure `nik` column exists/is used in KOMCS `users` table.
2. **Phase 2**: Setup database triggers or API hooks to sync Profile changes.
3. **Phase 3**: Implement Daily Attendance fetch from Payroll's finalized attendance table.

---
*Created: 2026-02-28 (Consensus from users.md in Payroll project)*
