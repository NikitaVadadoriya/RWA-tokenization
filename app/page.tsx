import Link from "next/link";

const stats = [
  { label: "Global Real Estate Market", value: "$326T", sub: "Less than 0.01% tokenized" },
  { label: "Bond Market", value: "$130T", sub: "Less than 0.1% tokenized" },
  { label: "Projected Market by 2030", value: "$16T", sub: "RWA tokenization (BCG)" },
  { label: "Minimum Investment", value: "$100", sub: "Any asset class" },
];

const assetClasses = [
  {
    icon: "🏢",
    title: "Real Estate",
    desc: "Commercial offices, luxury hotels, residential complexes, warehouses. Earn monthly rental yield.",
    yield: "6–12% APY",
    color: "#0ea5e9",
  },
  {
    icon: "📊",
    title: "Bonds",
    desc: "Corporate and government bonds fractionalized. Access the $130 trillion bond market from $100.",
    yield: "4–8% APY",
    color: "#a78bfa",
  },
  {
    icon: "⚡",
    title: "Infrastructure",
    desc: "Solar farms, toll roads, data centers. Earn revenue from electricity sales and toll collections.",
    yield: "8–15% APY",
    color: "#f59e0b",
  },
  {
    icon: "🎨",
    title: "Fine Art",
    desc: "Co-own authenticated masterpieces. Art historically outperforms stock markets.",
    yield: "10–25% (appreciation)",
    color: "#ec4899",
  },
  {
    icon: "🥇",
    title: "Precious Metals",
    desc: "Gold and silver tokens backed by physical metals. Redeem for real metal anytime.",
    yield: "Market-linked",
    color: "#d97706",
  },
  {
    icon: "🚢",
    title: "Trade Finance",
    desc: "Fund international trade invoices. 30-120 day cycles with fixed returns.",
    yield: "8–12% APY",
    color: "#10b981",
  },
];

const steps = [
  { n: "01", title: "Register & Verify", desc: "Create account, complete KYC in under 10 minutes" },
  { n: "02", title: "Browse Assets", desc: "Explore vetted, legally-structured real-world assets" },
  { n: "03", title: "Invest from $100", desc: "Buy fractional tokens representing ownership shares" },
  { n: "04", title: "Earn Automatically", desc: "Smart contracts distribute income directly to your wallet" },
];

export default function LandingPage() {
  return (
    <main style={{ minHeight: "100vh" }}>
      {/* Nav */}
      <nav className="glass" style={{
        position: "sticky", top: 0, zIndex: 50,
        padding: "1rem 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, var(--color-primary), var(--color-gold))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18
          }}>⬡</div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem" }}>
            RWA<span className="gradient-text">Platform</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/login" className="btn btn-ghost" style={{ padding: "0.5rem 1.25rem" }}>Sign In</Link>
          <Link href="/register" className="btn btn-primary" style={{ padding: "0.5rem 1.25rem" }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: "6rem 2rem 4rem",
        maxWidth: 1100, margin: "0 auto",
        textAlign: "center"
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          background: "oklch(0.6 0.2 200 / 0.1)", border: "1px solid oklch(0.6 0.2 200 / 0.3)",
          borderRadius: 99, padding: "0.35rem 1rem", marginBottom: "2rem",
          fontSize: "0.85rem", color: "var(--color-primary)"
        }}>
          <span>⬡</span> Powered by Ethereum Smart Contracts
        </div>

        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
          fontWeight: 700,
          lineHeight: 1.1,
          marginBottom: "1.5rem"
        }}>
          Invest in Real‑World Assets<br />
          <span className="gradient-text">Starting from $100</span>
        </h1>

        <p style={{
          fontSize: "1.2rem", color: "var(--color-muted)",
          maxWidth: 680, margin: "0 auto 2.5rem",
          lineHeight: 1.7
        }}>
          Fractional ownership of real estate, bonds, infrastructure, fine art and precious metals —
          powered by ERC-20 tokens on Ethereum. Earn automated income. Exit anytime.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" className="btn btn-primary" style={{ padding: "0.875rem 2.5rem", fontSize: "1.05rem" }}>
            Start Investing →
          </Link>
          <Link href="/marketplace" className="btn btn-ghost" style={{ padding: "0.875rem 2rem", fontSize: "1.05rem" }}>
            Browse Assets
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: "3rem 2rem", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          {stats.map((s) => (
            <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, fontFamily: "var(--font-display)" }} className="gradient-text">{s.value}</div>
              <div style={{ fontWeight: 600, marginTop: "0.25rem" }}>{s.label}</div>
              <div style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Asset Classes */}
      <section style={{ padding: "4rem 2rem", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", fontWeight: 700 }}>
            6 Asset Classes. One Platform.
          </h2>
          <p style={{ color: "var(--color-muted)", marginTop: "0.75rem" }}>
            Previously accessible only to ultra-wealthy investors and institutions.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
          {assetClasses.map((a) => (
            <div key={a.title} className="card card-hover">
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${a.color}18`, border: `1px solid ${a.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.5rem"
                }}>{a.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{a.title}</div>
                  <div className="yield-tag">{a.yield}</div>
                </div>
              </div>
              <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section style={{
        padding: "4rem 2rem",
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)"
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", fontWeight: 700, textAlign: "center", marginBottom: "3rem" }}>
            How It Works
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2rem" }}>
            {steps.map((s) => (
              <div key={s.n} style={{ textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56,
                  background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                  borderRadius: 16, display: "flex", alignItems: "center",
                  justifyContent: "center", margin: "0 auto 1rem",
                  fontSize: "0.8rem", fontWeight: 800, color: "white", letterSpacing: "0.05em"
                }}>{s.n}</div>
                <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>{s.title}</div>
                <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "5rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem" }}>
          Ready to build generational wealth?
        </h2>
        <p style={{ color: "var(--color-muted)", marginBottom: "2rem", fontSize: "1.1rem" }}>
          Join thousands of investors earning passive income from real-world assets.
        </p>
        <Link href="/register" className="btn btn-gold" style={{ padding: "1rem 3rem", fontSize: "1.1rem" }}>
          Create Free Account →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--color-border)",
        padding: "2rem",
        color: "var(--color-muted)",
        textAlign: "center",
        fontSize: "0.875rem"
      }}>
        © 2025 RWA Platform. All investments involve risk. Past performance does not guarantee future results.
      </footer>
    </main>
  );
}
