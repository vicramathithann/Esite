"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
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
  Trash2,
  History,
  User,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  RotateCcw,
  Layers,
  List,
  Filter,
  X,
  Radio,
} from "lucide-react";
import { formatDateOnly } from "@/lib/formatters";

export type DerivedInviteStatus =
  | "PENDING"
  | "ACCEPTED"
  | "EXPIRED"
  | "REVOKED"
  | "ACCOUNT_DELETED"
  | "SUPERSEDED";

export interface InviteRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  effectiveStatus: DerivedInviteStatus;
  statusReason: string | null;
  isLatest: boolean;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedUserId: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  accountDeletedAt: string | null;
  deletedBy: string | null;
  linkedUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  } | null;
}

interface ToastMessage {
  id: string;
  type: "success" | "info" | "warning";
  text: string;
}

export default function AdminInvitePage() {
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | DerivedInviteStatus>("ALL");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [groupByEmail, setGroupByEmail] = useState(true);

  // Expanded email history rows
  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>({});

  // Live polling state
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [recentlyChangedIds, setRecentlyChangedIds] = useState<Record<string, "accepted" | "deleted" | "revoked">>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Track previous statuses to detect live changes
  const prevStatusesRef = useRef<Map<string, DerivedInviteStatus>>(new Map());
  const isInitialLoadRef = useRef(true);

  // Send Invite Form State
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [lastGeneratedLink, setLastGeneratedLink] = useState<string | null>(null);

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const addToast = useCallback((text: string, type: "success" | "info" | "warning" = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  // Fetch invites with change detection
  const loadInvites = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch("/api/admin/invites", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.invites)) {
        const newInvites: InviteRecord[] = data.invites;

        // Detect live status transitions
        if (!isInitialLoadRef.current && isBackground) {
          const changed: Record<string, "accepted" | "deleted" | "revoked"> = {};

          newInvites.forEach((inv) => {
            const prev = prevStatusesRef.current.get(inv.id);
            const curr = inv.effectiveStatus;

            if (prev && prev !== curr) {
              if (curr === "ACCEPTED") {
                changed[inv.id] = "accepted";
                addToast(`${inv.email} accepted the invitation! Account is now active.`, "success");
              } else if (curr === "ACCOUNT_DELETED") {
                changed[inv.id] = "deleted";
                addToast(`${inv.email} deleted their account (${inv.statusReason || "account deleted"}).`, "warning");
              } else if (curr === "REVOKED") {
                changed[inv.id] = "revoked";
                addToast(`Invitation for ${inv.email} was revoked.`, "info");
              }
            }
          });

          if (Object.keys(changed).length > 0) {
            setRecentlyChangedIds((prev) => ({ ...prev, ...changed }));
            setTimeout(() => {
              setRecentlyChangedIds({});
            }, 4500);
          }
        }

        // Update status map
        const statusMap = new Map<string, DerivedInviteStatus>();
        newInvites.forEach((inv) => statusMap.set(inv.id, inv.effectiveStatus));
        prevStatusesRef.current = statusMap;
        isInitialLoadRef.current = false;

        setInvites(newInvites);
        setLastUpdated(new Date());
        setSecondsAgo(0);
      }
    } catch (e) {
      console.error("Failed to load invites:", e);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [addToast]);

  // Initial load
  useEffect(() => {
    loadInvites(false);
  }, [loadInvites]);

  // Background polling every 12 seconds, pausing when document is hidden
  useEffect(() => {
    const pollInterval = 12000;
    let timer: NodeJS.Timeout | null = null;

    const tick = () => {
      if (document.visibilityState === "visible") {
        setIsLiveActive(true);
        loadInvites(true);
      } else {
        setIsLiveActive(false);
      }
    };

    timer = setInterval(tick, pollInterval);

    // Refetch immediately on window focus
    const handleFocus = () => {
      setIsLiveActive(true);
      loadInvites(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setIsLiveActive(true);
        loadInvites(true);
      } else {
        setIsLiveActive(false);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadInvites]);

  // Second ticker for "Updated Xs ago"
  useEffect(() => {
    const secondTimer = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      setSecondsAgo(diff);
    }, 1000);
    return () => clearInterval(secondTimer);
  }, [lastUpdated]);

  // Send Invitation Handler
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
      addToast(`Invitation sent to ${cleanEmail}`, "success");
      await loadInvites(true);
    } catch {
      setSendError("Network error sending invite. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Revoke Handler
  const handleRevoke = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the pending invitation for ${email}?`)) {
      return;
    }

    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/admin/invites?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Revoked invitation for ${email}`, "info");
        await loadInvites(true);
      } else {
        alert(data.error || "Failed to revoke invitation.");
      }
    } catch {
      alert("Network error revoking invitation.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Resend / Re-invite Handler
  const handleResend = async (email: string) => {
    try {
      setActionLoadingId(email);
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Fresh invitation dispatched to ${email}`, "success");
        if (data.inviteLink) {
          setLastGeneratedLink(data.inviteLink);
          setSendSuccess(`Fresh link dispatched to ${email}. You can also copy it below.`);
        }
        await loadInvites(true);
      } else {
        alert(data.error || "Failed to resend invitation.");
      }
    } catch {
      alert("Network error resending invitation.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Copy to clipboard with visual feedback
  const copyToClipboard = (text: string, identifier: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(identifier);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = {
      ALL: invites.length,
      PENDING: 0,
      ACCEPTED: 0,
      EXPIRED: 0,
      REVOKED: 0,
      ACCOUNT_DELETED: 0,
    };

    invites.forEach((i) => {
      const st = i.effectiveStatus;
      if (st === "PENDING") counts.PENDING++;
      else if (st === "ACCEPTED") counts.ACCEPTED++;
      else if (st === "EXPIRED") counts.EXPIRED++;
      else if (st === "REVOKED") counts.REVOKED++;
      else if (st === "ACCOUNT_DELETED") counts.ACCOUNT_DELETED++;
    });

    return counts;
  }, [invites]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalSent = invites.length;
    const pendingCount = tabCounts.PENDING;
    const acceptedCount = tabCounts.ACCEPTED;
    const deletedOrRevokedCount = tabCounts.ACCOUNT_DELETED + tabCounts.REVOKED;
    const acceptanceRate = totalSent > 0 ? Math.round((acceptedCount / totalSent) * 100) : 0;

    return {
      totalSent,
      pendingCount,
      acceptedCount,
      deletedOrRevokedCount,
      acceptanceRate,
    };
  }, [invites, tabCounts]);

  // Filtered and sorted invites
  const filteredInvites = useMemo(() => {
    return invites.filter((inv) => {
      // 1. Status Tab filter
      if (activeTab !== "ALL") {
        if (inv.effectiveStatus !== activeTab) return false;
      }

      // 2. Search query (email, role, invitedBy)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchEmail = inv.email?.toLowerCase().includes(q);
        const matchName = inv.linkedUser?.name?.toLowerCase().includes(q);
        const matchInviter = inv.invitedBy?.toLowerCase().includes(q);
        if (!matchEmail && !matchName && !matchInviter) return false;
      }

      // 3. Role filter
      if (roleFilter !== "all") {
        if (inv.role.toUpperCase() !== roleFilter.toUpperCase()) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [invites, activeTab, search, roleFilter, sortOrder]);

  // Grouped by email
  const emailGroups = useMemo(() => {
    const groupsMap = new Map<string, { latest: InviteRecord; history: InviteRecord[] }>();

    filteredInvites.forEach((inv) => {
      const em = inv.email.toLowerCase().trim();
      if (!groupsMap.has(em)) {
        groupsMap.set(em, { latest: inv, history: [] });
      } else {
        groupsMap.get(em)!.history.push(inv);
      }
    });

    return Array.from(groupsMap.entries()).map(([email, g]) => ({
      email,
      latest: g.latest,
      history: g.history,
    }));
  }, [filteredInvites]);

  const toggleEmailExpand = (email: string) => {
    setExpandedEmails((prev) => ({
      ...prev,
      [email]: !prev[email],
    }));
  };

  // Render Status Badge
  const renderStatusBadge = (inv: InviteRecord) => {
    const st = inv.effectiveStatus;
    const reason = inv.statusReason || "";

    switch (st) {
      case "ACCEPTED":
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            title={reason || "User account is active"}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Accepted</span>
          </span>
        );
      case "PENDING":
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            title={reason || "Awaiting registration"}
          >
            <Clock className="w-3 h-3 animate-pulse" />
            <span>Pending</span>
          </span>
        );
      case "ACCOUNT_DELETED":
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
            title={reason || "Linked user account was deleted"}
          >
            <Trash2 className="w-3 h-3" />
            <span>Account Deleted</span>
          </span>
        );
      case "EXPIRED":
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-tile text-muted border border-border"
            title={reason || "Past 48-hour expiration"}
          >
            <Clock className="w-3 h-3" />
            <span>Expired</span>
          </span>
        );
      case "REVOKED":
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
            title={reason || "Revoked by admin"}
          >
            <XCircle className="w-3 h-3" />
            <span>Revoked</span>
          </span>
        );
      case "SUPERSEDED":
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted/10 text-muted border border-border"
            title={reason || "Superseded by a newer invitation"}
          >
            <History className="w-3 h-3" />
            <span>Superseded</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Render Action Buttons
  const renderActions = (inv: InviteRecord) => {
    const st = inv.effectiveStatus;
    const isLoading = actionLoadingId === inv.id || actionLoadingId === inv.email;

    return (
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {st === "PENDING" && (
          <>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleResend(inv.email)}
              className="px-2.5 py-1 rounded-lg bg-tile hover:bg-tile/80 text-foreground border border-border text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
              title="Resend invitation email"
            >
              <RotateCcw className={`w-3 h-3 text-[#C9A66B] ${isLoading ? "animate-spin" : ""}`} />
              <span>Resend</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleRevoke(inv.id, inv.email)}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
              title="Revoke invitation"
            >
              <XCircle className="w-3 h-3" />
              <span>Revoke</span>
            </button>
          </>
        )}

        {st === "ACCEPTED" && (
          <Link
            href={`/admin/customers?search=${encodeURIComponent(inv.email)}`}
            className="px-2.5 py-1 rounded-lg bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 text-[11px] font-semibold transition flex items-center gap-1"
            title="View linked customer account in Admin"
          >
            <User className="w-3 h-3" />
            <span>View User</span>
          </Link>
        )}

        {st === "ACCOUNT_DELETED" && (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleResend(inv.email)}
            className="px-2.5 py-1 rounded-lg bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Send new invite to this email"
          >
            <Send className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>Invite Again</span>
          </button>
        )}

        {(st === "EXPIRED" || st === "REVOKED") && (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleResend(inv.email)}
            className="px-2.5 py-1 rounded-lg bg-tile hover:bg-tile/80 text-foreground border border-border text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
            title="Dispatch fresh invitation"
          >
            <RotateCcw className={`w-3 h-3 text-[#C9A66B] ${isLoading ? "animate-spin" : ""}`} />
            <span>Resend</span>
          </button>
        )}

        {st === "SUPERSEDED" && (
          <span className="text-[11px] text-muted italic">Archived</span>
        )}
      </div>
    );
  };

  // Render Last Activity cell text
  const renderLastActivity = (inv: InviteRecord) => {
    if (inv.effectiveStatus === "ACCEPTED" && inv.acceptedAt) {
      return (
        <div>
          <div className="font-semibold text-foreground">Accepted</div>
          <div className="text-[10px] text-muted">{formatDateOnly(inv.acceptedAt)}</div>
        </div>
      );
    }
    if (inv.effectiveStatus === "ACCOUNT_DELETED" && inv.accountDeletedAt) {
      return (
        <div>
          <div className="font-semibold text-rose-600 dark:text-rose-400">Deleted</div>
          <div className="text-[10px] text-muted">{formatDateOnly(inv.accountDeletedAt)}</div>
        </div>
      );
    }
    if (inv.effectiveStatus === "REVOKED" && inv.revokedAt) {
      return (
        <div>
          <div className="font-semibold text-muted">Revoked</div>
          <div className="text-[10px] text-muted">{formatDateOnly(inv.revokedAt)}</div>
        </div>
      );
    }
    return (
      <div>
        <div className="text-muted">Expires</div>
        <div className="text-[10px] text-muted">{formatDateOnly(inv.expiresAt)}</div>
      </div>
    );
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-3.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2.5 pointer-events-auto border transition-all animate-scale-in ${
                toast.type === "success"
                  ? "bg-emerald-950 text-emerald-200 border-emerald-500/30"
                  : toast.type === "warning"
                  ? "bg-rose-950 text-rose-200 border-rose-500/30"
                  : "bg-[#111827] text-white border-white/10"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : toast.type === "warning" ? (
                <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-[#C9A66B] shrink-0" />
              )}
              <span className="flex-1">{toast.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* 1. Header Card with Live Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2] shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-foreground">User Invitations & Access</h1>
              {/* Live Status Indicator */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                  isLiveActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-tile text-muted border-border"
                }`}
                title={isLiveActive ? "Auto-refreshing every 12s" : "Paused while tab is in background"}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isLiveActive ? "bg-emerald-500 animate-ping" : "bg-muted"
                  }`}
                />
                <span>Live • {secondsAgo === 0 ? "Updated just now" : `Updated ${secondsAgo}s ago`}</span>
              </div>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Live invitation tracking synced with accounts. Automatically reflects user registration and deletion.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* View mode toggle: Grouped by Email vs Flat List */}
          <div className="inline-flex items-center bg-tile border border-border rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setGroupByEmail(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                groupByEmail
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
              title="Group by recipient email"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Group by Email</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupByEmail(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                !groupByEmail
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
              title="Show flat chronological list"
            >
              <List className="w-3.5 h-3.5" />
              <span>Flat List</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadInvites(false)}
            disabled={loading}
            className="p-2.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] rounded-xl transition cursor-pointer"
            title="Refresh Invitations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS (With Acceptance Rate) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Sent */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted">Total Invites</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {summaryMetrics.totalSent}
          </div>
          <div className="text-[11px] text-muted mt-1">Dispatched invitations</div>
        </div>

        {/* Card 2: Pending */}
        <button
          type="button"
          onClick={() => setActiveTab("PENDING")}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition shadow-xs cursor-pointer ${
            activeTab === "PENDING"
              ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-card border-border hover:border-amber-500/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted">Pending Acceptance</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
            {summaryMetrics.pendingCount}
          </div>
          <div className="text-[11px] text-muted mt-1">Awaiting registration</div>
        </button>

        {/* Card 3: Accepted (Active Accounts) */}
        <button
          type="button"
          onClick={() => setActiveTab("ACCEPTED")}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition shadow-xs cursor-pointer ${
            activeTab === "ACCEPTED"
              ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20"
              : "bg-card border-border hover:border-emerald-500/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted">Active Accounts</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {summaryMetrics.acceptedCount}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {summaryMetrics.acceptanceRate}% Acceptance Rate
          </div>
        </button>

        {/* Card 4: Deleted / Revoked */}
        <button
          type="button"
          onClick={() => setActiveTab("ACCOUNT_DELETED")}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition shadow-xs cursor-pointer ${
            activeTab === "ACCOUNT_DELETED" || activeTab === "REVOKED"
              ? "bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20"
              : "bg-card border-border hover:border-rose-500/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted">Deleted / Revoked</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
            {summaryMetrics.deletedOrRevokedCount}
          </div>
          <div className="text-[11px] text-muted mt-1">
            {tabCounts.ACCOUNT_DELETED} deleted, {tabCounts.REVOKED} revoked
          </div>
        </button>
      </div>

      {/* 3. Send Invitation Form Card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
        <div className="flex items-center gap-2 mb-2">
          <Send className="w-4 h-4 text-[#C9A66B]" />
          <h2 className="text-sm font-bold text-foreground">Send New Invitation</h2>
        </div>
        <p className="text-xs text-muted mb-5 leading-relaxed">
          Enter the recipient&apos;s email address. An invitation email with a secure registration link will be dispatched. The link is valid for 48 hours.
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
                  Registration Link (also delivered via email):
                </span>
                <div className="flex items-center gap-2 bg-background border border-border rounded-xl p-2 font-mono text-[11px] break-all">
                  <span className="truncate flex-1 text-foreground select-all">{lastGeneratedLink}</span>
                  <button
                    type="button"
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
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-background border border-border rounded-xl focus:outline-none focus:border-[#C9A66B] transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="py-2.5 px-5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] active:bg-[#A67C3D] disabled:opacity-50 text-[#FFFCFA] font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
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
              <strong>Access Restriction:</strong> Invited persons strictly receive User (storefront customer) access. Role is enforced strictly on the server and cannot be escalated.
            </span>
          </div>
        </form>
      </div>

      {/* 4. STATUS TABS WITH LIVE COUNTS */}
      <div className="relative border-b border-border">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 pt-1">
          {[
            { key: "ALL", label: "All", count: tabCounts.ALL },
            { key: "PENDING", label: "Pending", count: tabCounts.PENDING },
            { key: "ACCEPTED", label: "Accepted (Active)", count: tabCounts.ACCEPTED },
            { key: "EXPIRED", label: "Expired", count: tabCounts.EXPIRED },
            { key: "REVOKED", label: "Revoked", count: tabCounts.REVOKED },
            { key: "ACCOUNT_DELETED", label: "Account Deleted", count: tabCounts.ACCOUNT_DELETED },
          ].map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#C9A66B] text-[#FFFCFA] shadow-xs"
                    : "bg-card hover:bg-tile border border-border text-muted hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-black/20 text-[#FFFCFA]" : "bg-tile text-muted"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. SEARCH & FILTER TOOLBAR */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors duration-200">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient email or customer name..."
            className="w-full pl-10 pr-8 py-2 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B] transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-muted hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-tile border border-border text-xs text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-[#C9A66B] cursor-pointer"
          >
            <option value="all">Role: All</option>
            <option value="USER">Role: USER</option>
            <option value="ADMIN">Role: ADMIN</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-tile border border-border text-xs text-foreground rounded-xl px-3 py-2 focus:outline-none focus:border-[#C9A66B] cursor-pointer"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>
        </div>
      </div>

      {/* 6. INVITATIONS TABLE */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden transition-colors duration-200">
        {loading ? (
          <div className="p-12 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-tile/70 rounded-xl" />
            ))}
          </div>
        ) : filteredInvites.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted">
            <UserPlus className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-foreground text-sm">No invitations match your filters</p>
            <p className="text-[11px] mt-1 max-w-sm mx-auto">
              {search || activeTab !== "ALL" || roleFilter !== "all"
                ? "Try clearing your search query or switching status tabs."
                : "Send your first invitation using the form above."}
            </p>
            {(search || activeTab !== "ALL" || roleFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveTab("ALL");
                  setRoleFilter("all");
                }}
                className="mt-4 px-3.5 py-1.5 rounded-xl bg-[#C9A66B] text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : groupByEmail ? (
          /* Grouped by Email with Expandable History */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tile/80 border-b border-border text-muted font-bold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Recipient & Account</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Invited On</th>
                  <th className="py-3 px-4">Accepted / Last Activity</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {emailGroups.map(({ email, latest, history }) => {
                  const isExpanded = Boolean(expandedEmails[email]);
                  const changedType = recentlyChangedIds[latest.id];

                  return (
                    <React.Fragment key={latest.id}>
                      <tr
                        className={`hover:bg-tile/50 transition ${
                          changedType === "accepted"
                            ? "bg-emerald-500/15"
                            : changedType === "deleted"
                            ? "bg-rose-500/15"
                            : changedType === "revoked"
                            ? "bg-amber-500/15"
                            : ""
                        }`}
                      >
                        {/* Recipient Email & History Toggle */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                            <span className="font-semibold text-foreground">{latest.email}</span>
                            {history.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleEmailExpand(email)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-tile border border-border text-[10px] font-semibold text-[#8C6226] dark:text-[#E5CBA2] hover:bg-tile/80 cursor-pointer"
                                title="Toggle invitation history for this email"
                              >
                                <span>+{history.length} previous</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                          {latest.linkedUser && (
                            <div className="text-[11px] text-muted ml-5.5">
                              Active user: <span className="text-foreground font-semibold">{latest.linkedUser.name}</span>
                            </div>
                          )}
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            {latest.role}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          {renderStatusBadge(latest)}
                        </td>

                        {/* Invited Date */}
                        <td className="py-3.5 px-4 text-muted text-[11px]">
                          {formatDateOnly(latest.createdAt)}
                        </td>

                        {/* Accepted / Last Activity */}
                        <td className="py-3.5 px-4 text-[11px]">
                          {renderLastActivity(latest)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          {renderActions(latest)}
                        </td>
                      </tr>

                      {/* Expandable History Rows for this Email */}
                      {isExpanded &&
                        history.map((hInv) => (
                          <tr key={hInv.id} className="bg-tile/30 text-muted">
                            <td className="py-2.5 px-4 sm:px-6 pl-10 text-[11px]">
                              <div className="flex items-center gap-2">
                                <History className="w-3 h-3 text-muted shrink-0" />
                                <span className="font-mono text-muted/80">Older Invite ({formatDateOnly(hInv.createdAt)})</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-[10px] uppercase font-bold text-muted">
                              {hInv.role}
                            </td>
                            <td className="py-2.5 px-4">
                              {renderStatusBadge(hInv)}
                            </td>
                            <td className="py-2.5 px-4 text-[11px] text-muted">
                              {formatDateOnly(hInv.createdAt)}
                            </td>
                            <td className="py-2.5 px-4 text-[11px] text-muted">
                              {renderLastActivity(hInv)}
                            </td>
                            <td className="py-2.5 px-4 sm:px-6 text-right">
                              {renderActions(hInv)}
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Flat Chronological List */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tile/80 border-b border-border text-muted font-bold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Recipient Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Invited On</th>
                  <th className="py-3 px-4">Accepted / Last Activity</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {filteredInvites.map((inv) => {
                  const changedType = recentlyChangedIds[inv.id];

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-tile/50 transition ${
                        changedType === "accepted"
                          ? "bg-emerald-500/15"
                          : changedType === "deleted"
                          ? "bg-rose-500/15"
                          : changedType === "revoked"
                          ? "bg-amber-500/15"
                          : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span>{inv.email}</span>
                          {!inv.isLatest && (
                            <span className="text-[10px] text-muted font-normal italic">
                              (Older)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {inv.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(inv)}
                      </td>
                      <td className="py-3.5 px-4 text-muted text-[11px]">
                        {formatDateOnly(inv.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-[11px]">
                        {renderLastActivity(inv)}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        {renderActions(inv)}
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
