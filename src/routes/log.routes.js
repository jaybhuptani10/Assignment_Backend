import { Router } from "express";
import { getLogs } from "../controllers/log.controller.js";
import { verifyJWT, authorizeRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT);
router.route("/").get(authorizeRoles("Admin"), getLogs);

export default router;
