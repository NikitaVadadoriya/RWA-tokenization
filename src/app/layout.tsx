import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { WalletProvider } from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "RWA Platform — Real World Asset Tokenization",
  description:
    "Invest in tokenized real-world assets — real estate, bonds, infrastructure, fine art, and precious metals. Fractional ownership starting from $100.",
  keywords: ["RWA", "tokenization", "real estate", "blockchain", "investment", "fractional ownership"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionProvider><WalletProvider>{children}</WalletProvider></SessionProvider>
      </body>
    </html>
  );
}
