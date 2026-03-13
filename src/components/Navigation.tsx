"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useWallet } from "@/components/WalletProvider";

export function Navbar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const { walletAddress, connectWallet, disconnectWallet, shortAddress, isConnecting } = useWallet();

    const isLoggedIn = !!session?.user;
    const role = (session?.user as unknown as Record<string, unknown>)?.role;

    return (
        <nav
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 48px",
                borderBottom: "1px solid var(--border-color)",
                position: "sticky",
                top: 0,
                background: "rgba(10, 14, 26, 0.92)",
                backdropFilter: "blur(20px)",
                zIndex: 100,
            }}
        >
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "var(--gradient-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 18,
                        color: "white",
                    }}
                >
                    R
                </div>
                <span style={{ fontWeight: 700, fontSize: 20, color: "var(--text-primary)" }}>
                    RWA <span className="gradient-text">Platform</span>
                </span>
            </Link>

            {/* Navigation Links */}
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                {isLoggedIn && (
                    <>
                        <NavLink href="/investor/marketplace" active={pathname.startsWith("/investor/marketplace")}>
                            🛒 Marketplace
                        </NavLink>
                        <NavLink href="/investor/dashboard" active={pathname.startsWith("/investor/dashboard")}>
                            📊 Dashboard
                        </NavLink>
                        <NavLink href="/investor/portfolio" active={pathname.startsWith("/investor/portfolio")}>
                            💼 Portfolio
                        </NavLink>
                        <NavLink href="/investor/trade" active={pathname.startsWith("/investor/trade")}>
                            📈 Trade
                        </NavLink>
                        {role === "admin" && (
                            <NavLink href="/admin/dashboard" active={pathname.startsWith("/admin")}>
                                ⚙️ Admin
                            </NavLink>
                        )}
                    </>
                )}
            </div>

            {/* Auth Actions */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {isLoggedIn ? (
                    <>
                        {/* Wallet Connection */}
                        {walletAddress ? (
                            <div style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "6px 14px", borderRadius: 8,
                                background: "rgba(16,185,129,0.1)",
                                border: "1px solid rgba(16,185,129,0.25)",
                            }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-emerald)", display: "inline-block" }} />
                                <span style={{ color: "var(--accent-emerald)", fontSize: 12, fontFamily: "monospace" }}>
                                    {shortAddress}
                                </span>
                                <button
                                    onClick={disconnectWallet}
                                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}
                                    title="Disconnect wallet"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={connectWallet}
                                disabled={isConnecting}
                                style={{
                                    padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                                    background: "rgba(245, 158, 11, 0.12)",
                                    color: "var(--accent-amber)",
                                    border: "1px solid rgba(245,158,11,0.3)",
                                    cursor: "pointer",
                                }}
                            >
                                {isConnecting ? "Connecting..." : "🦊 Connect Wallet"}
                            </button>
                        )}
                        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                            {(session?.user as unknown as Record<string, unknown>)?.name as string}
                        </span>
                        <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="btn-secondary"
                            style={{ padding: "8px 20px", fontSize: 13 }}
                        >
                            🚪 Sign Out
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/login" className="btn-secondary" style={{ padding: "10px 24px", fontSize: 14 }}>
                            Sign In
                        </Link>
                        <Link href="/register" className="glow-btn" style={{ padding: "10px 24px", fontSize: 14 }}>
                            Get Started →
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            style={{
                color: active ? "var(--accent-cyan)" : "var(--text-secondary)",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
                padding: "6px 12px",
                borderRadius: 8,
                background: active ? "rgba(6, 182, 212, 0.1)" : "transparent",
                transition: "all 0.2s",
            }}
        >
            {children}
        </Link>
    );
}

export function InvestorSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const role = (session?.user as unknown as Record<string, unknown>)?.role;

    return (
        <div className="sidebar" style={{ display: "flex", flexDirection: "column" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, textDecoration: "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "white" }}>
                    R
                </div>
                <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>RWA Platform</span>
            </Link>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <SidebarLink href="/investor/dashboard" active={pathname === "/investor/dashboard"}>📊 Dashboard</SidebarLink>
                <SidebarLink href="/investor/marketplace" active={pathname.startsWith("/investor/marketplace")}>🛒 Marketplace</SidebarLink>
                <SidebarLink href="/investor/portfolio" active={pathname === "/investor/portfolio"}>💼 Portfolio</SidebarLink>
                <SidebarLink href="/investor/trade" active={pathname === "/investor/trade"}>📈 Trade</SidebarLink>
                <SidebarLink href="/investor/transactions" active={pathname === "/investor/transactions"}>📄 Transactions</SidebarLink>
                <SidebarLink href="/investor/distributions" active={pathname === "/investor/distributions"}>💸 Distributions</SidebarLink>
                <SidebarLink href="/investor/kyc" active={pathname === "/investor/kyc"}>🪪 KYC</SidebarLink>
            </nav>
            {role === "admin" && (
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "0 16px 8px", textTransform: "uppercase", letterSpacing: 1 }}>Admin</div>
                    <SidebarLink href="/admin/dashboard" active={pathname === "/admin/dashboard"}>⚙️ Admin Panel</SidebarLink>
                    <SidebarLink href="/admin/assets" active={pathname === "/admin/assets"}>🏢 Manage Assets</SidebarLink>
                    <SidebarLink href="/admin/investors" active={pathname === "/admin/investors"}>👥 Investors</SidebarLink>
                </div>
            )}

            {/* Logout Section */}
            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
                {session?.user && (
                    <div style={{ padding: "0 16px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                            {(session.user as unknown as Record<string, unknown>).name as string}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {(session.user as unknown as Record<string, unknown>).email as string}
                        </div>
                    </div>
                )}
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "calc(100% - 16px)",
                        margin: "0 8px",
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: "1px solid rgba(244, 63, 94, 0.3)",
                        background: "rgba(244, 63, 94, 0.08)",
                        color: "var(--accent-rose)",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        transition: "all 0.2s",
                    }}
                >
                    🚪 Sign Out
                </button>
            </div>
        </div>
    );
}

export function AdminSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <div className="sidebar" style={{ display: "flex", flexDirection: "column" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, textDecoration: "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #f43f5e, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "white" }}>
                    A
                </div>
                <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>Admin Panel</span>
            </Link>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <SidebarLink href="/admin/dashboard" active={pathname === "/admin/dashboard"}>📊 Dashboard</SidebarLink>
                <SidebarLink href="/admin/assets" active={pathname === "/admin/assets"}>🏢 Assets</SidebarLink>
                <SidebarLink href="/admin/investors" active={pathname === "/admin/investors"}>👥 Investors</SidebarLink>
                <SidebarLink href="/admin/distributions" active={pathname === "/admin/distributions"}>💸 Distributions</SidebarLink>
                <SidebarLink href="/admin/transactions" active={pathname === "/admin/transactions"}>📊 Transactions</SidebarLink>
                <SidebarLink href="/admin/revenue" active={pathname === "/admin/revenue"}>💰 Revenue</SidebarLink>
            </nav>
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
                <SidebarLink href="/investor/dashboard" active={false}>← Investor View</SidebarLink>
                <SidebarLink href="/investor/marketplace" active={false}>🛒 Marketplace</SidebarLink>
            </div>

            {/* Logout Section */}
            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
                {session?.user && (
                    <div style={{ padding: "0 16px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                            {(session.user as unknown as Record<string, unknown>).name as string}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {(session.user as unknown as Record<string, unknown>).email as string}
                        </div>
                    </div>
                )}
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "calc(100% - 16px)",
                        margin: "0 8px",
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: "1px solid rgba(244, 63, 94, 0.3)",
                        background: "rgba(244, 63, 94, 0.08)",
                        color: "var(--accent-rose)",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        transition: "all 0.2s",
                    }}
                >
                    🚪 Sign Out
                </button>
            </div>
        </div>
    );
}

function SidebarLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className={`sidebar-link ${active ? "active" : ""}`}
        >
            {children}
        </Link>
    );
}
