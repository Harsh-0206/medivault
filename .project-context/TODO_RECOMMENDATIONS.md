# MediVault - TODO & Recommendations

Prioritized list of improvements, fixes, and feature recommendations.

---

## 1. CRITICAL FIXES (Do First)

### 1.1 Fix TLS Verification Disabled

**File**: `backend/blockchain/blockchain.js`

**Current**:
```javascript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'  // DANGEROUS
```

**Fix**:
- Remove this line entirely
- Use proper SSL certificates for HTTPS
- If using self-signed certs during dev: use certificate pinning or proper local setup

**Effort**: 1 hour
**Impact**: Eliminates man-in-the-middle vulnerability

---

### 1.2 Stop Logging Credentials

**File**: `backend/config/db.js`

**Current**:
```javascript
console.log('Database config:', {host, user, password})
```

**Fix**:
```javascript
console.log('Database connected to host:', host)
// Don't log credentials
```

**Effort**: 30 minutes
**Impact**: Removes credential leakage

---

### 1.3 Fix RequireAuth Redirect Mismatch

**File**: `src/components/auth/RequireAuth.jsx` and `src/App.jsx`

**Current**:
```javascript
// RequireAuth.jsx redirects to
navigate('/doctor-dashboard')

// But App.jsx route is
<Route path="/doctor" ... />
```

**Fix**: Make paths consistent
```javascript
// Option 1: Update routes to match redirects
<Route path="/doctor-dashboard" ... />

// Option 2: Update redirects to match routes
navigate('/doctor')
```

**Effort**: 1 hour
**Impact**: Fixes redirect loops

---

### 1.4 Fix Broken /patient/search Route

**File**: `backend/routes/patientRoutes.js` and `backend/server.js`

**Current**:
```javascript
// patientRoutes.js
router.get('/search', searchPatient)

// searchPatient tries to use
const db = req.app.get('db')  // NOT SET
```

**Fix**: Pass db through different mechanism
```javascript
// Option 1: Add to server.js
app.set('db', pool)

// Option 2: Use middleware
router.use(dbMiddleware)
```

**Effort**: 1.5 hours
**Impact**: Enables doctor patient search

---

### 1.5 Mount Admin Routes

**File**: `backend/server.js`

**Current**:
```javascript
// Routes not mounted for admin
// app.use('/admin', adminRoutes) // Missing
```

**Fix**:
1. Create `backend/routes/adminRoutes.js`
2. Create `backend/controllers/adminController.js`
3. Mount in server.js:
```javascript
app.use('/admin', adminRoutes)
```
4. Implement functions:
   - approveDoctors()
   - getDoctorList()
   - rejectDoctor()
   - viewSystemStats()

**Effort**: 3 hours
**Impact**: Enables admin functionality

---

## 2. HIGH PRIORITY FIXES (Next Sprint)

### 2.1 Add Rate Limiting

**File**: `backend/middleware/rateLimiter.js` (new)

**Implementation**:
```javascript
const rateLimit = require('express-rate-limit')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later'
})

app.post('/auth/login', loginLimiter, loginHandler)
```

**Effort**: 2 hours
**Impact**: Prevents brute force attacks

---

### 2.2 Fix TOCTOU Race Condition in Appointments

**File**: `backend/controllers/appointmentController.js`

**Current**:
```javascript
const booked = await db.query('SELECT * FROM appointments WHERE ...')
if (booked.length > 0) return error
// Gap here! Another request could book same slot
await db.query('INSERT INTO appointments ...')
```

**Fix 1 (Database Lock)**:
```javascript
// Use SELECT ... FOR UPDATE
const [booked] = await db.query(
  'SELECT * FROM appointments WHERE doctor_id = ? AND appointment_date = ? FOR UPDATE',
  [doctorId, date]
)
// Cannot be interrupted; other requests wait
```

**Fix 2 (Unique Constraint + Error Handling)**:
```javascript
// Add unique constraint to appointments table
ALTER TABLE appointments ADD UNIQUE(doctor_id, appointment_date, appointment_time)

// Catch duplicate error
try {
  await db.query('INSERT INTO appointments ...')
} catch (err) {
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({message: 'Slot already booked'})
  }
  throw err
}
```

**Effort**: 2 hours
**Impact**: Prevents double-booking

---

### 2.3 Add Subprocess Timeout

**File**: `backend/controllers/ragController.js`

**Current**:
```javascript
const child = spawn(pythonCmd, args)
// No timeout; can hang forever
```

**Fix**:
```javascript
const child = spawn(pythonCmd, args)
let killed = false

const timeout = setTimeout(() => {
  killed = true
  child.kill()
}, 30000) // 30 second timeout

child.on('close', (code) => {
  clearTimeout(timeout)
  if (killed) {
    return res.status(500).json({
      success: false,
      message: 'Query took too long; timeout'
    })
  }
  // Process result
})
```

**Effort**: 1.5 hours
**Impact**: Prevents request hangs

---

### 2.4 Add Transaction Support

**File**: `backend/routes/fileRoutes.js`

**Implementation**:
```javascript
const connection = await db.getConnection()
try {
  await connection.beginTransaction()
  
  // Upload file
  // Anchor blockchain
  // Append records.json
  
  // Insert database
  await connection.query('INSERT INTO medical_records ...')
  
  await connection.commit()
} catch (err) {
  await connection.rollback()
  // Cleanup: delete file, remove from records.json
  throw err
} finally {
  connection.release()
}
```

**Effort**: 3 hours
**Impact**: Ensures data consistency

---

### 2.5 Optimize Token Lookup

**File**: `backend/controllers/authController.js`

**Current** (O(n)):
```javascript
const allTokens = await db.query('SELECT * FROM refresh_tokens')
for (let token of allTokens) {
  if (await argon2.verify(token.token_hash, refreshToken)) {
    return token
  }
}
```

**Fix**: Add index on user_id
```sql
ALTER TABLE refresh_tokens ADD INDEX idx_user_id (user_id)
```

Then use:
```javascript
// Instead of iterating all tokens, query by user
const tokens = await db.query(
  'SELECT * FROM refresh_tokens WHERE user_id = ?',
  [userId]
)
for (let token of tokens) {
  if (await argon2.verify(token.token_hash, refreshToken)) {
    return token
  }
}
```

**Effort**: 1 hour
**Impact**: Improves performance on large token tables

---

## 3. MEDIUM PRIORITY IMPROVEMENTS (2-3 Sprint Backlog)

### 3.1 Integrate AuthProvider

**File**: `src/main.jsx`

**Current**:
```javascript
ReactDOM.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
```

**Fix**:
```javascript
import { AuthProvider } from './context/AuthContext'

ReactDOM.render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
)
```

Then use `useAuth()` hook in components instead of localStorage.

**Effort**: 3 hours
**Impact**: Centralizes auth state management

---

### 3.2 Add Pagination to Patient History

**File**: `backend/controllers/doctorController.js`

**Current**:
```javascript
SELECT * FROM medical_records WHERE patient_id = ?
// Returns all records; could be huge
```

**Fix**:
```javascript
const limit = req.query.limit || 10
const offset = req.query.offset || 0

const records = await db.query(
  'SELECT * FROM medical_records WHERE patient_id = ? LIMIT ? OFFSET ?',
  [patientId, limit, offset]
)

const total = await db.query(
  'SELECT COUNT(*) as count FROM medical_records WHERE patient_id = ?',
  [patientId]
)

return {records, total: total[0].count, limit, offset}
```

**Effort**: 2 hours
**Impact**: Improves memory usage and response time

---

### 3.3 Split PatientDashboard Component

**File**: `src/pages/patient/PatientDashboard.jsx`

**Current**: ~500 lines, handles 6 features

**Split into**:
- `PatientDashboard.jsx` (container, orchestrator)
- `PatientProfileSection.jsx`
- `MedicalRecordsSection.jsx`
- `AppointmentsSection.jsx`
- `PrescriptionsSection.jsx`
- `VitalSignsSection.jsx`
- `HealthChatSection.jsx`

**Effort**: 4 hours
**Impact**: Easier testing, maintenance, and code reuse

---

### 3.4 Add Missing Indexes

**File**: Database schema

```sql
ALTER TABLE users ADD INDEX idx_email (email);
ALTER TABLE users ADD INDEX idx_role (role);
ALTER TABLE appointments ADD INDEX idx_patient_id (patient_id);
ALTER TABLE appointments ADD INDEX idx_doctor_id (doctor_id);
ALTER TABLE medical_records ADD INDEX idx_patient_id (patient_id);
ALTER TABLE prescriptions ADD INDEX idx_patient_id (patient_id);
ALTER TABLE vital_signs ADD INDEX idx_patient_id (patient_id);
ALTER TABLE refresh_tokens ADD INDEX idx_user_id (user_id);
ALTER TABLE patient_access_tokens ADD INDEX idx_patient_id (patient_id);
ALTER TABLE patient_access_tokens ADD INDEX idx_doctor_id (doctor_id);
```

**Effort**: 1 hour
**Impact**: Significant query performance improvement

---

## 4. LOW PRIORITY ENHANCEMENTS (Backlog)

### 4.1 Add Audit Logging

Create `access_logs` table:
```sql
CREATE TABLE access_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100),
  resource_type VARCHAR(100),
  resource_id INT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

Then log sensitive actions:
```javascript
// When doctor views patient history
await db.query('INSERT INTO access_logs (user_id, action, resource_type, resource_id) VALUES (?, ?, ?, ?)',
  [doctorId, 'view_patient_history', 'patient', patientId])
```

---

### 4.2 Centralize Canned Responses

Create table:
```sql
CREATE TABLE canned_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  query_pattern VARCHAR(255),
  response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

Then query instead of hardcoding:
```javascript
const canned = await db.query(
  'SELECT response FROM canned_responses WHERE query_pattern = ?',
  [normalizeQuery(userQuery)]
)
```

---

### 4.3 Implement Redis Caching

Cache frequently accessed data:
```javascript
// Cache available slots for 5 minutes
const cacheKey = `slots:${doctorId}:${date}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

const slots = generateSlots(...)
await redis.setex(cacheKey, 300, JSON.stringify(slots))
return slots
```

---

### 4.4 Add Email Notifications

Send emails for:
- Appointment confirmations
- Prescription updates
- Access token grants
- Doctor approvals

Use Nodemailer or SendGrid.

---

### 4.5 Implement Python Connection Pooling

Instead of spawning new process per query:
```python
# Start long-running Python service
# Backend communicates via HTTP or socket
```

---

## 5. Feature Requests (Future)

- [ ] Real-time notifications (WebSocket)
- [ ] Telemedicine video calls
- [ ] AI-powered symptom checker
- [ ] Medicine recommendation engine
- [ ] Appointment reminders
- [ ] Two-factor authentication
- [ ] Dark mode
- [ ] Mobile app (React Native)
- [ ] Data export functionality
- [ ] Insurance integration

---

## Implementation Timeline

### Week 1 (Critical)
- [ ] Fix TLS verification
- [ ] Stop logging credentials
- [ ] Fix RequireAuth redirects
- [ ] Fix /patient/search route
- [ ] Mount admin routes

### Week 2 (High Priority)
- [ ] Add rate limiting
- [ ] Fix TOCTOU race condition
- [ ] Add subprocess timeout
- [ ] Add transaction support
- [ ] Optimize token lookup

### Week 3-4 (Medium Priority)
- [ ] Integrate AuthProvider
- [ ] Add pagination
- [ ] Split PatientDashboard
- [ ] Add missing indexes
- [ ] Add audit logging

### Month 2 (Low Priority)
- [ ] Centralize canned responses
- [ ] Add Redis caching
- [ ] Implement email notifications
- [ ] Python connection pooling
- [ ] Test suite implementation

---

## Estimated Total Effort

- **Critical Fixes**: 5-7 hours
- **High Priority**: 10-12 hours
- **Medium Priority**: 12-15 hours
- **Low Priority**: 8-10 hours
- **Test Suite**: 20-30 hours

**Total**: 55-74 hours (1-2 weeks full-time development)

---

## Success Metrics

After implementing all recommendations:
- ✅ 0 critical security vulnerabilities
- ✅ 60%+ test coverage
- ✅ Average page load <500ms
- ✅ Zero race condition issues
- ✅ Complete audit trail for compliance
- ✅ Admin functionality fully working
- ✅ All routes accessible and tested
