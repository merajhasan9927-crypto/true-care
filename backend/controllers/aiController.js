import { GoogleGenerativeAI } from "@google/generative-ai";
import Diagnosis from "../models/Diagnosis.js";

export const analyzeSymptoms = async (req, res) => {
  try {
    const { symptoms, age, gender, medicalHistory } = req.body;

    // 1. Normalize symptoms whether sent as an Array (["fever"]) or a String ("fever")
    const symptomsArray = Array.isArray(symptoms)
      ? symptoms.map(s => String(s).trim()).filter(Boolean)
      : typeof symptoms === "string"
        ? symptoms
            .split(",")
            .map(s => s.trim())
            .filter(Boolean)
        : [];

    const symptomsText = symptomsArray.join(", ");

    if (!symptomsText) {
      return res
        .status(400)
        .json({ error: "Please provide symptoms to analyze." });
    }

    // 2. Dynamically inspect allowed enum values from Diagnosis schema
    const allowedActions =
      Diagnosis.schema.path("recommendedAction")?.enumValues || [];
    const allowedUrgencies = Diagnosis.schema.path("urgencyLevel")
      ?.enumValues || ["Low", "Medium", "High", "Critical"];

    let aiResult = null;

    // 3. Call Gemini API (try supported models in order)
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const candidateModels = [
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite",
      ];

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const actionInstruction =
            allowedActions.length > 0
              ? `MUST be one of: ${allowedActions.map(a => `"${a}"`).join(" | ")}`
              : `"Schedule Appointment" | "Emergency ER" | "Self-Care"`;

          const prompt = `You are a clinical triage AI assistant. Analyze the following patient case and return ONLY valid JSON (no markdown code blocks):
Patient Symptoms: ${symptomsText}
Age: ${age || "Not specified"}
Gender: ${gender || "Not specified"}
Medical History: ${medicalHistory || "None reported"}

Return JSON with this exact structure:
{
  "urgencyLevel": "Low" | "Medium" | "High" | "Critical",
  "summary": "Brief clinical impression and analysis of the symptoms",
  "aiAnalysis": "Detailed clinical triage assessment of the reported symptoms",
  "recommendedAction": ${actionInstruction},
  "possibleConditions": ["Condition 1", "Condition 2", "Condition 3"],
  "recommendedSpecialist": "Specialist type (e.g., Cardiologist, General Physician, Neurologist)",
  "advice": ["Actionable step 1", "Actionable step 2", "Actionable step 3"]
}`;

          const response = await model.generateContent(prompt);
          const rawText = response.response
            .text()
            .replace(/```json|```/g, "")
            .trim();
          aiResult = JSON.parse(rawText);
          if (aiResult) break;
        } catch (geminiErr) {
          console.warn(`Gemini (${modelName}) fallback:`, geminiErr.message);
        }
      }
    }

    // 4. Clinical fallback if API key is restricted or model call fails
    const lower = symptomsText.toLowerCase();
    const isCritical =
      lower.includes("chest") ||
      lower.includes("breath") ||
      lower.includes("stroke") ||
      lower.includes("unconscious") ||
      lower.includes("bleeding") ||
      lower.includes("severe");

    if (!aiResult) {
      const summaryText = isCritical
        ? "Potentially acute cardiopulmonary or neurological symptoms detected requiring immediate medical evaluation."
        : `Clinical evaluation recommended for reported symptoms: ${symptomsText}.`;

      const adviceList = isCritical
        ? [
            "Seek emergency medical care or dispatch an ambulance immediately.",
            "Avoid physical exertion and remain seated or lying down.",
            "Keep emergency contacts and current medications ready.",
          ]
        : [
            "Book a specialist or general physician consultation within 24–48 hours.",
            "Monitor temperature, hydration, and symptom progression.",
            "Escalate to Emergency ER if symptoms worsen rapidly.",
          ];

      aiResult = {
        urgencyLevel: isCritical ? "Critical" : "Medium",
        summary: summaryText,
        aiAnalysis: summaryText,
        recommendedAction: isCritical ? "Emergency ER" : "Schedule Appointment",
        possibleConditions: isCritical
          ? [
              "Acute Coronary Syndrome",
              "Pulmonary Embolism",
              "Hypertensive Crisis",
            ]
          : [
              "Acute Viral Syndrome",
              "Systemic Inflammatory Response",
              "Stress-Related Somatic Condition",
            ],
        recommendedSpecialist: isCritical
          ? "Emergency Medicine / Cardiologist"
          : "General Physician",
        advice: adviceList,
      };
    }

    // 5. Match recommendedAction to exact Mongoose schema enum value if enum exists
    let validAction = aiResult.recommendedAction || "Schedule Appointment";
    if (allowedActions.length > 0 && !allowedActions.includes(validAction)) {
      if (
        isCritical ||
        aiResult.urgencyLevel === "Critical" ||
        aiResult.urgencyLevel === "High"
      ) {
        validAction =
          allowedActions.find(a =>
            /er|emerg|urgent|critical|ambulance|hospital|immediate/i.test(a),
          ) || allowedActions[allowedActions.length - 1];
      } else if (aiResult.urgencyLevel === "Low") {
        validAction =
          allowedActions.find(a => /self|home|rest|low|monitor/i.test(a)) ||
          allowedActions[0];
      } else {
        validAction =
          allowedActions.find(a =>
            /appoint|consult|doctor|clinic|specialist|schedule|visit/i.test(a),
          ) || allowedActions[Math.min(1, allowedActions.length - 1)];
      }
    }

    let validUrgency =
      aiResult.urgencyLevel || (isCritical ? "Critical" : "Medium");
    if (
      allowedUrgencies.length > 0 &&
      !allowedUrgencies.includes(validUrgency)
    ) {
      validUrgency = isCritical
        ? allowedUrgencies[allowedUrgencies.length - 1]
        : allowedUrgencies[Math.min(1, allowedUrgencies.length - 1)];
    }

    const aiAnalysis =
      aiResult.aiAnalysis ||
      aiResult.summary ||
      `Clinical assessment for ${symptomsText}.`;

    const userId =
      req.user?.uid || req.user?.id || req.user?._id || "guest-user";

    const recordData = {
      userId,
      patientName: req.user?.name || req.user?.email || "Patient",
      symptoms: symptomsArray,
      urgencyLevel: validUrgency,
      summary: aiResult.summary || aiAnalysis,
      aiAnalysis,
      recommendedAction: validAction,
      possibleConditions: aiResult.possibleConditions || [],
      recommendedSpecialist:
        aiResult.recommendedSpecialist || "General Physician",
      advice: Array.isArray(aiResult.advice) ? aiResult.advice : [],
    };

    // 6. Save to MongoDB and guarantee persistence
    let savedRecord = null;
    try {
      savedRecord = await Diagnosis.create(recordData);
    } catch (dbErr) {
      console.warn(
        "Primary save warning, saving without strict enum check:",
        dbErr.message,
      );
      const doc = new Diagnosis(recordData);
      savedRecord = await doc.save({ validateBeforeSave: false });
    }

    return res.status(200).json({
      ...recordData,
      ...(savedRecord ? savedRecord.toObject() : {}),
      _id: savedRecord._id,
      createdAt: savedRecord.createdAt,
    });
  } catch (error) {
    console.error("AI Controller Error:", error);
    return res.status(500).json({ error: "Failed to analyze symptoms." });
  }
};

export const getDiagnosisHistory = async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id || req.user?._id;
    let history = [];

    if (userId) {
      history = await Diagnosis.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20);
    }

    if (history.length === 0) {
      history = await Diagnosis.find({}).sort({ createdAt: -1 }).limit(20);
    }

    return res.status(200).json({ history });
  } catch (error) {
    console.error("Get Diagnosis History Error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch diagnosis history." });
  }
};
