# MediVault - Agent Context Guide

**READ THIS FIRST** - Optimized for AI agents to become productive immediately.

---

## Quick Start for AI Agents

### What is MediVault?

A secure digital health record system where:
- **Patients** upload medical files, book appointments, chat with AI health assistant
- **Doctors** search patients, review histories, write prescriptions
- **System** anchors file hashes on Ethereum blockchain for tamper-proof audit trail

**Tech Stack**: React 19 + Express 5 + MySQL 8 + Web3.js + Python RAG

**Deployment**: Frontend on http://localhost:5173, Backend on http://localhost:4000

---

## Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────┐
│ Frontend (React 19 + Vite)                                   │
│ ├── /patient-dashboard (authenticated, patient role)        │
│ ├── /doctor-dashboard (authenticated, doctor role)          │
│ ├── /admin (authenticated, admin role - NOT IMPLEMENTED)    │
│ └── /login (public)                                         │
└──────────────────────────────────────────────────────────────┘
           ↓ API Calls (JSON + Bearer JWT)
┌──────────────────────────────────────────────────────────────┐
│ Backend (Express 5 on :4000)                                 │
│ ├── /auth/* (registration, login, token refresh)           │
│ ├── /patient/* (profile, records, appointments, vitals)    │
│ ├── /doctor/* (dashboard, patient search, history)         │
│ ├── /appointments/* (booking, slots, access tokens)        │
│ ├── /files/* (upload with blockchain anchoring)            │
│ ├── /prescriptions/* (create, read)                        │
│ └── /rag/* (health chat)                                   │
└──────────────────────────────────────────────────────────────┘
    ├── MySQL 8 (persistent data)
    ├── Ethereum Sepolia (hash anchoring)
    └── Groq API (RAG LLM)
           ↓ spawns
┌──────────────────────────────────────────────────────────────┐
│ Python Service (medical_summary.py)                          │
│ ├── Retrieves patient data from MySQL                       │
│ ├── Calls Groq API for LLM response                         │
│ └── Returns JSON to backend                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Coding Conventions

### Backend (Node.js)

**File Organization**:
```
backend/
├── server.js              # Express app + middleware setup
├── config/db.js           # MySQL connection pool
├── middleware/auth.js     # JWT + role middleware
├── controllers/           # Business logic
│   ├── authController.js
│   ├── patientController.js
│   └── ...
├── routes/               # Route definitions
│   ├── authRoutes.js
│   ├── patientRoutes.js
│   └── ...
└── blockchain/blockchain.js # Web3.js integration
```

**Async/Await Pattern** (preferred over callbacks):
```javascript
// GOOD
async function getUser(id) {
  try {
    const user = await db.query('SELECT * FROM users WHERE id = ?', [id])
    return user[0]
  } catch (err) {
    console.error('DB error:', err)
    throw new Error('User not found')
  }
}

// BAD - avoid callbacks
function getUser(id, callback) {
  db.query('...', (err, results) => {...})
}
```

**Error Handling** (consistent):
```javascript
// Use try/catch for async
try {
  const result = await operation()
} catch (err) {
  res.status(500).json({success: false, message: err.message})
}
```

**Route Definitions**:
```javascript
// routes/patientRoutes.js
const express = require('express')
const router = express.Router()
const {authenticateToken, requireRole} = require('../middleware/auth')
const controller = require('../controllers/patientController')

// Public route
router.get('/search', controller.searchPatient)

// Protected routes
router.get('/profile', authenticateToken, requireRole('patient'), controller.getProfile)
router.post('/appointments', authenticateToken, requireRole('patient'), controller.bookAppointment)

module.exports = router
```

**Naming Conventions**:
- Functions: `camelCase` - `getPatientProfile()`, `bookAppointment()`
- Constants: `UPPER_SNAKE_CASE` - `MAX_FILE_SIZE`, `JWT_EXPIRE`
- Variables: `camelCase` - `patientId`, `appointmentDate`
- Classes: `PascalCase` - `MedicalSummarizer`

---

### Frontend (React)

**Component Organization**:
```javascript
// src/pages/patient/PatientDashboard.jsx
import {useState, useEffect} from 'react'
import PatientHealthChat from '../../components/patient/PatientHealthChat'

export default function PatientDashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchProfile()
  }, [])
  
  async function fetchProfile() {
    try {
      const response = await fetch('/patient/profile', {
        headers: {Authorization: `Bearer ${localStorage.getItem('mv_token')}`}
      })
      setProfile(await response.json())
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) return <div>Loading...</div>
  if (!profile) return <div>Error loading profile</div>
  
  return (
    <div className="container mx-auto">
      <h1>{profile.name}</h1>
      {/* Render profile content */}
    </div>
  )
}
```

**React Hooks Pattern**:
```javascript
// Preferred modern approach
const [count, setCount] = useState(0)
useEffect(() => { /* side effect */ }, [dependency])
const value = useContext(AuthContext)

// Avoid older class components
```

**Naming Conventions**:
- Components: `PascalCase` - `PatientDashboard`, `BookingForm`
- Hooks: `camelCase` starting with `use` - `useAuth`, `useAppointments`
- Handlers: `camelCase` prefixed with `handle` - `handleSubmit`, `handleClick`
- Props: `camelCase` - `patientId`, `onSubmit`

---

### Python

**Style**: PEP 8 (standard Python)

```python
# medical_summary.py
class MedicalSummarizer:
    def __init__(self, db_config, groq_api_key):
        self.db_config = db_config
        self.groq_api_key = groq_api_key
    
    async def answer_query_with_rag(self, patient_id, query, top_k=5):
        """Generate answer using patient data and Groq LLM."""
        try:
            patient_data = await self.get_patient_data(patient_id)
            context = self._build_context(patient_data)
            answer = await self._llm_complete(query, context)
            return {
                'success': True,
                'answer': answer,
                'patient_id': patient_id
            }
        except Exception as e:
            return {'success': False, 'message': str(e)}
```

---

## Important Patterns Used

### JWT Authentication Pattern

```javascript
// 1. Login: Issue token
const token = jwt.sign({id: userId, role}, JWT_SECRET, {expiresIn: '15m'})

// 2. Middleware: Verify token
function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({message: 'No token'})
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    res.status(403).json({message: 'Invalid token'})
  }
}

// 3. Route: Protected endpoint
app.get('/patient/profile', authenticateToken, requireRole('patient'), handler)
```

### Role-Based Access Control (RBAC)

```javascript
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (req.user.role !== requiredRole) {
      return res.status(403).json({message: 'Forbidden'})
    }
    next()
  }
}
```

### File Upload with Blockchain

```
1. User selects file
2. Multer saves file to /uploads/
3. Compute SHA-256 hash
4. Call addRecordToBlockchain(hash) [WAIT for Ethereum]
5. Append to records.json (audit log)
6. INSERT medical_records to MySQL
7. Return success with transaction hash
```

### Time-Boxed Access Tokens

```javascript
// Patient grants 30-min access
const token = crypto.randomBytes(32).toString('hex')
const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
INSERT INTO patient_access_tokens (patient_id, doctor_id, access_token, expires_at)

// Doctor uses token
SELECT * FROM patient_access_tokens WHERE access_token = ? AND expires_at > NOW()
```

---

## Common Workflows

### Adding a New Patient Feature

**Example**: Add "Medical Notes" feature to patient dashboard

1. **Create Controller Function** (`backend/controllers/patientController.js`):
```javascript
async function getMedicalNotes(req, res) {
  try {
    const patientId = req.user.id
    const notes = await db.query('SELECT * FROM medical_notes WHERE patient_id = ?', [patientId])
    res.json({success: true, notes})
  } catch (err) {
    res.status(500).json({success: false, message: err.message})
  }
}
```

2. **Create Route** (`backend/routes/patientRoutes.js`):
```javascript
router.get('/medical-notes', authenticateToken, requireRole('patient'), getMedicalNotes)
```

3. **Create Frontend Component** (`src/components/patient/MedicalNotesSection.jsx`):
```javascript
export default function MedicalNotesSection() {
  const [notes, setNotes] = useState([])
  
  useEffect(() => {
    fetch('/patient/medical-notes', {
      headers: {Authorization: `Bearer ${localStorage.getItem('mv_token')}`}
    })
    .then(r => r.json())
    .then(data => setNotes(data.notes))
  }, [])
  
  return <div>{notes.map(note => <p key={note.id}>{note.text}</p>)}</div>
}
```

4. **Integrate into Dashboard** (`src/pages/patient/PatientDashboard.jsx`):
```javascript
import MedicalNotesSection from '../../components/patient/MedicalNotesSection'

// In JSX
<MedicalNotesSection />
```

### Debugging an Issue

1. **Identify Error**:
   - Frontend: Check browser console (F12)
   - Backend: Check terminal output
   - Python: Check subprocess stderr

2. **Add Logging**:
```javascript
console.log('DEBUG: patientId =', patientId)
console.log('DEBUG: query result =', result)
```

3. **Reproduce Step-by-Step**:
   - Use seedTestDoctor.js for test data
   - Walk through exact user actions
   - Check database directly

4. **Find Root Cause**:
   - Is it a logic error?
   - Is it a database query?
   - Is it a missing authorization check?

5. **Fix Minimal**:
   - Fix root cause, not symptom
   - Don't over-engineer

6. **Test All Related Features**:
   - If you fix appointments, test booking and canceling
   - If you fix auth, test all role types

### Safe Refactoring

1. **Keep API Same**:
   - Don't change route signatures
   - Don't change function parameters
   - Maintain backward compatibility

2. **Make Small Changes**:
   - Refactor one function at a time
   - Test after each change
   - Use git commits for checkpoints

3. **Move Incrementally**:
   - Extract small functions first
   - Split components into smaller pieces
   - Move shared logic to utilities

---

## Critical Files That Work Together

When editing one of these, check the others:

| File | Works With | When | Example |
|------|-----------|------|---------|
| authController.js | authRoutes.js, middleware/auth.js | Changing auth logic | Add two-factor auth |
| patientController.js | patientRoutes.js | Adding patient feature | Add medical notes |
| appointmentController.js | appointmentRoutes.js | Appointment feature | Add cancellation fee |
| fileRoutes.js | blockchain.js | File upload changes | Change hash algorithm |
| PatientDashboard.jsx | all patient components | Restructuring UI | Split into sections |
| App.jsx | RequireAuth.jsx | Changing routes/auth | Add new role (nurse) |
| server.js | all routes, middleware | Adding mount point | Mount new route set |

---

## Files to Edit With Caution

**These require understanding the full system**:

| File | Why | What Could Break |
|------|-----|------------------|
| server.js | Middleware order matters | CORS before routes; wrong order breaks API |
| db.js | Connection pool | All DB queries use this |
| blockchain.js | Transaction logic | File uploads fail if broken |
| app.py | RAG entry point | All health chat queries fail if broken |
| main.jsx | React entry point | Entire frontend fails if broken |

---

## Files to NEVER Edit Without Caution

**These are stable and rarely change**:

| File | Why |
|------|-----|
| package.json | Dependency versions |
| vite.config.js | Build configuration |
| context.md | Project documentation |

---

## Important Invariants (Never Violate)

1. **User Authentication**:
   - Every protected route MUST validate JWT via authenticateToken middleware
   - req.user MUST be set before accessing user data
   - Endpoints MUST check req.user.id matches resource owner

2. **RBAC**:
   - Patients can only see own data
   - Doctors can only see granted access data
   - Admin can see all (when implemented)

3. **File Safety**:
   - Blockchain hash MUST be anchored before file confirmed
   - records.json MUST be kept in sync with MySQL
   - File paths MUST be validated (no directory traversal)

4. **Appointments**:
   - Cannot double-book same doctor/time/date
   - Patient cannot book past appointments
   - Doctor can only approve/decline own appointments

5. **Tokens**:
   - Access tokens expire in 15 minutes
   - Refresh tokens expire in 7 days
   - Access tokens MUST be Bearer format in Authorization header

---

## Testing Without Automated Suite

1. **Use seedTestDoctor.js**:
```bash
npm run seed  # Creates test doctor
```

2. **Manual Testing Flow**:
   - Open frontend at http://localhost:5173
   - Login as test doctor
   - Create test patient (use Register)
   - Book appointment
   - Test each feature

3. **API Testing**:
   - Use Postman or curl
   - Include Authorization header
   - Check response status codes

4. **Database Verification**:
```bash
mysql -u root -p medivault_db
SELECT * FROM appointments;
SELECT * FROM users;
```

---

## Build & Deployment

**Development**:
```bash
npm run dev          # Backend
npm run dev          # Frontend (separate terminal)
```

**Production Build**:
```bash
npm run build        # Creates dist/
```

**Deployment Checklist**:
- [ ] .env configured for production
- [ ] Database migrated
- [ ] All tests passing
- [ ] No security vulnerabilities
- [ ] HTTPS enabled
- [ ] Monitoring configured

---

## Quick Reference: What File to Edit

| Task | Edit This File |
|------|----------------|
| Add new API endpoint | controllers/{domain}.js + routes/{domain}Routes.js |
| Fix bug in patient feature | patientController.js |
| Fix bug in appointments | appointmentController.js |
| Update patient UI | src/pages/patient/PatientDashboard.jsx |
| Fix authentication | authController.js + middleware/auth.js |
| Add React component | src/components/{domain}/{Component}.jsx |
| Change database schema | Manually via MySQL (no migrations) |
| Add environment variable | .env + .env.example |
| Change build config | vite.config.js (frontend) or server.js (backend) |

---

## Common Mistakes to Avoid

1. ❌ Using localStorage instead of useAuth() hook
   - ✅ Use useAuth() from AuthContext (once integrated)

2. ❌ Forgetting Bearer token in Authorization header
   - ✅ `Authorization: Bearer {token}`

3. ❌ Assuming admin routes exist
   - ✅ Check server.js for route mounting

4. ❌ Editing database directly without code
   - ✅ Always update both code and database

5. ❌ Not validating user owns resource
   - ✅ Always check `req.user.id === resource.owner_id`

6. ❌ Returning raw database errors to client
   - ✅ Wrap in try/catch, return generic error message

7. ❌ Blocking UI during async operations
   - ✅ Show loading spinner

8. ❌ Double-booking in appointments
   - ✅ Use database lock or unique constraint

9. ❌ Committing .env with secrets
   - ✅ Add to .gitignore; use .env.example

10. ❌ Forgetting to handle blockchain failures
    - ✅ Wrap in try/catch; cleanup on failure

---

## Summary for AI Agents

**To become productive immediately**:

1. Read FILE_ANALYSIS.md for file breakdown
2. Read ARCHITECTURE.md for data flows
3. Read API_REFERENCE.md for endpoint details
4. Check this file (AGENT_CONTEXT.md) when making changes
5. Use TODO_RECOMMENDATIONS.md as priority queue for improvements

**When adding features**:
- Follow the workflow in "Common Workflows" section
- Check "Critical Files That Work Together" before editing
- Test thoroughly with seedTestDoctor.js
- Verify invariants still hold

**When debugging**:
- Add logging
- Reproduce step-by-step
- Check database directly
- Use browser dev tools
- Check error messages carefully

**Most important**: Always understand what you're changing and why, before making changes.
