import mongoose from "mongoose";

const diagnosisSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      default: "",
    },
    symptoms: {
      type: [String],
      required: true,
    },
    recommendedAction: {
      type: String,
      enum: ["emergency", "consult-doctor", "home-care"],
      required: true,
    },
    aiAnalysis: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Diagnosis", diagnosisSchema);
