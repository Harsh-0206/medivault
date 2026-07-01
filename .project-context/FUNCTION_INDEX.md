# MediVault - Function Index

Searchable index of every function in the codebase.

---

## Backend Functions (Node.js)

### Authentication Functions

| Function | File | Parameters | Returns | Purpose | Callers | Callees |
|----------|------|-----------|---------|---------|---------|---------|
| generateAccessToken | authController.js | user: {id, role} | string (JWT) | Create 15m access token | login, refresh | jwt.sign |
| generateRefreshToken | authController.js | None | string (hex) | Generate random refresh token | login | crypto.randomBytes |
| hashToken | authController.js | token: string | Promise<string> | Argon2 hash token | login | argon2.hash |
| registerPatient | authController.js | req, res | JSON response | Create patient account | POST /auth/register | db.query, argon2.hash |
| registerDoctor | authController.js | req, res | JSON response | Create doctor account (unverified) | POST /auth/register-doctor | db.query, argon2.hash |
| login | authController.js | req, res | JSON {token, refreshToken, role} | Authenticate user, issue tokens | POST /auth/login | db.query, argon2.verify, generateAccessToken, hashToken |
| refresh | authController.js | req, res | JSON {token, refreshToken} | Issue new access token | POST /auth/refresh | db.query, argon2.verify, generateAccessToken |
| authenticateToken | auth.js (middleware) | req, res, next | void | Verify JWT, set req.user | Used in route chains | jwt.verify |
| requireRole | auth.js (middleware) | role: string | function | Check user role | Used in route chains | authenticateToken |

### Patient Controller Functions

| Function | File | Parameters | Returns | Purpose | Callers |
|----------|------|-----------|---------|---------|---------|
| getPatientProfile | patientController.js | req, res | JSON {patient} | Fetch patient profile | GET /patient/profile |
| updatePatientProfile | patientController.js | req, res | JSON {message} | Update patient fields | PUT /patient/profile |
| getMedicalRecords | patientController.js | req, res | JSON {records} | List patient's records | GET /patient/medical-records |
| deleteMedicalRecord | patientController.js | req, res | JSON {message} | Delete record and file | DELETE /patient/medical-records/:recordId |
| getAppointments | patientController.js | req, res | JSON {appointments} | List patient's appointments | GET /patient/appointments |
| bookAppointment | patientController.js | req, res | JSON {message, appointment} | Create appointment | POST /patient/appointments |
| cancelAppointment | patientController.js | req, res | JSON {message} | Cancel appointment | PUT /patient/appointments/:appointmentId/cancel |
| getPrescriptions | patientController.js | req, res | JSON {prescriptions} | List prescriptions | GET /patient/prescriptions |
| getVitalSigns | patientController.js | req, res | JSON {vital_signs} | List vital signs | GET /patient/vital-signs |
| addVitalSigns | patientController.js | req, res | JSON {message} | Log new vital signs | POST /patient/vital-signs |
| getDashboardOverview | patientController.js | req, res | JSON {appointments, prescriptions, ...} | Dashboard summary | GET /patient/dashboard |

### Doctor Controller Functions

| Function | File | Parameters | Returns | Purpose | Callers |
|----------|------|-----------|---------|---------|---------|
| getDoctorDashboard | doctorController.js | req, res | JSON {todayAppointments, totalPatients, recentPrescriptions} | Doctor dashboard overview | GET /doctor/dashboard |
| searchPatient | doctorController.js | req, res | JSON {patients} | Search patients by name/ID/email | GET /doctor/search |
| getPatientHistory | doctorController.js | req, res | JSON {profile, vitals, records, prescriptions, appointments} | Full patient dossier | GET /doctor/patient/:id/history |

### Appointment Controller Functions

| Function | File | Parameters | Returns | Purpose | Callers |
|----------|------|-----------|---------|---------|---------|
| getDoctorAvailability | appointmentController.js | req, res | JSON {availability: {day: {enabled, start, end}}} | Fetch doctor's availability settings | GET /appointments/doctor/availability |
| updateDoctorAvailability | appointmentController.js | req, res | JSON {message} | Update doctor's availability | PUT /appointments/doctor/availability |
| getAvailableSlots | appointmentController.js | req, res | JSON {date, slots: [{time, available}]} | Get available time slots | GET /appointments/doctor/:doctorId/slots |
| generateTimeSlots | appointmentController.js | startTime, endTime, intervalMinutes | Array<string> | Generate time slot array | getAvailableSlots (helper) |
| bookAppointment | appointmentController.js | req, res | JSON {message, appointment} | Create appointment | POST /appointments/ |
| getPatientAppointments | appointmentController.js | req, res | JSON {appointments} | List patient's appointments | GET /appointments/patient |
| cancelAppointment | appointmentController.js | req, res | JSON {message} | Cancel appointment | POST /appointments/:id/cancel |
| getDoctorAppointments | appointmentController.js | req, res | JSON {appointments} | List doctor's appointments | GET /appointments/doctor |
| respondToAppointment | appointmentController.js | req, res | JSON {message} | Doctor approves/declines appointment | POST /appointments/:id/respond |
| grantEasyAccess | appointmentController.js | req, res | JSON {access_token, expiresAt} | Create 30m access token | POST /appointments/:id/easy-access |
| createEmergencyAccess | appointmentController.js | req, res | JSON {access_token, expiresAt} | Doctor requests emergency access | POST /appointments/emergency/:patientId |
| getPatientHistoryWithToken | appointmentController.js | req, res | JSON {full patient data} | Retrieve patient history using token | GET /appointments/patient-history/:token |

### Prescription Controller Functions

| Function | File | Parameters | Returns | Purpose | Callers |
|----------|------|-----------|---------|---------|---------|
| createPrescription | prescriptionController.js | req, res | JSON {message, prescription} | Doctor creates prescription | POST /doctor/prescriptions |
| getPrescriptionsForPatientByDoctor | prescriptionController.js | req, res | JSON {prescriptions} | Doctor views own prescriptions for patient | GET /doctor/prescriptions/patient/:patientId |

### RAG Controller Functions

| Function | File | Parameters | Returns | Purpose | Callers |
|----------|------|-----------|---------|---------|---------|
| patientRagChat | ragController.js | req, res | JSON {success, answer, patient_id, query, model, ...} | Spawn Python RAG process | POST /patient/rag/chat |

### File Upload Functions

| Function | File | Parameters | Returns | Purpose | Callers |
|----------|------|-----------|---------|---------|---------|
| ensureRecordsFile | fileRoutes.js | None | Promise | Create records.json if missing | readRecords (helper) |
| readRecords | fileRoutes.js | None | Promise<Array> | Read records.json | POST /files/upload (helper) |
| writeRecords | fileRoutes.js | records: Array | Promise | Write records.json | POST /files/upload (helper) |
| (POST /files/upload handler) | fileRoutes.js | req, res | JSON {success, fileHash, transactionHash, blockNumber} | Upload medical file + blockchain anchor | POST /files/upload |

### Blockchain Functions

| Function | File | Parameters | Returns | Purpose | Callers |
|----------|------|-----------|---------|---------|---------|
| loadAbi | blockchain.js | None | Array (ABI JSON) | Load contract ABI from env | initializeBlockchain |
| initializeBlockchain | blockchain.js | None | {web3, contract, account} | Initialize Web3 connection | addRecordToBlockchain |
| addRecordToBlockchain | blockchain.js | fileHash: string | Promise<{transactionHash, blockNumber, owner, beforeCount, afterCount}> | Anchor hash on Sepolia | fileRoutes.js POST /upload |

### API Test Functions

| Function | File | Parameters | Returns | Purpose | Callers |
|----------|------|-----------|---------|---------|---------|
| apiHealth | apiTestController.js | req, res | JSON {success: true, message: "API working"} | Health check endpoint | GET /api/test |
| getAllUsers | apiTestController.js | req, res | JSON {success: true, users: []} | Debug endpoint (no auth) | GET /api/users |

### Middleware Helpers

| Function | File | Parameters | Returns | Purpose | Callers |
|----------|------|-----------|---------|---------|---------|
| runUpload | fileRoutes.js | req, res, next | void | Multer error wrapper | fileRoutes POST /upload |

---

## Frontend Functions (React)

### Login Component

| Function | File | Parameters | Returns | Purpose |
|----------|------|-----------|---------|---------|
| submit | Login.jsx | e: React.FormEvent | Promise | Submit login form, store tokens, navigate |

### Patient Dashboard Component

| Function | File | Parameters | Returns | Purpose |
|----------|------|-----------|---------|---------|
| handleEasyAccess | PatientDashboard.jsx | appointmentId: number | Promise | Generate easy access token |
| formatDate | PatientDashboard.jsx | dateString: string | string | Format date for display |
| formatTime | PatientDashboard.jsx | timeString: string | string | Format time for display |
| formatDateTime | PatientDashboard.jsx | value: any | string | Format datetime for display |
| getStatusColor | PatientDashboard.jsx | status: string | string | Map status to CSS class |

### Patient Health Chat Component

| Function | File | Parameters | Returns | Purpose |
|----------|------|-----------|---------|---------|
| normalizeQuery | PatientHealthChat.jsx | text: string | string | Normalize query for canned matching |
| sendMessage | PatientHealthChat.jsx | e: React.FormEvent | Promise | Form submit handler |
| sendQuery | PatientHealthChat.jsx | text: string | Promise | Send query to RAG endpoint |

### API Client

| Function | File | Parameters | Returns | Purpose |
|----------|------|-----------|---------|---------|
| api.get | axiosClient.js | endpoint: string, token: string | Promise | GET request with auth |
| api.post | axiosClient.js | endpoint: string, data: any, token: string | Promise | POST request with auth |
| api.put | axiosClient.js | endpoint: string, data: any, token: string | Promise | PUT request with auth |
| api.delete | axiosClient.js | endpoint: string, token: string | Promise | DELETE request with auth |
| api.uploadFile | axiosClient.js | endpoint: string, formData: FormData, token: string | Promise | File upload request |

---

## Python Functions

### Main Entry Point

| Function | File | Parameters | Returns | Purpose | Callers |
|----------|------|-----------|---------|---------|---------|
| resolve_patient_id | app.py | args: argparse.Namespace | int | Resolve patient ID from CLI/env | main |
| validate_config | app.py | None | (bool, list) | Check required config | main |
| get_canned_rag_response | app.py | query: string | string or None | Check canned response dict | main |
| main | app.py | None | None | CLI entry point | app.py (if __name__ == '__main__') |

### Medical Summarizer Class

| Function | File | Parameters | Returns | Purpose |
|----------|------|-----------|---------|---------|
| __init__ | medical_summary.py | db_config, groq_api_key, groq_model=None | None | Initialize class |
| connect_db | medical_summary.py | None | None | Establish MySQL connection |
| close_db | medical_summary.py | None | None | Close MySQL connection |
| ensure_summaries_table | medical_summary.py | None | None | Create patient_summaries table |
| get_last_summary | medical_summary.py | patient_id: int | dict or None | Fetch most recent summary |
| get_new_data_since | medical_summary.py | patient_id: int, since_date: string | dict | Fetch new data since date |
| get_all_patient_data | medical_summary.py | patient_id: int | dict | Fetch all patient data |
| _llm_complete | medical_summary.py | user_prompt: string, system_prompt: string or None | string | Call Groq API |
| get_summary | medical_summary.py | patient_id: int, force_refresh: bool | dict | Generate/update summary |
| answer_query_with_rag | medical_summary.py | patient_id: int, query: string, top_k: int | dict | RAG Q&A |

---

## Database Query Functions

These are not explicit functions but are important query patterns used throughout:

| Query Pattern | File | Purpose |
|--------------|------|---------|
| SELECT * FROM users WHERE email = ? | Multiple controllers | User lookup by email |
| SELECT * FROM users WHERE id = ? | Multiple controllers | User lookup by ID |
| INSERT INTO users (...) | authController.js | Create user |
| UPDATE users SET ... WHERE id = ? | Multiple controllers | Update user fields |
| SELECT * FROM appointments WHERE patient_id = ? | appointmentController.js | List patient appointments |
| SELECT * FROM doctor_profiles WHERE user_id = ? | appointmentController.js | Get doctor availability |
| SELECT * FROM medical_records WHERE patient_id = ? | patientController.js | List patient records |
| SELECT * FROM prescriptions WHERE patient_id = ? | patientController.js | List prescriptions |
| INSERT INTO patient_access_tokens (...) | appointmentController.js | Grant access token |
| SELECT * FROM patient_access_tokens WHERE access_token = ? | appointmentController.js | Validate token |

---

## Lifecycle Functions

| Function | File | Purpose | Called When |
|----------|------|---------|-------------|
| app.listen(4000) | server.js | Start Express server | Backend startup |
| db.getConnection() | server.js | Test MySQL connection | Backend startup |
| main() | app.py | Python entry point | Every RAG query |
| initializeBlockchain() | blockchain.js | Initialize Web3 | First file upload |
| createRoot(...).render(...) | main.jsx | Render React app | Frontend startup |

---

## Summary: Most Critical Functions

### By Frequency of Use
1. **authenticateToken** - On every protected request
2. **login** - Every user login
3. **bookAppointment** - Core patient feature
4. **getAvailableSlots** - Core appointment flow
5. **addRecordToBlockchain** - Every file upload

### By Complexity
1. **addRecordToBlockchain** - Async blockchain interaction
2. **patientRagChat** - Subprocess management, JSON parsing
3. **answer_query_with_rag** - Groq API, DB queries, text processing
4. **getPatientHistory** - Large data retrieval
5. **getDashboardOverview** - Multiple queries aggregated

### By Risk (if broken)
1. **authenticateToken** - Auth system failure
2. **login** - Users cannot access system
3. **addRecordToBlockchain** - File uploads fail
4. **bookAppointment** - Appointments fail
5. **patientRagChat** - RAG feature fails
