import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITransaction extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    assetId: mongoose.Types.ObjectId;
    type: "purchase" | "sale" | "distribution" | "transfer";
    quantity: number;
    pricePerToken: number;
    totalAmount: number;
    fee: number;
    txHash: string;
    status: "pending" | "confirmed" | "failed";
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
        type: {
            type: String,
            enum: ["purchase", "sale", "distribution", "transfer"],
            required: true,
        },
        quantity: { type: Number, required: true },
        pricePerToken: { type: Number, required: true },
        totalAmount: { type: Number, required: true },
        fee: { type: Number, default: 0 },
        txHash: { type: String, default: "" },
        status: { type: String, enum: ["pending", "confirmed", "failed"], default: "pending" },
    },
    { timestamps: true }
);

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ assetId: 1 });

const TransactionModel: Model<ITransaction> =
    mongoose.models.Transaction ||
    mongoose.model<ITransaction>("Transaction", TransactionSchema);

export default TransactionModel;
