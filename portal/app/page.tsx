import { redirect } from "next/navigation";

// Middleware handles the unauthenticated redirect to /login
// and authenticated redirect to /dashboard. This page only renders
// in the unlikely case middleware is bypassed.
export default function RootPage() {
  redirect("/login");
}
