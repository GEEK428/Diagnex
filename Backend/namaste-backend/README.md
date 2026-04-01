# NAMASTE Backend (Express + PostgreSQL + MongoDB)

## Stack
- Node.js + Express
- PostgreSQL via Prisma (`code_systems`, `concepts`, `mappings`)
- MongoDB via Mongoose (`users`, `audit_logs`, `import_history`, `ml_feedback`, `reset_tokens`)

## Local setup (no Docker)
1. Copy `.env.example` to `.env` and set every required value.
   - No secret/DB/ML values are auto-guessed.
2. Install dependencies:
   - `npm install`
3. Generate Prisma client and run migrations:
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
4. Seed default code systems:
   - `npm run prisma:seed`
5. Start API:
   - `npm run dev`

API base URL: `http://localhost:8080`
