<div align="center">

<img src="https://img.icons8.com/fluency/96/caduceus.png" alt="Diagnex Logo" width="90"/>

# 🧬 Diagnex

### Clinical Search & Terminology Intelligence Platform

*Maps medical codes across ICD-11, NAMASTE, and custom systems — powered by an AI confidence layer and an expert-driven feedback loop.*

<br/>

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)

<br/>

> ⭐ **If this project helped you or gave you ideas, drop a star!** It takes 2 seconds and means a lot.  

</div>

---

## ✨ What it does

| Feature | Description |
|--------|-------------|
| 🔍 **Multi-system Code Search** | Fuzzy + semantic search across any registered terminology system |
| 🤖 **AI-Powered Mapping** | ML model predicts cross-system concept mappings with a draggable confidence threshold (45–100%) |
| 🔁 **Expert Feedback Loop** | Clinicians correct predictions; corrections retrain the model in the background |
| 🗂️ **Concept Lifecycle Management** | Create, activate, deactivate, and archive concepts with full audit trails |
| 🛡️ **Admin Control Plane** | Bulk CSV import, mapping verification, concept request approvals, ML feedback review |
| 🔐 **Role-Based Access** | `DOCTOR` and `ADMIN` roles with JWT auth + Google OAuth |

---

## 🏗️ Architecture

```
Diagnex/
├── 🖥️  Frontend/                        React SPA (CRA)
├── ⚙️  Backend/
│   └── namaste-backend/                Node.js + Express API
└── 🧠  ML/
    └── Namaste-Prediction-Model/       FastAPI prediction service
```

| Layer | Tech |
|-------|------|
| 🖥️ Frontend | React, Axios, Lucide Icons |
| ⚙️ Backend | Node.js, Express, Prisma, JWT, Passport |
| 🗄️ Primary DB | PostgreSQL — code systems, concepts, mappings |
| 📋 Operational DB | MongoDB — users, audit logs, import history, ML feedback |
| 🧠 ML Service | Python, FastAPI, scikit-learn, joblib |

---

## 🚀 Quick Start

### Prerequisites

- ![Node](https://img.shields.io/badge/Node.js-≥18-339933?logo=nodedotjs&logoColor=white&style=flat-square)
- ![Python](https://img.shields.io/badge/Python-≥3.10-3776AB?logo=python&logoColor=white&style=flat-square)
- PostgreSQL and MongoDB running locally

---

### 🧠 1. ML Service

```bash
cd ML/Namaste-Prediction-Model
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

> Available at `http://localhost:8000`  
> Endpoints: `GET /ping` · `POST /predict` · `POST /train` · `GET /train/status`

---

### ⚙️ 2. Backend

```bash
cd Backend/namaste-backend
cp .env.example .env        # fill in all required values
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed          # seeds default code systems
npm run dev                  # starts on :8080
```

**Required `.env` keys**

```env
DATABASE_URL=           # PostgreSQL connection string
MONGODB_URI=            # MongoDB connection string
JWT_SECRET=             # any strong random string
ML_SERVICE_URL=         # e.g. http://localhost:8000
GOOGLE_CLIENT_ID=       # optional — enables Google OAuth
GOOGLE_CLIENT_SECRET=   # optional
EMAIL_HOST=             # optional — enables email notifications
```

---

### 🖥️ 3. Frontend

```bash
cd Frontend
npm install
npm start              # starts on :3000
```

> Set the API base URL in `src/config.js` if the backend isn't on `:8080`.

---

## 📡 API Overview

| Module | Prefix | Auth |
|--------|--------|------|
| 🔑 Auth | `/api/auth` | Public (rate-limited) |
| 🔍 Clinical / Search | `/api/codes` | Optional / JWT |
| 🛡️ Admin | `/api/admin` | JWT + `ADMIN` role |

**Key endpoints**

```
GET  /api/codes/search                   Fuzzy search across terminology systems
GET  /api/codes/translate                Translate a code from one system to another
POST /api/codes/ai-search                ML-powered concept search
POST /api/codes/ml-feedback              Submit expert correction for retraining
POST /api/codes/concept-requests         Request a new concept to be added
GET  /api/codes/dashboard                Doctor's personal stats

POST  /api/admin/import/concepts/csv     Bulk import concepts from CSV
GET   /api/admin/mappings                List all mappings
PATCH /api/admin/mappings/:id/verify     Verify a mapping
PATCH /api/admin/mappings/:id/reject     Reject with reason
GET   /api/admin/concept-requests        List pending requests
PATCH /api/admin/concept-requests/:id/approve
```

---

## 🗄️ Data Model

```
CodeSystem ──< Concept >──< Mapping >── Concept
CodeSystem ──< SystemVersion
```

| Model | Key States |
|-------|-----------|
| **CodeSystem** | `AUTHORITY` (e.g. ICD-11) or `LOCAL` (custom) |
| **Concept** | `ACTIVE` → `INACTIVE` → `ARCHIVED` |
| **Mapping** | `PENDING` → `VERIFIED` / `REJECTED` + confidence score |

---

## ⏱️ Background Jobs

| Job | Trigger | Purpose |
|-----|---------|---------|
| `mlSync.job.js` | Cron | Pushes verified mappings to ML service for retraining |
| `conceptArchive.job.js` | Cron | Auto-archives inactive concepts past retention window |

---

## 🗺️ Frontend Pages

| Route | Role | Description |
|-------|------|-------------|
| `/search` | All | Main clinical code search |
| `/mappings` | 👨‍⚕️ Doctor | Personal mapping workspace |
| `/systems` | 👨‍⚕️ Doctor | Browse code systems |
| `/concept-requests` | 👨‍⚕️ Doctor | Track submitted concept requests |
| `/admin` | 🛡️ Admin | Dashboard with system stats |
| `/admin/import` | 🛡️ Admin | CSV import with history |
| `/admin/mappings` | 🛡️ Admin | Verify / reject ML-predicted mappings |
| `/admin/ml-feedback` | 🛡️ Admin | Review and act on clinician corrections |
| `/admin/concept-requests` | 🛡️ Admin | Approve or reject concept requests |

---

## 👨‍💻 Author

Built with ❤️ by **[@GEEK428](https://github.com/GEEK428)**

<div align="center">

---

**If Diagnex saved you time or sparked an idea:**

⭐ [**Star this repo**](../../stargazers) — it helps others find the project  
---

*© 2026 Diagnex Clinical Systems. All rights reserved.*

</div>
