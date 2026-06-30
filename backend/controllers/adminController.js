import db from "../config/db.js";

export async function getDoctorList(req, res) {
  try {
    const status = req.query.status || "pending";

    if (status !== "pending") {
      return res.status(400).json({ message: "Only status=pending is supported" });
    }

    const [doctors] = await db.query(
      `SELECT id, name, email, reg_number AS regNumber, degree, document_path AS documentPath
       FROM users
       WHERE role = 'doctor' AND is_verified = 0
       ORDER BY name`
    );

    return res.json({ doctors });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function approveDoctor(req, res) {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "UPDATE users SET is_verified = 1 WHERE id = ? AND role = 'doctor'",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    return res.json({ message: "Doctor approved successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function rejectDoctor(req, res) {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM users WHERE id = ? AND role = 'doctor' AND is_verified = 0",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Doctor not found or already verified" });
    }

    return res.json({ message: "Doctor rejected successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function getSystemStats(req, res) {
  try {
    const [[users]] = await db.query("SELECT COUNT(*) AS count FROM users");
    const [[records]] = await db.query("SELECT COUNT(*) AS count FROM medical_records");
    const [[appointments]] = await db.query("SELECT COUNT(*) AS count FROM appointments");

    return res.json({
      users: users.count,
      records: records.count,
      appointments: appointments.count,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}
