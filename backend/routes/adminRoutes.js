import express from "express";
import {
  updateLiveBeds,
  getAdminStats,
  admitPatient,
  dischargePatient,
} from "../controllers/adminController.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Require authentication and staff role (admin or doctor)
router.use(verifyToken);
router.use(authorizeRoles("admin", "doctor"));

router.get("/stats", getAdminStats);
router.patch("/beds", updateLiveBeds);
router.post("/admit", admitPatient);
router.patch("/discharge/:id", dischargePatient);

export default router;
