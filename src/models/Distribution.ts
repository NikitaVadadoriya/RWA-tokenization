import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDistribution extends Document {
    _id: mongoose.Types.ObjectId;
    assetId: mongoose.Types.ObjectId;
    totalAmount: number;
    schedule: "monthly" | "quarterly" | "on_completion" | "on_sale";
    status: "pending" | "processing" | "completed" | "failed";
    recipientCount: number;
    feeAmount: number;
    netAmount: number;
    txHash: string;
    onChainId?: number;
    description: string;
    distributedAt: Date;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const DistributionSchema = new Schema<IDistribution>(
    {
        assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
        totalAmount: { type: Number, required: true, min: 0 },
        schedule: {
            type: String,
            enum: ["monthly", "quarterly", "on_completion", "on_sale"],
            default: "monthly",
        },
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
        },
        recipientCount: { type: Number, default: 0 },
        feeAmount: { type: Number, default: 0 },
        netAmount: { type: Number, default: 0 },
        txHash: { type: String, default: "" },
        onChainId: { type: Number },
        description: { type: String, default: "" },
        distributedAt: { type: Date },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const DistributionModel: Model<IDistribution> =
    mongoose.models.Distribution ||
    mongoose.model<IDistribution>("Distribution", DistributionSchema);

export default DistributionModel;
