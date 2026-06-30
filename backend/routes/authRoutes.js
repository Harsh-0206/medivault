import express from "express";
import multer from "multer";
import {
  registerPatient,
  registerDoctor,
  login,
  refresh
} from "../controllers/authController.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Multer for doctor file uploads
const upload = multer({ dest: "uploads/documents/" });

// PATIENT REGISTRATION
router.post("/register", registerPatient);

// DOCTOR REGISTRATION
router.post("/register-doctor", upload.single("document"), registerDoctor);

// LOGIN & REFRESH
router.post("/login", authLimiter, login);
router.post("/refresh", authLimiter, refresh);

export default router;
