import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { z } from "zod";
import { authConfig } from "../auth.config";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig, // Spread the edge config (callbacks, pages)
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const parsed = loginSchema.safeParse(credentials);
                if (!parsed.success) return null;

                await connectDB();
                const user = await User.findOne({ email: parsed.data.email }).select(
                    "+passwordHash"
                );
                if (!user) return null;

                const isValid = await bcrypt.compare(
                    parsed.data.password,
                    user.passwordHash
                );
                if (!isValid) return null;

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    kycStatus: user.kycStatus,
                };
            },
        }),
    ],
    // Ensure NextAuth uses JWT session strategy natively since Edge can't read DB
    session: { strategy: "jwt" },
});
