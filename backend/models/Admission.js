import mongoose from "mongoose";

const admissionSchema = new mongoose.Schema(
  {
    hospitalName: {
      type: String,
      default: "City Central Emergency Hospital",
    },
    patientName: {
      type: String,
      required: true,
    },
    patientEmail: {
      type: String,
      default: "",
    },
    patientUid: {
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
    conditionSeverity: {
      type: String,
      enum: ["Critical", "Urgent", "Observation"],
      default: "Urgent",
    },
    bedNumber: {
      type: String,
      required: true,
    },
    admittedAt: {
      type: Date,
      default: Date.now,
    },
    dischargedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["admitted", "discharged"],
      default: "admitted",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Admission", admissionSchema);
