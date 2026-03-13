import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKYC extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    documentType: "passport" | "national_id" | "drivers_license";
    documentUrl: string;
    proofOfAddress: string;
    status: "pending" | "approved" | "rejected";
    tier: "retail" | "accredited" | "institutional";
    amlFlags: string[];
    reviewedBy?: mongoose.Types.ObjectId;
    reviewNotes?: string;
    submittedAt: Date;
    reviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const KYCSchema = new Schema<IKYC>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        documentType: {
            type: String,
            enum: ["passport", "national_id", "drivers_license"],
            required: true,
        },
        documentUrl: { type: String, required: true },
        proofOfAddress: { type: String, default: "" },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        tier: { type: String, enum: ["retail", "accredited", "institutional"], default: "retail" },
        amlFlags: [{ type: String }],
        reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reviewNotes: { type: String },
        submittedAt: { type: Date, default: Date.now },
        reviewedAt: { type: Date },
    },
    { timestamps: true }
);

const KYCModel: Model<IKYC> =
    mongoose.models.KYC || mongoose.model<IKYC>("KYC", KYCSchema);

export default KYCModel;
