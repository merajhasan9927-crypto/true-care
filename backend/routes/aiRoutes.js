import express from "express";
import {
  analyzeSymptoms,
  getDiagnosisHistory,
} from "../controllers/aiController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/diagnose", analyzeSymptoms);
router.get("/history", getDiagnosisHistory);

export default router;
