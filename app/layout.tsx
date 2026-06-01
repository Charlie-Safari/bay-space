import type { Metadata, Viewport } from "next";
import MountainTimeFooter from "./components/mountain-time-footer";
import { getSiteUrl } from "../lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: "BaySpace",
  title: "bay-space",
  description: "A DOS-inspired bay-space website.",
  appleWebApp: {
    capable: true,
    title: "BaySpace",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "bay-space",
    description: "A DOS-inspired bay-space website.",
    url: "/",
    siteName: "bay-space",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#020402",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col pb-24">
        {children}
        <MountainTimeFooter />
      </body>
    </html>
  );
}
