import { auth } from "@/lib/auth";

export default auth((req) => {
  const isAuthed = !!req.auth;
  const { pathname } = req.nextUrl;

  // Public routes: auth flows, root marketing redirect, Auth.js endpoints
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/reset") ||
    pathname.startsWith("/api/auth");

  if (!isAuthed && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return Response.redirect(url);
  }
  if (isAuthed && (pathname === "/" || pathname.startsWith("/login"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
