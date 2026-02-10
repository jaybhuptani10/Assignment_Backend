import { Router } from "express";
import { createUserAccount } from "../controllers/invite.controller.js";
import { verifyJWT, authorizeRoles } from "../middleware/auth.middleware.js";

const router = Router();

// Admin only: Create user account directly
router.route("/").post(verifyJWT, authorizeRoles("Admin"), createUserAccount);

export default router;
