import mongoose, { Document, Schema } from "mongoose";

export interface ITransaction extends Document {
    userId: mongoose.Types.ObjectId;
    assetId: mongoose.Types.ObjectId;
    type: "purchase" | "sale" | "distribution" | "withdrawal";
    quantity?: number; // tokens (for purchase/sale)
    amount: number; // USD value
    pricePerToken?: number;
    txHash?: string;
    status: "pending" | "confirmed" | "failed";
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
        type: {
            type: String,
            enum: ["purchase", "sale", "distribution", "withdrawal"],
            required: true,
        },
        quantity: { type: Number },
        amount: { type: Number, required: true },
        pricePerToken: { type: Number },
        txHash: { type: String },
        status: {
            type: String,
            enum: ["pending", "confirmed", "failed"],
            default: "pending",
        },
        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

export default mongoose.models.Transaction ||
    mongoose.model<ITransaction>("Transaction", TransactionSchema);
