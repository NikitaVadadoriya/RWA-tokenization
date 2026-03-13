import mongoose, { Document, Schema } from "mongoose";

// Covers all asset types: real_estate, bond, project, art, metal
export interface IAsset extends Document {
    assetType: "real_estate" | "bond" | "project" | "art" | "metal";
    name: string;
    description: string;
    location?: string;
    images: string[];
    // Token details
    contractAddress?: string; // set after ERC-20 is deployed
    distributorAddress?: string; // set after IncomeDistributor is deployed
    totalTokens: number;
    tokenPrice: number; // USD
    availableTokens: number;
    // Financial
    expectedYield?: number; // Annual % yield
    // Legal
    legalDocuments: string[];
    spvEntity?: string;
    // Status
    status: "draft" | "funding" | "active" | "closed";
    createdBy: mongoose.Types.ObjectId;
    // Addon-specific metadata (flexible for all asset classes)
    metadata: Record<string, unknown>;
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
        location: { type: String },
        images: [{ type: String }],
        contractAddress: { type: String, default: null },
        distributorAddress: { type: String, default: null },
        totalTokens: { type: Number, required: true, min: 1 },
        tokenPrice: { type: Number, required: true, min: 0.01 },
        availableTokens: { type: Number, required: true },
        expectedYield: { type: Number },
        legalDocuments: [{ type: String }],
        spvEntity: { type: String },
        status: {
            type: String,
            enum: ["draft", "funding", "active", "closed"],
            default: "draft",
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

// Metadata examples by asset type:
// real_estate: { propertyType, occupancyRate, rentalIncome, maintenanceCost }
// bond:        { bondRating, couponRate, maturityDate, issuer }
// project:     { projectType, revenueSource, constructionPhase, completionDate }
// art:         { artist, medium, provenance, custodianVault }
// metal:       { metalType, gramsPerToken, vaultLocation, lbmaApproved }

export default mongoose.models.Asset ||
    mongoose.model<IAsset>("Asset", AssetSchema);
