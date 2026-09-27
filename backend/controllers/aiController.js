import { GoogleGenerativeAI } from "@google/generative-ai";
import Diagnosis from "../models/Diagnosis.js";

export const analyzeSymptoms = async (req, res) => {
  try {
    const { symptoms, age, gender, medicalHistory } = req.body;

    const symptomsArray = Array.isArray(symptoms)
      ? symptoms.map((s) => String(s).trim()).filter(Boolean)
      : typeof symptoms === "string"
      ? symptoms.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const symptomsText = symptomsArray.join(", ");

    if (symptomsArray.length === 0) {
      return res
        .status(400)
        .json({ error: "Please provide symptoms to analyze." });
    }

    let aiResult = null;

    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const candidateModels = ["gemini-3-flash-preview", "gemini-3.1-flash-lite"];

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const prompt = `You are a clinical triage AI assistant. Analyze the following patient symptoms and return ONLY valid JSON (no markdown code blocks):
Patient Symptoms: ${symptomsText}
Age: ${age || "Not specified"}
Gender: ${gender || "Not specified"}
Medical History: ${medicalHistory || "None reported"}

Return JSON with this exact structure:
{
  "recommendedAction": "emergency" | "consult-doctor" | "home-care",
  "aiAnalysis": "Detailed clinical triage assessment and actionable guidance for the patient"
}`;

          const response = await model.generateContent(prompt);
          const rawText = response.response
            .text()
            .replace(/```json|```/g, "")
            .trim();
          aiResult = JSON.parse(rawText);
          if (aiResult) break;
        } catch (geminiErr) {
          console.log(`Gemini (${modelName}) fallback:`, geminiErr.message);
        }
      }
    }

    const lower = symptomsText.toLowerCase();
    const isCritical =
      lower.includes("chest") ||
      lower.includes("breath") ||
      lower.includes("stroke") ||
      lower.includes("unconscious") ||
      lower.includes("bleeding") ||
      lower.includes("severe");

    const validActions = ["emergency", "consult-doctor", "home-care"];
    let recommendedAction = aiResult?.recommendedAction;
    if (!validActions.includes(recommendedAction)) {
      recommendedAction = isCritical ? "emergency" : "consult-doctor";
    }

    const aiAnalysis =
      aiResult?.aiAnalysis ||
      aiResult?.summary ||
      (isCritical
        ? "Potentially acute cardiopulmonary or neurological symptoms detected requiring immediate emergency evaluation."
        : `Clinical evaluation recommended for reported symptoms: ${symptomsText}.`);

    const userId =
      req.user?.uid || req.user?.id || req.user?._id || "guest-user";
    const userEmail = req.user?.email || "";

    const savedRecord = await Diagnosis.create({
      userId,
      userEmail,
      symptoms: symptomsArray,
      recommendedAction,
      aiAnalysis,
    });

    const recordObj = savedRecord.toObject();

    return res.status(200).json({
      ...recordObj,
      diagnosis: recordObj,
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
