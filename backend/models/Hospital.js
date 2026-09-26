import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    lat: {
      type: Number,
      default: 23.8183,
    },
    lng: {
      type: Number,
      default: 90.4195,
    },
    phone: {
      type: String,
      default: "+1 (555) 019-2834",
    },
    erBedsAvailable: {
      type: Number,
      default: 8,
      min: 0,
    },
    status: {
      type: String,
      default: "Open 24/7",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Hospital", hospitalSchema);
