import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppStoreProvider } from "@/lib/appStore";
import { ScreenContextProvider } from "@/lib/screenContext";
import { CineTasteChatbot } from "@/components/CineTasteChatbot";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-heading",
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
      <body className={`${inter.variable} ${plusJakartaSans.variable} font-sans antialiased min-h-screen flex flex-col bg-background text-foreground selection:bg-emerald-500/20 selection:text-emerald-300`}>
        <ThemeProvider>
          <AppStoreProvider>
            <ScreenContextProvider>
              {children}
              <CineTasteChatbot />
              <Toaster richColors position="bottom-right" />
            </ScreenContextProvider>
          </AppStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
