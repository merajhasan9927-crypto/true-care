import { GoogleGenerativeAI } from "@google/generative-ai";
import Diagnosis from "../models/Diagnosis.js";

export const analyzeSymptoms = async (req, res) => {
  try {
    const { symptoms, age, gender, medicalHistory } = req.body;

    // 1. Normalize symptoms whether sent as an Array (["fever"]) or a String ("fever")
    const symptomsArray = Array.isArray(symptoms)
      ? symptoms.map((s) => String(s).trim()).filter(Boolean)
      : typeof symptoms === "string"
      ? symptoms
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const symptomsText = symptomsArray.join(", ");

    if (!symptomsText) {
      return res
        .status(400)
        .json({ error: "Please provide symptoms to analyze." });
    }

    let aiResult = null;

    // 2. Call Gemini API using gemini-3.0-flash
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3.0-flash" });

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
  "recommendedAction": "Primary recommended clinical action for the patient",
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
      } catch (geminiErr) {
        console.warn("Gemini API fallback triggered:", geminiErr.message);
      }
    }

    // 3. Clinical fallback if API key is restricted or model call fails
    if (!aiResult) {
      const lower = symptomsText.toLowerCase();
      const isCritical =
        lower.includes("chest") ||
        lower.includes("breath") ||
        lower.includes("stroke") ||
        lower.includes("unconscious") ||
        lower.includes("bleeding");

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
        recommendedAction: adviceList[0],
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

    // Ensure both required schema fields and frontend fields are always populated
    const aiAnalysis =
      aiResult.aiAnalysis ||
      aiResult.summary ||
      `Clinical assessment for ${symptomsText}.`;
    const recommendedAction =
      aiResult.recommendedAction ||
      (Array.isArray(aiResult.advice) && aiResult.advice.length > 0
        ? aiResult.advice.join(" • ")
        : `Consult a ${aiResult.recommendedSpecialist || "General Physician"}.`);

    const recordData = {
      userId: req.user?.uid || req.user?.id || req.user?._id || "guest-user",
      patientName: req.user?.name || req.user?.email || "Patient",
      symptoms: symptomsArray,
      urgencyLevel: aiResult.urgencyLevel || "Medium",
      summary: aiResult.summary || aiAnalysis,
      aiAnalysis,
      recommendedAction,
      possibleConditions: aiResult.possibleConditions || [],
      recommendedSpecialist:
        aiResult.recommendedSpecialist || "General Physician",
      advice: aiResult.advice || [recommendedAction],
    };

    // 4. Save to MongoDB safely
    let savedRecord = null;
    try {
      savedRecord = await Diagnosis.create(recordData);
    } catch (dbErr) {
      console.warn("Retrying Diagnosis save with string symptoms:", dbErr.message);
      try {
        savedRecord = await Diagnosis.create({
          ...recordData,
          symptoms: symptomsText,
        });
      } catch (secondDbErr) {
        console.error("Database save warning:", secondDbErr.message);
      }
    }

    return res.status(200).json({
      ...recordData,
      ...(savedRecord ? savedRecord.toObject() : {}),
      summary: recordData.summary,
      aiAnalysis: recordData.aiAnalysis,
      recommendedAction: recordData.recommendedAction,
      possibleConditions: recordData.possibleConditions,
      recommendedSpecialist: recordData.recommendedSpecialist,
      advice: recordData.advice,
      _id: savedRecord?._id || Date.now().toString(),
      createdAt: savedRecord?.createdAt || new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Controller Error:", error);
    return res.status(500).json({ error: "Failed to analyze symptoms." });
  }
};

export const getDiagnosisHistory = async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.id || req.user?._id;
    const query = userId ? { userId } : {};
    const history = await Diagnosis.find(query)
      .sort({ createdAt: -1 })
      .limit(20);
    return res.status(200).json(history);
  } catch (error) {
    console.error("Get Diagnosis History Error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch diagnosis history." });
  }
};