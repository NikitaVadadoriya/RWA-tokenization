import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    country: z.string().optional(),
});

// M3: User Registration
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = registerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }

        await connectDB();
        const existing = await User.findOne({ email: parsed.data.email });
        if (existing) {
            return NextResponse.json({ error: "Email already registered" }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(parsed.data.password, 12);
        const user = await User.create({
            name: parsed.data.name,
            email: parsed.data.email,
            passwordHash,
            country: parsed.data.country,
        });

        return NextResponse.json({
            id: user._id,
            name: user.name,
            email: user.email,
            kycStatus: user.kycStatus,
        }, { status: 201 });
    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
