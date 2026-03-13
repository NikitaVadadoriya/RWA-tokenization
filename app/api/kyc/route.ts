import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import KYC from "@/models/KYC";
import User from "@/models/User";
import { auth } from "@/lib/auth";

const kycSchema = z.object({
    documentType: z.enum(["passport", "national_id", "drivers_license"]),
    documentFrontUrl: z.string().url(),
    documentBackUrl: z.string().url().optional(),
    proofOfAddressUrl: z.string().url().optional(),
    selfieUrl: z.string().url().optional(),
    dateOfBirth: z.string().optional(),
    address: z.string().optional(),
});

// M3: Submit KYC
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const parsed = kycSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }

        await connectDB();
        const existingKYC = await KYC.findOne({ userId: session.user.id });
        if (existingKYC) {
            return NextResponse.json({ error: "KYC already submitted" }, { status: 409 });
        }

        const kyc = await KYC.create({
            userId: session.user.id,
            ...parsed.data,
            status: "pending",
            amlFlags: [],
        });

        // Update user kycStatus
        await User.findByIdAndUpdate(session.user.id, { kycStatus: "pending" });

        return NextResponse.json(kyc, { status: 201 });
    } catch (error) {
        console.error("KYC submit error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// M3: Get KYC status
export async function GET() {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const kyc = await KYC.findOne({ userId: session.user.id }).select("-documentFrontUrl -documentBackUrl");
    return NextResponse.json(kyc || { status: "not_started" });
}
