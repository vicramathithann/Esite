"use client";

import React, { useState, useEffect } from "react";
import {
  UserPlus,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Clock,
  ShieldCheck,
  XCircle,
  Search,
} from "lucide-react";
import { formatDateOnly } from "@/lib/formatters";

interface InviteRecord {
  id: string;
  email: string;
  token: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export default function AdminInvitePage() {
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Send Invite Form State
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [lastGeneratedLink, setLastGeneratedLink] = useState<string | null>(null);

  // Copied state tracking
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadInvites = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/invites", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setInvites(data.invites || []);
      }
    } catch (e) {
      console.error("Failed to load invites:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setSendSuccess(null);
    setLastGeneratedLink(null);

    const cleanEmail = recipientEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setSendError("Please enter an email address.");
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setSendError(data.error || "Failed to dispatch invitation.");
        setIsSending(false);
        return;
      }

      setSendSuccess(data.message || `Invitation successfully sent to ${cleanEmail}.`);
      setLastGeneratedLink(data.inviteLink || null);
      setRecipientEmail("");
      await loadInvites();
    } catch {
      setSendError("Network error sending invite. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRevoke = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the pending invitation for ${email}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/invites?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        await loadInvites();
      } else {
        alert(data.error || "Failed to revoke invitation.");
      }
    } catch {
      alert("Network error revoking invitation.");
    }
  };

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(identifier);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtered invites based on search
  const filteredInvites = invites.filter((inv) =>
    inv.email.toLowerCase().includes(search.toLowerCase()) ||
    inv.status.toLowerCase().includes(search.toLowerCase())
  );

  // Quick stats
  const pendingCount = invites.filter((i) => i.status === "PENDING").length;
  const acceptedCount = invites.filter((i) => i.status === "ACCEPTED").length;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">User Invitations & Access</h1>
            <p className="text-xs text-muted">
              Dispatch exclusive registration invites with Instagram-style unique handles. Users receive storefront customer access.
            </p>
          </div>
        </div>

        <button
          onClick={loadInvites}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-tile hover:bg-tile/80 text-foreground border border-border shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#C9A66B]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Total Invites Sent</div>
            <div className="text-2xl font-black text-foreground mt-0.5">{invites.length}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Pending Acceptance</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingCount}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Accounts Created</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{acceptedCount}</div>
          </div>
        </div>
      </div>

      {/* Send Invitation Form Card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Send className="w-4 h-4 text-[#C9A66B]" />
          <h2 className="text-sm font-bold text-foreground">Send New Invitation</h2>
        </div>
        <p className="text-xs text-muted mb-5 leading-relaxed">
          Enter the recipient&apos;s email address. An invitation email with a secure registration link will be sent. The link expires in 48 hours.
        </p>

        {sendError && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="font-medium">{sendError}</div>
          </div>
        )}

        {sendSuccess && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{sendSuccess}</span>
            </div>

            {lastGeneratedLink && (
              <div className="pt-1">
                <span className="block text-[11px] font-semibold text-muted mb-1">
                  Invite Link (also sent to email):
                </span>
                <div className="flex items-center gap-2 bg-background border border-border rounded-xl p-2 font-mono text-[11px] break-all">
                  <span className="truncate flex-1 text-foreground select-all">{lastGeneratedLink}</span>
                  <button
                    onClick={() => copyToClipboard(lastGeneratedLink, "last-gen")}
                    className="shrink-0 px-2.5 py-1 bg-[#C9A66B]/15 hover:bg-[#C9A66B]/25 text-[#8C6226] dark:text-[#E5CBA2] rounded-lg transition font-sans font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === "last-gen" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSendInvite} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Enter recipient email address (e.g. member@gmail.com)"
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-background border border-border rounded-xl focus:outline-none focus:border-[#C9A66B] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="py-2.5 px-5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] active:bg-[#A67C3D] disabled:opacity-50 text-[#FFFCFA] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {isSending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending Invitation...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Invite</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C9A66B]" />
            <span>
              <strong>Access Restriction:</strong> Invited persons strictly receive User (storefront) access. They cannot access administrative controls or view admin resources.
            </span>
          </div>
        </form>
      </div>

      {/* Invitations History Table */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">Invitations History</h2>
            <p className="text-xs text-muted">
              Audit log of all sent invitation tokens, expiration timeframes, and acceptance statuses.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invites..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-xl focus:outline-none focus:border-[#C9A66B] transition"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-muted flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#C9A66B] border-t-transparent rounded-full animate-spin" />
            <span>Loading invitations...</span>
          </div>
        ) : filteredInvites.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted">
            <UserPlus className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-foreground">No invitations found</p>
            <p className="text-[11px] mt-1">
              {search ? "No invites match your search." : "Send your first invitation using the form above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tile border-b border-border text-muted font-bold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Recipient Email</th>
                  <th className="py-3 px-4">Role Assigned</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Sent Date</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {filteredInvites.map((inv) => {
                  const isExpired = new Date(inv.expiresAt) < new Date() && inv.status === "PENDING";
                  const effectiveStatus = isExpired ? "EXPIRED" : inv.status;

                  const inviteUrl = typeof window !== "undefined"
                    ? `${window.location.origin}/invite?token=${encodeURIComponent(inv.token)}`
                    : `/invite?token=${encodeURIComponent(inv.token)}`;

                  return (
                    <tr key={inv.id} className="hover:bg-tile/50 transition">
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span>{inv.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {inv.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {effectiveStatus === "ACCEPTED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Accepted</span>
                          </span>
                        ) : effectiveStatus === "PENDING" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3 animate-pulse" />
                            <span>Pending</span>
                          </span>
                        ) : effectiveStatus === "EXPIRED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-tile text-muted border border-border">
                            <Clock className="w-3 h-3" />
                            <span>Expired</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" />
                            <span>Revoked</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-muted text-[11px]">
                        {formatDateOnly(inv.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-muted text-[11px]">
                        {formatDateOnly(inv.expiresAt)}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {effectiveStatus === "PENDING" && (
                            <>
                              <button
                                onClick={() => copyToClipboard(inviteUrl, inv.id)}
                                title="Copy direct invite URL"
                                className="p-1.5 rounded-lg bg-tile hover:bg-tile/80 text-foreground border border-border transition cursor-pointer text-[10px] flex items-center gap-1"
                              >
                                {copiedId === inv.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="hidden sm:inline text-emerald-500 font-bold">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-muted" />
                                    <span className="hidden sm:inline">Copy Link</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleRevoke(inv.id, inv.email)}
                                title="Revoke Invitation"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition cursor-pointer text-[10px] flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Revoke</span>
                              </button>
                            </>
                          )}

                          {effectiveStatus === "ACCEPTED" && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              Account Active
                            </span>
                          )}

                          {(effectiveStatus === "EXPIRED" || effectiveStatus === "REVOKED") && (
                            <span className="text-[10px] text-muted italic">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

