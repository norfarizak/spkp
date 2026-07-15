# SPKP-JTM — Sistem Pengurusan Kurikulum dan Pentauliahan Jabatan Tenaga Manusia

> **AI-Powered, Cloud-Native, Glassmorphism Enterprise Platform** for TVET curriculum management and accreditation — built for Jabatan Tenaga Manusia (JTM), Kementerian Sumber Manusia Malaysia.

## Quick Start

```bash
# 1. Install dependencies
bun install  # or npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Push database schema
bun run db:push

# 4. Seed dummy data
bun run scripts/seed.ts

# 5. Start dev server
bun run dev
```

Open http://localhost:3000

## Demo Login

- **Super Admin:** admin@spkp-jtm.gov.my / Spkp@2026
- **Pengarah:** pengarah@ikbnkl.gov.my / Spkp@2026
- **Pegawai Kurikulum:** pegkur1@ikbnkl.gov.my / Spkp@2026
- **Pensyarah:** pensyarah1@ikbnkl.gov.my / Spkp@2026

## Tech Stack

- Next.js 16 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui
- Supabase PostgreSQL + Prisma ORM
- z.ai GLM 5.2 for AI features
- Modern Glassmorphism UI

## 13 Modules

1. Dashboard & Analytics
2. Pengurusan Kurikulum
3. NOSS Library
4. WIM (Working Instructional Material)
5. Pentauliahan/Accreditation
6. Panel Pakar
7. Workflow Engine
8. Documents
9. AI Assistant (GLM 5.2)
10. Reports
11. Notifications
12. User Management & RBAC
13. Audit & Compliance

## Security

- PBKDF2 password hashing (120k iterations)
- HMAC-signed session tokens (HttpOnly cookies)
- RBAC: 17 roles × 17 permissions
- Immutable audit trail
- Rate limiting & password policy
- Input sanitization (XSS prevention)

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start dev server (port 3000) |
| `bun run build` | Build for production |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema to database |
| `bun run scripts/seed.ts` | Seed dummy data |

## License

Developed for Jabatan Tenaga Manusia (JTM), Kementerian Sumber Manusia Malaysia.
