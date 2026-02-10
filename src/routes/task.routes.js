import { Router } from "express";
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";
import { verifyJWT, authorizeRoles } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Public routes are not existent for tasks. All need login.

router.route("/").get(getAllTasks).post(createTask); // All authenticated users can create tasks

router
  .route("/:taskId")
  .get(getTaskById)
  .patch(updateTask) // Logic inside controller handles granular role checks
  .delete(authorizeRoles("Admin"), deleteTask); // Only admins can delete

export default router;
