import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
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
          <Suspense
            fallback={
              <aside className="w-[220px] shrink-0 border-r border-zinc-200 bg-zinc-50" />
            }
          >
            <Sidebar />
          </Suspense>
          <div className="flex min-h-full flex-1 flex-col">{children}</div>
        </div>
      </body>
    </html>
  );
}
