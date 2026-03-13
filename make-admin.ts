import * as dotenv from "dotenv";
import path from "path";
// LOAD ENV FIRST before importing db
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { connectDB } from "./lib/db";
import User from "./models/User";

async function makeAdmin() {
    try {
        console.log("Connecting to DB...");
        await connectDB();

        // Find the newest user
        const userToPromote = await User.findOne().sort({ createdAt: -1 });

        if (!userToPromote) {
            console.log("No users found in database. Please register first.");
            process.exit(0);
        }

        userToPromote.role = "admin";
        await userToPromote.save();

        console.log(`✅ Success! Account ${userToPromote.email} is now an ADMIN.`);
        console.log(`You can now go to http://localhost:3000/admin/dashboard`);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

makeAdmin();
