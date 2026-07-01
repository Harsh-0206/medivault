# MediVault - Configuration & Environment

Complete environment variable, build, and deployment configuration reference.

---

## Environment Variables

All environment variables should be set in a `.env` file in the project root.

### Database Configuration

```env
# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=medivault_user
DB_PASS=secure_password_here
DB_NAME=medivault_db
DB_MAX_CONNECTIONS=10
```

**Notes**:
- DB_HOST: MySQL server hostname (localhost for dev)
- DB_USER: MySQL user (should have permissions to create tables)
- DB_PASS: MySQL password (SECURITY RISK: logged to console; use secrets manager in production)
- DB_NAME: Database name (will be created if not exists)
- Typical connection string: `mysql://user:pass@localhost:3306/medivault_db`

---

### Authentication Configuration

```env
# JWT Secrets
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars_long
JWT_EXPIRE=15m
REFRESH_TOKEN_EXPIRE=7d
```

**Notes**:
- JWT_SECRET: Must be >32 characters, random, never committed to repo
- JWT_EXPIRE: Access token expiry (15 minutes recommended)
- REFRESH_TOKEN_EXPIRE: Refresh token expiry (7 days recommended)
- Generate secure secret: `openssl rand -base64 32`

---

### Blockchain Configuration

```env
# Ethereum Sepolia Testnet
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_CHAIN_ID=11155111
PRIVATE_KEY=0x... (hex string, 66 characters including 0x prefix)
CONTRACT_ADDRESS=0x...
CONTRACT_ABI_PATH=./abi.json
# OR
CONTRACT_ABI_JSON='[{"inputs":[...]...}]'
```

**Notes**:
- SEPOLIA_RPC_URL: RPC endpoint for Sepolia testnet
  - Infura: https://infura.io
  - Alchemy: https://www.alchemy.com
  - QuickNode: https://www.quicknode.com
- PRIVATE_KEY: Ethereum account private key (HIGHLY SENSITIVE)
  - Account must be funded with SEP (Sepolia testnet ETH)
  - Never commit to repo; use secrets manager
  - How to get test ETH: https://sepoliafaucet.com
- CONTRACT_ADDRESS: Smart contract address on Sepolia
  - Deploy contract or use existing address
- CONTRACT_ABI_PATH or CONTRACT_ABI_JSON: Smart contract interface
  - Either provide file path or inline JSON
  - ABI file should be JSON array

**Security Note**: Current implementation has:
```javascript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'  // DANGEROUS
```
This disables TLS verification. In production, should be removed and proper certificates used.

---

### Groq API Configuration

```env
# Groq AI API
GROQ_API_KEY=gsk_... (Groq API key)
GROQ_MODEL=llama-3.3-70b-versatile
```

**Notes**:
- GROQ_API_KEY: API key from https://console.groq.com
- GROQ_MODEL: Default LLM model (can override in code)
- Available models:
  - llama-3.3-70b-versatile (default, recommended)
  - mixtral-8x7b-32768
  - gemma-7b-it
  - See https://console.groq.com/docs/models for latest
- Model is used by Python RAG service

---

### Python Service Configuration

```env
# Python RAG Service
PYTHON_PATH=/usr/bin/python3
# OR (Windows)
PYTHON_PATH=C:\Python39\python.exe
```

**Notes**:
- Points to Python executable used for RAG subprocess
- Default: `python` (from PATH)
- Ensure Python 3.9+ installed with dependencies

---

### Server Configuration

```env
# Express Server
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:5173
```

**Notes**:
- NODE_ENV: development or production
- PORT: Express server port
- FRONTEND_URL: Used for CORS whitelist
- CORS currently allows: http://localhost:5173 with credentials

---

### File Upload Configuration

```env
# File Upload Limits
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_DIR=./uploads
```

**Notes**:
- MAX_FILE_SIZE: Maximum file size in bytes (10MB = 10485760)
- UPLOAD_DIR: Directory to store uploaded files
- Ensure directory exists and is writable
- Default: ./uploads (relative to backend/)

---

## Package.json Scripts

### Frontend Scripts

```json
{
  "scripts": {
    "dev": "vite --port 5173 --open",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src"
  }
}
```

**Development**: `npm run dev` → Start Vite dev server on http://localhost:5173

**Build**: `npm run build` → Create production build in `dist/`

**Lint**: `npm run lint` → Check code quality

---

### Backend Scripts

```json
{
  "scripts": {
    "start": "node backend/server.js",
    "dev": "nodemon backend/server.js",
    "seed": "node backend/scripts/seedTestDoctor.js",
    "seed-data": "node backend/scripts/seedDemoData.js"
  }
}
```

**Start**: `npm start` → Run Express server on port 4000

**Dev**: `npm run dev` → Run with auto-reload (requires nodemon)

**Seed**: `npm run seed` → Insert test doctor account

**Seed Data**: `npm run seed-data` → Populate demo data

---

## .env.example (Template)

Create `.env` file based on this template:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=password
DB_NAME=medivault_db
DB_MAX_CONNECTIONS=10

# JWT
JWT_SECRET=your_super_secret_key_at_least_32_chars_long
JWT_EXPIRE=15m
REFRESH_TOKEN_EXPIRE=7d

# Blockchain (Sepolia)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_CHAIN_ID=11155111
PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
CONTRACT_ABI_PATH=./abi.json

# Groq API
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Server
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:5173

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Python
PYTHON_PATH=python3
```

---

## Vite Configuration

### `vite.config.js` (Frontend)

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      }
    }
  }
})
```

**Notes**:
- Hot Module Replacement (HMR) enabled by default
- Proxy: Requests to `/api` forward to `http://localhost:4000`
- Compile target: ESNext (modern browsers)
- Build output: `dist/` directory

### Build Output

```
dist/
├── index.html       (main HTML)
├── assets/
│   ├── index-abc123.js    (main bundle)
│   ├── index-abc123.css   (styles)
│   └── chunk-xyz789.js    (code split)
```

---

## Express Server Configuration

### `backend/server.js` Key Settings

```javascript
// CORS
const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

// Body Parser Limits
app.use(express.json({limit: '10mb'}))
app.use(express.urlencoded({limit: '10mb'}))

// Static File Serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Port
const PORT = process.env.PORT || 4000
```

**Notes**:
- CORS: Only allows requests from `http://localhost:5173`
- Body limit: 10MB (for large medical records)
- Static files: Serve uploads at `/uploads/` endpoint
- Change FRONTEND_URL for production deployments

---

## MySQL Schema (Inferred from Code)

### Core Tables

```sql
-- Users (patients, doctors, admins)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('patient', 'doctor', 'admin') NOT NULL,
  is_verified BOOLEAN DEFAULT 0,
  phone VARCHAR(20),
  date_of_birth DATE,
  blood_group VARCHAR(10),
  address TEXT,
  emergency_contact VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Doctor Profiles
CREATE TABLE doctor_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  specialty VARCHAR(100),
  reg_number VARCHAR(50),
  degree VARCHAR(100),
  location VARCHAR(255),
  consultation_fee DECIMAL(10,2),
  experience INT,
  available_days VARCHAR(100),
  available_time_start TIME,
  available_time_end TIME,
  slot_duration INT DEFAULT 30,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Medical Records
CREATE TABLE medical_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  doctor_id INT,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  record_date DATE,
  file_path VARCHAR(255),
  file_hash VARCHAR(64),
  transaction_hash VARCHAR(255),
  block_number VARCHAR(50),
  notes TEXT,
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

-- Appointments
CREATE TABLE appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  doctor_id INT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  reason VARCHAR(255),
  status ENUM('pending', 'confirmed', 'declined', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

-- Prescriptions
CREATE TABLE prescriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  doctor_id INT,
  medicine_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  duration VARCHAR(100),
  instructions TEXT,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

-- Vital Signs
CREATE TABLE vital_signs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  heart_rate INT,
  blood_pressure VARCHAR(20),
  glucose INT,
  temperature DECIMAL(5,2),
  weight DECIMAL(5,2),
  recorded_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id)
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  token_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (DATE_ADD(NOW(), INTERVAL 7 DAY)),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Patient Access Tokens (Easy Access)
CREATE TABLE patient_access_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  doctor_id INT,
  access_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

-- Patient Summaries (RAG Cache)
CREATE TABLE patient_summaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  summary_text LONGTEXT,
  summary_date DATE,
  last_record_date DATE,
  data_included TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id)
);
```

---

## Database Migration Setup (Manual)

Since no migration system is tracked:

1. **Create database**:
   ```sql
   CREATE DATABASE medivault_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Create tables** (run SQL above)

3. **Insert initial data** (optional):
   ```bash
   npm run seed              # Test doctor
   npm run seed-data         # Demo data
   ```

---

## Development Workflow

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env
# Edit .env with your values

# 3. Create MySQL database
# Run SQL schema above

# 4. Start backend
npm run dev

# 5. Start frontend (new terminal)
npm run dev

# 6. Access frontend
# Open http://localhost:5173
```

### Running Tests

```bash
# Seed test data
npm run seed
npm run seed-data

# Use frontend UI to test
# Or use API tools (Postman, curl, etc.)
```

---

## Deployment Checklist

- [ ] Set NODE_ENV=production
- [ ] Set FRONTEND_URL to production domain
- [ ] Use strong JWT_SECRET (generate new one)
- [ ] Set database credentials (use secrets manager, not .env)
- [ ] Set blockchain credentials securely
- [ ] Set Groq API key securely
- [ ] Enable TLS verification (remove NODE_TLS_REJECT_UNAUTHORIZED)
- [ ] Configure CORS for production domain
- [ ] Set MAX_FILE_SIZE appropriately
- [ ] Configure upload directory (persistent storage)
- [ ] Set database backups
- [ ] Set up monitoring and logging
- [ ] Configure email notifications (if adding)
- [ ] Test all features before deployment
- [ ] Set up CI/CD pipeline (GitHub Actions, etc.)

---

## Production Recommendations

1. **Database**: Use managed database service (AWS RDS, DigitalOcean Managed, etc.)
2. **Secrets**: Use secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
3. **Frontend**: Deploy to CDN (Vercel, Netlify, AWS CloudFront, etc.)
4. **Backend**: Deploy to server or container (Docker, Kubernetes, AWS ECS, etc.)
5. **Blockchain**: Consider using Mainnet (Ethereum) instead of Sepolia testnet
6. **Monitoring**: Set up logging and alerting (DataDog, New Relic, etc.)
7. **Backup**: Regular database backups
8. **SSL/TLS**: Use HTTPS with valid certificates
9. **Rate Limiting**: Implement rate limiting on API endpoints
10. **Audit Logging**: Log all sensitive operations for compliance
