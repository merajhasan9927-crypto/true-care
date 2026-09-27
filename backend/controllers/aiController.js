import { GoogleGenerativeAI } from "@google/generative-ai";
import Diagnosis from "../models/Diagnosis.js";

export const analyzeSymptoms = async (req, res) => {
  try {
    const { symptoms, age, gender, medicalHistory } = req.body;

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

    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are a clinical triage AI assistant. Analyze the following patient case and return ONLY valid JSON (no markdown code blocks):
Patient Symptoms: ${symptomsText}
Age: ${age || "Not specified"}
Gender: ${gender || "Not specified"}
Medical History: ${medicalHistory || "None reported"}

Return JSON with this exact structure:
{
  "urgencyLevel": "Low" | "Medium" | "High" | "Critical",
  "summary": "Brief clinical impression",
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

    if (!aiResult) {
      const lower = symptomsText.toLowerCase();
      const isCritical =
        lower.includes("chest") ||
        lower.includes("breath") ||
        lower.includes("stroke") ||
        lower.includes("unconscious") ||
        lower.includes("bleeding");

      aiResult = {
        urgencyLevel: isCritical ? "Critical" : "Medium",
        summary: isCritical
          ? "Potentially acute cardiopulmonary or neurological symptoms detected requiring immediate medical evaluation."
          : `Clinical evaluation recommended for reported symptoms: ${symptomsText}.`,
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
        advice: isCritical
          ? [
              "Seek emergency medical care or dispatch an ambulance immediately.",
              "Avoid physical exertion and remain seated or lying down.",
              "Keep emergency contacts and current medications ready.",
            ]
          : [
              "Book a specialist or general physician consultation within 24–48 hours.",
              "Monitor temperature, hydration, and symptom progression.",
              "Escalate to Emergency ER if symptoms worsen rapidly.",
            ],
      };
    }

    let savedRecord = null;
    const recordData = {
      userId: req.user?.uid || "guest-user",
      patientName: req.user?.name || req.user?.email || "Patient",
      urgencyLevel: aiResult.urgencyLevel,
      summary: aiResult.summary,
      possibleConditions: aiResult.possibleConditions,
      recommendedSpecialist: aiResult.recommendedSpecialist,
      advice: aiResult.advice,
    };

    try {
      savedRecord = await Diagnosis.create({
        ...recordData,
        symptoms: symptomsText,
      });
    } catch (dbErr) {
      savedRecord = await Diagnosis.create({
        ...recordData,
        symptoms: symptomsArray,
      });
    }

    return res.status(200).json({
      ...aiResult,
      symptoms: savedRecord.symptoms,
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
    const query = req.user?.uid ? { userId: req.user.uid } : {};
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
