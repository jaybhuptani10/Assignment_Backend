import { asyncHandler } from "../utils/asyncHandler.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  // Admin only check is done in route
  const logs = await ActivityLog.find()
    .populate("user", "fullName email") // Populate who performed the action
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await ActivityLog.countDocuments();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { logs, total, page: parseInt(page), pages: Math.ceil(total / limit) },
        "Activity logs fetched",
      ),
    );
});

export { getLogs };
