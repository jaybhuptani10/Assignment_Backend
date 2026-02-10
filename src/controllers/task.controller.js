import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

// Helper to emit events
const emitSocketEvent = (req, roomId, event, payload) => {
  req.app.get("io").in(roomId).emit(event, payload);
};

// Helper: Log Activity
const logActivity = async (user, action, targetId, targetModel, details) => {
  try {
    await ActivityLog.create({
      user,
      action,
      targetId,
      targetModel,
      details: JSON.stringify(details),
    });
  } catch (error) {
    console.error("Activity Log Error:", error);
  }
};

// Create Task
const createTask = asyncHandler(async (req, res) => {
  console.log("📝 Creating task START");
  console.log("📦 Body:", req.body);
  console.log("👤 User:", req.user._id, req.user.role);

  let { title, description, status, priority, dueDate, assignedTo, paramount } =
    req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  // Sanitize inputs
  if (dueDate === "") dueDate = undefined;
  if (assignedTo === "") assignedTo = undefined;

  if (assignedTo) {
    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      throw new ApiError(400, "Invalid assignedTo ID");
    }
    const assignee = await User.findById(assignedTo);
    if (!assignee) throw new ApiError(404, "Assigned user not found");
  }

  try {
    console.log("👉 Creating task document...");
    const task = await Task.create({
      title,
      description,
      status: status || "Pending",
      priority: priority || "Medium",
      dueDate,
      paramount: paramount || false,
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
    });
    console.log("✅ Task created:", task._id);

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "fullName email avatar")
      .populate("createdBy", "fullName email");
    console.log("✅ Task created and populated:", task._id);

    console.log("👉 Logging activity...");
    await logActivity(req.user._id, "CREATE_TASK", task._id, "Task", { title });
    console.log("✅ Activity logged");

    // Real-time: Notify relevant users
    console.log("👉 Emitting socket events...");
    const io = req.app.get("io");

    // Notify the creator
    io.in(req.user._id.toString()).emit("taskCreated", populatedTask);

    // Notify assignee if different from creator
    if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
      io.in(assignedTo.toString()).emit("taskCreated", populatedTask);
    }

    // Notify all admins
    io.to("Admin").emit("taskCreated", populatedTask);

    return res
      .status(201)
      .json(new ApiResponse(201, populatedTask, "Task created successfully"));
  } catch (error) {
    console.error("❌ Error in createTask:", error);
    throw error;
  }
});

// Get All Tasks
const getAllTasks = asyncHandler(async (req, res) => {
  let filter = {};
  const { page = 1, limit = 20, status } = req.query;

  if (req.user.role !== "Admin") {
    filter = {
      $or: [{ assignedTo: req.user._id }, { createdBy: req.user._id }],
    };
  }

  if (status && status !== "All") {
    filter.status = status;
  }

  const tasks = await Task.find(filter)
    .populate("assignedTo", "fullName email avatar")
    .populate("createdBy", "fullName email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Task.countDocuments(filter);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { tasks, total, page: parseInt(page), pages: Math.ceil(total / limit) },
        "Tasks fetched successfully",
      ),
    );
});

// Get Single Task
const getTaskById = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  const task = await Task.findById(taskId)
    .populate("assignedTo", "fullName email avatar")
    .populate("createdBy", "fullName email")
    .populate("comments.userId", "fullName avatar");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  if (
    req.user.role !== "Admin" &&
    task.assignedTo?._id.toString() !== req.user._id.toString() &&
    task.createdBy?._id.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, "You do not have permission to view this task");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task fetched successfully"));
});

// Update Task
const updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const {
    title,
    description,
    status,
    priority,
    dueDate,
    assignedTo,
    paramount,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  const task = await Task.findById(taskId);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const isAdmin = req.user.role === "Admin";
  const isAssignee = task.assignedTo?.toString() === req.user._id.toString();
  const isCreator = task.createdBy?.toString() === req.user._id.toString();

  if (!isAdmin && !isAssignee && !isCreator) {
    throw new ApiError(403, "You do not have permission to update this task");
  }

  // STATUS LIFECYCLE VALIDATION (Simple)
  // Pending -> In Progress -> Completed
  // Can go back? Yes, usually.
  // Restricted transitions suitable for strict workflow?
  // Let's allow flexible transitions for now but validate enum.
  if (status && !["Pending", "In Progress", "Completed"].includes(status)) {
    throw new ApiError(400, "Invalid status value");
  }

  if (!isAdmin) {
    // Employees can only update status
    if (
      title ||
      description ||
      priority ||
      dueDate ||
      assignedTo ||
      typeof paramount !== "undefined"
    ) {
      throw new ApiError(403, "Employees can only update task status");
    }
  }

  let updateData = {};
  if (isAdmin) {
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (dueDate) updateData.dueDate = dueDate;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (typeof paramount !== "undefined") updateData.paramount = paramount;
  } else {
    if (status) updateData.status = status;
  }

  const updatedTask = await Task.findByIdAndUpdate(
    taskId,
    { $set: updateData },
    { new: true },
  )
    .populate("assignedTo", "fullName email avatar")
    .populate("createdBy", "fullName email");

  await logActivity(req.user._id, "UPDATE_TASK", taskId, "Task", updateData);

  // Real-time: Notify relevant users
  const io = req.app.get("io");

  // Notify Assignee
  if (updatedTask.assignedTo) {
    io.in(updatedTask.assignedTo._id.toString()).emit(
      "taskUpdated",
      updatedTask,
    );
  }

  // Notify Creator
  if (updatedTask.createdBy) {
    io.in(updatedTask.createdBy._id.toString()).emit(
      "taskUpdated",
      updatedTask,
    );
  }

  // Notify Admins
  io.to("Admin").emit("taskUpdated", updatedTask);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTask, "Task updated successfully"));
});

// Delete Task
const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new ApiError(400, "Invalid task ID");
  }

  if (req.user.role !== "Admin") {
    throw new ApiError(403, "Only admins can delete tasks");
  }

  const task = await Task.findByIdAndDelete(taskId);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  await logActivity(req.user._id, "DELETE_TASK", taskId, "Task", {
    title: task.title,
  });

  // Real-time: Notify relevant rooms
  const io = req.app.get("io");

  if (task.assignedTo) {
    io.in(task.assignedTo.toString()).emit("taskDeleted", { taskId });
  }

  if (task.createdBy) {
    io.in(task.createdBy.toString()).emit("taskDeleted", { taskId });
  }

  // Notify Admins
  io.to("Admin").emit("taskDeleted", { taskId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Task deleted successfully"));
});

export { createTask, getAllTasks, getTaskById, updateTask, deleteTask };
