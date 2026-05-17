import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ICB Wayland — Admin",
  description: "Website content manager for ICB Wayland",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
