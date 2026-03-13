import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAsset extends Document {
    _id: mongoose.Types.ObjectId;
    assetType: "real_estate" | "bond" | "project" | "art" | "metal";
    name: string;
    description: string;
    images: string[];
    location: string;
    contractAddress: string;
    orderBookAddress: string;
    incomeDistributorAddress: string;
    totalTokens: number;
    tokenPrice: number;
    tokenPriceEth: number;
    availableTokens: number;
    expectedYield: number;
    status: "draft" | "active" | "funded" | "closed";
    legalDocuments: string[];
    propertyType?: string;
    restrictedCountries: string[];
    minimumTier: "retail" | "accredited" | "institutional";
    metadata: {
        // Real Estate
        occupancyRate?: number;
        annualRent?: number;
        propertySize?: string;
        // Bonds
        bondRating?: string;
        couponRate?: number;
        maturityDate?: Date;
        issuer?: string;
        // Projects
        projectType?: string;
        revenueSource?: string;
        completionDate?: Date;
        milestones?: string[];
        // Art
        artist?: string;
        medium?: string;
        year?: number;
        provenance?: string;
        // Metals
        metalType?: string;
        gramsPerToken?: number;
        vaultLocation?: string;
        purity?: string;
    };
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
    {
        assetType: {
            type: String,
            enum: ["real_estate", "bond", "project", "art", "metal"],
            required: true,
        },
        name: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        images: [{ type: String }],
        location: { type: String, default: "" },
        contractAddress: { type: String, default: "" },
        orderBookAddress: { type: String, default: "" },
        incomeDistributorAddress: { type: String, default: "" },
        totalTokens: { type: Number, required: true },
        tokenPrice: { type: Number, required: true },
        tokenPriceEth: { type: Number, default: 0.001 },
        availableTokens: { type: Number, required: true },
        expectedYield: { type: Number, default: 0 },
        status: { type: String, enum: ["draft", "active", "funded", "closed"], default: "draft" },
        legalDocuments: [{ type: String }],
        propertyType: { type: String },
        restrictedCountries: [{ type: String }],
        minimumTier: { type: String, enum: ["retail", "accredited", "institutional"], default: "retail" },
        metadata: { type: Schema.Types.Mixed, default: {} },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

AssetSchema.index({ assetType: 1, status: 1 });
AssetSchema.index({ name: "text", description: "text" });

const AssetModel: Model<IAsset> =
    mongoose.models.Asset || mongoose.model<IAsset>("Asset", AssetSchema);

export default AssetModel;
