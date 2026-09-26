import express from "express";
import {
  requestEmergencySOS,
  getActiveDispatches,
  getPatientActiveDispatch,
  deployAmbulance,
  resolveDispatch,
} from "../controllers/dispatchController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/sos", requestEmergencySOS);
router.get("/active", getActiveDispatches);
router.get("/my-active", getPatientActiveDispatch);
router.patch("/:id/deploy", deployAmbulance);
router.patch("/:id/resolve", resolveDispatch);

export default router;
