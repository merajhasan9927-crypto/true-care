import EmergencyDispatch from "../models/EmergencyDispatch.js";
import User from "../models/User.js";

// POST /api/dispatch/sos
export const requestEmergencySOS = async (req, res) => {
  try {
    const { lat, lng, emergencyNote } = req.body;
    const uid = req.user?.uid;
    const email = req.user?.email || "";

    if (lat === undefined || lng === undefined) {
      return res
        .status(400)
        .json({ message: "Exact GPS coordinates are required." });
    }

    const userProfile = await User.findOne({ uid });

    const newDispatch = await EmergencyDispatch.create({
      userId: uid,
      patientEmail: email,
      patientName:
        userProfile?.name ||
        (email ? email.split("@")[0] : "Emergency Patient"),
      patientPhone:
        userProfile?.phone ||
        userProfile?.emergencyContact?.phone ||
        "Not specified",
      bloodGroup: userProfile?.bloodGroup || "Unknown",
      allergies: userProfile?.allergies || [],
      lat: Number(lat),
      lng: Number(lng),
      emergencyNote: emergencyNote || "Patient initiated immediate SOS beacon.",
      status: "pending",
      eta: "Awaiting hospital dispatch...",
    });

    // Broadcast new SOS emergency to Hospital Admin Portal
    const io = req.app.get("io");
    if (io) {
      io.emit("dispatch_updated", { action: "new_sos", dispatch: newDispatch });
    }

    res.status(201).json({
      message: "Emergency SOS beacon broadcasted successfully.",
      dispatch: newDispatch,
    });
  } catch (error) {
    console.error("Emergency SOS Request Error:", error);
    res
      .status(500)
      .json({ message: "Failed to broadcast emergency SOS: " + error.message });
  }
};

// GET /api/dispatch/active
export const getActiveDispatches = async (req, res) => {
  try {
    const activeDispatches = await EmergencyDispatch.find({
      status: { $in: ["pending", "dispatched", "en-route"] },
    }).sort({ createdAt: -1 });

    res.status(200).json({ dispatches: activeDispatches });
  } catch (error) {
    console.error("Get Active Dispatches Error:", error);
    res.status(500).json({ message: "Failed to fetch dispatch queue." });
  }
};

// GET /api/dispatch/my-active
export const getPatientActiveDispatch = async (req, res) => {
  try {
    const uid = req.user?.uid;
    const activeDispatch = await EmergencyDispatch.findOne({
      userId: uid,
      status: { $in: ["pending", "dispatched", "en-route"] },
    }).sort({ createdAt: -1 });

    res.status(200).json({ dispatch: activeDispatch || null });
  } catch (error) {
    console.error("Patient Active Dispatch Error:", error);
    res.status(500).json({ message: "Failed to check active dispatch." });
  }
};

// PATCH /api/dispatch/:id/deploy
export const deployAmbulance = async (req, res) => {
  try {
    const { id } = req.params;
    const { ambulanceUnit, driverContact, eta, status } = req.body;

    const dispatch = await EmergencyDispatch.findById(id);
    if (!dispatch) {
      return res.status(404).json({ message: "Emergency record not found." });
    }

    if (ambulanceUnit) dispatch.ambulanceUnit = ambulanceUnit;
    if (driverContact) dispatch.driverContact = driverContact;
    if (eta) dispatch.eta = eta;
    dispatch.status = status || "en-route";

    await dispatch.save();

    // Broadcast ambulance deployment to Patient Map & Admin Portal
    const io = req.app.get("io");
    if (io) {
      io.emit("dispatch_updated", { action: "deployed", dispatch });
    }

    res.status(200).json({
      message: "Ambulance deployed and tracking coordinates updated.",
      dispatch,
    });
  } catch (error) {
    console.error("Deploy Ambulance Error:", error);
    res.status(500).json({ message: "Failed to deploy response unit." });
  }
};

// PATCH /api/dispatch/:id/resolve
export const resolveDispatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const dispatch = await EmergencyDispatch.findByIdAndUpdate(
      id,
      { status: status || "resolved" },
      { new: true },
    );

    if (!dispatch) {
      return res.status(404).json({ message: "Emergency record not found." });
    }

    // Broadcast resolution/cancellation to all screens
    const io = req.app.get("io");
    if (io) {
      io.emit("dispatch_updated", { action: "resolved", dispatch });
    }

    res.status(200).json({ message: "Dispatch event updated.", dispatch });
  } catch (error) {
    console.error("Resolve Dispatch Error:", error);
    res.status(500).json({ message: "Failed to update emergency event." });
  }
};
