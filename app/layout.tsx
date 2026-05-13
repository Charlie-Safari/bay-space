import type { Metadata } from "next";
import MountainTimeFooter from "./components/mountain-time-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "bay-space",
  description: "A DOS-inspired bay-space website.",
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
