import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    passwordHash: string;
    role: "investor" | "admin";
    walletAddress?: string;
    kycStatus: "none" | "pending" | "verified" | "rejected";
    investorTier: "retail" | "accredited" | "institutional";
    country: string;
    restrictedCountries: string[];
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ["investor", "admin"], default: "investor" },
        walletAddress: { type: String, default: "" },
        kycStatus: { type: String, enum: ["none", "pending", "verified", "rejected"], default: "none" },
        investorTier: { type: String, enum: ["retail", "accredited", "institutional"], default: "retail" },
        country: { type: String, default: "" },
        restrictedCountries: [{ type: String }],
    },
    { timestamps: true }
);

const UserModel: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default UserModel;
