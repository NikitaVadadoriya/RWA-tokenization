export type UserRole = "investor" | "admin";
export type KYCStatus = "none" | "pending" | "verified" | "rejected";
export type InvestorTier = "retail" | "accredited" | "institutional";
export type AssetType = "real_estate" | "bond" | "project" | "art" | "metal";
export type AssetStatus = "draft" | "active" | "funded" | "closed";
export type OrderType = "buy" | "sell";
export type OrderStatus = "open" | "filled" | "partial" | "cancelled";
export type TransactionType = "purchase" | "sale" | "distribution" | "transfer";
export type DistributionSchedule = "monthly" | "quarterly" | "on_completion" | "on_sale";

export interface SessionUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    kycStatus: KYCStatus;
    investorTier: InvestorTier;
}

export interface AssetCardData {
    _id: string;
    assetType: AssetType;
    name: string;
    description: string;
    images: string[];
    location: string;
    totalTokens: number;
    tokenPrice: number;
    availableTokens: number;
    expectedYield: number;
    status: AssetStatus;
    propertyType?: string;
}

export interface PortfolioHolding {
    assetId: string;
    assetName: string;
    assetType: AssetType;
    tokensOwned: number;
    currentPrice: number;
    totalValue: number;
    totalIncome: number;
    purchaseDate: string;
}

export interface TradeOrder {
    _id: string;
    userId: string;
    assetId: {
        _id: string;
        name: string;
        assetType: AssetType;
        tokenPrice: number;
    };
    type: OrderType;
    quantity: number;
    pricePerToken: number;
    totalPrice: number;
    status: OrderStatus;
    createdAt: string;
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
    real_estate: "Real Estate",
    bond: "Bonds",
    project: "Infrastructure",
    art: "Fine Art",
    metal: "Precious Metals",
};

export const ASSET_TYPE_ICONS: Record<AssetType, string> = {
    real_estate: "🏢",
    bond: "📄",
    project: "🏗️",
    art: "🎨",
    metal: "🥇",
};

export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
    real_estate: "#06b6d4",
    bond: "#8b5cf6",
    project: "#f59e0b",
    art: "#ec4899",
    metal: "#eab308",
};
