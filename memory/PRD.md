# HIMPONI DKI Jakarta — Member Database

## Original Problem Statement
Full-stack Member Database Web Application for HIMPONI DKI Jakarta (Indonesian Oncology Nurses Association). User originally requested external Supabase PostgreSQL connection (string: `postgresql://...@db.gcvucwkdpbkcnskqvrwc.supabase.co:5432/postgres`), a public Member Registration Form (Bahasa Indonesia), and a secure Admin Dashboard with search, filters, Excel/CSV export, and Area Kerja distribution chart. Theme: professional medical/healthcare teal+white.

## Architecture
- **Backend**: FastAPI (port 8001) + Motor (MongoDB async) + PyJWT + bcrypt + openpyxl
- **Frontend**: React 19 + React Router 7 + shadcn/ui + Recharts + sonner + Tailwind
- **DB**: MongoDB (collections: `members`, `admins`). NOTE: User-supplied Supabase project ref does not resolve via DNS; fell back to MongoDB. Schema mirrors all the requested PostgreSQL fields and can be migrated if a working Supabase URL is supplied.
- **Auth**: JWT (httpOnly cookie + Bearer header fallback for cross-origin). Admin seeded on startup from `.env`.

## User Personas
- **Calon Anggota / Anggota HIMPONI**: fills public registration form
- **Administrator HIMPONI**: views dashboard, exports data, manages members

## Core Requirements (Static)
- Public registration form with 5 sections (Data Pribadi, Alamat, Pendidikan & Tempat Kerja, Sertifikasi/Pelatihan, Keanggotaan Organisasi)
- Conditional fields: Area Kerja "Lainnya" → free text; Anggota Himponi "Ya" → Nomor Anggota
- Up to 10 dynamic custom certificates
- Secure admin login (email + password)
- Members table with search by Nama / Tempat Kerja / NIRA; filter by Area Kerja & Wilayah
- Export to CSV and XLSX
- Distribution chart (bar + pie) for Area Kerja
- Summary stats (total members, new last 7 days, top area, region count)

## Implemented (Feb 2026)
- Backend endpoints: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/members` (POST public + GET admin), `/api/members/stats`, `/api/members/export?format=csv|xlsx`
- Validation on backend (Lainnya, anggota Ya, max 10 certs)
- Admin seeded on startup; idempotent
- Frontend routes: `/`, `/admin/login`, `/admin` (protected)
- Registration form fully functional with success state
- Admin dashboard: stat cards + bar/pie charts + filterable table + detail dialog + CSV/XLSX export
- All interactive elements have `data-testid`
- 100% pass rate from automated testing (backend + frontend, iteration_1)

## Test Credentials
- See `/app/memory/test_credentials.md`
- Admin: `admin@himponi-dki.org` / `HimponiAdmin2026`

## Backlog / Next Tasks
**P0**
- Connect to real Supabase PostgreSQL when user supplies a working project URL (rewrite layer with asyncpg / SQLAlchemy)
**P1**
- Email/WhatsApp notification on new registration (Resend/Twilio)
- CSV/XLSX import (bulk member upload)
- Member edit / soft-delete by admin
- Pagination on members table (currently capped at 500)
**P2**
- Multi-admin with role management
- Public member directory (opt-in)
- Annual statistics report PDF
