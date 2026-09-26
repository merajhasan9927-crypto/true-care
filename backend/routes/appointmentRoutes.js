import express from "express";
import {
  createAppointment,
  getMyAppointments,
  getAllAppointments,
  updateAppointmentStatus,
  issuePrescription,
} from "../controllers/appointmentController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", createAppointment);
router.get("/my", getMyAppointments);
router.get("/", getAllAppointments);
router.patch("/:id/status", updateAppointmentStatus);
router.post("/:id/prescribe", issuePrescription);

export default router;
