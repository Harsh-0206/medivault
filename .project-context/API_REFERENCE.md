# MediVault - API Reference

Complete HTTP API documentation: all endpoints, methods, parameters, responses.

---

## Authentication Routes

### POST /auth/register

**Purpose**: Register new patient account

**Authentication**: None required

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response** (200):
```json
{
  "message": "Patient registered successfully",
  "user": {
    "id": 42,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "patient"
  }
}
```

**Errors**:
- 400: Missing required fields
- 400: Email already registered
- 500: Database error

---

### POST /auth/register-doctor

**Purpose**: Register new doctor account (unverified, requires admin approval)

**Authentication**: None required

**Request Body** (multipart/form-data):
```
name: "Dr. Smith"
email: "smith@hospital.com"
password: "DoctorPassword123"
regNumber: "REG123456"
degree: "MBBS"
document: <file>  (PDF, DOC, DOCX)
```

**Response** (200):
```json
{
  "message": "Doctor registration submitted for approval",
  "doctor": {
    "id": 15,
    "name": "Dr. Smith",
    "email": "smith@hospital.com",
    "role": "doctor",
    "is_verified": 0
  }
}
```

**Errors**:
- 400: Missing required fields or file
- 400: Invalid file type (must be PDF/DOC/DOCX)
- 400: Email already registered
- 500: File upload error

---

### POST /auth/login

**Purpose**: Authenticate user and issue tokens

**Authentication**: None required

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123",
  "role": "patient"
}
```

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
  "role": "patient",
  "user": {
    "id": 42,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Token Details**:
- `token`: JWT valid for 15 minutes
- `refreshToken`: Refresh token for new access token
- Headers must include: `Authorization: Bearer {token}`

**Errors**:
- 400: Missing email, password, or role
- 401: Invalid email or password
- 403: Doctor account not verified yet
- 400: Role doesn't match user's role in DB

---

### POST /auth/refresh

**Purpose**: Generate new access token using refresh token

**Authentication**: Required (Bearer token, but uses refreshToken from body)

**Request Body**:
```json
{
  "refreshToken": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0"
}
```

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "xyz...",
  "role": "patient"
}
```

**Errors**:
- 400: Missing refreshToken
- 401: Invalid or expired refreshToken
- 500: Token lookup error

---

## Patient Routes

### GET /patient/profile

**Purpose**: Fetch authenticated patient's profile

**Authentication**: Required (Bearer token, role='patient')

**Parameters**: None

**Response** (200):
```json
{
  "id": 42,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "patient",
  "dateOfBirth": "1985-03-15",
  "bloodGroup": "O+",
  "phone": "9876543210",
  "address": "123 Main St, City",
  "emergencyContact": "Jane Doe",
  "created_at": "2025-01-10T08:30:00Z"
}
```

**Errors**:
- 401: Missing or invalid token

---

### PUT /patient/profile

**Purpose**: Update patient profile

**Authentication**: Required (Bearer token, role='patient')

**Request Body** (all optional):
```json
{
  "name": "John Doe Updated",
  "dateOfBirth": "1985-03-15",
  "bloodGroup": "O+",
  "phone": "9876543210",
  "address": "456 Oak Ave, City",
  "emergencyContact": "Jane Doe"
}
```

**Response** (200):
```json
{
  "message": "Profile updated successfully",
  "updated_fields": ["name", "phone"]
}
```

**Errors**:
- 400: Invalid data format

---

### GET /patient/medical-records

**Purpose**: List patient's medical records

**Authentication**: Required (Bearer token, role='patient')

**Parameters**: 
- `limit` (query): Max records to return (default 10)
- `offset` (query): Pagination offset (default 0)

**Response** (200):
```json
{
  "records": [
    {
      "id": 100,
      "patient_id": 42,
      "title": "Chest X-Ray",
      "type": "image",
      "record_date": "2025-06-30",
      "file_path": "/uploads/chest_xray.png",
      "notes": "Annual checkup",
      "file_hash": "a1b2c3d4...",
      "transaction_hash": "0xabc123def456",
      "block_number": "1234567",
      "uploaded_by": 42,
      "created_at": "2025-06-30T10:30:00Z"
    }
  ],
  "total": 5
}
```

---

### POST /files/upload

**Purpose**: Upload medical file with blockchain anchoring

**Authentication**: Required (Bearer token)

**Request Body** (multipart/form-data):
```
file: <binary>
title: "Chest X-Ray"
type: "image"
recordDate: "2025-06-30"
notes: "Annual checkup"
doctor_id: (optional, for doctor uploads)
```

**Allowed File Types**: .pdf, .jpg, .jpeg, .png, .doc, .docx, .xlsx, .xls

**Max File Size**: 10MB

**Response** (200):
```json
{
  "success": true,
  "fileHash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
  "transactionHash": "0xabc123def456789...",
  "blockNumber": "1234567",
  "recordId": 100,
  "filePath": "/uploads/chest_xray_1719747000000.png",
  "message": "File uploaded and anchored on blockchain"
}
```

**Errors**:
- 400: Invalid file type
- 400: File size exceeds 10MB
- 400: Missing title or type
- 500: Blockchain transaction failed
- 500: Database error

---

### DELETE /patient/medical-records/:recordId

**Purpose**: Delete medical record and file

**Authentication**: Required (Bearer token, role='patient')

**Response** (200):
```json
{
  "message": "Record deleted successfully",
  "recordId": 100
}
```

**Errors**:
- 404: Record not found
- 403: Patient doesn't own record
- 500: File deletion error

---

### GET /patient/appointments

**Purpose**: List patient's appointments

**Authentication**: Required (Bearer token, role='patient')

**Response** (200):
```json
{
  "appointments": [
    {
      "id": 50,
      "patient_id": 42,
      "doctor_id": 15,
      "doctor_name": "Dr. Smith",
      "doctor_specialty": "Cardiology",
      "appointment_date": "2025-07-10",
      "appointment_time": "10:00:00",
      "reason": "Routine checkup",
      "status": "confirmed",
      "created_at": "2025-06-28T14:20:00Z"
    }
  ]
}
```

---

### POST /patient/appointments

**Purpose**: Book new appointment

**Authentication**: Required (Bearer token, role='patient')

**Request Body**:
```json
{
  "doctor_id": 15,
  "appointment_date": "2025-07-10",
  "appointment_time": "10:00:00",
  "reason": "Routine checkup"
}
```

**Response** (201):
```json
{
  "message": "Appointment booked successfully",
  "appointment": {
    "id": 50,
    "patient_id": 42,
    "doctor_id": 15,
    "appointment_date": "2025-07-10",
    "appointment_time": "10:00:00",
    "reason": "Routine checkup",
    "status": "pending"
  }
}
```

**Errors**:
- 400: Slot already booked
- 400: Doctor not available on that date
- 400: Invalid date/time format
- 404: Doctor not found

---

### GET /patient/prescriptions

**Purpose**: List patient's prescriptions

**Authentication**: Required (Bearer token, role='patient')

**Response** (200):
```json
{
  "prescriptions": [
    {
      "id": 200,
      "patient_id": 42,
      "doctor_id": 15,
      "doctor_name": "Dr. Smith",
      "medicine_name": "Lisinopril",
      "dosage": "10mg",
      "duration": "30 days",
      "instructions": "Take once daily with food",
      "end_date": "2025-07-20",
      "created_at": "2025-06-20T09:15:00Z"
    }
  ]
}
```

---

### GET /patient/vital-signs

**Purpose**: List patient's vital signs history

**Authentication**: Required (Bearer token, role='patient')

**Response** (200):
```json
{
  "vital_signs": [
    {
      "id": 300,
      "patient_id": 42,
      "heart_rate": 72,
      "blood_pressure": "120/80",
      "glucose": 95,
      "temperature": 98.6,
      "weight": 75,
      "recorded_date": "2025-06-30",
      "created_at": "2025-06-30T08:00:00Z"
    }
  ]
}
```

---

### POST /patient/vital-signs

**Purpose**: Log new vital signs

**Authentication**: Required (Bearer token, role='patient')

**Request Body**:
```json
{
  "heart_rate": 72,
  "blood_pressure": "120/80",
  "glucose": 95,
  "temperature": 98.6,
  "weight": 75,
  "recordedDate": "2025-06-30"
}
```

**Response** (201):
```json
{
  "message": "Vital signs recorded successfully",
  "vital": {
    "id": 300,
    "patient_id": 42,
    "heart_rate": 72,
    "recorded_date": "2025-06-30"
  }
}
```

---

### GET /patient/dashboard

**Purpose**: Get patient dashboard overview

**Authentication**: Required (Bearer token, role='patient')

**Response** (200):
```json
{
  "upcoming_appointments": 3,
  "total_medical_records": 15,
  "total_prescriptions": 5,
  "total_vital_signs": 24,
  "last_appointment": {
    "date": "2025-06-25",
    "doctor": "Dr. Smith"
  }
}
```

---

### POST /patient/rag/chat

**Purpose**: Ask health question via RAG service

**Authentication**: Required (Bearer token, role='patient')

**Request Body**:
```json
{
  "message": "What medications am I currently on?",
  "top_k": 5
}
```

**Response** (200):
```json
{
  "success": true,
  "answer": "Based on your medical records, you are currently on Lisinopril 10mg daily and Metformin 500mg twice daily...",
  "patient_id": 42,
  "query": "What medications am I currently on?",
  "model": "llama-3.3-70b-versatile",
  "retrieved_chunks": ["Lisinopril 10mg", "Metformin 500mg"],
  "message": "Query answered using patient history"
}
```

**Errors**:
- 400: Message empty
- 500: GROQ_API_KEY not configured
- 500: Python subprocess error
- 500: Database connection error

---

## Doctor Routes

### GET /doctor/dashboard

**Purpose**: Get doctor dashboard overview

**Authentication**: Required (Bearer token, role='doctor')

**Response** (200):
```json
{
  "today_appointments": 5,
  "total_patients": 42,
  "recent_prescriptions": [
    {
      "id": 200,
      "patient_name": "John Doe",
      "medicine": "Lisinopril",
      "created_at": "2025-06-30"
    }
  ],
  "recent_records": [
    {
      "id": 100,
      "patient_name": "John Doe",
      "title": "Chest X-Ray",
      "created_at": "2025-06-30"
    }
  ]
}
```

---

### GET /doctor/search

**Purpose**: Search for patients by name, ID, email, or phone

**Authentication**: Required (Bearer token, role='doctor')

**Parameters**:
- `query` (query): Search term

**Response** (200):
```json
{
  "patients": [
    {
      "id": 42,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "date_of_birth": "1985-03-15",
      "blood_group": "O+"
    }
  ]
}
```

**Errors**:
- 400: Query empty

---

### GET /doctor/patient/:id/history

**Purpose**: Retrieve patient's full history

**Authentication**: Required (Bearer token, role='doctor') + patient access token validation

**Parameters**: None

**Response** (200):
```json
{
  "patient": {
    "id": 42,
    "name": "John Doe",
    "date_of_birth": "1985-03-15",
    "blood_group": "O+",
    "phone": "9876543210"
  },
  "vital_signs": [...],
  "medical_records": [...],
  "prescriptions": [...],
  "appointments": [...]
}
```

---

## Appointment Routes

### GET /appointments/doctor/:doctorId/slots

**Purpose**: Get available appointment slots for doctor on specific date

**Authentication**: None required

**Parameters**:
- `date` (query): Date in YYYY-MM-DD format

**Response** (200):
```json
{
  "date": "2025-07-10",
  "slots": [
    {"time": "09:00", "available": true},
    {"time": "09:30", "available": false},
    {"time": "10:00", "available": true}
  ]
}
```

**Errors**:
- 400: Invalid date format
- 404: Doctor not found
- 400: Doctor not available on that day

---

### GET /appointments/doctor/availability

**Purpose**: Get doctor's availability settings (days and hours)

**Authentication**: Required (Bearer token, role='doctor')

**Response** (200):
```json
{
  "availability": {
    "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": false},
    "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "friday": {"enabled": true, "start": "09:00", "end": "14:00"},
    "saturday": {"enabled": false},
    "sunday": {"enabled": false}
  }
}
```

---

### PUT /appointments/doctor/availability

**Purpose**: Update doctor's availability

**Authentication**: Required (Bearer token, role='doctor')

**Request Body**:
```json
{
  "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "wednesday": {"enabled": false},
  "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
  "friday": {"enabled": true, "start": "09:00", "end": "14:00"},
  "saturday": {"enabled": false},
  "sunday": {"enabled": false}
}
```

**Response** (200):
```json
{
  "message": "Availability updated successfully"
}
```

---

### GET /appointments/doctor

**Purpose**: Get doctor's appointments

**Authentication**: Required (Bearer token, role='doctor')

**Response** (200):
```json
{
  "appointments": [
    {
      "id": 50,
      "patient_id": 42,
      "patient_name": "John Doe",
      "appointment_date": "2025-07-10",
      "appointment_time": "10:00:00",
      "reason": "Routine checkup",
      "status": "confirmed"
    }
  ]
}
```

---

### POST /appointments/:id/respond

**Purpose**: Doctor approves or declines appointment

**Authentication**: Required (Bearer token, role='doctor')

**Request Body**:
```json
{
  "status": "confirmed"
}
```

**Allowed Statuses**: `"confirmed"`, `"declined"`

**Response** (200):
```json
{
  "message": "Appointment response recorded",
  "appointment": {
    "id": 50,
    "status": "confirmed"
  }
}
```

---

### POST /appointments/:id/easy-access

**Purpose**: Patient grants doctor 30-minute access to history

**Authentication**: Required (Bearer token, role='patient')

**Response** (200):
```json
{
  "access_token": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
  "expiresAt": "2025-06-30T11:15:00Z",
  "message": "Access token generated successfully"
}
```

---

### GET /appointments/patient-history/:token

**Purpose**: Access patient history using access token (used by doctor)

**Authentication**: Optional; validated via token parameter

**Parameters**:
- `token` (URL): Access token from easy-access grant

**Response** (200):
```json
{
  "patient": {...},
  "vital_signs": [...],
  "medical_records": [...],
  "prescriptions": [...],
  "appointments": [...]
}
```

**Errors**:
- 403: Token invalid or expired
- 403: Token for different doctor

---

## Doctors Routes

### GET /doctors/search

**Purpose**: Search verified doctors (public endpoint)

**Authentication**: None required

**Parameters**:
- `query` (query): Doctor name or specialty

**Response** (200):
```json
{
  "doctors": [
    {
      "id": 15,
      "name": "Dr. Smith",
      "specialty": "Cardiology",
      "location": "City Hospital",
      "consultation_fee": 500,
      "experience": "10 years",
      "is_verified": 1
    }
  ]
}
```

---

## Prescription Routes

### POST /doctor/prescriptions

**Purpose**: Doctor creates prescription for patient

**Authentication**: Required (Bearer token, role='doctor')

**Request Body**:
```json
{
  "patient_id": 42,
  "medicine_name": "Lisinopril",
  "dosage": "10mg",
  "duration": "30 days",
  "instructions": "Take once daily with food",
  "end_date": "2025-07-20"
}
```

**Response** (201):
```json
{
  "message": "Prescription created successfully",
  "prescription": {
    "id": 200,
    "patient_id": 42,
    "doctor_id": 15,
    "medicine_name": "Lisinopril",
    "dosage": "10mg",
    "duration": "30 days"
  }
}
```

---

### GET /doctor/prescriptions/patient/:patientId

**Purpose**: Get prescriptions issued by logged-in doctor for specific patient

**Authentication**: Required (Bearer token, role='doctor')

**Response** (200):
```json
{
  "prescriptions": [
    {
      "id": 200,
      "patient_id": 42,
      "medicine_name": "Lisinopril",
      "dosage": "10mg",
      "duration": "30 days",
      "instructions": "Take once daily with food",
      "created_at": "2025-06-20T09:15:00Z"
    }
  ]
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "error_code (optional)"
}
```

**Common HTTP Status Codes**:
- 200: Success
- 201: Created
- 400: Bad Request (invalid input)
- 401: Unauthorized (missing or invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

---

## Authentication

All protected endpoints require:

**Header**:
```
Authorization: Bearer <jwt_token>
```

**Token Format**: JWT (JSON Web Token) with 15-minute expiry

**Token Contents**:
```json
{
  "id": 42,
  "role": "patient",
  "iat": 1719747000,
  "exp": 1719747900
}
```

Refresh tokens are provided after login and can be used to obtain new access tokens via `/auth/refresh`.
