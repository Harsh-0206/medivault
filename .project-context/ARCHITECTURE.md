# MediVault - Architecture in Detail

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                             │
│                       (React 19 + Vite + Tailwind)                       │
│  ┌─────────────┬──────────────┬──────────────┬──────────────────────┐   │
│  │   Landing   │   Patient    │   Doctor     │      Admin           │   │
│  │   (Public)  │  Dashboard   │  Dashboard   │   Dashboard          │   │
│  │             │  (Records,   │  (Appts,     │  (Non-functional)    │   │
│  │  Auth Pages │   Appts,     │   Search,    │                      │   │
│  │  Login/Reg  │   Prescr,    │   Schedule)  │                      │   │
│  │             │   Vitals,    │              │                      │   │
│  │             │   Chat)      │              │                      │   │
│  └─────────────┴──────────────┴──────────────┴──────────────────────┘   │
│                            │                                             │
│                    (HTTP via axios/fetch)                               │
└────────────────────────────┼───────────────────────────────────────────┘
                             │
                 ┌───────────▼───────────┐
                 │  API LAYER            │
                 │  (Express 5)          │
         ┌───────┴───────────────────────┴────────┐
         │                                         │
┌────────▼──────────────────┐      ┌─────────────▼────────────────┐
│ AUTHENTICATION LAYER      │      │ BUSINESS LOGIC LAYER         │
├───────────────────────────┤      ├──────────────────────────────┤
│ JWT Middleware            │      │ Controllers:                 │
│ Role-based Access         │      │  - Patient (profile, records)│
│ Refresh Token Management  │      │  - Doctor (appointments)     │
│ Access Token Grants       │      │  - Appointments (booking)    │
│ (Easy/Emergency Access)   │      │  - Prescriptions             │
└────────────────────────────┘      │  - RAG (Groq integration)    │
                                    │  - File upload pipeline      │
                                    └──────────────────────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────┐
                    │                          │                      │
         ┌──────────▼──────────┐   ┌──────────▼────────┐  ┌──────────▼─────────┐
         │  DATA ACCESS LAYER  │   │ FILE UPLOAD       │  │ BLOCKCHAIN LAYER  │
         │  (mysql2/promise)   │   │ PIPELINE          │  │ (Web3.js)         │
         ├─────────────────────┤   ├───────────────────┤  ├───────────────────┤
         │ Queries:            │   │ Multer            │  │ Sepolia RPC       │
         │ - CRUD users        │   │ SHA-256 hashing   │  │ Smart Contract    │
         │ - Profile mgmt      │   │ File storage      │  │ Transaction       │
         │ - Records/Appts     │   │ Metadata logging  │  │ Receipt tracking  │
         │ - Search & filters  │   │ (records.json)    │  │                   │
         │ - Access tokens     │   │                   │  │                   │
         └──────────────────────┘   └───────────────────┘  └───────────────────┘
                    │
         ┌──────────▼──────────┐
         │  DATABASE LAYER     │
         ├─────────────────────┤
         │ MySQL 8.0+          │
         │                     │
         │ Tables:             │
         │ - users             │
         │ - doctor_profiles   │
         │ - medical_records   │
         │ - appointments      │
         │ - prescriptions     │
         │ - vital_signs       │
         │ - refresh_tokens    │
         │ - patient_access... │
         │ - patient_summaries │
         └─────────────────────┘
                    │
         ┌──────────▼──────────┐
         │  STORAGE            │
         ├─────────────────────┤
         │ /uploads/           │
         │ (medical files,     │
         │  doctor docs)       │
         └─────────────────────┘
```

---

## Core Architectural Patterns

### 1. **Layered Architecture**

**Request Flow Example** (File Upload):

```
1. Browser (React) → FormData with file
                    ↓
2. Frontend (PatientDashboard.jsx) → POST /files/upload with Bearer JWT
                    ↓
3. Express Server (server.js) → Apply CORS, parse JWT
                    ↓
4. Middleware (auth.js) → authenticateToken() → validates JWT, sets req.user
                    ↓
5. Route Handler (fileRoutes.js) → POST /upload (multer, async)
                    ↓
6. Controller Logic → Compute hash, validate, prepare blockchain call
                    ↓
7. Blockchain Module (blockchain.js) → Web3.js transaction → Sepolia
                    ↓
8. Database Access (config/db.js) → Insert medical_records row
                    ↓
9. File System → Save file to /uploads/, append records.json
                    ↓
10. Response → Return metadata JSON
                    ↓
11. Frontend → Display success, show download link
```

### 2. **Model-View-Controller (MVC) for Backend**

```
Model = Database Tables + Queries (mysql2)
View = JSON Response + Error Handling
Controller = Business Logic (controllers/*.js)
Routes = HTTP Verb + Path Mapping (routes/*.js)
Middleware = Cross-cutting Concerns (auth, CORS, validation)
```

### 3. **Authentication & Authorization Strategy**

```
JWT Flow:
  1. User submits credentials (email, password, role)
  2. Backend hashes password check, generates JWT (payload: {id, role}, exp: 15m)
  3. Backend generates refresh token (random bytes), stores Argon2 hash in DB
  4. Frontend stores JWT in localStorage, uses as Bearer token
  5. Each request: middleware validates JWT signature, extracts user context
  6. Routes use requireRole() to enforce role-based access

Refresh Token Flow:
  1. Frontend detects JWT expired (decode, check exp)
  2. Frontend calls POST /auth/refresh with refresh token
  3. Backend iterates refresh_tokens table, Argon2-verifies match
  4. Backend issues new JWT, returns new refresh token (optional)
  5. Frontend updates localStorage, continues

Role-Based Access Control (RBAC):
  - Middleware: requireRole('patient'|'doctor'|'admin')
  - Checks req.user.role against required role
  - 403 if mismatch, 401 if missing
```

### 4. **Access Token Grants (Time-Boxed)**

```
Patient Easy Access:
  1. Patient views appointment, clicks "Easy Access"
  2. Frontend POST /appointments/{id}/easy-access
  3. Backend creates patient_access_tokens row: 
     {patient_id, doctor_id, access_token (random), expires_at: now+30m, is_active: 1}
  4. Frontend displays token (copy to clipboard or QR code)
  5. Patient shares token with doctor out-of-band (SMS, in-person, etc.)

Doctor Redemption:
  1. Doctor has token, calls GET /appointments/patient-history/{token}
  2. Backend validates:
     - Token exists in patient_access_tokens
     - expires_at > NOW()
     - is_active = 1
     - doctor_id matches authenticated doctor
  3. Backend retrieves patient profile, records, vitals, prescriptions, appointments
  4. Frontend displays patient dashboard
  5. Access token expires after 30 minutes; doctor re-shares needed if access renewal required
```

### 5. **File Upload & Blockchain Anchoring**

```
Upload Pipeline:
  1. Client: Select file, fill metadata (title, type, record date, notes)
  2. Client: POST /files/upload (multipart/form-data) with Bearer JWT
  3. Server: Authenticate (JWT middleware)
  4. Server: Multer receives file → disk at /uploads/{timestamp}_{filename}
  5. Server: Read file content → SHA-256 hash (deterministic)
  6. Server: Call addRecordToBlockchain(hash) [ASYNC WAIT]
     a. Initialize Web3 from SEPOLIA_RPC_URL
     b. Load contract ABI from CONTRACT_ABI_JSON
     c. Create account from PRIVATE_KEY
     d. Invoke contract.methods.addRecord(hash).send({from: account.address})
     e. Wait for receipt (receipt.transactionHash, receipt.blockNumber)
     f. Read contract.methods.count() before/after for audit
  7. Server: Append record to records.json (audit log)
  8. Server: Insert medical_records in MySQL (patient_id, doctor_id, file_path, etc.)
  9. Server: Return to client: {success: true, fileHash, transactionHash, blockNumber}
  10. Client: Display confirmation, show link to /uploads/{filename}

Blockchain Contract Assumptions:
  - Method: addRecord(bytes32 or string hash) → void or event
  - Method: count() → uint256 (returns record count)
  - Event: RecordAdded (hash, timestamp, etc.) - emitted on addRecord
  - Owned/managed by user (via PRIVATE_KEY)
```

### 6. **RAG Health Chat Architecture**

```
Client → POST /patient/rag/chat {message, top_k}
           ↓ (Bearer JWT in header)

Node.js Backend (ragController.js):
   1. Authenticate patient JWT
   2. Extract patient_id from JWT
   3. Validate message not empty
   4. Spawn subprocess: python app.py --patient_id {id} --query "{msg}" --top_k 5
   5. Set environment: GROQ_API_KEY, DB_PASSWORD, PATIENT_ID
   6. Capture stdout/stderr
   7. Wait for child to close
   8. Parse JSON from stdout
   9. Return result to client

Python (app.py → medical_summary.py):
   1. Parse CLI arguments
   2. Load .env config (DB, Groq)
   3. Initialize MedicalSummarizer
   4. Check canned responses first (known queries)
   5. If canned match: return canned answer
   6. Else: Call summarizer.answer_query_with_rag(patient_id, query, top_k):
      a. Connect to MySQL
      b. Fetch patient data (records, appointments, prescriptions, vitals)
      c. Create context: "Patient {name}, DOB {dob}, medical history: ..."
      d. Format query: user_prompt = query, system_prompt = medical context
      e. Call Groq API (HTTP POST to api.groq.com/openai/v1/chat/completions)
      f. Parse response, extract answer
      g. Return: {success: true, answer, patient_id, query, model: "llama-3.3-70b-versatile", ...}
   7. Output JSON to stdout

Node.js Backend (continued):
   10. Return JSON to client: {success, answer, retrieved_chunks, ...}

Client (PatientHealthChat.jsx):
   11. Parse response
   12. Display answer in chat UI
   13. Show disclaimer: "For information only, consult clinician for medical decisions"
```

---

## Module Responsibilities

### Frontend Modules

| Module | Responsibility | Ownership |
|--------|---|---|
| App.jsx | Routing, layout | Root level |
| Landing.jsx | Marketing, public content | Pages |
| Login.jsx / Register.jsx | Auth flows, form validation | Pages/auth |
| PatientDashboard.jsx | Patient hub, multi-tab interface | Pages/patient |
| PatientHealthChat.jsx | RAG UI, message display | Components/patient |
| DoctorDashboard.jsx | Doctor hub, stats | Pages/doctor |
| DoctorScheduleManagement.jsx | Availability CRUD | Pages/doctor |
| axiosClient.js | HTTP client, interceptors | API layer |
| AuthContext.jsx | (Intended) Auth state management | Context layer |
| RequireAuth.jsx | Route protection | Components/auth |

### Backend Modules

| Module | Responsibility | Ownership |
|---|---|---|
| server.js | Express app assembly, middleware setup | Root |
| config/db.js | MySQL connection pool | Config |
| middleware/auth.js | JWT verification, role checks | Middleware |
| authController.js | Register, login, token refresh | Controllers |
| patientController.js | Patient CRUD, records, vitals | Controllers |
| doctorController.js | Doctor dashboard, patient search, history | Controllers |
| appointmentController.js | Booking, slots, availability, access tokens | Controllers |
| prescriptionController.js | Prescription CRUD | Controllers |
| ragController.js | Python subprocess spawning | Controllers |
| authRoutes.js | POST /auth/... | Routes |
| patientRoutes.js | GET/POST /patient/... | Routes |
| fileRoutes.js | POST /files/upload, file pipeline | Routes |
| blockchain.js | Web3.js, Sepolia transactions | Blockchain |

### Python Modules

| Module | Responsibility |
|---|---|
| app.py | CLI entry point, argument parsing, error handling |
| medical_summary.py | MedicalSummarizer class, DB queries, Groq API calls |

---

## Execution Flow: Key Workflows

### 1. **Patient Registration & Login**

```
USER ACTION: Click "Register" as Patient

1. POST /auth/register {name, email, password}
   ├─ Validate inputs (all required)
   ├─ Check email not already registered
   ├─ Argon2.hash(password)
   ├─ INSERT users: {name, email, password_hash, role='patient', is_verified=1}
   └─ Return {message: "Patient registered successfully"}

2. POST /auth/login {email, password, role='patient'}
   ├─ SELECT users WHERE email = ?
   ├─ Argon2.verify(input_password, stored_hash)
   ├─ Check role matches
   ├─ Generate JWT {id, role} with 15m expiry
   ├─ Generate refresh_token (random 40 bytes hex)
   ├─ Argon2.hash(refresh_token)
   ├─ INSERT refresh_tokens {user_id, token_hash}
   └─ Return {token: JWT, refreshToken: plaintext, role: 'patient'}

3. Frontend stores JWT in localStorage as 'mv_token'

4. GET /patient/dashboard (with Bearer JWT)
   ├─ Middleware verifies JWT signature
   ├─ Middleware requireRole('patient') checks req.user.role
   ├─ Controller getDashboardOverview() executes
   ├─ SELECT appointments, prescriptions, medical_records
   └─ Return summarized data
```

### 2. **Doctor Registration & Verification**

```
USER ACTION: Click "Register" as Doctor

1. POST /auth/register-doctor {name, email, password, regNumber, degree} + FILE
   ├─ Validate inputs
   ├─ Check email not registered
   ├─ Argon2.hash(password)
   ├─ Multer save document file
   ├─ INSERT users {name, email, password_hash, role='doctor', reg_number, degree, document_path, is_verified=0}
   └─ Return {message: "Doctor registration submitted for admin approval"}

2. POST /auth/login {email, password, role='doctor'}
   ├─ SELECT users WHERE email = ?
   ├─ Argon2.verify()
   ├─ Check is_verified = 1
   │  └─ If is_verified = 0: Return 403 "Doctor not verified by admin yet"
   ├─ Generate JWT, refresh token
   └─ Return tokens

ADMIN WORKFLOW (NOT IMPLEMENTED):
3. GET /admin/doctors/pending (would fetch is_verified=0 doctors)
4. POST /admin/doctors/{id}/approve (would set is_verified=1)
5. Doctor can now login successfully

Once verified:
6. POST /doctor/availability {monday, tuesday, ...} with {enabled, start, end}
   ├─ Validate authentication (requireRole('doctor'))
   ├─ UPDATE doctor_profiles SET available_days, available_time_start, available_time_end
   └─ Return {message: "Availability updated"}
```

### 3. **Appointment Booking Workflow**

```
PATIENT ACTION: Click "Book Appointment"

1. GET /doctors/search?query=cardiologist
   ├─ SELECT verified doctors (is_verified=1) matching query
   └─ Return {doctors: [{id, name, specialty, location, ...}]}

2. Patient selects doctor_id, picks date

3. GET /appointments/doctor/{doctorId}/slots?date=2025-06-30
   ├─ Fetch doctor_profiles WHERE user_id = doctorId
   ├─ Check doctor available on day-of-week (e.g., Monday)
   ├─ Generate time slots (e.g., 09:00, 09:30, 10:00, ...)
   ├─ SELECT appointments WHERE doctor_id=? AND appointment_date=? AND status IN ('pending','confirmed')
   ├─ Filter out booked slots
   └─ Return {slots: [{time: "09:00", available: true}, ...]}

4. Patient selects time, fills reason

5. POST /appointments {doctor_id, appointment_date, appointment_time, reason}
   ├─ Authenticate patient JWT
   ├─ Validate slot still available (re-check)
   ├─ INSERT appointments {patient_id, doctor_id, appointment_date, appointment_time, reason, status='pending'}
   └─ Return {message: "Appointment booked"}

6. Doctor sees new appointment on GET /appointments/doctor
   ├─ Doctor reviews appointment
   ├─ Doctor POST /appointments/{id}/respond {status: 'confirmed'|'declined'}
   │  └─ UPDATE appointments SET status = ?
   └─ Patient sees confirmed status on next dashboard refresh
```

### 4. **Easy Access Token Grant**

```
PATIENT ACTION: View appointment, tap "Easy Access"

1. POST /appointments/{appointmentId}/easy-access
   ├─ Authenticate patient JWT
   ├─ Fetch appointment to verify ownership
   ├─ Generate random token (32 bytes hex)
   ├─ INSERT patient_access_tokens {patient_id, doctor_id, access_token, expires_at: now+30min, is_active: 1}
   └─ Return {access_token, expiresAt}

2. Frontend displays token (copy button, optional QR code)

3. Patient shares token with doctor (SMS, chat, in-person, etc.)

DOCTOR ACTION: Receive token, access patient history

4. Doctor calls GET /appointments/patient-history/{token}
   ├─ Authenticate doctor JWT
   ├─ SELECT patient_access_tokens WHERE access_token = ?
   ├─ Validate expires_at > NOW()
   ├─ Validate is_active = 1
   ├─ Validate doctor_id matches authenticated doctor
   ├─ SELECT patient profile, vitals, medical_records, prescriptions, appointments
   └─ Return full patient data

5. Frontend displays patient dashboard (read-only)

6. 30 minutes pass: Token expires; doctor loses access; patient must re-grant
```

### 5. **Medical File Upload with Blockchain**

```
PATIENT ACTION: Upload medical record

1. Patient selects file, fills: {title, type, recordDate, notes}
2. POST /files/upload (multipart/form-data) with Bearer JWT
   ├─ Authenticate patient JWT
   ├─ Multer receives file → disk at /uploads/record-{timestamp}.pdf
   ├─ Read file: fileBuffer = fs.readFileSync(file.path)
   ├─ Compute hash: fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
   │  └─ Example: "a1b2c3d4e5f6..."
   ├─ Call addRecordToBlockchain(fileHash)
   │  ├─ Initialize Web3(Sepolia RPC)
   │  ├─ Create account from PRIVATE_KEY (signer)
   │  ├─ Instantiate contract: new web3.eth.Contract(ABI, CONTRACT_ADDRESS)
   │  ├─ Call contract.methods.addRecord(fileHash).send({from: account.address})
   │  │  └─ Waits for receipt: {transactionHash: '0xabc...', blockNumber: 1234567}
   │  └─ Return {transactionHash, blockNumber, owner, beforeCount, afterCount}
   ├─ Append to records.json: {id: nextId, userId, fileHash, transactionHash, blockNumber, ...}
   ├─ INSERT medical_records {patient_id, title, type, record_date, file_path='/uploads/...', notes, uploaded_by, ...}
   └─ Return {success: true, fileHash, transactionHash, blockNumber}

3. Frontend displays: "File uploaded! Hash: a1b2c3d4... | Block: 1234567 | TxHash: 0xabc..."

4. Patient can later verify hash on-chain:
   ├─ Visit Etherscan: https://sepolia.etherscan.io/tx/0xabc...
   ├─ View contract interaction: addRecord(a1b2c3d4...)
   ├─ Proof: This hash was submitted by this wallet at this block
   └─ Tamper-evidence: If file is modified, new hash ≠ stored hash on chain
```

### 6. **RAG Health Chat**

```
PATIENT ACTION: Type question in health chat

1. POST /patient/rag/chat {message: "What medications am I on?", top_k: 5}
   ├─ Authenticate patient JWT (extract patient_id)
   ├─ Validate message not empty
   ├─ Node.js ragController:
   │  ├─ Spawn: child_process.spawn('python', ['app.py', '--patient_id', '42', '--query', 'What medications am I on?', '--top_k', '5'])
   │  ├─ Set env: GROQ_API_KEY, DB_PASSWORD, PATIENT_ID
   │  ├─ Listen to stdout/stderr
   │  └─ On child.close(): parse JSON from stdout
   │
   ├─ Python subprocess (app.py):
   │  ├─ Load config (DB, Groq)
   │  ├─ Resolve patient_id from CLI arg
   │  ├─ Initialize MedicalSummarizer
   │  ├─ Check canned responses: normalized_query in CANNED_RAG_ANSWERS?
   │  │  └─ If match: return canned answer immediately
   │  ├─ Else: answer_query_with_rag():
   │  │  ├─ Connect to MySQL
   │  │  ├─ SELECT prescriptions WHERE patient_id=42 LIMIT 5 (top_k)
   │  │  ├─ Build context: "Patient Jane Doe, medications: [list from DB]"
   │  │  ├─ Call Groq:
   │  │  │  └─ POST https://api.groq.com/openai/v1/chat/completions
   │  │  │     Body: {model: "llama-3.3-70b-versatile", messages: [{role: "user", content: "..."}], ...}
   │  │  │     Header: Authorization: Bearer {GROQ_API_KEY}
   │  │  ├─ Parse response: answer = response.choices[0].message.content
   │  │  └─ Return: {success: true, answer: "You are prescribed: [list]", ...}
   │  ├─ Output JSON to stdout
   │  └─ Exit
   │
   └─ Node receives JSON, return to client

2. Frontend parses response:
   ├─ If error: show error message
   ├─ Else: display answer in chat bubble
   └─ Show disclaimer: "For information only, not medical advice"

3. Patient continues conversation (next query follows same flow)
```

---

## Lifecycle & Startup Sequence

### Application Startup

```
FRONTEND:
  npm run dev
  ├─ Vite dev server starts on http://localhost:5173
  ├─ Watches src/ for changes, HMR enabled
  ├─ Serves index.html, injects entry point (main.jsx)
  └─ main.jsx renders App → BrowserRouter → Routes

BACKEND:
  node backend/server.js
  ├─ Load .env (DB credentials, JWT secret, Groq API key, Blockchain config)
  ├─ Import db.js
  ├─ Create mysql2 connection pool
  ├─ Try to connect: db.getConnection() (test connection)
  │  ├─ Success: console.log("✅ MySQL Connected")
  │  └─ Failure: console.error("❌ MySQL Connection Failed")
  ├─ Import all route files
  ├─ Create Express app
  ├─ Mount middleware: CORS, JSON parser, cookie parser
  ├─ Mount routes: auth, patient, doctor, appointments, files, etc.
  ├─ Start listening: app.listen(4000)
  └─ console.log("Server running on port 4000")

BLOCKCHAIN:
  ├─ Not initialized at startup (lazy-load on first file upload)
  ├─ First upload: blockchainjs.initializeBlockchain()
  │  ├─ Read env: SEPOLIA_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS, ABI
  │  ├─ Create Web3 instance, add account to wallet
  │  ├─ Instantiate contract
  │  └─ Cache blockchainContext for reuse

PYTHON:
  ├─ Not started at backend startup
  ├─ First RAG query: ragController spawns subprocess
  │  ├─ python app.py --patient_id ... --query ... --top_k ...
  │  └─ Each query = new Python process (no pooling)
```

### Database Initialization

**No migrations tracked in repo.** Schema is inferred from controllers; manual setup required:

```sql
CREATE DATABASE medivault;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  role ENUM('patient', 'doctor', 'admin'),
  is_verified TINYINT(1) DEFAULT 0,
  date_of_birth DATE,
  blood_group VARCHAR(10),
  phone VARCHAR(20),
  address TEXT,
  emergency_contact VARCHAR(255),
  reg_number VARCHAR(100),
  degree VARCHAR(100),
  document_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctor_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  specialty VARCHAR(100),
  qualification VARCHAR(255),
  experience_years INT,
  consultation_fee DECIMAL(10, 2),
  location VARCHAR(255),
  available_days VARCHAR(50),
  available_time_start TIME,
  available_time_end TIME,
  slot_duration INT,
  bio TEXT,
  accepts_new_patients TINYINT(1) DEFAULT 1,
  online_consultation TINYINT(1) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ... and other tables (medical_records, appointments, prescriptions, vital_signs, etc.)
```

### Shutdown Sequence

```
GRACEFUL SHUTDOWN:
1. Frontend (browser): User navigates away or closes tab
   └─ No explicit cleanup (stateless)

2. Backend (SIGTERM):
   ├─ Stop accepting new connections
   ├─ Allow in-flight requests to complete (timeout ~30s)
   ├─ Close database connection pool: await pool.end()
   ├─ Flush blockchain context (none)
   ├─ Exit process

ABRUPT SHUTDOWN:
  ├─ Processes killed
  ├─ Connections may not close cleanly
  ├─ DB transactions may roll back or hang
  ├─ Blockchain transactions in-flight may be lost
```

---

## Communication Between Modules

### Frontend ↔ Backend (HTTP)

```
HTTP Methods Used:
├─ GET: Retrieve data (no side effects)
│  └─ Examples: /patient/profile, /appointments/doctor/:id/slots, /doctors/search
├─ POST: Create resource
│  └─ Examples: /auth/login, /appointments, /files/upload, /patient/rag/chat
├─ PUT: Update resource
│  └─ Examples: /patient/profile, /appointments/:id/cancel, /doctor/availability
└─ DELETE: Remove resource
   └─ Examples: /patient/medical-records/:recordId

CORS Policy:
  ├─ Allowed Origin: http://localhost:5173 (hardcoded)
  ├─ Allowed Methods: GET, POST, PUT, DELETE, OPTIONS
  ├─ Allowed Headers: Content-Type, Authorization
  ├─ Credentials: true (send/include cookies)
  └─ No pre-flight caching (each request checks)

Authentication Header:
  ├─ Format: Authorization: Bearer {JWT}
  ├─ JWT contains: {id, role, iat, exp}
  ├─ Signature verified on each request
  └─ Expiry: 15 minutes (reuse refresh token after expiry)
```

### Backend ↔ Database (MySQL)

```
Connection:
  ├─ Driver: mysql2/promise
  ├─ Pool: 10 connections (default)
  ├─ Timeout: depends on pool config
  └─ Usage: db.query(sql, params) → Promise<[rows, fields]>

Patterns:
  ├─ Parameterized queries: WHERE id = ? (prevents SQL injection)
  ├─ Async/await: const [rows] = await db.query(...)
  ├─ Error handling: try/catch with 500 responses
  └─ No transactions explicitly (autocommit mode)

Queries:
  ├─ Read: SELECT * FROM table WHERE condition
  ├─ Write: INSERT, UPDATE, DELETE
  ├─ Joins: SELECT users u JOIN appointments a ON u.id = a.patient_id
  └─ Aggregates: COUNT, SUM, MAX, etc.
```

### Backend ↔ Blockchain (Web3.js)

```
RPC Communication:
  ├─ Protocol: JSON-RPC over HTTPS
  ├─ Endpoint: process.env.SEPOLIA_RPC_URL (e.g., https://sepolia.infura.io/v3/...)
  ├─ Timeout: default ~60s
  └─ SSL: Verification disabled in dev (NODE_TLS_REJECT_UNAUTHORIZED = 0)

Contract Interaction:
  ├─ Contract instance: web3.eth.Contract(ABI, contractAddress)
  ├─ Read: contract.methods.count().call() → returns value
  ├─ Write: contract.methods.addRecord(hash).send({from: account}) → returns receipt
  ├─ Events: (not currently used)
  └─ Gas: Estimated automatically by Web3.js

Transaction Flow:
  ├─ Client (account): Sends transaction to mempool
  ├─ Sepolia Validator: Picks up transaction, includes in block
  ├─ Block Mined: Transaction in block, receipt generated
  └─ Confirmation: Usually 12 blocks for Sepolia (finality)

Security:
  ├─ Private Key: Stored in process.env.PRIVATE_KEY (plaintext in .env, should use vault)
  ├─ Signer: Account derived from private key
  ├─ No signing protection (key in process memory)
  └─ Risk: If server compromised, attacker has signing access
```

### Backend ↔ Python (subprocess)

```
IPC Mechanism:
  ├─ Child Process: spawn('python', ['app.py', ...])
  ├─ Stdio: Inherited from parent for logging
  ├─ Stdout: Captured line-by-line for JSON output
  ├─ Stderr: Captured for error logging
  └─ Exit Code: 0 = success, non-zero = failure

Environment Passing:
  ├─ ENV Variables: GROQ_API_KEY, DB_PASSWORD, PATIENT_ID
  ├─ CLI Arguments: --patient_id, --query, --top_k
  └─ No shared memory (separate processes)

Output Protocol:
  ├─ Python outputs JSON to stdout at end: JSON.stringify({...})
  ├─ Node captures all stdout text
  ├─ Node JSON.parses the full text
  ├─ Node handles JSON parse errors (incomplete, malformed, etc.)
  └─ Error messages: Printed to stderr, not captured as part of response

Lifecycle:
  ├─ Python process starts
  ├─ Runs to completion (DB connection → Groq API → response)
  ├─ Outputs JSON
  ├─ Exits (child.on('close'))
  ├─ No pooling: Each query spawns new Python process (overhead)
  └─ Timeout: If subprocess hangs, no built-in timeout (inherit from Node timeout)
```

---

## Dependency Graph

### Core Dependencies
```
Frontend:
  React 19 → Vite → Tailwind CSS
  React Router → Navigation
  Axios → HTTP requests
  dayjs → Date formatting

Backend:
  Express → Routes & middleware
  mysql2/promise → Database access
  jsonwebtoken → JWT creation/validation
  argon2 → Password hashing (primary)
  bcrypt → Backup password hashing
  multer → File uploads
  web3 → Blockchain interaction
  dotenv → Environment variables
  cors → Cross-origin requests

Python:
  mysql-connector-python → Database access
  urllib (built-in) → HTTP to Groq API
  json (built-in) → JSON parsing
  argparse (built-in) → CLI argument parsing
  ssl (built-in) → HTTPS with fallback
```

### Cross-Module Dependencies
```
Controllers → Database (config/db.js)
Routes → Controllers
Middleware → JWT library, dotenv
FileRoutes → Blockchain module
RAG Controller → Child process (Python)
Frontend Pages → API client (axiosClient.js)
Frontend Pages → Context (AuthContext.jsx) [unused]
```

---

## Summary: Architecture Principles

1. **Modularity**: Clear separation of concerns (routes, controllers, middleware, database).
2. **Layering**: Presentation → API → Business Logic → Data Access → Database.
3. **RBAC**: Role-based access control at middleware level.
4. **Async Processing**: File upload waits for blockchain; RAG queries spawn subprocess.
5. **Stateless Backend**: No session state (JWT-based); can scale horizontally.
6. **Time-Boxed Access**: Tokens with expiry for temporary access grants.
7. **Multi-Tech Integration**: React, Express, MySQL, Web3, Python/Groq in one system.

**Strengths**:
- Clear responsibility boundaries.
- Proven patterns (MVC, RBAC, JWT).
- Diverse tech stack for different problems.

**Weaknesses**:
- No connection pooling for Python service (startup overhead).
- Blockchain transaction waits block upload (timeout risk).
- No audit logging for access events.
- Admin workflow incomplete (routes not wired).
- Context exists but unused (auth state confusion).
