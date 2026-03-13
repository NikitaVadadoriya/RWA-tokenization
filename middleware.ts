import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
    // Matcher from original middleware
    matcher: [
        "/investor/:path*",
        "/admin/:path*",
        "/api/assets/:path*",
        "/api/kyc/:path*",
        "/api/orders/:path*",
        "/api/distributions/:path*",
        "/api/blockchain/:path*",
    ],
};
