import mongoose, { Schema } from "mongoose";

const activityLogSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: [
        "CREATE_TASK",
        "UPDATE_TASK",
        "DELETE_TASK",
        "LOGIN",
        "LOGOUT",
        "REGISTER",
        "COMMENT",
      ],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId, // ID of the task or object affected
      required: false,
    },
    targetModel: {
      type: String, // 'Task', 'User', etc.
      required: false,
    },
    details: {
      type: String, // Human readable description or JSON string
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
