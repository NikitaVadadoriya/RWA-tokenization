import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import UserModel from "@/models/User";

export const authConfig: NextAuthConfig = {
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                await connectDB();
                const user = await UserModel.findOne({ email: credentials.email });
                if (!user) return null;

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.passwordHash
                );
                if (!isValid) return null;

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    kycStatus: user.kycStatus,
                    investorTier: user.investorTier,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                const u = user as unknown as Record<string, unknown>;
                token.role = u.role;
                token.kycStatus = u.kycStatus;
                token.investorTier = u.investorTier;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                const su = session.user as unknown as Record<string, unknown>;
                su.id = token.sub;
                su.role = token.role;
                su.kycStatus = token.kycStatus;
                su.investorTier = token.investorTier;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
