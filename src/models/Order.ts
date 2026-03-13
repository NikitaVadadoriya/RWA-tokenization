import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrder extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    assetId: mongoose.Types.ObjectId;
    type: "buy" | "sell";
    quantity: number;
    pricePerToken: number;
    totalPrice: number;
    filled: number;
    status: "open" | "filled" | "partial" | "cancelled";
    txHash: string;
    onChainOrderId?: number;
    createdAt: Date;
    updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
        type: { type: String, enum: ["buy", "sell"], required: true },
        quantity: { type: Number, required: true, min: 1 },
        pricePerToken: { type: Number, required: true, min: 0 },
        totalPrice: { type: Number, required: true, min: 0 },
        filled: { type: Number, default: 0 },
        status: { type: String, enum: ["open", "filled", "partial", "cancelled"], default: "open" },
        txHash: { type: String, default: "" },
        onChainOrderId: { type: Number },
    },
    { timestamps: true }
);

OrderSchema.index({ assetId: 1, status: 1 });
OrderSchema.index({ userId: 1 });

const OrderModel: Model<IOrder> =
    mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default OrderModel;
