import Hospital from "../models/Hospital.js";
import Admission from "../models/Admission.js";
import User from "../models/User.js";

// GET /api/admin/stats
export const getAdminStats = async (req, res) => {
  try {
    let hospital = await Hospital.findOne({
      name: "City Central Emergency Hospital",
    });

    if (!hospital) {
      hospital = await Hospital.create({
        name: "City Central Emergency Hospital",
        lat: 23.8183,
        lng: 90.4195,
        phone: "+1 (555) 019-2834",
        erBedsAvailable: 8,
        status: "Open 24/7",
      });
    }

    const admissions = await Admission.find({
      hospitalName: hospital.name,
      status: "admitted",
    }).sort({ admittedAt: -1 });

    res.status(200).json({
      erBedsAvailable: hospital.erBedsAvailable,
      activeAdmissions: admissions,
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    res.status(500).json({ message: "Failed to fetch admin stats" });
  }
};

// PATCH /api/admin/beds
export const updateLiveBeds = async (req, res) => {
  try {
    const { erBedsAvailable, hospitalName } = req.body;

    if (erBedsAvailable === undefined || erBedsAvailable < 0) {
      return res.status(400).json({ message: "Valid bed count is required." });
    }

    const targetName = hospitalName || "City Central Emergency Hospital";

    const hospital = await Hospital.findOneAndUpdate(
      { name: targetName },
      { $set: { erBedsAvailable: Number(erBedsAvailable) } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // Broadcast live bed update to all connected clients
    const io = req.app.get("io");
    if (io) {
      io.emit("hospital_updated", {
        hospitalName: hospital.name,
        erBedsAvailable: hospital.erBedsAvailable,
      });
    }

    res.status(200).json({
      message: "Bed availability updated successfully",
      erBedsAvailable: hospital.erBedsAvailable,
    });
  } catch (error) {
    console.error("Admin Bed Update Error:", error);
    res
      .status(500)
      .json({ message: "Failed to update bed metrics: " + error.message });
  }
};

// POST /api/admin/admit
export const admitPatient = async (req, res) => {
  try {
    const { patientName, patientEmail, conditionSeverity, bedNumber } =
      req.body;
    const hospitalName = "City Central Emergency Hospital";

    if (!patientName || !bedNumber) {
      return res
        .status(400)
        .json({ message: "Patient name and bed number are required." });
    }

    const hospital = await Hospital.findOne({ name: hospitalName });
    if (!hospital || hospital.erBedsAvailable <= 0) {
      return res
        .status(400)
        .json({ message: "No ER beds currently available for admission." });
    }

    let bloodGroup = "Unknown";
    let allergies = [];
    let patientUid = "";

    if (patientEmail) {
      const existingUser = await User.findOne({ email: patientEmail });
      if (existingUser) {
        bloodGroup = existingUser.bloodGroup || "Unknown";
        allergies = existingUser.allergies || [];
        patientUid = existingUser.uid;
      }
    }

    const newAdmission = await Admission.create({
      hospitalName,
      patientName,
      patientEmail,
      patientUid,
      bloodGroup,
      allergies,
      conditionSeverity: conditionSeverity || "Urgent",
      bedNumber,
      status: "admitted",
    });

    hospital.erBedsAvailable = Math.max(0, hospital.erBedsAvailable - 1);
    await hospital.save();

    // Broadcast live admission & bed update
    const io = req.app.get("io");
    if (io) {
      io.emit("hospital_updated", {
        hospitalName: hospital.name,
        erBedsAvailable: hospital.erBedsAvailable,
        admission: newAdmission,
      });
    }

    res.status(201).json({
      message: "Patient admitted successfully",
      admission: newAdmission,
      erBedsAvailable: hospital.erBedsAvailable,
    });
  } catch (error) {
    console.error("Admit Patient Error:", error);
    res
      .status(500)
      .json({ message: "Failed to admit patient: " + error.message });
  }
};

// PATCH /api/admin/discharge/:id
export const dischargePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalName = "City Central Emergency Hospital";

    const admission = await Admission.findById(id);
    if (!admission || admission.status === "discharged") {
      return res
        .status(404)
        .json({ message: "Active admission record not found." });
    }

    admission.status = "discharged";
    admission.dischargedAt = new Date();
    await admission.save();

    const hospital = await Hospital.findOneAndUpdate(
      { name: hospitalName },
      { $inc: { erBedsAvailable: 1 } },
      { new: true },
    );

    // Broadcast live discharge & bed release
    const io = req.app.get("io");
    if (io) {
      io.emit("hospital_updated", {
        hospitalName: hospital.name,
        erBedsAvailable: hospital.erBedsAvailable,
        dischargedId: id,
      });
    }

    res.status(200).json({
      message: "Patient discharged and bed returned to service.",
      erBedsAvailable: hospital.erBedsAvailable,
    });
  } catch (error) {
    console.error("Discharge Patient Error:", error);
    res
      .status(500)
      .json({ message: "Failed to process discharge: " + error.message });
  }
};
