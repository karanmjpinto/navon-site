import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Navon Portal",
  description: "Customer portal for Navon data centre services",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-display bg-ink text-paper antialiased">
        {children}
      </body>
    </html>
  );
}
