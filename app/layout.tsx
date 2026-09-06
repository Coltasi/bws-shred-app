import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppBoot from "./components/AppBoot";

export const metadata: Metadata = {
  title: "BWS Shred | Colin's Program",
  description: "Built With Science – Shred Program: Workouts, Meal Plan & Progress Tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BWS Shred",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#eef4f7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#0a0a0f] text-white antialiased">
        <AppBoot>{children}</AppBoot>
      </body>
    </html>
  );
}
