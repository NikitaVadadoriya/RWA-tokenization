import type { NextAuthConfig } from "next-auth";

// Edge-compatible NextAuth config (no bcrypt, no mongoose)
export const authConfig = {
    providers: [], // The real providers are added in auth.ts
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const role = (auth?.user as any)?.role;

            const isInvestorRoute = nextUrl.pathname.startsWith("/investor");
            const isAdminRoute = nextUrl.pathname.startsWith("/admin");

            if (isInvestorRoute || isAdminRoute) {
                if (!isLoggedIn) return false; // Redirect to login

                // Strict Role Boundaries
                if (isAdminRoute && role !== "admin") {
                    return Response.redirect(new URL("/investor/dashboard", nextUrl));
                }
                if (isInvestorRoute && role === "admin") {
                    return Response.redirect(new URL("/admin/dashboard", nextUrl));
                }

                return true;
            }
            return true;
        },
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.kycStatus = (user as any).kycStatus;
            }
            // Handle profile updates
            if (trigger === "update" && session) {
                token.kycStatus = session.kycStatus;
                token.role = session.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                (session.user as any).role = token.role as string;
                (session.user as any).kycStatus = token.kycStatus as string;
            }
            return session;
        },
    },
} satisfies NextAuthConfig;
