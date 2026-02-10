import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models/User.js";

dotenv.config({ path: "./.env" });

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB");

    const adminEmail = "jay@gmail.com";
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit(0);
    }

    await User.create({
      fullName: "Jay Admin",
      email: adminEmail,
      username: "jay",
      password: "admin123",
      role: "Admin",
      avatar: "",
    });

    console.log("Admin user created successfully!");
    console.log("Email: jay@gmail.com");
    console.log("Password: admin123");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
