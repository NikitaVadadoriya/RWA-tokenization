import mongoose, { Document, Schema } from "mongoose";

export interface IWithdrawal extends Document {
    userId: mongoose.Types.ObjectId;
    amount: number; // USD / FIAT amount
    status: "pending" | "approved" | "rejected" | "completed";
    bankDetails: {
        accountName: string;
        accountNumber: string;
        routingNumber: string;
    };
    txHash?: string; // If processed via crypto instead of fiat
    createdAt: Date;
    updatedAt: Date;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        amount: { type: Number, required: true, min: 10 },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "completed"],
            default: "pending",
        },
        bankDetails: {
            accountName: { type: String, required: true },
            accountNumber: { type: String, required: true },
            routingNumber: { type: String, required: true },
        },
        txHash: { type: String },
    },
    { timestamps: true }
);

export default mongoose.models.Withdrawal ||
    mongoose.model<IWithdrawal>("Withdrawal", WithdrawalSchema);
