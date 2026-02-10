import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import crypto from "crypto";
import { sendEmail } from "../services/email.service.js";

// Create User Account Directly (Admin only)
const createUserAccount = asyncHandler(async (req, res) => {
  const { email, fullName, role } = req.body;

  if (!email || !fullName) {
    throw new ApiError(400, "Email and full name are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // Generate random password
  const randomPassword = crypto.randomBytes(8).toString("hex"); // 16 character password

  // Generate username from email
  const username =
    email.split("@")[0].toLowerCase() + Math.floor(Math.random() * 1000);

  // Create user account
  const user = await User.create({
    fullName,
    email,
    password: randomPassword,
    username,
    role: role || "Employee",
    avatar: "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  // Send email with credentials
  const emailSent = await sendEmail(
    email,
    "Your TaskFlow Account Has Been Created",
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Welcome to TaskFlow!</h2>
      <p>Hello <strong>${fullName}</strong>,</p>
      <p>Your account has been created by an administrator. Here are your login credentials:</p>
      
      <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Email/Username:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background-color: #E5E7EB; padding: 4px 8px; border-radius: 4px;">${randomPassword}</code></p>
        <p style="margin: 5px 0;"><strong>Role:</strong> ${role || "Employee"}</p>
      </div>
      
      <p>You can log in at: <a href="http://localhost:5173/login" style="color: #4F46E5;">http://localhost:5173/login</a></p>
      
      <p style="color: #EF4444; font-weight: bold;">⚠️ Important: Please change your password after your first login for security purposes.</p>
      
      <p>If you have any questions, please contact your administrator.</p>
      
      <p>Best regards,<br>TaskFlow Team</p>
    </div>
    `,
  );

  // For development: include password in response if email failed
  const responseData = {
    user: createdUser,
    ...(emailSent
      ? {}
      : {
          temporaryPassword: randomPassword,
          note: "Email service unavailable. Please share these credentials manually.",
        }),
  };

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        responseData,
        emailSent
          ? "User account created and credentials sent via email"
          : "User account created. Email service unavailable - credentials included in response.",
      ),
    );
});

export { createUserAccount };
