import express from "express";
import {
  getDoctorDashboard,
  searchPatient
} from "../controllers/doctorController.js";
import { createPrescription, getPrescriptionsForPatientByDoctor } from "../controllers/prescriptionController.js";

import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Doctor dashboard
router.get(
  "/dashboard",
  authenticateToken,
  requireRole("doctor"),
  getDoctorDashboard
);

// Patient search
router.get(
  "/search",
  authenticateToken,
  requireRole("doctor"),
  searchPatient
);

// New: create prescription
router.post("/prescriptions", authenticateToken, requireRole("doctor"), createPrescription);

// Optional: doctor view prescriptions for a patient
router.get("/prescriptions/patient/:patientId", authenticateToken, requireRole("doctor"), getPrescriptionsForPatientByDoctor);

export default router;
