import mongoose, { Document, Schema } from "mongoose";

export interface IKYC extends Document {
    userId: mongoose.Types.ObjectId;
    documentType: "passport" | "national_id" | "drivers_license";
    documentFrontUrl: string;
    documentBackUrl?: string;
    proofOfAddressUrl?: string;
    selfieUrl?: string;
    dateOfBirth?: string;
    address?: string;
    status: "pending" | "verified" | "rejected";
    rejectionReason?: string;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    amlFlags: string[];
    createdAt: Date;
    updatedAt: Date;
}

const KYCSchema = new Schema<IKYC>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        documentType: {
            type: String,
            enum: ["passport", "national_id", "drivers_license"],
            required: true,
        },
        documentFrontUrl: { type: String, required: true },
        documentBackUrl: { type: String },
        proofOfAddressUrl: { type: String },
        selfieUrl: { type: String },
        dateOfBirth: { type: String },
        address: { type: String },
        status: {
            type: String,
            enum: ["pending", "verified", "rejected"],
            default: "pending",
        },
        rejectionReason: { type: String },
        reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reviewedAt: { type: Date },
        amlFlags: [{ type: String }],
    },
    { timestamps: true }
);

export default mongoose.models.KYC || mongoose.model<IKYC>("KYC", KYCSchema);
