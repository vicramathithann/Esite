import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import CustomerSupportChatbot from "@/components/CustomerSupportChatbot";

export const metadata: Metadata = {
  title: "VN Mobiles.in: Flagship Smartphones, Deals & Device Protection",
  description: "VN Mobiles online smartphone store. Shop latest iPhones, Samsung Galaxy, OnePlus, Pixel with INR pricing, No Cost EMI, and automated warranty protection emails.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme")||"system";var d=window.matchMedia("(prefers-color-scheme: dark)").matches;if(t==="dark"||(t==="system"&&d)){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}else{document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light"}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-accent selection:text-white"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <AppProvider>
            <Navbar />
            <CartDrawer />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
            <CustomerSupportChatbot />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}