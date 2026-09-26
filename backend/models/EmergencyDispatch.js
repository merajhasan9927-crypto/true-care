import mongoose from "mongoose";

const dispatchSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    patientPhone: {
      type: String,
      default: "",
    },
    patientEmail: {
      type: String,
      default: "",
    },
    bloodGroup: {
      type: String,
      default: "Unknown",
    },
    allergies: {
      type: [String],
      default: [],
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    emergencyNote: {
      type: String,
      default: "Immediate medical extraction requested.",
    },
    status: {
      type: String,
      enum: ["pending", "dispatched", "en-route", "resolved", "cancelled"],
      default: "pending",
    },
    ambulanceUnit: {
      type: String,
      default: "",
    },
    driverContact: {
      type: String,
      default: "",
    },
    eta: {
      type: String,
      default: "Calculating...",
    },
  },
  { timestamps: true },
);

export default mongoose.model("EmergencyDispatch", dispatchSchema);
