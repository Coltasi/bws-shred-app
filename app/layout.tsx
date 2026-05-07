import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistrar from "./components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "BWS Shred | Colin's Program",
  description: "Built With Science – Shred Program: Workouts, Meal Plan & Progress Tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
  themeColor: "#f59e0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#0a0a0f] text-white antialiased">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
