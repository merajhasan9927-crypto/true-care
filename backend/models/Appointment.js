import mongoose from "mongoose";

const medicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    dosage: { type: String, default: "" },
    frequency: { type: String, default: "" },
    duration: { type: String, default: "" },
  },
  { _id: false },
);

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      default: "Patient",
    },
    patientEmail: {
      type: String,
      default: "",
    },
    doctorName: {
      type: String,
      required: true,
    },
    specialty: {
      type: String,
      default: "General Medicine",
    },
    date: {
      type: String,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "completed", "cancelled"],
      default: "pending",
    },
    prescription: {
      diagnosisSummary: { type: String, default: "" },
      doctorAdvice: { type: String, default: "" },
      medications: { type: [medicationSchema], default: [] },
      issuedAt: { type: Date },
    },
  },
  { timestamps: true },
);

const Appointment =
  mongoose.models.Appointment ||
  mongoose.model("Appointment", appointmentSchema);

export default Appointment;
