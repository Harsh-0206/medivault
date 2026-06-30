# MediVault - Complete Directory Structure

This document maps every folder and file, explaining purpose, dependencies, and relationships.

---

## Root Level

### `package.json`
- **Purpose**: Project metadata and Node.js dependencies.
- **Key Fields**:
  - `name`: "my-react-app" (should be "medivault" for branding)
  - `scripts`: 
    - `dev`: Start Vite dev server
    - `build`: Bundle React + Tailwind
    - `lint`: ESLint checks
    - `seed:test-doctor`: Run test doctor seeding script
    - `seed:demo`: Run demo data seeding
  - `dependencies`: React, Express, mysql2, web3, axios, jwt, argon2, multer, etc.
- **Notes**: No backend start script; users must manually run `node backend/server.js`.

### `vite.config.js`
- **Purpose**: Vite bundler configuration.
- **Includes**: React plugin, Tailwind CSS integration.
- **Output**: Builds to `dist/` (not in repo).

### `eslint.config.js`
- **Purpose**: ESLint linting rules.
- **Includes**: React hooks rules, React refresh rules.

### `.env` (Expected, not in repo)
- **Contains**: `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `JWT_SECRET`, `GROQ_API_KEY`, Blockchain RPC/contract details.
- **Note**: Never commit; rotate secrets if leaked.

### `context.md`
- **Purpose**: High-level project context document (marketing/architecture summary).
- **Used by**: Presentations, reports, new team members.

### `README.md`
- **Purpose**: Generic Vite React template README.
- **Note**: Doesn't describe MediVault; should be updated.

---

## Frontend: `src/`

### Structure Overview
```
src/
├── App.jsx                    # Root routing component
├── main.jsx                   # Entry point (Vite)
├── index.css                  # Global styles
├── App.css                    # App-level styles
├── api/
│   └── axiosClient.js         # Configured axios instance
├── context/
│   └── AuthContext.jsx        # (Unused) Auth state context
├── components/
│   ├── auth/
│   │   └── RequireAuth.jsx    # Route protection wrapper
│   ├── layout/
│   │   └── AuthNavBar.jsx     # Top navigation bar
│   └── patient/
│       └── PatientHealthChat.jsx  # RAG health assistant UI
└── pages/
    ├── Landing.jsx            # Public homepage
    ├── admin/
    │   └── AdminDashboard.jsx # Admin panel (non-functional backend)
    ├── auth/
    │   ├── Login.jsx          # Login form
    │   └── Register.jsx       # Registration form
    ├── doctor/
    │   ├── DoctorDashboard.jsx                    # Doctor main page
    │   ├── DoctorPatientHistoryAccess.jsx         # View patient history
    │   ├── DoctorScheduleManagement.jsx           # Availability settings
    │   └── PrescriptionForm.jsx                   # Create prescription
    └── patient/
        ├── BookingForm.jsx                        # Appointment booking
        ├── PatientAppointmentBooking.jsx          # Appointment flow
        ├── PatientAppointmentsWithToken.jsx       # Appointments + easy access UI
        ├── PatientDashboard.jsx                   # Main patient hub
        ├── PatientPrescriptions.jsx               # View prescriptions
        └── PatientProfile.jsx                     # User profile edit
```

### Key Frontend Files

#### `src/App.jsx`
- **Purpose**: Root routing component; defines all routes.
- **Exports**: Default function `App()` returning Routes.
- **Routes**:
  - `GET /`: Public landing page
  - `GET /login`, `/register`: Public auth
  - `GET /patient-dashboard`: Protected, role='patient'
  - `GET /doctor`: Protected, role='doctor'
  - `GET /admin`: Protected, role='admin'
  - `GET /doctor/patient/:id`: Doctor views patient history
  - `GET /patient/book-appointment`: Patient appointment booking
  - `GET /doctor/schedule`: Doctor schedule management
  - Catch-all `*` redirects to `/`
- **Issues**: Uses `RequireAuth` but role redirect paths don't match actual routes.

#### `src/main.jsx`
- **Purpose**: Vite entry point.
- **Exports**: Renders App in React.StrictMode within BrowserRouter.
- **Issue**: Does NOT wrap App in `AuthProvider`, despite `AuthContext.jsx` existing.

#### `src/api/axiosClient.js`
- **Purpose**: Centralized axios configuration.
- **Base URL**: `http://localhost:4000`
- **Interceptors**:
  - **Request**: Attaches `mv_token` from localStorage as Bearer token.
  - **Response**: Auto-logout on 401 (removes token, redirects to `/login`).
- **Usage**: Imported by components that need API calls (but many use raw `fetch`).

#### `src/context/AuthContext.jsx`
- **Purpose**: (Intended) React Context for auth state management.
- **Exports**: `AuthProvider` (component), `useAuth` (hook).
- **Provides**: `user`, `token`, `login()`, `logout()`, `loading`.
- **Storage**: localStorage keys `accessToken`, `refreshToken`.
- **Issue**: **Not used in main.jsx**; components rely on localStorage directly.

#### `src/components/auth/RequireAuth.jsx`
- **Purpose**: Route protection wrapper; redirects if not authenticated or wrong role.
- **Props**: `role` (string), `children` (React node).
- **Behavior**:
  - Reads `mv_role` from localStorage.
  - Checks if `mv_token` exists and is valid (JWT decode).
  - Redirects to `/doctor-dashboard` or `/admin-dashboard` if role mismatch.
  - **Bug**: Redirect paths don't match App.jsx routes (`/doctor`, `/admin`).

#### `src/components/layout/AuthNavBar.jsx`
- **Purpose**: Top navigation bar (probably not in repo or minimal).
- **Expected Functions**: Show current user, logout button, navigation links.

#### `src/components/patient/PatientHealthChat.jsx`
- **Purpose**: UI for RAG health assistant.
- **Features**:
  - Chat message display (user/assistant alternation).
  - Input field and send button.
  - Auto-scroll to latest message.
  - Canned response matching for known queries.
  - Error display and loading state.
- **API Call**: `POST /patient/rag/chat` with message and top_k.
- **Props**: `token` (JWT string).

#### `src/pages/Landing.jsx`
- **Purpose**: Public homepage; marketing/info.
- **Content**: (Expected) MediVault pitch, feature overview, CTA to register/login.

#### `src/pages/auth/Login.jsx`
- **Purpose**: User login form.
- **Features**:
  - Role selection (patient/doctor/admin).
  - Email + password fields.
  - Remember me / show password options.
  - Handles login submission.
- **API Call**: `POST /auth/login` with email, password, role.
- **Storage**: Saves `mv_token` and `mv_role` to localStorage.
- **Navigation**: Redirects to appropriate dashboard on success.

#### `src/pages/auth/Register.jsx`
- **Purpose**: Registration form for patients/doctors.
- **Expected**: Role-based form (patient simpler, doctor includes document upload).
- **API Call**: `POST /auth/register` or `POST /auth/register-doctor`.

#### `src/pages/patient/PatientDashboard.jsx`
- **Purpose**: Main patient hub; integrates all patient features.
- **Tabs/Sections**:
  - Medical records (display, upload, download, delete)
  - Appointments (view, book, easy access)
  - Prescriptions
  - Vital signs
  - Health chat (RAG)
- **API Calls**: Multiple GET/POST to patient endpoints.
- **Features**:
  - Inline file upload with progress feedback.
  - Record metadata display (date, type, doctor name).
  - Appointment status colors.
  - Easy access token generation and display.
  - Token expiry countdown.

#### `src/pages/patient/PatientAppointmentBooking.jsx`
- **Purpose**: Appointment booking flow.
- **Steps**:
  1. Search/select doctor
  2. Pick date
  3. View available slots
  4. Select time and reason
  5. Submit booking
- **API Calls**: Doctor search, slots availability, book appointment.

#### `src/pages/doctor/DoctorDashboard.jsx`
- **Purpose**: Doctor main hub.
- **Sections**:
  - Today's appointments
  - Recent prescriptions issued
  - Patient search
  - Quick actions
- **API Calls**: Fetch today's appointments, recent prescriptions.

#### `src/pages/doctor/DoctorScheduleManagement.jsx`
- **Purpose**: Doctor sets availability (days, hours, slot duration).
- **Features**:
  - Day-of-week toggle (Mon-Sun).
  - Start/end time pickers.
  - Slot duration selector.
  - Save/update.
- **API Calls**: GET/PUT `/doctor/availability`.

#### `src/pages/doctor/PrescriptionForm.jsx`
- **Purpose**: Doctor creates prescription for a patient.
- **Fields**: Patient ID, medicine name, dosage, duration, instructions, end date.
- **API Call**: `POST /doctor/prescriptions`.

#### `src/pages/admin/AdminDashboard.jsx`
- **Purpose**: (Non-functional) Admin panel for doctor approval, platform stats.
- **Expected Features**: Approve pending doctors, view all users, platform metrics.
- **Issue**: Frontend exists but backend routes not implemented.

---

## Backend: `backend/`

### Structure Overview
```
backend/
├── server.js                  # Express app entry point
├── config/
│   └── db.js                  # MySQL connection pool
├── middleware/
│   └── auth.js                # JWT + role-based auth
├── controllers/               # Business logic
│   ├── authController.js      # Register, login, refresh
│   ├── patientController.js   # Patient profile, records, etc.
│   ├── doctorController.js    # Doctor dashboard, patient search, history
│   ├── appointmentController.js  # Appointment booking, availability
│   ├── prescriptionController.js # Create/view prescriptions
│   ├── ragController.js       # RAG chat spawning Python
│   └── apiTestController.js   # Debug endpoints
├── routes/                    # Route handlers
│   ├── authRoutes.js          # /auth/*
│   ├── patientRoutes.js       # /patient/*
│   ├── doctorRoutes.js        # /doctor/*
│   ├── appointments.js        # /appointments/*
│   ├── doctors.js             # /doctors/search
│   ├── fileRoutes.js          # /files/upload, records
│   ├── apiAuthRoutes.js       # /api/auth/* (alt auth)
│   └── apiTestRoutes.js       # /api/* (debug)
├── middleware/
│   └── auth.js                # authenticateToken, requireRole
├── blockchain/
│   └── blockchain.js          # Web3.js integration, Sepolia transactions
├── python/
│   ├── app.py                 # RAG entry point
│   ├── medical_summary.py     # Groq + DB queries
│   ├── requirements.txt       # Python dependencies
│   └── requirments.txt        # (Typo duplicate)
├── uploads/                   # Created at runtime, served statically
│   ├── documents/             # Doctor verification docs (from registration)
│   └── medical-records/       # Patient medical files
├── scripts/
│   ├── seedTestDoctor.js      # Create test doctor account
│   ├── seedDemoData.js        # Populate demo data
│   ├── seedDoctorAishaAvailability.js  # Setup specific doctor
│   └── seed_doctor8_patient1_access.py # Python seeding example
├── .env                       # Environment variables (expected, not in repo)
└── records.json               # Created at runtime, append-only upload log
```

### Backend Core Files

#### `backend/server.js`
- **Purpose**: Express app assembly; routes, middleware, startup.
- **Key Middleware**:
  - CORS (fixed origin `http://localhost:5173`, credentials enabled)
  - JSON body parser (10MB limit)
  - Cookie parser
  - Static file serving at `/uploads`
- **Routes Mounted**:
  - `/auth` → authRoutes
  - `/patient` → patientRoutes
  - `/doctor` → doctorRoutes
  - `/appointments` → appointmentRoutes
  - `/doctors` → doctorsSearchRoutes
  - `/files` → fileRoutes
  - `/api/auth` → apiAuthRoutes
  - `/api` → apiTestRoutes
- **Startup**: Connects to MySQL on load; logs connection status.
- **Issues**:
  - TLS verification disabled globally.
  - Admin routes NOT mounted despite admin dashboard existing.
  - `app.get('db')` not set (used in `/patient/search` route which will error).

#### `backend/config/db.js`
- **Purpose**: MySQL connection pool setup.
- **Uses**: `mysql2/promise` with connection pooling.
- **Configuration**: From `process.env`: DB_HOST, DB_USER, DB_PASS, DB_NAME.
- **Exports**: Pool instance.
- **Issue**: Logs credentials to console (security risk in production).

#### `backend/middleware/auth.js`
- **Purpose**: JWT authentication and role-based authorization.
- **Exports**:
  - `authenticateToken(req, res, next)`: Validates Bearer token, extracts user data.
  - `requireRole(role)`: Returns middleware that checks `req.user.role`.
- **Behavior**:
  - Reads `Authorization: Bearer <token>` header.
  - Verifies JWT signature against `JWT_SECRET`.
  - Sets `req.user = { id, role }` on success.
  - Returns 401/403 errors if token missing/invalid/role mismatch.

#### `backend/controllers/authController.js`
- **Purpose**: Authentication endpoints logic.
- **Exports**:
  - `registerPatient(req, res)`: Create patient account.
  - `registerDoctor(req, res)`: Create doctor account (requires document, is_verified=0).
  - `login(req, res)`: Issue JWT + refresh token.
  - `refresh(req, res)`: Issue new JWT from refresh token.
- **Key Details**:
  - Password hashing: Argon2 for patient/doctor registration, bcrypt for refresh verification.
  - Refresh tokens: Stored as Argon2 hashes in `refresh_tokens` table.
  - Access token expiry: 15 minutes.
  - Doctor verification: Returns 403 if `is_verified = 0`.

#### `backend/controllers/patientController.js`
- **Purpose**: Patient profile, records, appointments, vital signs.
- **Exports**:
  - `getPatientProfile(req, res)`: Fetch patient info.
  - `updatePatientProfile(req, res)`: Update patient fields.
  - `getMedicalRecords(req, res)`: List patient's medical records.
  - `deleteMedicalRecord(req, res)`: Delete record and cleanup file.
  - `getAppointments(req, res)`: List patient's appointments.
  - `bookAppointment(req, res)`: Create appointment.
  - `cancelAppointment(req, res)`: Cancel appointment.
  - `getPrescriptions(req, res)`: List patient's prescriptions.
  - `getVitalSigns(req, res)`: List patient's vital signs.
  - `addVitalSigns(req, res)`: Log new vital signs.
  - `getDashboardOverview(req, res)`: Summary for dashboard.
- **Database Tables Used**: users, medical_records, appointments, prescriptions, vital_signs, doctor_profiles.

#### `backend/controllers/doctorController.js`
- **Purpose**: Doctor dashboard, patient search, patient history.
- **Exports**:
  - `getDoctorDashboard(req, res)`: Today's appointments, recent prescriptions, patient count.
  - `searchPatient(req, res)`: Search by ID/name/email/phone.
  - `getPatientHistory(req, res)`: Full patient record (profile, vitals, records, prescriptions, appointments).
- **Access Control**: Enforces `patient_access_tokens` validity (easy access or emergency access).
- **Used by**: Doctor views patient history after patient grants access.

#### `backend/controllers/appointmentController.js`
- **Purpose**: Appointment booking, slots, availability, access tokens.
- **Exports**:
  - `bookAppointment(req, res)`: Patient books appointment.
  - `getPatientAppointments(req, res)`: Fetch patient's appointments.
  - `cancelAppointment(req, res)`: Cancel appointment.
  - `getDoctorAvailability(req, res)`: Get doctor's availability settings.
  - `updateDoctorAvailability(req, res)`: Doctor updates availability.
  - `getAvailableSlots(req, res)`: Get available time slots for a specific doctor and date.
  - `getDoctorAppointments(req, res)`: Doctor's appointments.
  - `respondToAppointment(req, res)`: Doctor approves/declines appointment.
  - `grantEasyAccess(req, res)`: Patient grants 30m access token to doctor.
  - `createEmergencyAccess(req, res)`: Doctor requests emergency access.
  - `getPatientHistoryWithToken(req, res)`: Doctor retrieves patient history using token.
- **Database Tables**: appointments, doctor_profiles, patient_access_tokens.
- **Slot Generation**: Calculates available times from doctor's availability + booked appointments.

#### `backend/controllers/prescriptionController.js`
- **Purpose**: Create and view prescriptions.
- **Exports**:
  - `createPrescription(req, res)`: Doctor creates prescription.
  - `getPrescriptionsForPatientByDoctor(req, res)`: Doctor views prescriptions they issued for a patient.
- **Database Table**: prescriptions (patient_id, doctor_id, medicine_name, dosage, duration, instructions, prescribed_date, end_date).

#### `backend/controllers/ragController.js`
- **Purpose**: Bridge between Node and Python RAG service.
- **Exports**:
  - `patientRagChat(req, res)`: Spawn Python subprocess, stream result.
- **Process**:
  1. Authenticate patient JWT.
  2. Extract patient_id from JWT.
  3. Spawn Python: `python app.py --patient_id X --query Y --top_k 5`.
  4. Pass GROQ_API_KEY and DB credentials via child env.
  5. Capture stdout/stderr.
  6. Parse JSON result, return to client.
- **Error Handling**: Tries alternate route if first fails (legacy fallback).
- **Limitations**: No connection pooling; each query has Python startup overhead.

#### `backend/controllers/apiTestController.js`
- **Purpose**: Debug/test endpoints.
- **Exports**:
  - `apiHealth(_req, res)`: Returns `{ success: true, message: "API working" }`.
  - `getAllUsers(req, res)`: Returns all users (no auth; security issue).

---

### Backend Routes

#### `backend/routes/authRoutes.js`
- **Mounted at**: `/auth`
- **Routes**:
  - `POST /register` → `registerPatient`
  - `POST /register-doctor` → `registerDoctor` (with multer document upload)
  - `POST /login` → `login`
  - `POST /refresh` → `refresh`

#### `backend/routes/patientRoutes.js`
- **Mounted at**: `/patient`
- **Middleware**: `authenticateToken`, `requireRole('patient')`
- **Routes**:
  - `GET /profile` → `getPatientProfile`
  - `PUT /profile` → `updatePatientProfile`
  - `GET /medical-records` → `getMedicalRecords`
  - `DELETE /medical-records/:recordId` → `deleteMedicalRecord`
  - `GET /appointments` → `getAppointments`
  - `POST /appointments` → `bookAppointment`
  - `PUT /appointments/:appointmentId/cancel` → `cancelAppointment`
  - `POST /appointments/:appointmentId/easy-access` → `grantEasyAccess`
  - `GET /prescriptions` → `getPrescriptions`
  - `GET /vital-signs` → `getVitalSigns`
  - `POST /vital-signs` → `addVitalSigns`
  - `GET /dashboard` → `getDashboardOverview`
  - `POST /rag/chat` → `patientRagChat`
  - `GET /search` → Doctor search (attempts to use `req.app.get('db')` which is not set; will error).

#### `backend/routes/doctorRoutes.js`
- **Mounted at**: `/doctor`
- **Middleware**: `authenticateToken`, `requireRole('doctor')` for most routes
- **Routes**:
  - `GET /dashboard` → `getDoctorDashboard`
  - `GET /appointments` → `getDoctorAppointments`
  - `GET /search` → `searchPatient` (search by name/ID)
  - `GET /patient/:id/history` → `getPatientHistory` (with access token validation)
  - `POST /prescriptions` → `createPrescription`
  - `GET /prescriptions/patient/:patientId` → `getPrescriptionsForPatientByDoctor`
  - `GET /availability` → `getDoctorAvailability`
  - `PUT /availability` → `updateDoctorAvailability`

#### `backend/routes/appointments.js`
- **Mounted at**: `/appointments`
- **Routes**:
  - Patient routes (require patient role):
    - `POST /` → `bookAppointment`
    - `GET /patient` → `getPatientAppointments`
    - `POST /:id/cancel` → `cancelAppointment`
  - Doctor routes (require doctor role):
    - `GET /doctor/availability` → `getDoctorAvailability`
    - `PUT /doctor/availability` → `updateDoctorAvailability`
    - `GET /doctor` → `getDoctorAppointments`
    - `POST /:id/respond` → `respondToAppointment`
  - Doctor access routes:
    - `GET /patient-history/:token` → `getPatientHistoryWithToken`
    - `POST /:id/easy-access` → `grantEasyAccess`
    - `POST /emergency/:patientId` → `createEmergencyAccess`
  - Shared (both patient/doctor):
    - `GET /doctor/:doctorId/slots` → `getAvailableSlots`

#### `backend/routes/doctors.js`
- **Mounted at**: `/doctors`
- **Routes**:
  - `GET /search` → Search verified doctors by name/specialty/degree/bio.
  - Requires auth; used by patients finding doctors.

#### `backend/routes/fileRoutes.js`
- **Mounted at**: `/files`
- **Routes**:
  - `POST /upload` → Medical file upload (patient/doctor), hash → blockchain → MySQL.
  - `GET /records` → Fetch records.json content (append-only log).
- **Pipeline**:
  1. Authenticate JWT.
  2. Multer receive file.
  3. Compute SHA-256 hash.
  4. Call `addRecordToBlockchain(hash)`.
  5. Append to records.json.
  6. Insert medical_records in MySQL.

#### `backend/routes/apiAuthRoutes.js`
- **Mounted at**: `/api/auth`
- **Routes**:
  - `POST /register` → `register` (alternate, uses bcrypt)
  - `POST /login` → `login` (alternate, same bcrypt)
- **Purpose**: Secondary auth endpoints (legacy/API client support).

#### `backend/routes/apiTestRoutes.js`
- **Mounted at**: `/api`
- **Routes**:
  - `GET /test` → `apiHealth`
  - `GET /users` → `getAllUsers` (no auth; security issue)

---

### Backend Blockchain Integration

#### `backend/blockchain/blockchain.js`
- **Purpose**: Web3.js integration with Ethereum Sepolia.
- **Exports**:
  - `addRecordToBlockchain(fileHash)`: Main function called during file upload.
- **Process**:
  1. Initialize Web3 connection to Sepolia RPC.
  2. Load contract ABI from `CONTRACT_ABI_JSON` (env var) or file.
  3. Create account from `PRIVATE_KEY`.
  4. Call contract method `addRecord(fileHash)`.
  5. Wait for receipt (includes transactionHash, blockNumber).
  6. Return metadata: { transactionHash, blockNumber, owner, beforeCount, afterCount }.
- **Configuration**:
  - `SEPOLIA_RPC_URL`: Sepolia RPC endpoint.
  - `PRIVATE_KEY`: Private key of signing account (should be funded with Sepolia ETH).
  - `CONTRACT_ADDRESS`: Deployed contract address.
  - `CONTRACT_ABI_JSON` or `CONTRACT_ABI_PATH`: Contract ABI.
- **Assumptions**: Contract has `addRecord(bytes32|string hash)` and `count()` methods.
- **Issues**: 
  - No retry logic if transaction fails.
  - No async/background processing; upload waits for full confirmation.
  - Timeouts possible if Sepolia is congested.

---

### Backend Python Service

#### `backend/python/app.py`
- **Purpose**: RAG entry point; CLI for medical summaries and Q&A.
- **Invocation**: Called by Node via `spawn()` in ragController.
- **CLI Arguments**:
  - `--patient_id`: Patient ID (required or from env).
  - `--query`: Question for RAG mode (optional).
  - `--top_k`: Number of chunks to retrieve (default 5).
  - `--force_refresh`: Force full refresh (0/1).
- **Modes**:
  - **Summary Mode** (no `--query`): Generate/update patient summary from recent data.
  - **RAG Mode** (with `--query`): Retrieve relevant data, query Groq, return answer.
- **Output**: JSON to stdout (captured by Node).
- **Configuration**:
  - Loads `.env` from `backend/` and optional `backend/utils/.env`.
  - `GROQ_API_KEY`, `GROQ_MODEL`, `DB_*` from env.
- **Canned Responses**: Hard-coded answers for known queries (e.g., blood sugar safety, blood pressure control).

#### `backend/python/medical_summary.py`
- **Purpose**: MedicalSummarizer class; core RAG + Groq logic.
- **Class**: `MedicalSummarizer(db_config, groq_api_key, groq_model=None)`
- **Methods**:
  - `connect_db()`: Establish MySQL connection.
  - `close_db()`: Close connection.
  - `ensure_summaries_table()`: Create `patient_summaries` table if not exists.
  - `get_last_summary(patient_id)`: Fetch most recent summary from DB.
  - `get_new_data_since(patient_id, since_date)`: Fetch new records/appointments/prescriptions/vitals since date.
  - `get_all_patient_data(patient_id)`: Fetch all patient data for full summary.
  - `_llm_complete(user_prompt, system_prompt=None)`: Call Groq API via HTTP (urllib).
  - `get_summary(patient_id, force_refresh)`: Generate/update summary.
  - `answer_query_with_rag(patient_id, query, top_k)`: RAG Q&A.
- **Groq Integration**: 
  - URL: `https://api.groq.com/openai/v1/chat/completions`
  - Model: `llama-3.3-70b-versatile` (default, overridable).
  - Temperature: 0.2 (low creativity).
  - Max tokens: 2048.
- **SSL Handling**: Falls back to unverified SSL for dev environments.
- **Database Queries**: Retrieves from `users`, `medical_records`, `appointments`, `prescriptions`, `vital_signs` tables.

#### `backend/python/requirements.txt`
- **Expected Content**: 
  ```
  mysql-connector-python
  python-dotenv
  ```
- **Note**: Not auto-installed; manual setup required. Groq API uses urllib (built-in).

---

### Backend Scripts

#### `backend/scripts/seedTestDoctor.js`
- **Purpose**: Create/update a test doctor account for local development.
- **Execution**: `npm run seed:test-doctor`
- **Credentials**:
  - Email: `abc123@gmail.com`
  - Password: `1234`
  - Name: "Test Doctor (seed)"
- **Operations**:
  - Upsert user row with role='doctor', is_verified=1.
  - Upsert doctor_profiles row with default values (specialty, availability, etc.).

#### `backend/scripts/seedDemoData.js`
- **Purpose**: Populate demo data for testing.
- **Execution**: `npm run seed:demo`
- **Expected**: Creates sample patients, doctors, appointments, prescriptions.

#### `backend/scripts/seedDoctorAishaAvailability.js`
- **Purpose**: Setup availability for a specific doctor (Aisha).
- **Expected**: Defines days/hours available for appointments.

#### `backend/scripts/seed_doctor8_patient1_access.py`
- **Purpose**: Python-based seeding (alternate).
- **Example**: Create access token for doctor 8 to view patient 1.

---

### Backend Uploads & Records

#### `backend/uploads/`
- **Purpose**: Local file storage for uploaded medical documents.
- **Subdirs**:
  - `documents/`: Doctor registration verification files.
  - `medical-records/`: Patient medical file uploads.
- **Served**: Statically at `http://localhost:4000/uploads/`.
- **Cleanup**: Not automated; manual or via delete API.
- **Scaling Issue**: Single server storage; no cloud backup or replication.

#### `backend/records.json`
- **Purpose**: Append-only audit log of all file uploads.
- **Structure**: JSON array of upload records, each with:
  - `id`: Unique record ID.
  - `userId`: User who uploaded.
  - `role`: User's role (patient/doctor).
  - `title`, `type`, `fileHash`: Metadata.
  - `transactionHash`, `blockNumber`: Blockchain metadata.
  - `timestamp`, `expiresAt`: Timing.
- **Usage**: Quick reference for upload history without querying DB.
- **Issue**: Not synchronized with file deletes; can grow unbounded.

---

## Database Schema (Inferred)

While no migrations are tracked in the repo, the code implies these tables:

| Table | Columns | Purpose |
|-------|---------|---------|
| `users` | id, name, email, password_hash, role, is_verified, date_of_birth, blood_group, phone, address, emergency_contact, reg_number (doctor), degree (doctor), document_path (doctor) | All users (patient/doctor/admin) |
| `doctor_profiles` | user_id, specialty, qualification, experience_years, consultation_fee, location, bio, available_days, available_time_start, available_time_end, slot_duration, accepts_new_patients, online_consultation | Extended doctor info |
| `medical_records` | id, patient_id, doctor_id, title, type, record_date, file_path, notes, uploaded_by | Patient medical files |
| `appointments` | id, patient_id, doctor_id, appointment_date, appointment_time, reason, status, token | Appointments |
| `prescriptions` | id, patient_id, doctor_id, medicine_name, dosage, duration, instructions, prescribed_date, end_date | Prescriptions issued by doctors |
| `vital_signs` | id, patient_id, heart_rate, blood_pressure, glucose, temperature, weight, recorded_date | Time-series vital data |
| `refresh_tokens` | id, user_id, token_hash | Stored refresh tokens (Argon2 hashes) |
| `patient_access_tokens` | id, patient_id, doctor_id, access_token, expires_at, is_active, created_at | Time-boxed doctor access grants |
| `patient_summaries` | id, patient_id, summary_text, summary_date, last_record_date, data_included, created_at | Cached AI summaries (created by Python) |

---

## Public Assets

### `public/`
- **Purpose**: Static assets served by Vite dev server and bundled into `dist/`.
- **Expected Content**: Favicon, index.html (auto-generated by Vite).

### `index.html`
- **Purpose**: HTML entry point for Vite.
- **Root Element**: `<div id="root"></div>`
- **Scripts**: Auto-injected by Vite build.

---

## Summary of Interdependencies

```
Frontend (React)
├── Calls API (axios, fetch) → Backend Express
│   ├── `/auth/*` - Authentication
│   ├── `/patient/*` - Patient CRUD
│   ├── `/doctor/*` - Doctor CRUD
│   ├── `/appointments/*` - Appointment CRUD
│   ├── `/files/upload` - File upload + blockchain
│   └── `/patient/rag/chat` - RAG Q&A
│
└── Stores in localStorage
    ├── `mv_token` - JWT access token
    └── `mv_role` - User role

Backend Express
├── Database (MySQL)
│   └── Connection pool in config/db.js
├── Blockchain (Web3.js)
│   └── Sepolia RPC for hash anchoring
└── Python subprocess
    └── RAG service (Groq + DB queries)

Authentication Flow
├── JWT (access token: 15m expiry)
├── Refresh token (persistent in DB)
├── Role-based middleware
└── localStorage (frontend state)

File Upload Flow
├── Multer (multipart) → SHA-256 hash
├── Web3.js → Sepolia smart contract
├── MySQL (medical_records table)
├── records.json (audit log)
└── `/uploads/` (static file serve)
```

---

This directory structure defines a modular, role-based health record system. Key strengths are clear separation of concerns (controllers, routes, middleware) and diverse tech integration (DB, blockchain, Python AI). Weaknesses include incomplete admin features, environmental assumptions (database schema not versioned), and scalability bottlenecks (local file storage, Python subprocess overhead).
