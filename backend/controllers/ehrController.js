import User from "../models/User.js";
import Diagnosis from "../models/Diagnosis.js";
import Appointment from "../models/Appointment.js";
import Admission from "../models/Admission.js";
import EmergencyDispatch from "../models/EmergencyDispatch.js";

// GET /api/ehr/my-records
export const getMyEHR = async (req, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || "";

    const userIdentityQuery = email
      ? { $or: [{ uid }, { firebaseUid: uid }, { email }] }
      : { $or: [{ uid }, { firebaseUid: uid }] };

    const recordOwnerQuery = email
      ? {
          $or: [
            { userId: uid },
            { patientUid: uid },
            { patientEmail: email },
            { email },
          ],
        }
      : { $or: [{ userId: uid }, { patientUid: uid }] };

    const [userProfile, diagnoses, appointments, admissions, dispatches] =
      await Promise.all([
        User.findOne(userIdentityQuery)
          .lean()
          .catch(() => null),
        Diagnosis.find(recordOwnerQuery)
          .sort({ createdAt: -1 })
          .lean()
          .catch(() => []),
        Appointment.find(recordOwnerQuery)
          .sort({ createdAt: -1 })
          .lean()
          .catch(() => []),
        Admission.find(recordOwnerQuery)
          .sort({ admittedAt: -1 })
          .lean()
          .catch(() => []),
        EmergencyDispatch.find(recordOwnerQuery)
          .sort({ createdAt: -1 })
          .lean()
          .catch(() => []),
      ]);

    const timeline = [];

    // 1. Map AI Symptom Triage Records
    diagnoses.forEach(d => {
      timeline.push({
        id: `diag_${d._id}`,
        type: "AI_DIAGNOSIS",
        title: `AI Symptom Triage — ${d.urgencyLevel || d.urgency || "Assessed"}`,
        subtitle: `Reported Symptoms: ${
          Array.isArray(d.symptoms)
            ? d.symptoms.join(", ")
            : d.symptoms || "N/A"
        }`,
        details:
          d.aiAnalysis ||
          d.summary ||
          d.recommendedAction ||
          "Automated clinical triage completed.",
        date: d.createdAt || new Date(),
      });
    });

    // 2. Map Specialist Appointments & Digital Prescriptions (Rx)
    appointments.forEach(a => {
      const hasRx =
        a.status === "completed" &&
        (a.prescription?.diagnosisSummary ||
          a.prescription?.medications?.length > 0);

      timeline.push({
        id: `app_${a._id}`,
        type: "APPOINTMENT",
        title: `${a.doctorName} (${a.specialty || "Specialist"})`,
        subtitle: `Scheduled: ${a.date} at ${a.timeSlot} • Status: ${(
          a.status || "pending"
        ).toUpperCase()}`,
        details: hasRx
          ? `Diagnosis: ${a.prescription.diagnosisSummary}. Advice: ${
              a.prescription.doctorAdvice || "Follow medication schedule."
            }`
          : `Reason for Visit: ${a.reason}`,
        prescription: hasRx ? a.prescription : null,
        date: a.prescription?.issuedAt || a.createdAt || new Date(),
      });
    });

    // 3. Map Hospital ER Admissions
    admissions.forEach(adm => {
      timeline.push({
        id: `adm_${adm._id}`,
        type: "ER_ADMISSION",
        title: `ER Admission — ${adm.hospitalName || "City Central Emergency Hospital"}`,
        subtitle: `Bed Unit: ${adm.bedNumber} • Severity: ${
          adm.conditionSeverity
        } • Status: ${(adm.status || "admitted").toUpperCase()}`,
        details: adm.dischargedAt
          ? `Admitted on ${new Date(
              adm.admittedAt,
            ).toLocaleString()} and discharged on ${new Date(
              adm.dischargedAt,
            ).toLocaleString()}.`
          : `Admitted to emergency unit ${adm.bedNumber}.`,
        date: adm.admittedAt || adm.createdAt || new Date(),
      });
    });

    // 4. Map Emergency 911 SOS Ambulance Dispatches
    dispatches.forEach(disp => {
      timeline.push({
        id: `sos_${disp._id}`,
        type: "SOS_DISPATCH",
        title: `911 SOS Ambulance Dispatch (${(
          disp.status || "pending"
        ).toUpperCase()})`,
        subtitle: `Response Vehicle: ${
          disp.ambulanceUnit || "Assigned Unit"
        } • ETA: ${disp.eta || "N/A"}`,
        details: `Emergency Note: "${disp.emergencyNote}" (GPS: ${Number(
          disp.lat,
        ).toFixed(4)}, ${Number(disp.lng).toFixed(4)})`,
        date: disp.createdAt || new Date(),
      });
    });

    // Sort all events newest first
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      patientProfile: {
        name:
          userProfile?.name ||
          req.user?.name ||
          (email ? email.split("@")[0] : "Patient"),
        email: userProfile?.email || email,
        phone: userProfile?.phone || "",
        bloodGroup: userProfile?.bloodGroup || "Unknown",
        allergies: userProfile?.allergies || [],
        chronicConditions: userProfile?.chronicConditions || [],
        emergencyContact: userProfile?.emergencyContact || {},
      },
      summary: {
        totalEvents: timeline.length,
        totalDiagnoses: diagnoses.length,
        totalAppointments: appointments.length,
        totalAdmissions: admissions.length,
        totalDispatches: dispatches.length,
      },
      timeline,
    });
  } catch (error) {
    console.error("EHR Controller Error:", error);
    res.status(500).json({ message: "Failed to compile EHR timeline" });
  }
};
