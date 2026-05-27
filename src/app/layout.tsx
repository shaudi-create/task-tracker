import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Task Tracker",
  description: "Personal task tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full font-sans text-sm antialiased">
        <div className="flex min-h-full">
          <Sidebar />
          <div className="flex min-h-full flex-1 flex-col">{children}</div>
        </div>
      </body>
    </html>
  );
}
