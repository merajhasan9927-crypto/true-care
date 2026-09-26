import express from "express";
import { getNearbyHospitals } from "../controllers/mapsController.js";

const router = express.Router();

router.get("/nearby", getNearbyHospitals);

export default router;
