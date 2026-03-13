import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Check for NextAuth session token (works with both secure and non-secure cookies)
    const token =
        req.cookies.get("authjs.session-token")?.value ||
        req.cookies.get("__Secure-authjs.session-token")?.value ||
        req.cookies.get("next-auth.session-token")?.value ||
        req.cookies.get("__Secure-next-auth.session-token")?.value;

    const isLoggedIn = !!token;

    // Protected investor routes — require login
    if (pathname.startsWith("/investor")) {
        if (!isLoggedIn) {
            return NextResponse.redirect(new URL("/login", req.nextUrl));
        }
    }

    // Protected admin routes — require login (role checked at API level)
    if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) {
            return NextResponse.redirect(new URL("/login", req.nextUrl));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/investor/:path*", "/admin/:path*"],
};
