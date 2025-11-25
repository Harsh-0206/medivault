// backend/controllers/prescriptionController.js
import db from "../config/db.js";

/**
 * Doctor creates a prescription for a patient.
 * Body:
 *  - patientId (required)
 *  - medicineName (required)
 *  - dosage (required)
 *  - duration (optional)
 *  - instructions (optional)
 *  - endDate (optional, YYYY-MM-DD)
 */
export async function createPrescription(req, res) {
  try {
    const doctorId = req.user.id;
    const {
      patientId,
      medicineName,
      dosage,
      duration,
      instructions,
      endDate
    } = req.body;

    if (!patientId || !medicineName || !dosage) {
      return res.status(400).json({ message: "patientId, medicineName and dosage are required" });
    }

    const prescribedDate = new Date(); // will store as DATE

    const [result] = await db.query(
      `INSERT INTO prescriptions
        (patient_id, doctor_id, medicine_name, dosage, duration, instructions, prescribed_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        doctorId,
        medicineName,
        dosage,
        duration || null,
        instructions || null,
        prescribedDate,
        endDate || null
      ]
    );

    // Return the inserted prescription id and basic data
    const insertedId = result.insertId;

    const [rows] = await db.query(
      `SELECT p.*, u.name as doctor_name
       FROM prescriptions p
       JOIN users u ON p.doctor_id = u.id
       WHERE p.id = ?`,
      [insertedId]
    );

    return res.status(201).json({ message: "Prescription created", prescription: rows[0] });

  } catch (err) {
    console.error("createPrescription error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * Optional: Doctor can fetch prescriptions they wrote for a particular patient
 * GET /doctor/prescriptions/patient/:patientId
 */
export async function getPrescriptionsForPatientByDoctor(req, res) {
  try {
    const doctorId = req.user.id;
    const { patientId } = req.params;

    const [rows] = await db.query(
      `SELECT p.*, d.name as doctor_name
       FROM prescriptions p
       JOIN users d ON p.doctor_id = d.id
       WHERE p.doctor_id = ? AND p.patient_id = ?
       ORDER BY p.prescribed_date DESC`,
      [doctorId, patientId]
    );

    return res.json({ prescriptions: rows });
  } catch (err) {
    console.error("getPrescriptionsForPatientByDoctor:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
