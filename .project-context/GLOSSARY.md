# MediVault - Glossary & Terminology

Project-specific terms, abbreviations, and definitions.

---

## Core Concepts

### MediVault
The product name. A secure digital health record system combining:
- React frontend for patient/doctor interfaces
- Express backend for APIs
- MySQL for persistent storage
- Ethereum blockchain for hash anchoring
- Python RAG service for AI-powered medical insights

---

### Role-Based Access Control (RBAC)
System dividing users into three categories:
- **Patient**: Can view own records, book appointments, grant access to doctors
- **Doctor**: Can search patients, view granted access records, write prescriptions
- **Admin**: Can approve doctors, view system stats (not yet implemented)

---

### Medical Records
Documents uploaded by patients or provided by doctors:
- Examples: X-rays, lab reports, prescriptions, medical notes
- Stored in `/uploads/` directory on server
- Metadata stored in `medical_records` table
- Hash anchored on blockchain for tamper-proof audit trail

---

### Appointments
Scheduled meetings between patient and doctor:
- States: `pending` (awaiting doctor response), `confirmed`, `declined`, `cancelled`
- Cannot be double-booked (single doctor cannot have two appointments at same time)
- Doctor can respond with approval/decline
- Patient can cancel anytime

---

### Prescriptions
Medicines prescribed by doctor to patient:
- Created by doctor after reviewing patient
- Includes: medicine name, dosage, duration, instructions, end date
- Patient views in dashboard
- Could include: refill requests, warnings, interactions

---

### Vital Signs
Physiological measurements:
- Heart rate (bpm)
- Blood pressure (systolic/diastolic, e.g., 120/80)
- Glucose (mg/dL)
- Temperature (°F)
- Weight (kg)

Patient logs vital signs; doctor reviews trends.

---

### Easy Access Token
**30-minute time-boxed access grant** from patient to doctor:
- Patient generates token after confirming appointment
- Token is random 64-character hex string
- Expires 30 minutes after creation
- Doctor uses token to view patient's full history without patient present
- Used during consultations for doctor to review records quickly
- Cannot be renewed automatically; patient must generate new token

---

### RAG (Retrieval-Augmented Generation)
AI technique combining:
1. **Retrieval**: Fetch relevant patient medical data from database
2. **Augmentation**: Provide data as context to LLM
3. **Generation**: LLM generates answer using context

**MediVault Usage**:
- Patient asks health question (e.g., "What medications am I on?")
- System retrieves patient's prescriptions, records, vitals
- Groq LLM generates answer using retrieved data
- Answer is grounded in patient's actual medical history (not hallucination)

---

### Canned Responses
Pre-written answers to known questions:
- Used when RAG not needed
- Examples: "What is your business hours?" → Fixed response
- Currently stored in code; should be in database
- Used to avoid unnecessary Groq API calls

---

### Patient Access Tokens
Database table tracking time-boxed access grants:
- Created when patient clicks "Easy Access" on appointment
- Contains: patient_id, doctor_id, access_token (random string), expires_at
- Validated when doctor uses token to view patient history
- Can be revoked by patient before expiry
- No automatic cleanup of expired tokens

---

### Refresh Tokens
Long-lived credentials used to obtain new access tokens:
- Issued during login
- Stored in database as Argon2-hashed value
- Valid for 7 days (default)
- User sends refresh token to `/auth/refresh` to get new access token
- Prevents need to re-login constantly
- Should be stored securely (httpOnly cookie, not localStorage in production)

---

## Technology Stack

### Frontend

**React 19.2.0**
Modern JavaScript UI library with hooks; used for component-based UI

**Vite 7.2.2**
Build tool and dev server; much faster than webpack

**React Router 7.9.6**
Client-side routing library; enables single-page navigation

**Tailwind CSS 4.1.17**
Utility-first CSS framework; styles components with class names

**Axios** (implied)
HTTP client for API calls from frontend

---

### Backend

**Express 5.1.0**
Web framework for Node.js; handles routing, middleware, request/response

**Node.js**
JavaScript runtime; powers backend server

**mysql2/promise 3.x**
MySQL driver with Promise support; handles database queries

**jsonwebtoken**
JWT creation and verification; handles authentication tokens

**argon2**
Password hashing algorithm; more secure than bcrypt

**web3.js 4.16.0**
Ethereum client library; interacts with blockchain

**multer**
Middleware for file uploads; handles multipart/form-data

**dotenv**
Loads environment variables from `.env` file

---

### Database

**MySQL 8.0+**
Relational database; stores users, appointments, records, etc.

**Tables**:
- `users`: Accounts (patients, doctors, admins)
- `doctor_profiles`: Extended doctor info
- `appointments`: Scheduled meetings
- `medical_records`: Uploaded documents metadata
- `prescriptions`: Medicines prescribed
- `vital_signs`: Health measurements
- `refresh_tokens`: Long-lived login tokens
- `patient_access_tokens`: Time-boxed access grants
- `patient_summaries`: RAG cache (summaries of patient history)

---

### Blockchain

**Ethereum Sepolia Testnet**
Development network for Ethereum testing (not production)

**Smart Contract**
On-chain code for `addRecord(hash)` function and `count()` getter

**Hash Anchoring**
Process of:
1. Computing SHA-256 hash of file
2. Storing hash on blockchain via smart contract
3. Recording transaction hash for audit trail

Provides immutable proof of file existence at specific time

---

### Python RAG Service

**Python 3.9+**
Language used for medical data processing and LLM integration

**Groq API**
LLM service; provides access to models like llama-3.3-70b-versatile

**mysql-connector-python**
MySQL driver for Python; retrieves patient data

---

## Abbreviations

| Abbr | Full Form | Definition |
|------|-----------|-----------|
| JWT | JSON Web Token | Stateless token for authentication |
| RBAC | Role-Based Access Control | Access determined by user role |
| RAG | Retrieval-Augmented Generation | AI technique using retrieved data |
| LLM | Large Language Model | AI model like GPT or Llama |
| RPC | Remote Procedure Call | Blockchain node communication protocol |
| ABI | Application Binary Interface | Smart contract function signatures |
| SQL | Structured Query Language | Database query language |
| CORS | Cross-Origin Resource Sharing | Browser security policy |
| TLS | Transport Layer Security | Encryption for HTTPS |
| SHA-256 | Secure Hash Algorithm 256-bit | Cryptographic hashing |
| Argon2 | Password hashing algorithm | More secure than bcrypt |
| HMR | Hot Module Replacement | Dev feature: live reload without page refresh |
| SEP | Sepolia ETH | Test currency on Sepolia testnet |
| ORM | Object-Relational Mapping | Abstraction layer for databases |
| REST | Representational State Transfer | API architectural style |

---

## File Paths

| Path | Purpose |
|------|---------|
| `/backend/server.js` | Express app entry point; starts server |
| `/backend/config/db.js` | MySQL connection pool configuration |
| `/backend/middleware/auth.js` | JWT verification middleware |
| `/backend/controllers/` | Route handler functions |
| `/backend/routes/` | Route definitions |
| `/backend/blockchain/blockchain.js` | Web3.js integration |
| `/backend/python/app.py` | RAG service entry point |
| `/backend/python/medical_summary.py` | RAG core logic |
| `/src/main.jsx` | React app entry point |
| `/src/pages/` | Page components (full screens) |
| `/src/components/` | Reusable components |
| `/src/context/` | React Context for state |
| `/src/api/` | API client utilities |
| `/dist/` | Production build output (not in repo) |
| `/.env` | Environment variables (git-ignored) |
| `/.env.example` | Template for environment variables |
| `/records.json` | Append-only log of file uploads |
| `/uploads/` | Directory for uploaded medical files |

---

## API Terminology

### Endpoints
HTTP addresses for API operations:
- `/auth/login`: POST request to authenticate
- `/patient/appointments`: GET to list appointments
- `/doctor/search`: GET to find patients

### Methods
HTTP verbs:
- **GET**: Retrieve data (safe, idempotent)
- **POST**: Create new resource
- **PUT**: Update existing resource
- **DELETE**: Remove resource
- **PATCH**: Partial update

### Request Body
JSON data sent to server (for POST/PUT)

### Response Body
JSON data returned by server

### Status Codes
- **200**: Success (GET/PUT/PATCH completed)
- **201**: Created (POST succeeded)
- **400**: Bad Request (invalid input)
- **401**: Unauthorized (missing/invalid auth)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **500**: Server Error

---

## Database Terminology

### Query
SQL command to retrieve/modify data

### Index
Database optimization; speeds up searches on specific column

### Transaction
Group of operations treated as atomic unit (all-or-nothing)

### Foreign Key
Column linking to another table; maintains referential integrity

### Primary Key
Unique identifier for each row

### JOIN
Combine rows from multiple tables based on common field

### LIKE
SQL pattern matching; `%` matches any characters

---

## Security Terminology

### Authentication
Verifying user identity (login with email/password)

### Authorization
Checking if authenticated user has permission (RBAC)

### Hashing
One-way encryption; password stored as hash, not plaintext

### Salt
Random value added to password before hashing; prevents rainbow table attacks

### Argon2
Modern password hashing algorithm; resistant to GPU attacks

### bcrypt
Older password hashing algorithm; still good but not as strong as Argon2

### Man-in-the-Middle Attack
Attacker intercepts communication between client and server

### TLS/SSL
Encryption protocol for HTTPS; prevents eavesdropping

---

## Blockchain Terminology

### Smart Contract
Self-executing code on blockchain; immutable once deployed

### Transaction
Action on blockchain; creates permanent record

### Gas
Fee paid to execute blockchain transaction

### Receipt
Confirmation of transaction completion; includes transaction hash

### Block
Group of transactions bundled together on blockchain

### Hash
Cryptographic fingerprint; tiny change in data = completely different hash

### Ethereum
Blockchain platform supporting smart contracts

### Sepolia Testnet
Development network for Ethereum (uses fake ETH, no real value)

### Private Key
Secret credential for signing blockchain transactions

---

## State Terminology

### Pending
Appointment awaiting doctor's response

### Confirmed
Appointment accepted by doctor; scheduled

### Declined
Appointment rejected by doctor

### Cancelled
Appointment terminated by patient

### Active
Access token is valid and not expired

### Expired
Access token no longer valid; must regenerate

### Revoked
Access token manually disabled by patient

---

## Development Terminology

### Dev Environment
Local development setup on developer's machine (localhost)

### Production Environment
Live deployed system serving real users

### Node.js
JavaScript runtime; powers backend server

### npm
Package manager for JavaScript; installs dependencies

### Package.json
Configuration file listing dependencies and scripts

### .env
Configuration file with environment variables (secrets)

### Middleware
Function that processes requests before route handler

### Route
HTTP endpoint definition

### Controller
Function handling route logic

### Component
Reusable React UI element

### Hook
React function for managing state/side effects

### State
Data that changes during component lifetime

### Props
Data passed from parent to child component

---

## Common Workflows

### Adding a Patient Feature
1. Identify requirement
2. Create controller function in `patientController.js`
3. Create route in `patientRoutes.js`
4. Create React component in `src/pages/patient/`
5. Test with seedTestDoctor.js

### Debugging an Issue
1. Identify error message
2. Check console logs (frontend and backend)
3. Add temporary logging
4. Reproduce issue step-by-step
5. Fix root cause, not symptom
6. Test all related features

### Deploying to Production
1. Update `.env` for production values
2. Run `npm run build` (frontend)
3. Deploy `dist/` to static file server
4. Deploy `backend/` to app server
5. Configure database (MySQL)
6. Test all features
7. Monitor for errors

---

## Summary

This glossary provides definitions for:
- **Core product concepts**: MediVault, RBAC, appointments, records, RAG
- **Technology stack**: React, Express, MySQL, Ethereum, Python
- **API terminology**: Endpoints, methods, status codes
- **Security concepts**: Authentication, authorization, hashing
- **Development workflow**: How to add features, debug, deploy

Refer back to this section when encountering unfamiliar terms or needing quick definitions.
