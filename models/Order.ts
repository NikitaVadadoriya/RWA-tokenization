import mongoose, { Document, Schema } from "mongoose";

export interface IOrder extends Document {
    assetId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    type: "buy" | "sell";
    quantity: number;
    pricePerToken: number; // USD
    onChainOrderId?: number; // OrderBook.sol orderId
    status: "open" | "filled" | "cancelled" | "partial";
    filledBy?: mongoose.Types.ObjectId; // user who filled
    txHash?: string;
    createdAt: Date;
    updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
    {
        assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: { type: String, enum: ["buy", "sell"], required: true },
        quantity: { type: Number, required: true, min: 1 },
        pricePerToken: { type: Number, required: true, min: 0 },
        onChainOrderId: { type: Number },
        status: {
            type: String,
            enum: ["open", "filled", "cancelled", "partial"],
            default: "open",
        },
        filledBy: { type: Schema.Types.ObjectId, ref: "User" },
        txHash: { type: String },
    },
    { timestamps: true }
);

export default mongoose.models.Order ||
    mongoose.model<IOrder>("Order", OrderSchema);
