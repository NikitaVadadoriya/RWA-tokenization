import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TradeClient from "@/components/TradeClient";

export default async function TradePage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const host = (await headers()).get("host") || "localhost:3000";
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const origin = `${protocol}://${host}`;

    let initialOrders = [];

    try {
        const cookie = (await headers()).get("cookie");
        const res = await fetch(`${origin}/api/orders`, {
            headers: cookie ? { cookie } : {}
        });
        if (res.ok) {
            initialOrders = await res.json();
        }
    } catch (e) {
        console.error("Failed to fetch active orders:", e);
    }

    return <TradeClient initialOrders={initialOrders} />;
}
