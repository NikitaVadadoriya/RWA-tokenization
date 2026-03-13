import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: "investor" | "admin";
    walletAddress?: string;
    kycStatus: "pending" | "verified" | "rejected" | "not_started";
    investorTier: "retail" | "accredited" | "institutional";
    country?: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ["investor", "admin"], default: "investor" },
        walletAddress: { type: String, default: null },
        kycStatus: {
            type: String,
            enum: ["not_started", "pending", "verified", "rejected"],
            default: "not_started",
        },
        investorTier: {
            type: String,
            enum: ["retail", "accredited", "institutional"],
            default: "retail",
        },
        country: { type: String, default: null },
    },
    { timestamps: true }
);

export default mongoose.models.User ||
    mongoose.model<IUser>("User", UserSchema);
