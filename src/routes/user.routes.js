import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  getCurrentUser,
  getAllUsers,
  deleteUser,
} from "../controllers/auth.controller.js";
import { verifyJWT, authorizeRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/current-user").get(verifyJWT, getCurrentUser);

// Admin only routes
router.route("/").get(verifyJWT, getAllUsers);
router.route("/:userId").delete(verifyJWT, authorizeRoles("Admin"), deleteUser);

export default router;
