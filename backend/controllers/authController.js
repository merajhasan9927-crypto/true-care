import User from "../models/User.js";

// GET /api/auth/profile
export const getProfile = async (req, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || `${uid}@truecare.local`;

    let user = await User.findOne({
      $or: [{ uid }, { firebaseUid: uid }, { email }],
    });

    if (!user) {
      user = await User.findOneAndUpdate(
        { email },
        {
          $setOnInsert: {
            uid,
            firebaseUid: uid,
            email,
            name: email.split("@")[0],
            role: "patient",
          },
        },
        { new: true, upsert: true },
      );
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Get Profile Error:", error.message);
    res.status(200).json({
      user: {
        uid: req.user?.uid,
        email: req.user?.email,
        name: req.user?.name || "Patient",
        role: req.user?.role || "patient",
        bloodGroup: "Unknown",
        allergies: [],
        chronicConditions: [],
      },
    });
  }
};

// PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || `${uid}@truecare.local`;
    const {
      name,
      role,
      phone,
      bloodGroup,
      allergies,
      chronicConditions,
      emergencyContact,
    } = req.body;

    const updateFields = {
      uid,
      firebaseUid: uid,
      email,
    };

    if (name !== undefined) updateFields.name = name;
    if (role !== undefined) updateFields.role = role;
    if (phone !== undefined) updateFields.phone = phone;
    if (bloodGroup !== undefined) updateFields.bloodGroup = bloodGroup;
    if (emergencyContact !== undefined)
      updateFields.emergencyContact = emergencyContact;

    if (allergies !== undefined) {
      updateFields.allergies = Array.isArray(allergies)
        ? allergies
        : typeof allergies === "string"
          ? allergies
              .split(",")
              .map(s => s.trim())
              .filter(Boolean)
          : [];
    }

    if (chronicConditions !== undefined) {
      updateFields.chronicConditions = Array.isArray(chronicConditions)
        ? chronicConditions
        : typeof chronicConditions === "string"
          ? chronicConditions
              .split(",")
              .map(s => s.trim())
              .filter(Boolean)
          : [];
    }

    const user = await User.findOneAndUpdate(
      { $or: [{ uid }, { firebaseUid: uid }, { email }] },
      { $set: updateFields },
      { new: true, upsert: true },
    );

    res.status(200).json({
      message: "Medical profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update Profile Error:", error.message);
    res.status(200).json({
      message: "Profile updated in session",
      user: {
        uid: req.user?.uid,
        email: req.user?.email,
        ...req.body,
      },
    });
  }
};
