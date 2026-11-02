"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useDraggableFab } from "@/hooks/useDraggableFab";
import SafeMarkdown from "@/components/SafeMarkdown";
import {
  BarChart3,
  X,
  Send,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Bot,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface AdminChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  links?: { label: string; href: string }[];
  suggestions?: string[];
  isError?: boolean;
  failedText?: string;
}

const ADMIN_INITIAL_SUGGESTIONS = [
  "📦 Today's orders",
  "⚠️ Low stock alert",
  "✉️ Pending invites",
  "💰 Total revenue & sales",
  "📊 Order cancellation rate",
  "🛡️ Warranty statistics",
];

export default function AdminSupportChatbot() {
  const pathname = usePathname();
  const { currentUser } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reusable Draggable FAB Hook with Admin Storage Key
  const {
    position,
    isDragging,
    fabRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleClick,
    getPanelStyle,
  } = useDraggableFab({
    storageKey: "vn_admin_ai_button_position",
    defaultBottom: 24,
    defaultRight: 24,
    initialWidth: 140,
    initialHeight: 48,
    onOpen: () => setIsOpen(true),
  });

  // Initialize friendly executive greeting on load
  const initGreeting = useCallback(() => {
    const adminGreeting: AdminChatMessage = {
      id: "admin-greeting-init",
      sender: "bot",
      text:
        `Hello, **${currentUser?.name || "Administrator"}**! 🛡️\n\n` +
        `I am your dedicated **VN Mobiles Admin AI Assistant**.\n\n` +
        `I have direct access to your store database and can analyze:\n` +
        `• **Today's Orders & Live Breakdown**\n` +
        `• **Low Stock & Inventory Alerts**\n` +
        `• **Gross Store Revenue & Sales Channels**\n` +
        `• **User Invitations & Acceptance Rates**\n` +
        `• **Registered User Accounts & Verification**\n` +
        `• **Order Cancellation Rates & RMA**\n` +
        `• **Device Shield Warranty & Email Logs**\n\n` +
        `What operational data or analysis can I generate for you?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestions: ADMIN_INITIAL_SUGGESTIONS,
    };
    setMessages([adminGreeting]);
  }, [currentUser]);

  useEffect(() => {
    initGreeting();
  }, [initGreeting]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Multi-turn message handler communicating with Admin AI Agent API
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputValue).trim();
    if (!messageText || isTyping) return;

    const userMessage: AdminChatMessage = {
      id: "admin-user-" + Date.now(),
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Filter out previous error notices before submitting new query
    const baseMessages = messages.filter((m) => !m.isError);
    const updatedMessages = [...baseMessages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsTyping(true);

    try {
      const payloadMessages = updatedMessages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/admin/support/agent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
        }),
      });

      const data = await res.json();

      if (data.success && data.answer) {
        const botMessage: AdminChatMessage = {
          id: "admin-bot-" + Date.now(),
          sender: "bot",
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          links: data.links,
          suggestions: data.suggestions && data.suggestions.length > 0 ? data.suggestions : ADMIN_INITIAL_SUGGESTIONS,
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        throw new Error(data.error || "Failed to retrieve admin analytics.");
      }
    } catch (err) {
      console.error("Admin AI Agent error:", err);
      const errorMessage: AdminChatMessage = {
        id: "admin-bot-err-" + Date.now(),
        sender: "bot",
        text:
          "⚠️ I encountered an error querying live store analytics. Please ensure your administrator session is active or retry your query.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
        failedText: messageText,
        links: [
          { label: "Admin Dashboard", href: "/admin/dashboard" },
          { label: "Orders Manager", href: "/admin/orders" },
          { label: "Inventory", href: "/admin/inventory" },
        ],
        suggestions: ADMIN_INITIAL_SUGGESTIONS,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = (failedText?: string) => {
    if (!failedText) return;
    handleSendMessage(failedText);
  };

  const handleResetChat = () => {
    const resetGreeting: AdminChatMessage = {
      id: "admin-reset-" + Date.now(),
      sender: "bot",
      text:
        `Admin analytics session refreshed. 🛡️ What other store metrics or operational insights do you need?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestions: ADMIN_INITIAL_SUGGESTIONS,
    };
    setMessages([resetGreeting]);
  };

  // Render strictly inside authorized Admin Portal pages (never on public storefront or login)
  if (!pathname?.startsWith("/admin") || pathname === "/admin/reset-password") {
    return null;
  }

  // Security check: Only verified root ADMIN can access
  if (
    !currentUser ||
    currentUser.role !== "ADMIN" ||
    (currentUser.email || "").toLowerCase() !== "rrroyce20@gmail.com"
  ) {
    return null;
  }

  return (
    <>
      {/* Floating Draggable Trigger Button for Admin: Calm Slate/Navy with Teal Accent */}
      {!isOpen && (
        <div
          ref={fabRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={
            position
              ? {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  bottom: "auto",
                  right: "auto",
                  touchAction: "none",
                }
              : { touchAction: "none" }
          }
          className={`fixed z-[9999] select-none ${
            !position ? "bottom-6 right-6" : ""
          } ${
            isDragging
              ? "cursor-grabbing"
              : "cursor-grab animate-button-entrance animate-float-gentle"
          }`}
        >
          {/* Subtle Ambient Teal / Indigo Glow Aura (Calm, Professional) */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-teal-500/25 via-indigo-500/25 to-teal-500/25 blur-xs opacity-75 animate-pulse pointer-events-none" />

          <button
            type="button"
            onClick={handleClick}
            aria-label="Open VN Mobiles Admin AI Assistant"
            className="relative group flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-[0_8px_25px_rgba(15,23,42,0.45)] hover:shadow-[0_14px_35px_rgba(20,184,166,0.3)] hover:scale-105 active:scale-95 hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-inherit border border-teal-500/40 hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 overflow-hidden"
          >
            {/* Shimmer Light Reflection Sweep on Hover */}
            <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <span className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-teal-400/20 to-transparent skew-x-[-20deg] group-hover:left-[150%] transition-all duration-700 ease-in-out" />
            </span>

            {/* Icon with Smooth Scale & Green Online Dot */}
            <div className="relative shrink-0">
              <BarChart3 className="w-5 h-5 text-teal-400 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12" />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
              )}
            </div>

            {/* Label */}
            <span className="text-xs font-bold tracking-wide text-white">
              Admin AI
            </span>
          </button>
        </div>
      )}

      {/* Mobile Dark Backdrop to easily dismiss chat */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-[9998] sm:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Floating Admin AI Agent Window (Slate Navy / Teal Theme, opens adjacent to dragged button) */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="VN Mobiles Admin AI Assistant"
          style={getPanelStyle(430, 600)}
          className="fixed bottom-4 right-4 sm:bottom-auto sm:right-auto z-[9999] w-[calc(100vw-2rem)] sm:w-[430px] h-[min(570px,calc(100dvh-5rem))] sm:h-[min(600px,calc(100dvh-6rem))] max-h-[calc(100dvh-2rem)] bg-card border border-slate-700/60 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header with Dark Slate/Navy Base, Teal Accents, Live Operational Indicator & Close Button */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-teal-500/25 flex items-center justify-between shrink-0 text-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white">Admin AI Assistant</h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    Live Analytics
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Authorized Admin • Real-time DB Grounding
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1.5">
              {/* Clear Chat Button */}
              <button
                type="button"
                onClick={handleResetChat}
                className="w-8 h-8 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Clear chat history"
                aria-label="Clear chat history"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-teal-500/20 text-slate-300 hover:text-teal-300 border border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                title="Close Admin Assistant"
                aria-label="Close Admin Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Notice Banner with Slate/Teal Accent */}
          <div className="bg-slate-800/80 dark:bg-slate-900/90 border-b border-teal-500/20 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-teal-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Real-time analytics for revenue, orders, inventory & invites
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-4 text-xs scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`relative max-w-[90%] rounded-2xl px-3.5 py-2.5 shadow-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-slate-900 dark:bg-slate-800 text-white border border-teal-500/30 rounded-tr-xs"
                      : msg.isError
                      ? "bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-tl-xs"
                      : "bg-tile/80 border border-border text-foreground rounded-tl-xs"
                  }`}
                >
                  {/* Safe Markdown Rendering (Never Raw HTML) */}
                  <SafeMarkdown content={msg.text} isUser={msg.sender === "user"} />

                  {/* Error Retry Action */}
                  {msg.isError && msg.failedText && (
                    <div className="mt-2.5 pt-2 border-t border-rose-500/20 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Query failed
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRetry(msg.failedText)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-600 hover:bg-teal-500 text-white transition-colors cursor-pointer shadow-xs"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}

                  {/* Direct Deep Links to Admin Pages */}
                  {msg.links && msg.links.length > 0 && !msg.isError && (
                    <div className="mt-2.5 pt-2 border-t border-border/60 flex flex-wrap gap-1.5">
                      {msg.links.map((link, idx) => (
                        <Link
                          key={idx}
                          href={link.href}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-card border border-teal-500/30 hover:border-teal-500 text-teal-600 dark:text-teal-400 transition-colors"
                        >
                          <span>{link.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ))}
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1 text-right select-none ${
                      msg.sender === "user" ? "text-teal-300/80" : "text-muted"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {/* Follow-up Interactive Suggestion Chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[95%]">
                    {msg.suggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleSendMessage(sug.replace(/^[^\w\s]+/, "").trim())}
                        className="px-2.5 py-1 rounded-full text-[11px] bg-card hover:bg-teal-500/10 text-foreground hover:text-teal-600 dark:hover:text-teal-300 border border-border hover:border-teal-500/40 transition-all duration-150 cursor-pointer shadow-2xs text-left"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-muted">
                <div className="w-7 h-7 rounded-full bg-slate-900 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-tile border border-border px-3.5 py-2 rounded-2xl rounded-tl-xs flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="text-[10px] ml-1 font-medium text-muted">Analyzing store database...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Form (Textarea: Enter to send, Shift+Enter for newline) */}
          <div className="p-3 bg-card border-t border-border shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask for revenue, orders, inventory or invites..."
                className="flex-1 bg-tile border border-border rounded-2xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all resize-none max-h-24 overflow-y-auto"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isTyping}
                className="p-2.5 rounded-full bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0 shadow-xs"
                title="Send query"
                aria-label="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-1.5 px-2 flex items-center justify-between text-[10px] text-muted">
              <span>Admin AI Analytics • Grounded DB</span>
              <span className="hidden sm:inline">Enter to send, Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
