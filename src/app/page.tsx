import Link from "next/link";

const ASSET_CLASSES = [
  {
    icon: "🏢",
    name: "Real Estate",
    desc: "Commercial offices, luxury hotels, residential complexes, warehouses",
    yield: "6-12% Annual Yield",
    color: "#06b6d4",
    market: "$326T Market",
  },
  {
    icon: "📄",
    name: "Bonds",
    desc: "Corporate and government bonds with automated coupon payments",
    yield: "4-8% Fixed Returns",
    color: "#8b5cf6",
    market: "$130T Market",
  },
  {
    icon: "🏗️",
    name: "Infrastructure",
    desc: "Solar farms, toll roads, data centers, water treatment plants",
    yield: "8-15% Revenue Share",
    color: "#f59e0b",
    market: "$50T+ Market",
  },
  {
    icon: "🎨",
    name: "Fine Art",
    desc: "Authenticated masterpieces and luxury collectibles",
    yield: "10-25% Appreciation",
    color: "#ec4899",
    market: "$2T+ Market",
  },
  {
    icon: "🥇",
    name: "Precious Metals",
    desc: "Physical gold, silver backed tokens with vault storage",
    yield: "Market Price",
    color: "#eab308",
    market: "Safe Haven",
  },
  {
    icon: "📊",
    name: "Trade Finance",
    desc: "Short-term invoice funding with fixed returns (30-120 days)",
    yield: "6-12% Fixed",
    color: "#10b981",
    market: "$1.7T Gap",
  },
];

const STATS = [
  { value: "$16T", label: "Projected Market by 2030" },
  { value: "24/7", label: "Trading Available" },
  { value: "$100", label: "Minimum Investment" },
  { value: "0.01%", label: "Currently Tokenized" },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 48px",
          borderBottom: "1px solid var(--border-color)",
          position: "sticky",
          top: 0,
          background: "rgba(10, 14, 26, 0.9)",
          backdropFilter: "blur(20px)",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            }}
          >
            R
          </div>
          <span style={{ fontWeight: 700, fontSize: 20 }}>
            RWA <span className="gradient-text">Platform</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/login" className="btn-secondary" style={{ padding: "10px 24px", fontSize: 14 }}>
            Sign In
          </Link>
          <Link href="/register" className="glow-btn" style={{ padding: "10px 24px", fontSize: 14 }}>
            Get Started →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          padding: "100px 48px 60px",
          textAlign: "center",
          maxWidth: 900,
          margin: "0 auto",
        }}
        className="animate-fade-in-up"
      >
        <div className="badge badge-cyan" style={{ marginBottom: 24, fontSize: 13 }}>
          🚀 Blockchain-Powered Asset Tokenization
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.1, marginBottom: 24 }}>
          Invest in <span className="gradient-text">Real World Assets</span>
          <br />
          Starting from $100
        </h1>
        <p
          style={{
            fontSize: 20,
            color: "var(--text-secondary)",
            maxWidth: 640,
            margin: "0 auto 40px",
            lineHeight: 1.6,
          }}
        >
          Fractional ownership of real estate, bonds, infrastructure, fine art, and
          precious metals — secured by Smart Contracts on the blockchain.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <Link href="/register" className="glow-btn" style={{ fontSize: 16, padding: "14px 36px" }}>
            Start Investing →
          </Link>
          <Link href="/investor/marketplace" className="btn-secondary" style={{ fontSize: 16, padding: "14px 36px" }}>
            Browse Assets
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: "40px 48px 80px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          {STATS.map((stat, i) => (
            <div
              key={i}
              className={`stat-card animate-fade-in-up animate-delay-${(i + 1) * 100}`}
              style={{ textAlign: "center" }}
            >
              <div className="gradient-text" style={{ fontSize: 36, fontWeight: 800, marginBottom: 4 }}>
                {stat.value}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Asset Classes */}
      <section style={{ padding: "40px 48px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, marginBottom: 12 }}>
            6 Asset Classes, <span className="gradient-text">One Platform</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 18 }}>
            Diversify across multiple asset classes with a single account
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          {ASSET_CLASSES.map((asset, i) => (
            <div
              key={i}
              className={`glass-card animate-fade-in-up animate-delay-${Math.min((i + 1) * 100, 400)}`}
              style={{ padding: 28 }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: `${asset.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  marginBottom: 16,
                }}
              >
                {asset.icon}
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{asset.name}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                {asset.desc}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="badge" style={{ background: `${asset.color}20`, color: asset.color }}>
                  {asset.yield}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{asset.market}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section
        style={{
          padding: "80px 48px",
          background: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-color)",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, marginBottom: 12 }}>
            How It <span className="gradient-text">Works</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 18 }}>
            From sign-up to earning income in 4 simple steps
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 32,
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          {[
            { step: "01", title: "Sign Up & KYC", desc: "Create account and verify identity in under 10 minutes" },
            { step: "02", title: "Browse Assets", desc: "Explore curated properties, bonds, projects, and more" },
            { step: "03", title: "Invest", desc: "Choose tokens, pay via bank/card, own in under 2 minutes" },
            { step: "04", title: "Earn Income", desc: "Receive automated distributions directly to your wallet" },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div
                className="gradient-text"
                style={{ fontSize: 48, fontWeight: 900, marginBottom: 12, opacity: 0.6 }}
              >
                {item.step}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "100px 48px", textAlign: "center" }}>
        <h2 style={{ fontSize: 40, fontWeight: 800, marginBottom: 16 }}>
          Ready to <span className="gradient-text">Invest?</span>
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 18, marginBottom: 32 }}>
          Join thousands of investors accessing premium assets
        </p>
        <Link href="/register" className="glow-btn" style={{ fontSize: 18, padding: "16px 48px" }}>
          Create Free Account →
        </Link>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "40px 48px",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "var(--text-muted)",
          fontSize: 14,
        }}
      >
        <div>© 2026 RWA Platform. All rights reserved.</div>
        <div style={{ display: "flex", gap: 24 }}>
          <span>Terms</span>
          <span>Privacy</span>
          <span>Compliance</span>
        </div>
      </footer>
    </div>
  );
}
