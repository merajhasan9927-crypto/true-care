import express from "express";
import { getMyEHR } from "../controllers/ehrController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

router.get("/my-records", getMyEHR);

export default router;
