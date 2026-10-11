import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppStoreProvider } from "@/lib/appStore";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CineTaste",
  description: "A Personal Movie & Series Companion That Learns Your Taste",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased min-h-screen flex flex-col`}>
        <ThemeProvider>
          <AppStoreProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </AppStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
