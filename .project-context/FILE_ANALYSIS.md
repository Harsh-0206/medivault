# MediVault - File Analysis

Comprehensive breakdown of every source file: purpose, major functions, dependencies, callers, and implementation details.

---

## Backend Controllers

### `backend/controllers/authController.js`

**Purpose**: Handle authentication flows: registration, login, token refresh.

**Major Functions**:

#### `generateAccessToken(user)`
- **Params**: user object with id, role
- **Returns**: JWT string (15m expiry)
- **Uses**: jsonwebtoken.sign() with JWT_SECRET
- **Callers**: login(), refresh()

#### `generateRefreshToken()`
- **Params**: None
- **Returns**: Random 40-byte hex string
- **Uses**: crypto.randomBytes()
- **Callers**: login(), refresh()

#### `hashToken(token)`
- **Params**: Plain refresh token string
- **Returns**: Promise<hashed string>
- **Uses**: argon2.hash()
- **Callers**: login()

#### `registerPatient(req, res)`
- **Params**: req.body = {name, email, password}
- **Returns**: JSON response
- **Validation**: All fields required, email unique
- **DB Ops**: INSERT users (role='patient', is_verified=1)
- **Uses**: argon2.hash(), db.query()
- **Callers**: POST /auth/register
- **Issues**: No duplicate email response; returns generic error

#### `registerDoctor(req, res)`
- **Params**: req.body = {name, email, password, regNumber, degree}, req.file = document
- **Returns**: JSON response
- **Validation**: All fields + document required, email unique
- **DB Ops**: INSERT users (role='doctor', is_verified=0, document_path from multer)
- **Uses**: argon2.hash(), db.query(), multer file
- **Callers**: POST /auth/register-doctor
- **Notes**: Sets is_verified=0; admin must approve

#### `login(req, res)`
- **Params**: req.body = {email, password, role}
- **Returns**: {token, refreshToken, role}
- **Validation**: All fields required, email exists, password valid, role matches DB
- **DB Ops**: SELECT users, INSERT refresh_tokens
- **Uses**: argon2.verify(), generateAccessToken(), hashToken()
- **Callers**: POST /auth/login
- **Issue**: Doctor returns 403 if is_verified=0

#### `refresh(req, res)`
- **Params**: req.body = {refreshToken}
- **Returns**: {token, refreshToken, role}
- **Logic**: Iterates ALL refresh_tokens, Argon2-verifies each (inefficient)
- **DB Ops**: SELECT refresh_tokens, SELECT users
- **Uses**: argon2.verify(), generateAccessToken()
- **Callers**: POST /auth/refresh
- **Issue**: O(n) complexity; poor scalability

**Dependencies**: argon2, jwt, crypto, dotenv, db
**Called By**: authRoutes.js
**Complexity**: Medium (crypto operations, DB lookups)
**Known Issues**: 
- Refresh token lookup is O(n) in table size
- No rate limiting on registration/login
- No email verification before account activation

---

### `backend/controllers/patientController.js`

**Purpose**: Patient profile, medical records, appointments, prescriptions, vital signs.

**Major Functions**:

#### `getPatientProfile(req, res)`
- **DB Ops**: SELECT users WHERE id = ? AND role = 'patient'
- **Returns**: Single patient object
- **Called By**: GET /patient/profile

#### `updatePatientProfile(req, res)`
- **Params**: Body = {name, dateOfBirth, bloodGroup, phone, address, emergencyContact}
- **DB Ops**: UPDATE users WHERE id = ?
- **Called By**: PUT /patient/profile

#### `getMedicalRecords(req, res)`
- **DB Ops**: SELECT medical_records LEFT JOIN users (doctor name) WHERE patient_id = ?
- **Returns**: Array of records with doctor info
- **Called By**: GET /patient/medical-records

#### `deleteMedicalRecord(req, res)`
- **Params**: recordId from URL
- **Logic**: Delete DB row + unlink file from /uploads/
- **DB Ops**: DELETE medical_records; SELECT to find file_path
- **File Ops**: fs.unlinkSync() to remove uploaded file
- **Called By**: DELETE /patient/medical-records/:recordId
- **Issue**: No transaction; DB delete succeeds but file delete fails = orphaned file

#### `getAppointments(req, res)`
- **DB Ops**: SELECT appointments JOIN users (doctor name) LEFT JOIN doctor_profiles (specialty) WHERE patient_id = ?
- **Returns**: Array of appointments with doctor info
- **Called By**: GET /patient/appointments

#### `bookAppointment(req, res)`
- **Params**: Body = {doctor_id, appointment_date, appointment_time, reason}
- **DB Ops**: INSERT appointments
- **Validation**: Slot availability check
- **Called By**: POST /patient/appointments
- **Issue**: No double-booking prevention; can book same slot twice

#### `cancelAppointment(req, res)`
- **Params**: appointmentId from URL
- **DB Ops**: UPDATE appointments SET status='cancelled'
- **Called By**: PUT /patient/appointments/:appointmentId/cancel

#### `getPrescriptions(req, res)`
- **DB Ops**: SELECT prescriptions JOIN users WHERE patient_id = ?
- **Returns**: Array of prescriptions with doctor name
- **Called By**: GET /patient/prescriptions

#### `getVitalSigns(req, res)`
- **DB Ops**: SELECT vital_signs WHERE patient_id = ? ORDER BY recorded_date DESC
- **Returns**: Array of vital sign readings
- **Called By**: GET /patient/vital-signs

#### `addVitalSigns(req, res)`
- **Params**: Body = {heartRate, bloodPressure, glucose, temperature, weight, recordedDate}
- **DB Ops**: INSERT vital_signs
- **Called By**: POST /patient/vital-signs

#### `getDashboardOverview(req, res)`
- **Purpose**: Return summary data for patient dashboard
- **DB Ops**: SELECT COUNT prescriptions, medical_records, appointments (upcoming)
- **Returns**: Aggregated dashboard data
- **Called By**: GET /patient/dashboard

**Dependencies**: db, path, fs
**Called By**: patientRoutes.js
**Complexity**: Low to Medium (basic CRUD, no complex logic)
**Known Issues**:
- No transaction support (delete medical record + file)
- No double-booking prevention
- No soft deletes; hard deletes lose history
- File deletion errors silent (logged but request succeeds)

---

### `backend/controllers/doctorController.js`

**Purpose**: Doctor dashboard, patient search, patient history retrieval.

**Major Functions**:

#### `getDoctorDashboard(req, res)`
- **Purpose**: Return doctor dashboard overview
- **DB Ops**: 
  - SELECT appointments WHERE doctor_id AND appointment_date = CURDATE()
  - SELECT COUNT DISTINCT patient_id FROM appointments
  - SELECT prescriptions (recent 5)
  - SELECT medical_records (recent 5)
- **Returns**: {todayAppointments, totalPatients, recentPrescriptions, recentRecords}
- **Called By**: GET /doctor/dashboard

#### `searchPatient(req, res)`
- **Purpose**: Doctor searches for a patient
- **Params**: req.query = {query}
- **DB Ops**: SELECT users WHERE (id = ? OR name LIKE ? OR email LIKE ? OR phone LIKE ?)
- **Returns**: Array of patient summaries
- **Called By**: GET /doctor/search

#### `getPatientHistory(req, res)`
- **Purpose**: Retrieve full patient history (with access token validation)
- **Access Control**: Validates patient_access_tokens (easy/emergency access)
- **DB Ops**:
  - SELECT patient_access_tokens (validate grant)
  - SELECT users (profile)
  - SELECT vital_signs (all time-series)
  - SELECT medical_records (all)
  - SELECT prescriptions (all, with doctor name)
  - SELECT appointments (all, with doctor name)
- **Returns**: Complete patient dossier
- **Called By**: GET /doctor/patient/:id/history
- **Issue**: Returns ALL history; no pagination; could be large dataset

**Dependencies**: db
**Called By**: doctorRoutes.js
**Complexity**: Low to Medium (SELECT queries, no complex logic)
**Known Issues**:
- No pagination for large histories
- All data returned in single response (memory risk)
- No audit logging of who viewed patient history

---

### `backend/controllers/appointmentController.js`

**Purpose**: Appointment booking, slots management, doctor availability, access tokens.

**Major Functions**:

#### `getDoctorAvailability(req, res)`
- **Purpose**: Fetch doctor's availability settings
- **DB Ops**: SELECT doctor_profiles WHERE user_id = ?
- **Returns**: Availability object {monday: {enabled, start, end}, ...}
- **Called By**: GET /appointments/doctor/availability

#### `updateDoctorAvailability(req, res)`
- **Purpose**: Doctor updates availability
- **Params**: Body = {monday, tuesday, ..., sunday} with {enabled, start, end}
- **DB Ops**: UPDATE doctor_profiles
- **Called By**: PUT /appointments/doctor/availability

#### `getAvailableSlots(req, res)`
- **Purpose**: Get available time slots for specific doctor/date
- **Logic**:
  1. Validate date provided
  2. Fetch doctor's availability settings
  3. Check if doctor available on day-of-week
  4. Generate time slots (start, end, duration)
  5. Query booked appointments for that date
  6. Filter available slots
- **Returns**: {date, slots: [{time, available: bool}, ...]}
- **Called By**: GET /appointments/doctor/:doctorId/slots
- **Issue**: No caching; slow for high traffic

#### `generateTimeSlots(startTime, endTime, intervalMinutes)`
- **Purpose**: Generate array of time slots
- **Params**: startTime='09:00', endTime='17:00', intervalMinutes=30
- **Logic**: Calculate minutes, loop incrementing by interval
- **Returns**: Array of time strings ['09:00', '09:30', '10:00', ...]

#### `bookAppointment(req, res)`
- **Purpose**: Patient books appointment
- **Params**: Body = {doctor_id, appointment_date, appointment_time, reason}
- **Validation**: Slot availability check
- **DB Ops**: INSERT appointments
- **Called By**: POST /appointments/
- **Issue**: TOCTOU race condition; no locking between availability check and insert

#### `getPatientAppointments(req, res)`
- **Purpose**: Fetch patient's appointments
- **DB Ops**: SELECT appointments LEFT JOIN users, doctor_profiles
- **Returns**: Array of appointments
- **Called By**: GET /appointments/patient

#### `cancelAppointment(req, res)`
- **Purpose**: Patient cancels appointment
- **DB Ops**: UPDATE appointments SET status='cancelled'
- **Called By**: POST /appointments/:id/cancel

#### `getDoctorAppointments(req, res)`
- **Purpose**: Fetch doctor's appointments
- **DB Ops**: SELECT appointments
- **Called By**: GET /appointments/doctor

#### `respondToAppointment(req, res)`
- **Purpose**: Doctor approves/declines appointment
- **Params**: Body = {status: 'confirmed'|'declined'}
- **DB Ops**: UPDATE appointments
- **Called By**: POST /appointments/:id/respond

#### `grantEasyAccess(req, res)`
- **Purpose**: Patient grants doctor 30-minute access to history
- **Logic**: Create access token, set 30m expiry
- **DB Ops**: INSERT patient_access_tokens
- **Returns**: {access_token, expiresAt}
- **Called By**: POST /appointments/:id/easy-access

#### `createEmergencyAccess(req, res)`
- **Purpose**: Doctor requests emergency access (30m)
- **DB Ops**: INSERT patient_access_tokens
- **Returns**: {access_token, expiresAt}
- **Called By**: POST /appointments/emergency/:patientId

#### `getPatientHistoryWithToken(req, res)`
- **Purpose**: Doctor uses token to view patient history
- **Access Control**: Validates patient_access_tokens entry
- **DB Ops**: Same as getPatientHistory (full dossier)
- **Called By**: GET /appointments/patient-history/:token

**Dependencies**: db, crypto (for token generation)
**Called By**: appointmentRoutes.js
**Complexity**: Medium (time slot generation, access token logic)
**Known Issues**:
- TOCTOU race: availability check then insert not atomic
- No pagination for patient history
- No audit logging of token generation/usage
- Access token expiry not enforced in DELETE (no cleanup job)

---

### `backend/controllers/prescriptionController.js`

**Purpose**: Create and retrieve prescriptions.

**Major Functions**:

#### `createPrescription(req, res)`
- **Purpose**: Doctor creates prescription for patient
- **Params**: Body = {patientId, medicineName, dosage, duration, instructions, endDate}
- **Validation**: patientId, medicineName, dosage required
- **DB Ops**: INSERT prescriptions
- **Returns**: Created prescription object
- **Called By**: POST /doctor/prescriptions

#### `getPrescriptionsForPatientByDoctor(req, res)`
- **Purpose**: Doctor retrieves prescriptions they issued for a patient
- **DB Ops**: SELECT prescriptions WHERE doctor_id = ? AND patient_id = ?
- **Returns**: Array of prescriptions
- **Called By**: GET /doctor/prescriptions/patient/:patientId

**Dependencies**: db
**Called By**: doctorRoutes.js
**Complexity**: Low (basic CRUD)
**Known Issues**: None identified

---

### `backend/controllers/ragController.js`

**Purpose**: Bridge Node.js backend to Python RAG service.

**Major Functions**:

#### `patientRagChat(req, res)`
- **Purpose**: Patient asks health question; spawns Python for RAG
- **Params**: Body = {message, top_k}
- **Validation**: Patient authenticated, message not empty, GROQ_API_KEY configured
- **Process**:
  1. Extract patient_id from JWT
  2. Spawn Python: app.py --patient_id X --query Y --top_k K
  3. Pass env: GROQ_API_KEY, DB_PASSWORD, PATIENT_ID
  4. Capture stdout/stderr
  5. Parse JSON result
  6. Return to client
- **Error Handling**: Tries alternate route if primary fails (legacy fallback)
- **Returns**: {success, answer, patient_id, query, model, ...}
- **Called By**: POST /patient/rag/chat
- **Issue**: No timeout; subprocess can hang forever
- **Issue**: Each query = new Python process (startup overhead, no pooling)

**Dependencies**: child_process (spawn), path, dotenv
**Called By**: patientRoutes.js (via router)
**Complexity**: Medium (subprocess management, JSON parsing)
**Known Issues**:
- No connection pooling for Python service
- No subprocess timeout
- No retry logic if subprocess fails
- Credentials passed via env (visible in ps output)

---

## Backend Routes

### `backend/routes/fileRoutes.js`

**Purpose**: Medical file upload pipeline with blockchain anchoring.

**Major Functions**:

#### `ensureRecordsFile()`
- **Purpose**: Create records.json if not exists
- **File Ops**: fs.access (check) → fs.writeFile (create empty array)

#### `readRecords()`
- **Purpose**: Read and parse records.json
- **Returns**: Array of upload records
- **File Ops**: fs.readFile, JSON.parse

#### `writeRecords(records)`
- **Purpose**: Write records array to records.json (prettified)
- **File Ops**: fs.writeFile with JSON.stringify (2-space indent, bigint handler)

#### POST /upload (main endpoint)
- **Purpose**: Medical file upload with hash + blockchain
- **Multer**: upload.single('file')
- **Validation**: 
  - User authenticated
  - File received
  - User role in ['patient', 'doctor']
  - title, type required
  - doctor uploads require patient_id
- **Pipeline**:
  1. Read file from disk
  2. Compute SHA-256 hash
  3. Call addRecordToBlockchain(hash) [async wait]
  4. Append to records.json
  5. Insert medical_records in MySQL
- **Returns**: {success, fileHash, transactionHash, blockNumber, recordId, filePath}
- **Called By**: POST /files/upload
- **Issue**: No transaction; blockchain success but DB fail = inconsistency
- **Issue**: No retry if blockchain fails

**Dependencies**: express, multer, crypto, fs, fs/promises, addRecordToBlockchain, authenticateToken, db
**Complexity**: High (async operations, blockchain integration, file I/O)
**Known Issues**:
- No transactional guarantee between blockchain and MySQL
- No cleanup if DB insert fails after blockchain succeeds
- records.json can grow unbounded
- Blockchain timeout can freeze upload

---

## Frontend Pages

### `src/pages/patient/PatientDashboard.jsx`

**Purpose**: Main patient hub integrating all features (records, appointments, prescriptions, vitals, RAG chat).

**Major Functions**:

#### `PatientAppointmentsWithToken()`
- **Purpose**: Display appointments with easy access token UI
- **State**: grantingId, grantSuccess, grantError
- **Functions**:
  - `handleEasyAccess(appointmentId)`: POST request to create access token
  - `formatDate()`, `formatTime()`: Formatting helpers
- **UI**: Appointment cards with grant button, token display, countdown timer
- **Issue**: Fallback logic tries alternate route if first fails (fragile)

#### `PatientDashboard()` (main component)
- **State**: Multiple useState for activeTab, records, appointments, prescriptions, vitals, errors, loading states
- **API Calls**: Fetch profile, records, appointments, prescriptions, vitals, dashboard overview
- **File Upload**: Inline upload handler with multipart FormData
- **Tabs**: 
  - Medical Records (upload, download, delete, view)
  - Appointments (list, book, easy access)
  - Prescriptions (list)
  - Vital Signs (log, view history)
  - Health Chat (RAG UI component)
- **Features**:
  - Inline edit forms for profile
  - File upload with type/date validation
  - Error modals and success notifications
  - Appointment booking embedded
  - Health chat embedded (PatientHealthChat component)
- **Issue**: Monolithic component (too many concerns; should split)
- **Issue**: Complex state management (many useState calls)

**Dependencies**: React hooks, fetch API, PatientHealthChat, PatientAppointmentBooking
**Complexity**: Very High (many features, complex state, UI logic)
**Known Issues**:
- Component is ~500+ lines; violates single responsibility
- No Redux/context for state management; prop drilling likely
- No optimistic updates; all operations block UI
- File upload error messages could be more specific

---

### `src/pages/auth/Login.jsx`

**Purpose**: User login form with role selection.

**Major Functions**:

#### `Login()` (main component)
- **State**: role, email, password, showPassword, isLoading
- **Functions**:
  - `submit(e)`: POST /auth/login, store tokens, navigate
- **UI**: 
  - Role selector (patient/doctor/admin buttons)
  - Email input
  - Password input (toggleable visibility)
  - Submit button
  - Back button
- **Behavior**: 
  - Stores mv_token and mv_role in localStorage
  - Redirects to appropriate dashboard
- **Issue**: No refresh token storage (lost on page reload)
- **Issue**: No password validation (length, strength)
- **Issue**: No remember me functionality

**Dependencies**: React, react-router-dom, lucide-react, fetch API
**Complexity**: Low (simple form)

---

## Frontend Components

### `src/components/patient/PatientHealthChat.jsx`

**Purpose**: UI for RAG health assistant (chat interface).

**Major Functions**:

#### `normalizeQuery(text)`
- **Purpose**: Normalize query for canned response matching
- **Logic**: Lowercase, trim, remove trailing punctuation
- **Returns**: Normalized string

#### `PatientHealthChat({token})` (main component)
- **State**: messages, input, sending, error, ref
- **Functions**:
  - `sendMessage(e)`: Form submit handler
  - `sendQuery(text)`: Main query sending logic
    - Check canned responses first
    - POST /patient/rag/chat if not canned
    - Parse response and update messages
    - Error handling
- **UI**: 
  - Message list (user/assistant alternation)
  - Input field with send button
  - Loading spinner
  - Error message display
  - Auto-scroll to latest message
- **Features**:
  - Canned response support (2 known queries)
  - Streaming loading state
  - Error recovery UI
- **Issue**: Canned responses hardcoded (should be data-driven)
- **Issue**: No message persistence (lost on page reload)

**Dependencies**: React hooks, fetch API, lucide-react
**Complexity**: Medium (async messaging, state management)
**Known Issues**:
- Canned responses are duplicated (also in Python)
- No rich formatting for medical data
- No source attribution for retrieved chunks

---

## Authentication Middleware

### `backend/middleware/auth.js`

**Purpose**: JWT verification and role-based authorization middleware.

**Major Functions**:

#### `authenticateToken(req, res, next)`
- **Purpose**: Verify Bearer token, extract user
- **Logic**:
  1. Read Authorization header
  2. Split "Bearer {token}"
  3. jwt.verify(token, JWT_SECRET)
  4. Set req.user = decoded payload {id, role}
  5. Call next()
- **Errors**: 401 (no token), 403 (invalid/expired token)
- **Called By**: Used in route middleware chains
- **Issue**: No token refresh on expiry (should suggest refresh)

#### `requireRole(role)`
- **Purpose**: Return middleware that checks role
- **Logic**: 
  1. Check req.user exists
  2. Check req.user.role === required role
  3. Call next() if match, 403 otherwise
- **Errors**: 401 (no user), 403 (role mismatch)
- **Called By**: Chained after authenticateToken

**Dependencies**: jsonwebtoken, dotenv
**Complexity**: Low (simple checks)
**Known Issues**: 
- No token refresh suggestion
- No audit logging of failed auth attempts
- Role is only 1 role per user (no multiple roles)

---

## Database Configuration

### `backend/config/db.js`

**Purpose**: MySQL connection pool setup.

**Functions**:

#### Pool creation
- **Driver**: mysql2/promise
- **Config**: From process.env (DB_HOST, DB_USER, DB_PASS, DB_NAME)
- **Default Pool Size**: 10 connections
- **Timeout**: Default connection timeout
- **Export**: Pool instance (query method available)

**Issues**:
- Credentials logged to console (security risk)
- No timeout configuration (could hang forever)
- No retry logic on connection failure
- Pool size not configurable

---

## Blockchain Integration

### `backend/blockchain/blockchain.js`

**Purpose**: Web3.js integration with Ethereum Sepolia for hash anchoring.

**Major Functions**:

#### `loadAbi()`
- **Purpose**: Load contract ABI from env
- **Logic**: 
  1. Check CONTRACT_ABI_JSON env var (parse)
  2. Fallback to CONTRACT_ABI_PATH (read file)
  3. Throw error if neither available
- **Returns**: Array of contract ABI

#### `initializeBlockchain()`
- **Purpose**: Initialize Web3 connection, account, contract
- **Logic**:
  1. Cache check (reuse if already initialized)
  2. Validate env vars (RPC URL, private key, contract address)
  3. Create Web3 instance
  4. Load ABI
  5. Derive account from private key
  6. Add account to wallet
  7. Instantiate contract
  8. Cache context
- **Returns**: {web3, contract, account}
- **Errors**: Throw if config missing
- **Issue**: Global caching (not thread-safe, but Node is single-threaded)

#### `addRecordToBlockchain(fileHash)`
- **Purpose**: Anchor file hash on Sepolia
- **Logic**:
  1. Initialize blockchain context
  2. Read count() before (audit)
  3. Send transaction: contract.methods.addRecord(fileHash).send({from: account.address})
  4. Wait for receipt
  5. Read count() after (audit)
  6. Return metadata
- **Returns**: {transactionHash, blockNumber, owner, beforeCount, afterCount}
- **Errors**: Throw if transaction fails
- **Issue**: No retry logic; transaction failure aborts upload
- **Issue**: Synchronous wait (can timeout)
- **Issue**: No gas limit configuration

**Dependencies**: web3, fs/promises, https
**Complexity**: Medium (Web3.js interaction, error handling)
**Known Issues**:
- No retry on transaction failure
- TLS verification disabled (NODE_TLS_REJECT_UNAUTHORIZED = 0)
- Private key in process memory (no HSM/vault)
- No gas price estimation

---

## Python Scripts

### `backend/python/app.py`

**Purpose**: CLI entry point for RAG service.

**Major Functions**:

#### `resolve_patient_id(args)`
- **Purpose**: Resolve patient ID from CLI or env
- **Order**: CLI arg > env PATIENT_ID > DEFAULT_PATIENT_ID
- **Returns**: Integer patient_id
- **Errors**: Raise ValueError if not found

#### `validate_config()`
- **Purpose**: Check required config
- **Checks**: GROQ_API_KEY, DB_NAME
- **Returns**: (is_valid, errors list)

#### `get_canned_rag_response(query)`
- **Purpose**: Check if query matches known response
- **Logic**: Normalize query (lowercase, remove punctuation), check dict
- **Returns**: Canned response string or None

#### `main()`
- **Purpose**: Main entry point
- **Logic**:
  1. Parse CLI args (patient_id, query, top_k, force_refresh)
  2. Validate config
  3. Resolve patient_id
  4. Initialize MedicalSummarizer
  5. If query: check canned, then RAG
  6. Else: generate summary
  7. Output JSON to stdout
- **Error Handling**: Try/except, output error JSON

**Dependencies**: sys, json, argparse, medical_summary, os, dotenv
**Complexity**: Medium (CLI parsing, error handling)

---

### `backend/python/medical_summary.py`

**Purpose**: Core RAG and Groq integration.

**Major Class**: `MedicalSummarizer`

**Methods**:

#### `__init__(db_config, groq_api_key, groq_model=None)`
- **Purpose**: Initialize with DB and Groq config
- **Sets**: db_config, groq_api_key, groq_model (default llama-3.3-70b-versatile)

#### `_llm_complete(user_prompt, system_prompt=None)`
- **Purpose**: Call Groq API
- **Logic**:
  1. Build messages list
  2. Prepare payload (model, messages, temperature, max_tokens)
  3. HTTP POST to Groq API (urllib.request)
  4. Parse response JSON
  5. Extract content from choices[0].message.content
  6. Handle SSL errors (retry with unverified context)
- **Returns**: Answer string
- **Error Handling**: Throw RuntimeError on API error

#### `connect_db()`, `close_db()`
- **Purpose**: DB lifecycle
- **Uses**: mysql.connector.connect(), cursor management

#### `ensure_summaries_table()`
- **Purpose**: Create patient_summaries table if not exists
- **Schema**: id, patient_id, summary_text, summary_date, last_record_date, data_included, created_at, indexes

#### `get_last_summary(patient_id)`
- **Purpose**: Fetch most recent summary from DB
- **Returns**: Dict or None

#### `get_new_data_since(patient_id, since_date)`
- **Purpose**: Fetch new records/appointments/prescriptions/vitals since date
- **Returns**: Dict with keys: medical_records, appointments, prescriptions, vital_signs

#### `get_all_patient_data(patient_id)`
- **Purpose**: Fetch all patient data for full summary
- **Returns**: Dict with user_info, medical_records, appointments, prescriptions, vital_signs

#### `get_summary(patient_id, force_refresh)`
- **Purpose**: Generate or update patient summary
- **Logic**:
  1. Get last summary
  2. If force_refresh: fetch all data
  3. Else: fetch new data since last summary
  4. Call Groq to generate summary
  5. Insert/update patient_summaries table
  6. Return result JSON
- **Returns**: {success, patient_id, summary_text, ...}

#### `answer_query_with_rag(patient_id, query, top_k)`
- **Purpose**: RAG Q&A over patient data
- **Logic**:
  1. Fetch patient data
  2. Build context string from records
  3. Call Groq with query + context
  4. Return answer with retrieved_chunks
- **Returns**: {success, patient_id, query, answer, retrieved_chunks, ...}

**Dependencies**: mysql-connector-python, urllib, ssl, json
**Complexity**: High (DB queries, Groq API, text processing)
**Known Issues**:
- No chunking strategy (sends all data to Groq; could hit token limit)
- No caching of summaries
- SSL fallback weakens security
- No handling of large patient histories

---

## Utility Files

### `backend/scripts/seedTestDoctor.js`

**Purpose**: Seed test doctor account for local dev.

**Functions**:

#### `main()` (main function)
- **Logic**:
  1. Load .env
  2. Hash test password
  3. Check if user exists
  4. Upsert user row (role='doctor', is_verified=1)
  5. Upsert doctor_profiles row
  6. Print credentials
- **DB Ops**: SELECT users, INSERT/UPDATE users, INSERT/UPDATE doctor_profiles

---

## Summary: File Relationships

```
Frontend Files:
  App.jsx
    ├─ pages/* (Landing, Login, Register, PatientDashboard, DoctorDashboard, etc.)
    ├─ components/auth/RequireAuth.jsx
    └─ components/layout/AuthNavBar.jsx

Backend Files:
  server.js
    ├─ config/db.js
    ├─ middleware/auth.js
    ├─ routes/* (authRoutes, patientRoutes, doctorRoutes, etc.)
    │   └─ controllers/* (authController, patientController, etc.)
    ├─ blockchain/blockchain.js
    └─ controllers/ragController.js
        └─ spawns: python/app.py
            └─ imports: python/medical_summary.py

File Upload Flow:
  routes/fileRoutes.js
    ├─ controllers/patientController.js (delete function)
    ├─ blockchain/blockchain.js (hash anchoring)
    └─ config/db.js (medical_records insert)

Authentication Flow:
  routes/authRoutes.js
    ├─ controllers/authController.js
    ├─ middleware/auth.js
    └─ config/db.js

RAG Flow:
  routes/patientRoutes.js
    └─ controllers/ragController.js
        └─ spawns: python/app.py
```

This file analysis covers the complete codebase structure. Each file has clear responsibilities, though some (like PatientDashboard.jsx) could be refactored for better modularity.
