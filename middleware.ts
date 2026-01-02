import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_ONLY_PATHS = ["/tools/articulos"];

function isProtectedPath(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/tools");
}

function isAdminPath(pathname: string) {
  return ADMIN_ONLY_PATHS.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const username = request.cookies.get("deck_user")?.value;
  const session = request.cookies.get("deck_session")?.value;

  if (!username || !session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isAdminPath(pathname)) {
    return NextResponse.next();
  }

  const roleResponse = await fetch(
    new URL(
      `/api/users/role?username=${encodeURIComponent(username)}`,
      request.url
    ),
    { headers: { cookie: request.headers.get("cookie") ?? "" } }
  );
  const roleData = (await roleResponse.json()) as { role?: string };

  if (roleData.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/tools/:path*", "/register"],
};
