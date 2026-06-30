# MediVault - Dependency Graph

Complete mapping of module dependencies, external libraries, and data flow relationships.

---

## Backend Dependencies (Node.js)

### Direct Dependencies (from package.json)

```
Core Framework:
├── express@5.1.0
│   └── Used in: server.js
│       Routes all API requests
│
Database:
├── mysql2@3.x
│   └── Used in: config/db.js
│       Creates connection pool
│       Used by: ALL controllers
│
Authentication:
├── jsonwebtoken@9.x
│   └── Used in: authController.js, middleware/auth.js
│       JWT creation and verification
│
├── argon2@0.x
│   └── Used in: authController.js
│       Password hashing (primary)
│
├── bcryptjs@2.x
│   └── Used in: apiAuthController.js
│       Password hashing (secondary - inconsistent)
│
└── dotenv@16.x
    └── Used in: config/db.js, server.js
        Loads environment variables

Blockchain:
└── web3@4.16.0
    └── Used in: blockchain/blockchain.js
        Ethereum interaction

File Upload:
└── multer@1.x
    └── Used in: fileRoutes.js
        Multipart form data parsing

Utilities:
├── cors@2.x
│   └── Used in: server.js
│       Cross-origin requests
│
├── express-json-rpc@1.x (implied)
│
└── (built-in) crypto, fs, path, http, https

```

### Implicit Dependencies

```
├── Node.js runtime
│   └── Provides: streams, events, fs, path, crypto, http, https
│
├── Operating System
│   └── File system access (uploads directory)
│
├── MySQL Server 8.0+
│   └── Database backend
│
├── Ethereum Sepolia Testnet
│   └── Blockchain for hash anchoring
│   └── Via: SEPOLIA_RPC_URL environment variable
│
└── Python 3.9+
    └── Spawned for RAG queries
```

---

## Frontend Dependencies (React)

### Direct Dependencies (from package.json)

```
Core Framework:
├── react@19.2.0
│   ├── Used in: src/main.jsx, all components
│   └── Provides: Component API, Hooks, JSX
│
├── react-dom@19.2.0
│   └── Used in: src/main.jsx
│   └── Renders React to DOM
│
└── react-router-dom@7.9.6
    └── Used in: src/App.jsx, src/components/auth/RequireAuth.jsx
    └── Client-side routing

Styling:
└── tailwindcss@4.1.17
    └── Used in: all components
    └── Utility CSS classes

UI Components (implied):
└── lucide-react
    └── Icons for UI

Build Tools:
├── vite@7.2.2
│   └── Dev server and bundler
│   └── Configured in: vite.config.js
│
└── @vitejs/plugin-react
    └── React support in Vite

Development:
├── eslint@8.x
│   └── Code linting
│
└── (implied) Node 18+
```

### Implicit Dependencies

```
├── Browser APIs
│   ├── localStorage (auth tokens)
│   ├── fetch API (HTTP requests)
│   ├── WebSocket (for real-time - not used yet)
│   └── File API (file uploads)
│
├── HTTP Backend
│   └── http://localhost:4000 (dev)
│   └── /auth/*, /patient/*, /doctor/*, /appointments/*, /files/*, /rag/* endpoints
│
└── Environment
    └── http://localhost:5173 (dev)
```

---

## Python Dependencies

### Direct Dependencies (from requirements.txt)

```
Database:
├── mysql-connector-python@8.x
│   └── Used in: medical_summary.py
│   └── Retrieves patient data
│
API Communication:
├── urllib (built-in)
│   └── Used in: medical_summary.py
│   └── HTTP POST to Groq API
│
└── ssl (built-in)
    └── HTTPS support (with verification disabled for dev)

Environment:
└── (implied) Python 3.9+
    └── Language runtime
```

### Implicit Dependencies

```
├── MySQL 8.0+ database
│   └── Same database as backend
│   └── Tables: users, prescriptions, medical_records, vital_signs, appointments
│
├── Groq API
│   └── LLM service
│   └── Endpoint: https://api.groq.com/openai/v1/chat/completions
│   └── Model: llama-3.3-70b-versatile
│   └── Requires: GROQ_API_KEY environment variable
│
└── Environment
    └── Spawned by: Node.js ragController.js
    └── Via: child_process.spawn()
    └── Arguments: --patient_id, --query, --top_k
    └── Environment: GROQ_API_KEY, DB_PASSWORD, PATIENT_ID
```

---

## Internal Module Dependencies

### Backend Controller Dependencies

```
patientController.js
├── config/db.js (database)
├── fs, path (file operations)
├── middleware/auth.js (indirectly through routes)
└── Used by: patientRoutes.js

doctorController.js
├── config/db.js
└── Used by: doctorRoutes.js

appointmentController.js
├── config/db.js
├── crypto (token generation)
└── Used by: appointmentRoutes.js

prescriptionController.js
├── config/db.js
└── Used by: doctorRoutes.js

ragController.js
├── child_process (spawn Python)
├── path (file paths)
├── dotenv (Groq API key)
└── Used by: patientRoutes.js

authController.js
├── config/db.js
├── jsonwebtoken
├── argon2
├── crypto
├── dotenv
└── Used by: authRoutes.js
```

### Route Dependencies

```
server.js
├── express
├── config/db.js
├── middleware/auth.js
├── routes/authRoutes.js
├── routes/patientRoutes.js
├── routes/doctorRoutes.js
├── routes/appointmentRoutes.js
├── routes/fileRoutes.js
├── routes/doctors.js
├── cors, express.json, express.static
└── blockchain/blockchain.js (for initialization)

fileRoutes.js
├── express, multer
├── crypto (SHA-256 hashing)
├── fs, fs/promises
├── blockchain/blockchain.js
├── config/db.js
├── middleware/auth.js
└── Used by: server.js
```

### Frontend Component Dependencies

```
App.jsx (main router)
├── React Router
├── pages/patient/PatientDashboard
├── pages/auth/Login
├── pages/auth/Register
├── pages/doctor/DoctorDashboard
├── pages/admin/AdminDashboard
├── components/auth/RequireAuth
└── components/layout/AuthNavBar

PatientDashboard.jsx
├── React hooks (useState, useEffect)
├── fetch API
├── components/patient/PatientHealthChat
├── components/AppointmentsSection
└── localStorage (mv_token, mv_role)

RequireAuth.jsx
├── React Router (useNavigate)
├── localStorage (mv_token, mv_role)
├── jsonwebtoken (decode via npm or fetch)
└── Role validation logic

PatientHealthChat.jsx
├── React hooks
├── fetch API (/patient/rag/chat)
├── lucide-react (icons)
└── localStorage (mv_token)
```

---

## Data Flow Dependencies

```
User Registration Flow:
  Frontend (Register.jsx)
    ↓ POST /auth/register
  Backend (authRoutes.js)
    ↓
  authController.registerPatient()
    ├─ argon2.hash(password)
    ├─ db.query('SELECT users...')
    ├─ db.query('INSERT users...')
    └─ return success/error

User Login Flow:
  Frontend (Login.jsx)
    ↓ POST /auth/login
  Backend (authRoutes.js)
    ↓
  authController.login()
    ├─ db.query('SELECT users...')
    ├─ argon2.verify(password)
    ├─ jwt.sign(token)
    ├─ generateRefreshToken()
    ├─ argon2.hash(refreshToken)
    ├─ db.query('INSERT refresh_tokens...')
    └─ return {token, refreshToken}

File Upload Flow:
  Frontend (PatientDashboard.jsx)
    ↓ POST /files/upload (multipart)
  fileRoutes.js
    ├─ authenticateToken middleware
    ├─ multer (save file)
    ├─ crypto (compute hash)
    ├─ blockchain.js addRecordToBlockchain()
    │   ├─ web3.js initialize
    │   ├─ contract.methods.addRecord()
    │   └─ return {transactionHash, blockNumber}
    ├─ fs (append records.json)
    └─ db.query('INSERT medical_records...')

RAG Query Flow:
  Frontend (PatientHealthChat.jsx)
    ↓ POST /patient/rag/chat
  Backend (ragController.js)
    ├─ authenticateToken
    └─ spawn child: python app.py --patient_id X --query Y
         ↓ (Python subprocess)
         medical_summary.py
         ├─ mysql-connector: SELECT patient data
         ├─ urllib: POST to Groq API
         ├─ Groq: LLM response
         └─ JSON to stdout
    ↓ (Parse JSON)
  Frontend: Display answer
```

---

## Circular Dependencies (None Found)

```
✓ No circular dependencies detected

Potential issue to watch:
- If adminRoutes.js is added, ensure it doesn't import from other controllers
- Keep middleware separate to avoid circular imports
```

---

## External Service Dependencies

### Mandatory

```
1. MySQL Database
   ├── Hostname: DB_HOST (default: localhost)
   ├── Port: DB_PORT (default: 3306)
   ├── Required for: Every data operation
   └── Failure Impact: Entire system down

2. Ethereum Sepolia RPC
   ├── Endpoint: SEPOLIA_RPC_URL (e.g., https://sepolia.infura.io/v3/...)
   ├── Required for: File uploads (blockchain anchoring)
   ├── Can fail without: System still functional, just no blockchain anchoring
   └── Failure Impact: File uploads rejected

3. Groq API
   ├── Key: GROQ_API_KEY
   ├── Endpoint: https://api.groq.com/openai/v1/chat/completions
   ├── Required for: RAG health chat
   ├── Can fail without: Chat feature returns error, system functional
   └── Failure Impact: Chat queries fail
```

### Optional / Development-Only

```
1. Email Service (not implemented)
   - Could be added for notifications

2. SMS Service (not implemented)
   - Could be added for appointments reminders

3. Redis Cache (not implemented)
   - Could improve performance
```

---

## Dependency Vulnerabilities

### Critical

```
✗ TLS verification disabled
  Location: blockchain/blockchain.js
  Vulnerability: Man-in-the-middle attack possible
  Affects: Blockchain interaction

✗ Credentials in logs
  Location: config/db.js
  Vulnerability: Secret leakage
  Affects: Database connection

✗ Inconsistent password hashing
  Location: authController.js vs apiAuthController.js
  Vulnerability: Weak hashing (bcrypt vs Argon2)
  Affects: Authentication security
```

### High

```
⚠ No rate limiting
  Affects: Login endpoint (brute force possible)

⚠ No input validation in some routes
  Affects: SQL injection risk (though using parameterized queries as mitigation)

⚠ Private key in process memory
  Affects: Blockchain transaction security
```

---

## Dependency Update Status

| Dependency | Current | Latest | Status |
|------------|---------|--------|--------|
| express | 5.1.0 | 5.1.0 | ✓ Current |
| react | 19.2.0 | 19.2.0 | ✓ Current |
| vite | 7.2.2 | 7.2.2 | ✓ Current |
| mysql2 | 3.x | 3.x | ✓ Current |
| web3 | 4.16.0 | 4.x | ✓ Current |
| tailwindcss | 4.1.17 | 4.1.17 | ✓ Current |
| react-router-dom | 7.9.6 | 7.9.6 | ✓ Current |

---

## Dependency Management Recommendations

### Keep Updated

- Framework dependencies (React, Express, Vite)
- Security-critical packages (authentication, hashing)

### Be Cautious With

- Database drivers (mysql2/promise)
- Blockchain libraries (web3.js)
- Python packages (api changes possible)

### Consider Removing

- apiAuthController.js (duplicate of authController.js)
- apiTestController.js (development-only)
- apiTestRoutes.js (development-only)
- Inconsistent password hashing (standardize on Argon2)

---

## Dependency Resolution Strategy

### Adding New Dependency

1. Check if library solves real problem
2. Review security record
3. Check maintenance status (recent commits)
4. Verify compatibility with current versions
5. Add to package.json
6. Run npm install
7. Test thoroughly
8. Document in CONFIGURATION.md

### Removing Dependency

1. Identify all usages (grep -r)
2. Create alternative implementation or refactor
3. Update all imports
4. Run tests
5. Remove from package.json
6. Run npm install

### Updating Dependency

1. Check CHANGELOG for breaking changes
2. Update package.json version
3. Run npm install
4. Test all features
5. If breaking changes: update code accordingly
6. Commit with clear message

---

## Summary

**Core Dependencies**:
- Express (backend framework)
- React (frontend framework)
- MySQL (database)
- Web3.js (blockchain)
- Groq (LLM)

**Key Relationships**:
- Frontend talks to Backend via REST API
- Backend talks to MySQL for data
- Backend talks to Ethereum for file anchoring
- Backend spawns Python for RAG queries

**Potential Issues**:
- TLS verification disabled
- Credentials logged
- No rate limiting
- Private key exposure

**Maintenance Priority**:
- Keep framework versions current
- Monitor security advisories
- Test before updating
- Document changes
