import React from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import AdminSupportChatbot from "@/components/AdminSupportChatbot";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  // Dedicated token-based recovery page handles and verifies its own token
  if (pathname === "/admin/reset-password") {
    return <>{children}</>;
  }

  // Authoritative server-side database verification against PostgreSQL "User" table
  const auth = await requireAdmin();
  if (auth instanceof Response) {
    // Show the app's real 404 page for anyone who is not a verified admin.
    // Never redirect to /login and never reveal that an admin portal exists.
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row transition-colors duration-200">
      <AdminNav />
      <div className="flex-1 min-w-0 lg:pl-64 xl:pl-72 flex flex-col">
        {children}
      </div>
      <AdminSupportChatbot />
    </div>
  );
}
