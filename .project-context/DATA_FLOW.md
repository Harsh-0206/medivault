# MediVault - Data Flow Diagrams

Complete tracing of important system flows and data transformations.

---

## 1. Complete User Registration & Login Flow

### Patient Registration
```
USER INPUTS:
  name, email, password

FLOW:
  1. Frontend (Register.jsx) → POST /auth/register
     {name, email, password}
  
  2. Backend (authController.js::registerPatient)
     a. Validate all fields present
     b. Check: SELECT users WHERE email = ? (unique check)
     c. Hash: password_hash = argon2.hash(password)
     d. Insert: INSERT INTO users (name, email, password_hash, role='patient', is_verified=1)
     e. Return: {message: "Patient registered successfully"}
  
  3. Frontend stores message, redirects to /login
  
  4. Frontend (Login.jsx) → POST /auth/login
     {email, password, role='patient'}
  
  5. Backend (authController.js::login)
     a. SELECT users WHERE email = ?
     b. Verify: argon2.verify(input_password, user.password_hash)
     c. Check: user.role == 'patient' ✓
     d. Check: user.is_verified == 1 ✓
     e. Generate: accessToken = jwt.sign({id, role}, JWT_SECRET, {expiresIn: '15m'})
     f. Generate: refreshToken = random 40-byte hex
     g. Hash: refresh_token_hash = argon2.hash(refreshToken)
     h. INSERT refresh_tokens (user_id, token_hash)
     i. Return: {token: accessToken, refreshToken, role: 'patient'}
  
  6. Frontend stores in localStorage:
     mv_token = accessToken
     mv_role = 'patient'
     refreshToken = refreshToken (sometimes)
  
  7. Frontend navigates to /patient-dashboard

DATA TRANSFORMATION:
  password (plaintext)
    ↓ [Argon2 hash]
    password_hash (stored in DB)
  
  {id, role}
    ↓ [JWT sign with secret]
    accessToken (sent to client)
  
  refreshToken (random bytes)
    ↓ [Argon2 hash]
    refresh_token_hash (stored in DB)
```

---

## 2. File Upload with Blockchain Anchoring

### Complete Pipeline
```
PATIENT INPUTS:
  file (binary), title, type, recordDate, notes

FLOW:

Phase 1: Frontend Preparation
  1. PatientDashboard.jsx → User selects file, fills metadata
  2. Create FormData:
     - Append 'file' (binary)
     - Append 'title' (string)
     - Append 'type' (string)
     - Append 'recordDate' (date)
     - Append 'notes' (text)
  3. POST /files/upload with Bearer JWT

Phase 2: Backend Validation & File Save
  4. authenticateToken middleware
     - Extract JWT from Authorization header
     - jwt.verify(token, JWT_SECRET)
     - Set req.user = {id, role}
  
  5. fileRoutes::POST /upload handler
     a. Multer parses multipart/form-data
     b. Save file to disk: /uploads/{timestamp}_{filename}
     c. Return file info: {path, filename, size, mimetype}

Phase 3: Hash Computation
  6. FileRoutes handler (continued)
     a. fileBuffer = fs.readFileSync(file.path)
     b. fileHash = crypto.createHash('sha256')
                         .update(fileBuffer)
                         .digest('hex')
     Example: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0"

Phase 4: Blockchain Anchoring (CRITICAL)
  7. addRecordToBlockchain(fileHash)
     a. Initialize Web3 context (lazy-load)
        - Web3 instance: new Web3(SEPOLIA_RPC_URL)
        - Account: web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY)
        - Contract: new web3.eth.Contract(ABI, CONTRACT_ADDRESS)
     
     b. Read before state
        - beforeCount = await contract.methods.count().call()
     
     c. Send transaction
        - await contract.methods.addRecord(fileHash)
                       .send({from: account.address})
        - Waits for receipt on Sepolia blockchain
     
     d. Receipt response
        - transactionHash: "0xabc123def456..."
        - blockNumber: 1234567
     
     e. Read after state
        - afterCount = await contract.methods.count().call()
     
     f. Return:
        {
          transactionHash: "0xabc...",
          blockNumber: "1234567",
          owner: "0xaccount...",
          beforeCount: "99",
          afterCount: "100"
        }

Phase 5: Local Audit Log (records.json)
  8. Read records.json → parse JSON array
  9. Calculate nextId = max(record.id) + 1
  10. Create new record object:
      {
        id: 100,
        userId: 42,
        role: 'patient',
        title: "Chest X-Ray",
        type: "image",
        fileHash: "a1b2c3d4...",
        transactionHash: "0xabc...",
        blockNumber: "1234567",
        timestamp: "2025-06-30T10:30:00Z",
        expiresAt: null,
        filePath: "/uploads/chest_xray_1719747000000.png"
      }
  11. Append to records array
  12. Write back to records.json (prettified JSON)

Phase 6: Database Persistence
  13. INSERT medical_records
      {
        patient_id: 42,
        doctor_id: null,
        title: "Chest X-Ray",
        type: "image",
        record_date: "2025-06-30",
        file_path: "/uploads/chest_xray_1719747000000.png",
        notes: "Annual checkup",
        uploaded_by: 42,
        created_at: NOW()
      }

Phase 7: Response
  14. Return to frontend:
      {
        success: true,
        fileHash: "a1b2c3d4...",
        transactionHash: "0xabc...",
        blockNumber: "1234567",
        recordId: 100,
        filePath: "/uploads/chest_xray_1719747000000.png"
      }

Phase 8: Frontend Update
  15. PatientDashboard.jsx
      - Display success notification
      - Show transaction hash as link to Etherscan
      - Append record to UI list
      - Provide download link to /uploads/...

DATA TRANSFORMATIONS:
  
  File (binary)
    ↓ [Save to disk]
    /uploads/{filename}
    ↓ [Compute SHA-256]
    fileHash (64-char hex)
    ↓ [Blockchain transaction]
    transactionHash (64-char hex starting with 0x)
    ↓ [Include in records.json]
    records.json (append-only log)
    ↓ [Also stored in MySQL]
    medical_records table row

POTENTIAL FAILURE POINTS:
  1. Multer fails to save file → 400 error
  2. Hash computation fails → 500 error (rare)
  3. Blockchain transaction fails → 500 error, file orphaned
  4. records.json write fails → file+chain OK but audit log corrupt
  5. MySQL insert fails → file+chain+log OK but DB empty
  
RISK: No transaction guarantee; blockchain success ≠ DB success
```

---

## 3. Appointment Booking Workflow

### Complete Flow
```
PHASE 1: Doctor Discovery
  1. Patient navigates to /patient/book-appointment
  2. GET /doctors/search?query=cardiologist
     - Backend: SELECT doctors (verified only) LIKE %cardiologist%
     - Return: {doctors: [{id, name, specialty, location, consultation_fee, ...}]}
  3. Patient reviews list, selects doctor_id

PHASE 2: Slot Selection
  4. Patient picks date (e.g., 2025-07-10)
  5. GET /appointments/doctor/{doctorId}/slots?date=2025-07-10
     
     Backend logic:
     a. SELECT doctor_profiles WHERE user_id = doctorId
     b. Parse available_days: "Mon,Wed,Fri"
     c. Calculate day-of-week for 2025-07-10: Thursday
     d. Check if "Thu" in available_days
        - If not: Return {message: "Doctor not available", slots: []}
        - If yes: Continue
     e. Get time window:
        - available_time_start: "09:00"
        - available_time_end: "17:00"
        - slot_duration: 30 minutes
     f. Generate slots: ["09:00", "09:30", "10:00", ..., "16:30"]
     g. Query booked appointments:
        SELECT appointment_time FROM appointments
        WHERE doctor_id = X AND appointment_date = "2025-07-10"
        AND status IN ('pending', 'confirmed')
     h. Build available set:
        - All slots start as available
        - Remove any booked slots
     i. Return: {date, slots: [{time: "09:00", available: true}, {time: "09:30", available: false}, ...]}
  
  6. Frontend shows slots, patient selects "10:00"

PHASE 3: Booking Confirmation
  7. Patient fills reason: "Routine checkup"
  8. POST /appointments
     Body: {
       doctor_id: 15,
       appointment_date: "2025-07-10",
       appointment_time: "10:00:00",
       reason: "Routine checkup"
     }
  
  9. Backend (appointmentController.js::bookAppointment)
     a. Extract patient_id from JWT
     b. Validate all fields present
     c. Re-check slot availability (TOCTOU race possible):
        - SELECT COUNT(*) FROM appointments
          WHERE doctor_id = 15 AND appointment_date = "2025-07-10"
          AND appointment_time = "10:00:00" AND status IN ('pending', 'confirmed')
        - If count > 0: Return 400 "Slot already booked"
     d. INSERT appointments:
        {
          patient_id: 42,
          doctor_id: 15,
          appointment_date: "2025-07-10",
          appointment_time: "10:00:00",
          reason: "Routine checkup",
          status: "pending",
          created_at: NOW()
        }
     e. Return: {message: "Appointment booked successfully", appointment}
  
  10. Frontend displays confirmation

PHASE 4: Doctor Response
  11. Doctor logs in, views GET /appointments/doctor
      - Shows: All appointments with patient names, times, status
  
  12. Doctor selects appointment, reviews details
  
  13. Doctor POST /appointments/{appointmentId}/respond
      Body: {status: "confirmed"}
  
  14. Backend: UPDATE appointments SET status = 'confirmed'
  
  15. Patient on next dashboard refresh sees status change to "confirmed"

DATA TRANSFORMATIONS:
  
  Doctor selection: doctor_id (integer)
  Date selection: appointment_date (YYYY-MM-DD)
  Slot selection: appointment_time (HH:MM:SS)
  
  Combined: appointment row in DB with status "pending" → "confirmed"

STATE MACHINE:
  
  [Not Booked] 
    ↓ (POST /appointments)
  [Pending]
    ↓ (Doctor POSTs /respond with 'confirmed')
  [Confirmed]
    ↓ (Patient cancels or time passes)
  [Cancelled]
```

---

## 4. RAG Health Chat Flow

### Complete Q&A Pipeline
```
USER INPUTS:
  message: "What medications am I currently on?"

PHASE 1: Frontend Message Processing
  1. PatientHealthChat.jsx → User types message
  2. Click Send button → sendQuery(text)
  3. normalizeQuery(text) = lowercase, trim, remove punctuation
     Result: "what medications am i currently on"
  4. Check CANNED_RESPONSES dict for match
     - If match: return canned answer immediately (no server call)
     - If no match: Continue to server

PHASE 2: Backend receives request
  5. POST /patient/rag/chat
     Headers: {Authorization: "Bearer {jwt}"}
     Body: {message: "What medications am I currently on?", top_k: 5}
  
  6. Backend (ragController.js::patientRagChat)
     a. authenticateToken middleware → req.user = {id: 42, role: 'patient'}
     b. Extract patient_id = 42
     c. Validate message not empty
     d. Check GROQ_API_KEY configured
     e. Prepare subprocess arguments:
        - scriptPath: "backend/python/app.py"
        - pythonCmd: "python" or process.env.PYTHON_PATH
        - args: ["app.py", "--patient_id", "42", "--query", "What medications am I on?", "--top_k", "5"]
     f. Prepare child environment:
        - Copy process.env
        - Set GROQ_API_KEY
        - Set DB_PASSWORD
        - Set PATIENT_ID
     g. Spawn subprocess:
        const child = spawn(pythonCmd, args, {env: childEnv})

PHASE 3: Python subprocess starts
  7. app.py main() function
     a. Load .env configuration
     b. Validate config (GROQ_API_KEY, DB_NAME)
     c. resolve_patient_id(args) → patient_id = 42
     d. Initialize MedicalSummarizer(db_config, groq_api_key)
     e. Check get_canned_rag_response("what medications am i currently on")
        - If match: return canned answer
        - If not: Continue to RAG

PHASE 4: Python RAG Query
  8. MedicalSummarizer.answer_query_with_rag(patient_id=42, query="What medications...", top_k=5)
     a. connect_db() → Connect to MySQL
     b. Retrieve patient data:
        - SELECT * FROM users WHERE id = 42
        - SELECT * FROM prescriptions WHERE patient_id = 42
        - SELECT * FROM medical_records WHERE patient_id = 42
        - SELECT * FROM vital_signs WHERE patient_id = 42
     c. Build context string:
        context = """
        Patient: John Doe
        DOB: 1985-03-15
        Medical History Summary:
        - Prescription 1: Lisinopril 10mg daily (issued by Dr. Smith)
        - Prescription 2: Metformin 500mg twice daily (issued by Dr. Smith)
        - Recent visit: 2025-06-20 (checkup)
        - Vital signs (latest): BP 120/80, HR 72
        """
     d. Call _llm_complete():
        - user_prompt = query
        - system_prompt = medical context
        - Build payload:
          {
            "model": "llama-3.3-70b-versatile",
            "messages": [
              {"role": "system", "content": context},
              {"role": "user", "content": "What medications am I on?"}
            ],
            "temperature": 0.2,
            "max_tokens": 2048
          }
        - HTTP POST to https://api.groq.com/openai/v1/chat/completions
        - Headers: {Authorization: "Bearer {GROQ_API_KEY}", Content-Type: "application/json"}
     e. Wait for response:
        {
          "choices": [
            {
              "message": {
                "content": "Based on your medical records, you are currently on: Lisinopril 10mg daily for blood pressure management, and Metformin 500mg twice daily for glucose control. These were prescribed by Dr. Smith. Please consult with your doctor before making any changes to your medications."
              }
            }
          ]
        }
     f. Extract answer = response.choices[0].message.content
     g. Build result:
        {
          "success": true,
          "patient_id": 42,
          "query": "What medications am I on?",
          "model": "llama-3.3-70b-versatile",
          "answer": "Based on your medical records...",
          "retrieved_chunks": ["Lisinopril 10mg", "Metformin 500mg"],
          "message": "Query answered using patient history"
        }
     h. Output JSON to stdout

PHASE 5: Backend captures subprocess output
  9. Node.js subprocess listeners:
     - child.stdout.on('data', ...): Accumulate stdout
     - child.stderr.on('data', ...): Log errors
     - child.on('close', (code) => {...}): Process exit
  
  10. On close event:
      a. Get accumulated stdout
      b. JSON.parse(stdout)
      c. If parse error: Return {success: false, message: "Unexpected response"}
      d. If result.success = true: Continue
      e. If result.success = false: Return error

PHASE 6: Backend returns to frontend
  11. Return result to frontend:
      {
        success: true,
        answer: "Based on your medical records...",
        patient_id: 42,
        query: "What medications am I on?",
        ...
      }

PHASE 7: Frontend displays answer
  12. PatientHealthChat.jsx
      a. Parse response JSON
      b. If error: Display error message, show disclaimer
      c. Else: Add message to chat array:
         {role: "assistant", content: answer}
      d. Auto-scroll to latest message
      e. Hide loading spinner

DATA TRANSFORMATIONS:
  
  User message (text)
    ↓ [Normalize]
    Normalized query (lowercase, cleaned)
    ↓ [Check canned responses]
    Could be: Answer (if match) or continue to Groq
    ↓ [Patient data from MySQL]
    Medical records (structured data)
    ↓ [Build context string]
    Context (large text with medical summary)
    ↓ [Groq API call]
    LLM response (JSON from API)
    ↓ [Extract content]
    Answer (natural language)
    ↓ [Format for frontend]
    Chat message (JSON)
    ↓ [Display in UI]
    Chat bubble

POTENTIAL BOTTLENECKS:
  1. Patient has huge history → Context string too large → Groq truncates
  2. Groq API slow or error → Subprocess hangs/fails
  3. MySQL query slow → Subprocess takes minutes
  4. No subprocess timeout → Can hang indefinitely
```

---

## 5. Access Token Flow (Easy Access)

### Patient Grants Doctor Access
```
TRIGGER: Patient views appointment, clicks "Easy Access"

PHASE 1: Token Generation
  1. Frontend: POST /appointments/{appointmentId}/easy-access
  
  2. Backend (appointmentController.js::grantEasyAccess)
     a. Authenticate patient JWT
     b. SELECT appointment WHERE id = ? AND patient_id = ?
        - Verify patient owns appointment
     c. Extract doctor_id from appointment row
     d. Generate token: crypto.randomBytes(32).toString('hex')
        Result: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0"
     e. Calculate expiry: now + 30 minutes
     f. INSERT patient_access_tokens:
        {
          patient_id: 42,
          doctor_id: 15,
          access_token: "a1b2c3...",
          expires_at: "2025-06-30T11:15:00Z",
          is_active: 1,
          created_at: NOW()
        }
     g. Return: {access_token, expiresAt}

PHASE 2: Frontend displays token
  3. PatientDashboard.jsx
     - Shows token in modal
     - Copy-to-clipboard button
     - Display expiry countdown: "Expires in 30:00"
     - Timer ticks down every second
     - When countdown reaches 0: "Expired" message

PHASE 3: Patient shares token
  4. Patient copies token, shares with doctor via:
     - SMS/text message
     - WhatsApp/messaging app
     - Email
     - In-person verbal/written

PHASE 4: Doctor uses token
  5. Doctor has token: "a1b2c3..."
  6. Doctor is authenticated (has JWT, role='doctor')
  7. GET /appointments/patient-history/{token}
  
  8. Backend (appointmentController.js::getPatientHistoryWithToken)
     a. Authenticate doctor JWT → req.user = {id: 15, role: 'doctor'}
     b. Look up token:
        SELECT * FROM patient_access_tokens WHERE access_token = ?
     c. Validate token row:
        - Row exists? If not: 403 "Invalid token"
        - is_active = 1? If not: 403 "Token revoked"
        - expires_at > NOW()? If not: 403 "Token expired"
        - doctor_id = req.user.id? If not: 403 "Token for different doctor"
     d. Extract patient_id from row
     e. Retrieve patient data (same as getPatientHistory):
        - SELECT users WHERE id = patient_id
        - SELECT vital_signs WHERE patient_id
        - SELECT medical_records WHERE patient_id
        - SELECT prescriptions WHERE patient_id
        - SELECT appointments WHERE patient_id
     f. Return full patient dossier

PHASE 5: Frontend displays patient data
  9. Frontend receives patient data
  10. Displays patient dashboard (read-only):
      - Patient profile
      - Vital signs history
      - Medical records list
      - Prescriptions
      - Appointments

PHASE 6: Token expiry
  11. 30 minutes pass: expires_at < NOW()
  12. If doctor tries to use token again:
      SELECT patient_access_tokens WHERE access_token = ?
      validates: expires_at > NOW() → FALSE
      Return: 403 "Token expired"
  13. Patient can regenerate token by tapping "Easy Access" again

CLEANUP/REVOCATION:
  - Patient could manually revoke: UPDATE patient_access_tokens SET is_active = 0
  - No automatic cleanup; stale tokens remain in DB (minor space waste)

DATA TRANSFORMATIONS:
  
  Random bytes (32)
    ↓ [Convert to hex]
    access_token (64-char hex string)
    ↓ [Include in request URL]
    GET /appointments/patient-history/{token}
    ↓ [Lookup in DB]
    patient_access_tokens row
    ↓ [Validate timestamp]
    is_expired: boolean
    ↓ [If valid, fetch patient data]
    Full patient dossier (JSON)
```

---

## 6. Error Flow Examples

### File Upload Failure Scenarios
```
SCENARIO 1: File Type Rejected
  User uploads .exe file
    ↓ Multer fileFilter checks allowedExt regex
    ↓ /\.(pdf|jpe?g|png|doc|docx|xlsx?)$/i
    ✗ Match fails
    ↓ cb(new Error("Invalid file type..."))
    ↓ runUpload wrapper catches
    ↓ Return: 400 {success: false, message: "Invalid file type..."}
    ✗ Upload fails, user sees error

SCENARIO 2: File Size Exceeds Limit
  User uploads 15MB file (limit 10MB)
    ↓ Multer limits check: fileSize > 10 * 1024 * 1024
    ✗ Exceeds
    ↓ cb(new Error("File too large"))
    ↓ Return: 400 error
    ✗ Upload fails

SCENARIO 3: Blockchain Transaction Fails
  File uploaded, hash computed, blockchain call sent
    ↓ Sepolia RPC timeout or error
    ✗ contract.methods.addRecord(hash).send() throws
    ↓ catch (err) → res.status(500) error
    ✗ Upload fails, file orphaned on disk
    ✓ records.json NOT updated
    ✓ MySQL medical_records NOT inserted
    ✗ User must retry; original file still on disk

SCENARIO 4: MySQL Insert Fails
  File uploaded, hash computed, blockchain succeeds, records.json updated
    ↓ INSERT medical_records fails (DB constraint, etc.)
    ✗ catch (err) → res.status(500) error
    ✓ File on disk (cannot be accessed without DB record)
    ✓ records.json has entry
    ✓ Blockchain has hash
    ✗ DB missing → frontend shows "not in system"
    ✗ Data inconsistency

POTENTIAL FIXES:
  - Wrap all phases in transaction (not currently done)
  - Implement cleanup on failure (delete file, remove from records.json, revert blockchain?)
  - Add retry logic for transient failures
```

---

## Summary

Data flows in MediVault involve:

1. **Linear flows** (user action → DB update): Registration, login, profile updates
2. **Complex async flows** (multi-step pipelines): File upload (file → hash → blockchain → DB), RAG (user query → Python → Groq → response)
3. **Time-boxed flows** (temporary access): Access tokens with expiry validation
4. **Query flows** (data retrieval): Appointments, records, prescriptions listing
5. **State machine flows** (status changes): Appointments (pending → confirmed), tokens (active → expired)

**Critical data transformations**:
- Binary file → SHA-256 hash → blockchain transaction
- User credentials → JWT + refresh token
- Patient question → context string → LLM answer
- Time selection → appointment row in DB

**Risks**:
- Race conditions (TOCTOU between availability check and booking)
- Transaction failures (blockchain succeeds but DB fails)
- Timeouts (blockchain, subprocess, Groq API)
- Data inconsistencies (records.json ≠ MySQL ≠ blockchain)

**Performance considerations**:
- No caching (each slot query regenerates availability)
- No connection pooling (Python subprocess per RAG query)
- Large history retrieval (no pagination on patient dossier)
- Synchronous blockchain wait (upload blocks on transaction)
