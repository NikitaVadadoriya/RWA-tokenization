import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
    try {
        await connectDB();

        // Find the newest user
        const user = await User.findOne().sort({ createdAt: -1 });

        if (!user) {
            return NextResponse.json(
                { message: "No users found in database. Please register your account FIRST at /register" },
                { status: 404 }
            );
        }

        if (user.role === "admin") {
            return NextResponse.json({ message: `Account ${user.email} is ALREADY an admin!` });
        }

        user.role = "admin";
        await user.save();

        return NextResponse.json({
            message: `✅ Success! Account ${user.email} has been promoted to ADMIN.`,
            nextStep: "Log out and log back in, then go to /admin/dashboard"
        });
    } catch (error) {
        console.error("Make admin error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
