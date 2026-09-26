import Appointment from "../models/Appointment.js";

// POST /api/appointments
export const createAppointment = async (req, res) => {
  try {
    const uid = req.user?.uid || "demo-uid";
    const email = req.user?.email || "";
    const name = req.user?.name || (email ? email.split("@")[0] : "Patient");

    const {
      doctorName,
      specialty,
      department,
      date,
      timeSlot,
      time,
      reason,
      symptoms,
    } = req.body;

    const resolvedSpecialty = specialty || department || "General Specialist";
    const resolvedTimeSlot = timeSlot || time || "09:30 AM";
    const resolvedReason = reason || symptoms || "General Consultation";

    if (!doctorName || !date || !resolvedReason) {
      return res.status(400).json({
        message:
          "Please select a doctor, preferred date, and reason for visit.",
      });
    }

    const newAppointment = await Appointment.create({
      userId: uid,
      patientName: name,
      patientEmail: email,
      doctorName,
      specialty: resolvedSpecialty,
      date,
      timeSlot: resolvedTimeSlot,
      reason: resolvedReason,
      status: "pending",
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("appointment_updated", {
        action: "created",
        appointment: newAppointment,
      });
    }

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment: newAppointment,
    });
  } catch (error) {
    console.error("Create Appointment Error:", error);
    res.status(500).json({
      message: "Failed to book appointment: " + error.message,
    });
  }
};

// GET /api/appointments/my
export const getMyAppointments = async (req, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;

    const query = email
      ? { $or: [{ userId: uid }, { patientEmail: email }] }
      : { userId: uid };

    const appointments = await Appointment.find(query).sort({ createdAt: -1 });

    res.status(200).json({ appointments });
  } catch (error) {
    console.error("Get My Appointments Error:", error);
    res.status(500).json({ message: "Failed to fetch your appointments" });
  }
};

// GET /api/appointments (All appointments for Admin / Doctor queue)
export const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    res.status(200).json({ appointments });
  } catch (error) {
    console.error("Get All Appointments Error:", error);
    res.status(500).json({ message: "Failed to fetch appointments queue" });
  }
};

// PATCH /api/appointments/:id/status
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true },
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("appointment_updated", {
        action: "status_changed",
        appointment,
      });
    }

    res.status(200).json({
      message: `Appointment status updated to ${status}`,
      appointment,
    });
  } catch (error) {
    console.error("Update Appointment Status Error:", error);
    res.status(500).json({ message: "Failed to update appointment status" });
  }
};

// POST /api/appointments/:id/prescribe
export const issuePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosisSummary, doctorAdvice, medications } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.status = "completed";
    appointment.prescription = {
      diagnosisSummary: diagnosisSummary || "Clinical Consultation Completed",
      doctorAdvice: doctorAdvice || "",
      medications: Array.isArray(medications) ? medications : [],
      issuedAt: new Date(),
    };

    await appointment.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("appointment_updated", {
        action: "prescribed",
        appointment,
      });
    }

    res.status(200).json({
      message: "Digital prescription issued and consultation completed.",
      appointment,
    });
  } catch (error) {
    console.error("Issue Prescription Error:", error);
    res.status(500).json({
      message: "Failed to issue prescription: " + error.message,
    });
  }
};
