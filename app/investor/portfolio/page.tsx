import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PortfolioClient from "@/components/PortfolioClient";

export default async function PortfolioPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const host = (await headers()).get("host") || "localhost:3000";
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const origin = `${protocol}://${host}`;

    let initialData = { holdings: [] };

    try {
        const cookie = (await headers()).get("cookie");
        const res = await fetch(`${origin}/api/portfolio`, {
            headers: cookie ? { cookie } : {}
        });
        if (res.ok) {
            initialData = await res.json();
        }
    } catch (e) {
        console.error("Failed to fetch initial portfolio data:", e);
    }

    return <PortfolioClient initialData={initialData} />;
}
