import mongoose, { Document, Schema } from "mongoose";

export interface IDistribution extends Document {
    assetId: mongoose.Types.ObjectId;
    totalAmount: number; // in ETH/MATIC
    schedule: "monthly" | "quarterly" | "on_completion";
    period: string; // e.g. "2025-Q1", "2025-03"
    status: "pending" | "processing" | "completed" | "failed";
    txHash?: string;
    recipientCount?: number;
    distributedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const DistributionSchema = new Schema<IDistribution>(
    {
        assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
        totalAmount: { type: Number, required: true },
        schedule: {
            type: String,
            enum: ["monthly", "quarterly", "on_completion"],
            required: true,
        },
        period: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
        },
        txHash: { type: String },
        recipientCount: { type: Number },
        distributedAt: { type: Date },
    },
    { timestamps: true }
);

export default mongoose.models.Distribution ||
    mongoose.model<IDistribution>("Distribution", DistributionSchema);
