import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPER_ROOT_ONLY_PATHS = ["/tools/articulos"];

function isProtectedPath(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/tools");
}

function isSuperRootPath(pathname: string) {
  return SUPER_ROOT_ONLY_PATHS.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/register")) {
    try {
      const statusResponse = await fetch(
        new URL("/api/users/status", request.url)
      );
      const statusData = (await statusResponse.json()) as {
        hasSuperRoot?: boolean;
      };
      if (statusData.hasSuperRoot) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const username = request.cookies.get("deck_user")?.value;
  const session = request.cookies.get("deck_session")?.value;

  if (!username || !session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isSuperRootPath(pathname)) {
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

  if (roleData.role !== "super-root") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/tools/:path*", "/register"],
};
