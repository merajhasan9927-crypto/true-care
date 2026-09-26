import { GoogleGenAI } from "@google/genai";
import Diagnosis from "../models/Diagnosis.js";

export const analyzeSymptoms = async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({ message: "Symptoms are required." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `As a medical AI assistant, analyze these symptoms: ${symptoms.join(", ")}.
Respond strictly in JSON format with exactly these two keys:
- "recommendedAction": choose either "emergency", "consult-doctor", or "home-care".
- "aiAnalysis": a brief paragraph explaining your preliminary assessment.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    const responseText = response.text;
    const cleanJson = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsedResult = JSON.parse(cleanJson);

    // Save diagnosis to database if user is authenticated
    if (req.user?.uid) {
      await Diagnosis.create({
        userId: req.user.uid,
        userEmail: req.user.email || "",
        symptoms,
        recommendedAction: parsedResult.recommendedAction,
        aiAnalysis: parsedResult.aiAnalysis,
      });
    }

    res.status(200).json(parsedResult);
  } catch (error) {
    console.error("AI Diagnosis Error:", error);
    res.status(500).json({ message: "Failed to process AI diagnosis" });
  }
};

// GET /api/ai/history
export const getDiagnosisHistory = async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const history = await Diagnosis.find({ userId: uid }).sort({
      createdAt: -1,
    });
    res.status(200).json({ history });
  } catch (error) {
    console.error("Diagnosis History Error:", error);
    res.status(500).json({ message: "Failed to fetch diagnostic history" });
  }
};
