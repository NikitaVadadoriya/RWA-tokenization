import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import KYCModel from "@/models/KYC";
import UserModel from "@/models/User";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const kycRecords = await KYCModel.find()
            .populate("userId", "name email kycStatus investorTier")
            .sort({ createdAt: -1 });

        return NextResponse.json({ kycRecords });
    } catch (error) {
        console.error("Admin KYC fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch KYC records" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const { kycId, status, reviewNotes } = body;

        const kyc = await KYCModel.findByIdAndUpdate(
            kycId,
            {
                status,
                reviewNotes,
                reviewedBy: (session.user as Record<string, unknown>).id,
                reviewedAt: new Date(),
            },
            { new: true }
        );

        if (!kyc) {
            return NextResponse.json({ error: "KYC record not found" }, { status: 404 });
        }

        const kycStatus = status === "approved" ? "verified" : status === "rejected" ? "rejected" : "pending";
        await UserModel.findByIdAndUpdate(kyc.userId, {
            kycStatus,
            investorTier: kyc.tier,
        });

        return NextResponse.json({ message: `KYC ${status}`, kyc });
    } catch (error) {
        console.error("Admin KYC update error:", error);
        return NextResponse.json({ error: "KYC update failed" }, { status: 500 });
    }
}
