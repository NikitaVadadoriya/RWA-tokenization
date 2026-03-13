import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import KYC from "@/models/KYC";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { z } from "zod";

const reviewSchema = z.object({
    userId: z.string(),
    status: z.enum(["verified", "rejected"]),
    rejectionReason: z.string().optional(),
});

// M8: Admin lists all pending KYC applications
export async function GET() {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "admin") {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    await connectDB();
    const kycs = await KYC.find({ status: "pending" })
        .populate("userId", "name email country investorTier")
        .sort({ createdAt: 1 }); // oldest first

    return NextResponse.json(kycs);
}

// M8: Admin approves or rejects KYC
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "admin") {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const parsed = reviewSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }

        await connectDB();
        const kyc = await KYC.findOneAndUpdate(
            { userId: parsed.data.userId },
            {
                status: parsed.data.status,
                rejectionReason: parsed.data.rejectionReason,
                reviewedBy: session.user.id,
                reviewedAt: new Date(),
            },
            { new: true }
        );

        if (!kyc) return NextResponse.json({ error: "KYC not found" }, { status: 404 });

        // Sync status to User document
        await User.findByIdAndUpdate(parsed.data.userId, {
            kycStatus: parsed.data.status,
        });

        return NextResponse.json(kyc);
    } catch (error) {
        console.error("KYC review error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
