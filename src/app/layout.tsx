import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import SmsInboxDrawer from "@/components/SmsInboxDrawer";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "VM Mobiles.in: Flagship Smartphones, Deals & Protection Alerts",
  description: "VM Mobiles online smartphone store. Shop latest iPhones, Samsung Galaxy, OnePlus, Pixel with INR pricing, No Cost EMI, and automated pre-expiry SMS alerts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-accent selection:text-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <AppProvider>
            <Navbar />
            <CartDrawer />
            <SmsInboxDrawer />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}