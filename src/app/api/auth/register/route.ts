import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import UserModel from "@/models/User";
import { z } from "zod";

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    walletAddress: z.string().min(42, "Invalid wallet address").max(42, "Invalid wallet address"),
});

export async function POST(req: Request) {
    try {
        await connectDB();
        const body = await req.json();
        const validated = registerSchema.parse(body);

        const existingEmail = await UserModel.findOne({ email: validated.email });
        if (existingEmail) {
            return NextResponse.json({ error: "Email already registered" }, { status: 400 });
        }

        const existingWallet = await UserModel.findOne({ walletAddress: validated.walletAddress });
        if (existingWallet) {
            return NextResponse.json({ error: "Wallet address already connected to another account" }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(validated.password, 12);
        const user = await UserModel.create({
            name: validated.name,
            email: validated.email,
            passwordHash,
            walletAddress: validated.walletAddress,
            role: "investor",
            kycStatus: "none",
            investorTier: "retail",
        });

        return NextResponse.json(
            { message: "Registration successful", userId: user._id },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = (error as z.ZodError).issues ?? [];
            return NextResponse.json({ error: issues[0]?.message || "Validation error" }, { status: 400 });
        }
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Registration failed" }, { status: 500 });
    }
}
