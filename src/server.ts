import "dotenv/config";
import { connectDB } from "./configs/database.js";

await connectDB();
