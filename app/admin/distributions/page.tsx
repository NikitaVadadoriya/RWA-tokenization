import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import Asset from "@/models/Asset";
import AdminDistributionsClient from "./AdminDistributionsClient";

export default async function AdminDistributionsPage() {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "admin") redirect("/login");

    await connectDB();

    // Only fetch active / funding assets that have a distributor deployed
    const rawAssets = await Asset.find({
        status: { $in: ["funding", "active"] },
        distributorAddress: { $ne: null }
    }).select("name assetType totalTokens distributorAddress").sort({ createdAt: -1 });

    const assets = JSON.parse(JSON.stringify(rawAssets));

    return <AdminDistributionsClient assets={assets} />;
}
