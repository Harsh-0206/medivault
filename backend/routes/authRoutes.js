import express from "express";
import multer from "multer";
import {
  registerPatient,
  registerDoctor,
  login,
  refresh
} from "../controllers/authController.js";

const router = express.Router();

// Multer for doctor file uploads
const upload = multer({ dest: "uploads/documents/" });

// PATIENT REGISTRATION
router.post("/register", registerPatient);

// DOCTOR REGISTRATION
router.post("/register-doctor", upload.single("document"), registerDoctor);

// LOGIN & REFRESH
router.post("/login", login);
router.post("/refresh", refresh);

export default router;
