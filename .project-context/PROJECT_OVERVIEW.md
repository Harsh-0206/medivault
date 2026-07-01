# MediVault - Project Overview

## What is MediVault?

**MediVault** is a secure digital health record (EHR) management system designed to centralize and protect patient medical information. It provides role-based access to medical records, appointments, prescriptions, vital signs, and AI-assisted data understanding through a modern web application.

The system bridges patients, healthcare providers (doctors), and administrators in a trust-enabled architecture where document integrity is anchored on blockchain (Ethereum Sepolia) and sensitive data is encrypted/hashed for verification.

---

## Problems it Solves

1. **Fragmented Medical Records**: Patients have medical data spread across multiple providers/systems. MediVault centralizes records in one searchable location.

2. **Lack of Document Integrity**: Traditional digital records can be modified without audit trail. MediVault uses SHA-256 hashing and Ethereum blockchain anchoring to create tamper-evidence for uploaded medical documents.

3. **Access Control Complexity**: Managing who can view whose data requires granular permissions. MediVault implements role-based access control (RBAC) and time-boxed access tokens for sensitive history.

4. **Poor Health Literacy**: Patients struggle to understand their medical data. MediVault includes an AI Health Assistant (powered by Groq LLM) that answers questions about patient data using Retrieval-Augmented Generation (RAG).

5. **Appointment Fragmentation**: Scheduling with multiple doctors is tedious. MediVault provides integrated appointment booking with real-time slot availability and doctor-specific scheduling.

---

## Main Features

### 1. **User Roles & Authentication**
- **Patient**: Can view/upload own records, book appointments, view prescriptions, ask health questions.
- **Doctor**: Can view patient history (with access granted), manage availability, create prescriptions, respond to appointments.
- **Admin**: (Partially implemented) Intended to approve doctor registrations and manage platform.

### 2. **Medical Record Management**
- Centralized upload of medical documents (PDF, images, Office files, spreadsheets).
- SHA-256 file hashing with automatic blockchain anchoring.
- Metadata storage: title, type, record date, notes, doctor associations.
- Download capability and deletion with cleanup.

### 3. **Appointment System**
- Doctor availability management (days/hours, slot duration).
- Patient appointment booking with real-time slot availability.
- Appointment status tracking (pending, confirmed, cancelled).
- Doctor-patient communication around appointments.

### 4. **Prescription Management**
- Doctors create/issue prescriptions to patients.
- Medicine name, dosage, duration, instructions, end date.
- Patient view history of all prescriptions.

### 5. **Vital Signs Tracking**
- Patients can log vital signs (heart rate, blood pressure, glucose, etc.).
- Time-series tracking for trend analysis.
- Integration with health summaries.

### 6. **AI Health Assistant (RAG)**
- Powered by Groq LLM (llama-3.3-70b-versatile by default).
- Retrieves relevant patient data from MySQL (records, appointments, prescriptions, vitals).
- Generates context-aware answers to patient questions.
- Canned responses for known queries.
- **Important**: Not a medical diagnosis tool; informational only.

### 7. **Access Control & Tokens**
- JWT-based authentication with 15-minute access tokens and refresh tokens.
- Role-based middleware (`authenticateToken`, `requireRole`).
- **Easy Access**: Patient grants 30-minute window for doctor to view history.
- **Emergency Access**: Doctor can request emergency access (30 min) for urgent patient data.

### 8. **Doctor Verification Workflow**
- Doctor registration requires document upload (credentials).
- Doctor starts with `is_verified = 0` status.
- Admin approval transitions to `is_verified = 1`.
- Verified doctors only appear in patient search.

### 9. **File Upload Pipeline**
- Multer-based multipart form upload.
- Server-side validation (file type, size limits).
- SHA-256 hashing of file content.
- Blockchain transaction for hash anchoring (asynchronous).
- JSON records.json append-only log for local audit trail.
- MySQL medical_records table entry with user/doctor associations.
- Static file serving at `/uploads` endpoint.

### 10. **Landing & Public Pages**
- Public-facing marketing/info site.
- Registration flow for patients and doctors.
- Login page with role selection.

---

## Current Implementation Status

### ✅ Fully Implemented
- Patient registration, login, profile management.
- Medical record upload with blockchain anchoring.
- Appointment booking and management.
- Doctor availability scheduling.
- JWT + refresh token authentication.
- Doctor-patient history access with access tokens (easy/emergency).
- Prescription creation and viewing.
- Vital signs logging and retrieval.
- RAG health assistant with Groq integration.
- Doctor search and verification filtering.
- Role-based routing and middleware.

### ⚠️ Partially Implemented / Issues
- **Admin dashboard**: Frontend exists (`AdminDashboard.jsx`) but backend `/admin/*` routes not wired in `server.js`.
- **Admin approval workflow**: Referenced in code but routes missing.
- **`RequireAuth` redirect logic**: Redirects to `/doctor-dashboard` and `/admin-dashboard` but routes are `/doctor` and `/admin`.
- **Patient doctor search route**: `/patient/search` in `patientRoutes.js` tries to use `req.app.get('db')` which is not set in `server.js`.
- **Context vs localStorage**: `AuthContext.jsx` exists but `main.jsx` doesn't wrap the app in `AuthProvider`, so all auth state uses localStorage instead.
- **TLS verification**: `process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"` weakens security for local dev.
- **Logging**: Database credentials printed to console in `db.js` (production risk).

### ❌ Not Implemented
- Comprehensive admin routes and functionality.
- Rate limiting on API endpoints.
- End-to-end encryption for data at rest.
- Two-factor authentication.
- Audit logging of access events.
- Email notifications for appointments/prescriptions.
- Data export in standard formats (HL7, FHIR, CCDA).
- Patient consent management UI.
- Integration with external health providers.
- HIPAA compliance features (specific encryption, breach notification).
- API rate limiting, request validation.

---

## Overall Architecture

### High-Level Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React 19 + Vite + Tailwind)                       │
│ - Patient Dashboard: Records, Appointments, Health Chat     │
│ - Doctor Dashboard: Patient Search, Availability            │
│ - Landing/Auth: Public-facing pages                         │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP (axios, fetch)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend (Express.js + Node.js)                              │
│ - API Routes: Auth, Patient, Doctor, Files, Appointments   │
│ - Controllers: Business logic, DB queries                   │
│ - Middleware: JWT auth, role-based access                  │
│ - File Upload: Multer, SHA-256 hashing                     │
│ - Blockchain Bridge: Web3.js spawn Sepolia transactions     │
└────────────────┬──────────────────┬───────────────────┬─────┘
                 │                  │                   │
          ┌──────▼────┐       ┌─────▼────┐      ┌──────▼───┐
          │  MySQL    │       │ Python   │      │Blockchain│
          │  Database │       │ Service  │      │(Sepolia) │
          │  (DB)     │       │ (Groq+   │      │Contract  │
          │  Records  │       │  LLM)    │      │          │
          │  Users    │       │  RAG     │      │(Ethereum)│
          │  Appts    │       │  Summaries│     │          │
          └───────────┘       └──────────┘      └──────────┘
```

### Modular Components

| Component | Purpose | Technology |
|-----------|---------|-----------|
| **Frontend (SPA)** | User interface for patients, doctors, admins | React 19, Vite, Tailwind CSS, React Router |
| **Backend API** | REST endpoints for CRUD and business logic | Express.js, Node.js, mysql2/promise |
| **Database** | Persistent storage for users, records, appointments | MySQL 8+ with connection pooling |
| **File Storage** | Local disk storage for medical documents | `/uploads` directory, served statically |
| **Blockchain Bridge** | Hash anchoring for document integrity | Web3.js, Ethereum Sepolia testnet |
| **Python RAG Service** | AI-powered question answering over patient data | Python 3.9+, Groq API, mysql-connector-python |

---

## High-Level Data Flow

### 1. **User Registration Flow**
```
Patient/Doctor → Register Form → POST /auth/register(-doctor)
                                   → Hash password (Argon2)
                                   → Insert into MySQL users table
                                   → Return success
                                   ← Redirect to login
```

### 2. **Login Flow**
```
User → Login Form → POST /auth/login
                    → Lookup user by email
                    → Verify password (Argon2)
                    → Generate JWT (15m expiry) + refresh token
                    → Store refresh token hash in DB
                    → Return tokens to client
                    ← Client stores in localStorage (mv_token)
```

### 3. **Medical File Upload Flow**
```
Patient/Doctor → Select File → POST /files/upload (multipart/form-data)
                                → Authenticate JWT
                                → Multer receives file
                                → Read file, compute SHA-256 hash
                                → Call addRecordToBlockchain(hash)
                                  └─ Web3.js sends transaction to Sepolia
                                  └─ Waits for receipt (block number, tx hash)
                                ← Append to records.json (audit log)
                                ← Insert medical_records into MySQL
                                ← Return metadata to client
                    ← File now at /uploads/...
```

### 4. **Appointment Booking Flow**
```
Patient → Select Doctor → GET /appointments/doctor/:doctorId/slots?date=...
                           → Fetch doctor availability
                           → Query booked appointments for that date
                           → Filter available slots
                           ← Return slot times
          Select Slot → POST /appointments
                        → Authenticate patient JWT
                        → Validate slot availability (re-check)
                        → Insert into appointments table
                        → Return confirmation
          ← Display confirmation
```

### 5. **RAG Health Chat Flow**
```
Patient → Type Question → POST /patient/rag/chat
                           → Authenticate patient JWT
                           → Extract patient_id from JWT
                           → Validate query
                           → Spawn Python subprocess: app.py --patient_id X --query Y --top_k 5
                             └─ Python connects to MySQL
                             └─ Retrieves patient's medical_records, appointments, prescriptions, vitals
                             └─ Sends query + context to Groq API
                             └─ Groq returns answer
                             └─ Python outputs JSON
                           ← Parse JSON from subprocess
                           ← Return answer to client
          ← Display in chat UI
```

### 6. **Doctor History Access Flow**
```
Patient → Grant Easy Access on Appointment
          → POST /appointments/:id/easy-access
             → Create patient_access_tokens row (30m expiry)
             → Return access_token
          ← Share token with doctor (UI copy/QR)
Doctor   → Receive token
          → GET /appointments/patient-history/:token
             → Authenticate doctor JWT
             → Verify token is valid & not expired
             → Verify doctor_id matches grant
             → Retrieve patient profile, vitals, records, prescriptions, appointments
             ← Return full history
          ← Display patient dashboard
```

---

## Technology Stack

### Frontend
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React | 19.2.0 | UI component library |
| Build | Vite | 7.2.2 | Fast bundler with HMR |
| Styling | Tailwind CSS | 4.1.17 | Utility-first CSS |
| Routing | React Router | 7.9.6 | Client-side navigation |
| HTTP Client | axios + fetch | 1.13.2 | API calls |
| Icons | lucide-react | 0.554.0 | Icon library |
| Date Utils | dayjs | 1.11.19 | Date formatting |
| Compiler | Babel + React Compiler | - | JSX transpilation, React optimization |

### Backend (Node.js)
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Express | 5.1.0 | REST API server |
| Database Driver | mysql2/promise | 3.22.3 | MySQL connectivity with promises |
| Auth | jsonwebtoken | 9.0.2 | JWT generation/verification |
| Password Hashing | argon2 | 0.44.0 (primary), bcrypt 6.0.0 (secondary) | Secure password storage |
| File Upload | multer | 2.0.2 | Multipart form handling |
| Refresh Token Hashing | cookie-parser | 1.4.7 | Cookie middleware |
| CORS | cors | 2.8.5 | Cross-origin resource sharing |
| Blockchain | web3 | 4.16.0 | Ethereum interaction, Sepolia RPC |
| Config | dotenv | 17.2.3 | Environment variable loading |
| UUID | uuid | 13.0.0 | Unique identifier generation |

### Backend (Python)
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Database | mysql-connector-python | MySQL queries from Python |
| LLM API | Groq (HTTP API) | Chat completions for RAG |
| Environment | python-dotenv | Config loading |
| HTTP | urllib (built-in) | Make HTTP requests to Groq |

### Infrastructure
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Database | MySQL 8.0+ | Primary data store |
| Blockchain | Ethereum Sepolia (testnet) | Hash anchoring via Web3.js |
| File Storage | Local filesystem | Medical document storage at `/uploads` |

---

## Important Design Decisions

### 1. **Blockchain Hash Anchoring (Not Full Storage)**
- **Decision**: Store file hash on Sepolia, not full file content.
- **Rationale**: Blockchain is expensive and slow; hashing (SHA-256) is fast and deterministic. Anchoring proves a specific file existed at a specific block.
- **Trade-off**: Provides tamper-evidence but not decentralized availability; document must stay on server.

### 2. **JWT + Refresh Token Pattern**
- **Decision**: Short-lived access tokens (15m) + persistent refresh tokens in DB.
- **Rationale**: Access tokens can't be revoked easily; refresh token allows server-side revocation if needed.
- **Implementation**: Refresh tokens are Argon2-hashed in `refresh_tokens` table; client stores plaintext in localStorage.

### 3. **Role-Based Access Control (RBAC) with Middleware**
- **Decision**: Middleware checks JWT role before route execution.
- **Rationale**: Simple, fast, clear ownership of access logic.
- **Limitation**: Does not support attribute-based access (e.g., "doctor can view patient only if patient consented"); could be enhanced with ABAC.

### 4. **Time-Boxed Access Tokens for History**
- **Decision**: Patient generates a short-lived token (30m) to grant doctor history access.
- **Rationale**: Avoids permanent or copy-paste-able access; supports emergency and routine use cases.
- **Implementation**: `patient_access_tokens` table with `expires_at` timestamp; doctor validates before serving data.

### 5. **Synchronous Blockchain Transaction in Upload**
- **Decision**: Wait for Sepolia transaction to complete before confirming upload.
- **Rationale**: Ensures hash is actually anchored before user is told upload succeeded.
- **Trade-off**: Upload may timeout if Sepolia is congested; no retry logic.
- **Improvement**: Could be made async with background polling.

### 6. **Python Subprocess for RAG**
- **Decision**: Node.js spawns Python subprocess for each RAG query.
- **Rationale**: Groq API is simple; keeping Python separate keeps dependencies clean.
- **Limitation**: No connection pooling; each query has startup overhead.
- **Improvement**: Could be replaced with a long-running Python service (e.g., FastAPI) that Node calls.

### 7. **Separate Auth Routes (`/auth` vs `/api/auth`)**
- **Decision**: Two implementations of register/login (main + API-only).
- **Rationale**: Legacy/alternate client support; API version uses bcrypt instead of argon2.
- **Issue**: Code duplication; inconsistency in password hashing.

### 8. **Record JSON Append-Only Log**
- **Decision**: `records.json` stores all upload events (not database replacement).
- **Rationale**: Provides quick audit trail without querying MySQL; human-readable format.
- **Limitation**: Not synchronized with actual file deletes; can grow unbounded.

### 9. **Doctor `is_verified` Flag + Dual Admin Workflow**
- **Decision**: Doctor registration sets `is_verified = 0`; admin must approve.
- **Rationale**: Prevents unvetted providers from appearing in system.
- **Issue**: Admin routes not wired in backend; workflow is incomplete.

### 10. **No Encryption at Rest**
- **Decision**: Data stored in MySQL plain (no column-level encryption).
- **Rationale**: Reduces complexity for MVP; assumes MySQL connection is over TLS (not verified).
- **Risk**: Sensitive data (medical records, passwords before hashing) vulnerable if database is compromised.

---

## Current Limitations

### Architectural Limitations
1. **No Rate Limiting**: API has no request throttling; susceptible to abuse/DoS.
2. **No Audit Logging**: Access events are not logged; cannot trace who accessed what and when.
3. **No Encryption at Rest**: Medical data stored plain in MySQL.
4. **No Data Export**: Users cannot export their records in standard formats (FHIR, CCDA, HL7).
5. **No Consent Management**: No UI/workflow for patients to grant/revoke data access consent.
6. **Monolithic Backend**: All features in one Node process; no microservices isolation.

### Feature Limitations
1. **Admin Dashboard Not Functional**: Frontend exists but backend not wired.
2. **Context Not Used**: `AuthContext.jsx` defined but not integrated; auth state relies on localStorage only.
3. **No Email Notifications**: Appointments and prescriptions don't send emails.
4. **No Real-Time Updates**: No WebSocket/SSE; clients must poll for new data.
5. **Limited Doctor Verification**: No document validation; file uploaded during registration is just stored.
6. **RAG Canned Responses**: Hard-coded answers for specific queries; limited to known patterns.

### Operational Limitations
1. **TLS Verification Disabled**: `process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"` weakens security.
2. **Credentials in Logs**: `db.js` prints MySQL host, user, password to console.
3. **No Database Migrations**: Schema not version-controlled; manual setup required.
4. **Python Dependency Missing**: `medical_summary.py` requires `mysql-connector-python` but not auto-installed.
5. **File Upload Path Hardcoded**: `uploads/` path assumed to exist; no S3/cloud storage support.

---

## Future Extensibility

### Easy Extensions
1. **Email Notifications**: Add nodemailer to send confirmations, reminders, prescriptions.
2. **SMS Alerts**: Integrate Twilio for SMS appointment reminders.
3. **Data Export**: Add endpoint to export patient records as PDF/FHIR JSON.
4. **Appointment Reminders**: Scheduled job (cron/agenda) to send reminders.
5. **File Versioning**: Track history of record updates, allow rollback.

### Medium Effort Extensions
1. **Real-Time Notifications**: WebSocket (Socket.io) for live appointment/chat updates.
2. **Microservices**: Extract Python RAG service, blockchain service into separate containers.
3. **API Gateway**: Add Kong/AWS API Gateway for rate limiting, auth, monitoring.
4. **Mobile App**: React Native / Flutter frontend for mobile patients.
5. **FHIR Compliance**: Map database schema to FHIR resources for interoperability.

### Major Refactoring
1. **Encryption at Rest**: Add column-level encryption (TDE) or application-level crypto.
2. **Multi-Tenancy**: Support multiple healthcare organizations using one deployment.
3. **Full Admin Dashboard**: Implement doctor approval workflow, platform analytics.
4. **Consent Management**: GDPR-compliant data access consent model.
5. **Authentication Provider**: OAuth2/OIDC integration (Google, Apple, hospital SSO).
6. **Data Warehouse**: Analytics pipeline to extract/transform/analyze medical trends.

---

## Deployment Considerations

### Current State (Local Development)
- Frontend: `npm run dev` on `http://localhost:5173`
- Backend: `node backend/server.js` on `http://localhost:4000`
- MySQL: Requires local or remote instance
- Python: Must have Python 3.9+, Groq dependencies installed
- Blockchain: Sepolia testnet (public, no setup required)

### For Production Deployment
1. **Database**: Use managed MySQL (RDS, Google Cloud SQL) with backups/replication.
2. **File Storage**: Migrate from local `/uploads` to S3 or similar (scale, backups, CDN).
3. **Environment**: Docker containers (Node, Python services) on Kubernetes/ECS.
4. **Monitoring**: APM (Datadog, New Relic) for error tracking, performance.
5. **Security**:
   - Enable TLS everywhere (API, DB, Python communications).
   - Rotate secrets (DB password, JWT secret, Groq API key) regularly.
   - Implement WAF (Web Application Firewall).
   - Add VPC/firewall rules.
6. **Blockchain**: Consider mainnet vs testnet trade-off (cost vs production-readiness).
7. **Scaling**: Load balancer (ALB) for Node.js, separate Python worker pool.
8. **CI/CD**: Automated testing, deployment pipeline (GitHub Actions, GitLab CI).

---

## Summary

MediVault is a **centralized, secure digital health record system** combining traditional web tech (React, Express, MySQL) with emerging tech (LLMs, blockchain). It addresses fragmentation, document integrity, and health literacy.

**Key Strengths**:
- Modern tech stack with good UX (Tailwind, React).
- Real-world features (appointments, AI chat, blockchain anchoring).
- Role-based security model.

**Key Weaknesses**:
- Incomplete admin workflow (missing backend routes).
- No audit logging or comprehensive security hardening.
- Python RAG service has startup overhead and no pooling.
- Not production-ready without additional work (rate limiting, encryption, migrations).

**Next Steps for Production**:
1. Wire admin approval routes and implement doctor verification.
2. Add rate limiting, request validation, audit logging.
3. Enable encryption at rest and in transit.
4. Set up database migrations and version control schema.
5. Deploy to containerized infrastructure with monitoring.
