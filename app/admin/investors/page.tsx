import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import KYC from "@/models/KYC";
import { revalidatePath } from "next/cache";

// Server action for admin to approve/reject KYC
async function updateKycStatus(formData: FormData) {
    "use server";
    const kycId = formData.get("kycId") as string;
    const action = formData.get("action") as "approve" | "reject";
    const userId = formData.get("userId") as string;

    await connectDB();
    const newStatus = action === "approve" ? "verified" : "rejected";

    await KYC.findByIdAndUpdate(kycId, { status: newStatus });
    await User.findByIdAndUpdate(userId, { kycStatus: newStatus });

    revalidatePath("/admin/investors");
}

export default async function AdminInvestorsPage() {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "admin") redirect("/login");

    await connectDB();

    // Get all users who are investors
    const investors = await User.find({ role: "investor" }).sort({ createdAt: -1 });

    // Get all KYC records mapped to users
    const kycRecords = await KYC.find().populate("userId", "name email");

    // Map them for easy rendering
    const kycMap = new Map();
    for (const record of kycRecords) {
        if (record.userId) kycMap.set(record.userId._id.toString(), record);
    }

    return (
        <div style={{ minHeight: "100vh", padding: "2rem" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    Investor Management
                </h1>
                <p style={{ color: "var(--color-muted)", marginBottom: "2rem" }}>Review KYC applications and manage user accounts.</p>

                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                            <tr>
                                <th style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.85rem", color: "var(--color-muted)" }}>Investor</th>
                                <th style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.85rem", color: "var(--color-muted)" }}>Wallet Address</th>
                                <th style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.85rem", color: "var(--color-muted)" }}>Joined</th>
                                <th style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.85rem", color: "var(--color-muted)" }}>KYC Status</th>
                                <th style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.85rem", color: "var(--color-muted)" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {investors.map(inv => {
                                const kyc = kycMap.get(inv._id.toString());
                                return (
                                    <tr key={inv._id.toString()} style={{ borderBottom: "1px solid var(--color-border)" }}>
                                        <td style={{ padding: "1rem 1.5rem" }}>
                                            <div style={{ fontWeight: 600 }}>{inv.name}</div>
                                            <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>{inv.email}</div>
                                        </td>
                                        <td style={{ padding: "1rem 1.5rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                                            {inv.walletAddress ? `${inv.walletAddress.substring(0, 8)}...` : "Not connected"}
                                        </td>
                                        <td style={{ padding: "1rem 1.5rem", fontSize: "0.9rem" }}>
                                            {new Date(inv.createdAt).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: "1rem 1.5rem" }}>
                                            <span className={`badge badge-${inv.kycStatus === 'verified' ? 'verified' : inv.kycStatus === 'pending' ? 'pending' : 'rejected'}`} style={{ textTransform: "capitalize" }}>
                                                {inv.kycStatus.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td style={{ padding: "1rem 1.5rem" }}>
                                            {kyc && kyc.status === "pending" ? (
                                                <form action={updateKycStatus} style={{ display: "flex", gap: "0.5rem" }}>
                                                    <input type="hidden" name="kycId" value={kyc._id.toString()} />
                                                    <input type="hidden" name="userId" value={inv._id.toString()} />
                                                    <button type="submit" name="action" value="approve" className="btn btn-primary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", background: "var(--color-success)" }}>
                                                        Approve
                                                    </button>
                                                    <button type="submit" name="action" value="reject" className="btn" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", background: "var(--color-surface-2)", color: "var(--color-danger)" }}>
                                                        Reject
                                                    </button>
                                                </form>
                                            ) : (
                                                <span style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>No actions</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {investors.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "var(--color-muted)" }}>
                                        No investors found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
