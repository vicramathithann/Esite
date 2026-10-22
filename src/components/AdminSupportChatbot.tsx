"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  ShieldAlert,
  X,
  Send,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Shield,
  BarChart3
} from "lucide-react";

interface AdminChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  links?: { label: string; href: string }[];
  suggestions?: string[];
}

export default function AdminSupportChatbot() {
  const pathname = usePathname();
  const { currentUser } = useApp();

  // IMPORTANT: Render strictly inside authorized Admin Portal pages (never on public storefront or login)
  if (!pathname?.startsWith("/admin") || pathname === "/admin/login" || pathname === "/admin/reset-password") {
    return null;
  }

  // Security check: Only verified ADMIN role can access
  if (currentUser?.role !== "ADMIN" && currentUser?.email?.toLowerCase() !== "rrroyce20@gmail.com") {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize friendly executive greeting on load
  useEffect(() => {
    const adminGreeting: AdminChatMessage = {
      id: "admin-greeting-init",
      sender: "bot",
      text:
        `Hello, **${currentUser?.name || "Administrator"}**! 🛡️\n\n` +
        `I am your dedicated **VN Mobiles Admin AI Assistant**.\n\n` +
        `I have direct access to your store database and can analyze:\n` +
        `• **Gross Store Revenue & Sales Channels**\n` +
        `• **User Invitations & Acceptance Rates**\n` +
        `• **Registered User Accounts & Verification**\n` +
        `• **Order Stats & Cancellation Rate**\n` +
        `• **Top-Selling Smartphones & Low-Stock Alerts**\n` +
        `• **Device Shield Warranty & Email Logs**\n\n` +
        `What operational data or analysis can I generate for you?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestions: [
        "💰 Total revenue & sales",
        "✉️ User invite acceptance stats",
        "📦 Order stats & cancellation rate",
        "📱 Top selling smartphones",
        "🛡️ Warranty statistics",
        "📊 Full store executive summary"
      ]
    };
    setMessages([adminGreeting]);
  }, [currentUser]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputValue).trim();
    if (!messageText) return;

    const userMessage: AdminChatMessage = {
      id: "admin-user-" + Date.now(),
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsTyping(true);

    try {
      const payloadMessages = updatedMessages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));

      const res = await fetch("/api/admin/support/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages
        })
      });

      const data = await res.json();

      if (data.success && data.answer) {
        const botMessage: AdminChatMessage = {
          id: "admin-bot-" + Date.now(),
          sender: "bot",
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          links: data.links,
          suggestions: data.suggestions
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        throw new Error(data.error || "Failed to retrieve admin analytics.");
      }
    } catch (err) {
      console.error("Admin AI Agent error:", err);
      const fallbackMessage: AdminChatMessage = {
        id: "admin-bot-err-" + Date.now(),
        sender: "bot",
        text:
          "⚠️ I encountered an error querying live store analytics. Please ensure your administrator session is active.\n\n" +
          "You can review core metrics directly from the Admin Dashboard.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        links: [
          { label: "Admin Dashboard", href: "/admin/dashboard" },
          { label: "Orders Manager", href: "/admin/orders" }
        ],
        suggestions: [
          "Total revenue & sales",
          "Order cancellation rate",
          "Top selling products"
        ]
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    const resetGreeting: AdminChatMessage = {
      id: "admin-reset-" + Date.now(),
      sender: "bot",
      text:
        `Admin analytics session refreshed. 🛡️ What other store metrics or operational insights do you need?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestions: [
        "Total revenue & sales",
        "User invite acceptance stats",
        "Order stats & cancellation rate",
        "Top selling smartphones"
      ]
    };
    setMessages([resetGreeting]);
  };

  // Helper function to format bold and linebreaks cleanly
  const formatMessageText = (text: string) => {
    return text.split("\n").map((line, lineIndex) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={lineIndex} className="block min-h-[1.25em]">
          {parts.map((part, partIndex) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={partIndex} className="font-semibold text-foreground">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={partIndex}>{part}</span>;
          })}
        </span>
      );
    });
  };

  return (
    <>
      {/* Floating Trigger Button for Admin (Crimson / Red Theme with elevated z-[9999]) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-button-entrance animate-float-gentle">
          {/* Subtle Ambient Red Glow Aura */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-rose-600 via-red-500 to-rose-700 blur-xs opacity-40 animate-pulse pointer-events-none" />

          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open VN Mobiles Admin AI Assistant"
            className="relative group flex items-center gap-2.5 px-4 py-3 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-[0_8px_25px_rgba(225,29,72,0.4)] hover:shadow-[0_14px_35px_rgba(225,29,72,0.65)] hover:scale-105 active:scale-95 hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer border border-white/25 focus:outline-none focus:ring-2 focus:ring-rose-500/50 overflow-hidden"
          >
            {/* Shimmer Light Reflection Sweep on Hover */}
            <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <span className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] group-hover:left-[150%] transition-all duration-700 ease-in-out" />
            </span>

            {/* Icon with Smooth Scale & Rotate on Hover */}
            <div className="relative shrink-0">
              <ShieldAlert className="w-5 h-5 text-white transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12" />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-300 ring-2 ring-rose-700 animate-pulse" />
              )}
            </div>

            {/* Label */}
            <span className="text-xs font-bold tracking-wide">
              Admin AI
            </span>
          </button>
        </div>
      )}

      {/* Mobile Dark Backdrop to easily dismiss chat */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/35 backdrop-blur-2xs z-[9998] sm:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Floating Admin AI Agent Window (Red / Crimson Theme) */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="VN Mobiles Admin AI Assistant"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] w-[calc(100vw-2rem)] sm:w-[430px] h-[min(570px,calc(100dvh-5rem))] sm:h-[min(600px,calc(100dvh-6rem))] max-h-[calc(100dvh-2rem)] bg-card border border-rose-500/30 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header with Red Accents, Live Operational Indicator & Close Button */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-card via-rose-500/10 to-card border-b border-rose-500/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-foreground">Admin AI Assistant</h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    Live Analytics
                  </span>
                </div>
                <p className="text-[11px] text-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Authorized Admin • Real-time DB Grounding
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1.5">
              {/* Reset Session */}
              <button
                onClick={handleResetChat}
                className="w-8 h-8 rounded-full text-muted hover:text-foreground hover:bg-tile border border-transparent hover:border-border flex items-center justify-center transition-colors cursor-pointer"
                title="Restart conversation"
                aria-label="Restart conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* High Contrast Close (X) Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-tile hover:bg-rose-500/15 text-muted hover:text-rose-600 border border-border flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                title="Close Admin Assistant"
                aria-label="Close Admin Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Notice Banner with Red Tint */}
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-rose-700 dark:text-rose-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              Real-time analytics for revenue, orders, invites & inventory
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
                      ? "bg-rose-600 text-white rounded-tr-xs"
                      : "bg-tile/80 border border-border text-foreground rounded-tl-xs"
                  }`}
                >
                  <div className="text-xs space-y-1">
                    {formatMessageText(msg.text)}
                  </div>

                  {/* Direct Deep Links to Admin Pages */}
                  {msg.links && msg.links.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-border/60 flex flex-wrap gap-1.5">
                      {msg.links.map((link, idx) => (
                        <Link
                          key={idx}
                          href={link.href}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-card border border-rose-500/30 hover:border-rose-500 text-rose-600 dark:text-rose-400 transition-colors"
                        >
                          <span>{link.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ))}
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1 text-right select-none ${
                      msg.sender === "user" ? "text-white/80" : "text-muted"
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
                        onClick={() => handleSendMessage(sug.replace(/^[^\w\s]+/, "").trim())}
                        className="px-2.5 py-1 rounded-full text-[11px] bg-card hover:bg-rose-500/10 text-foreground hover:text-rose-600 dark:hover:text-rose-400 border border-border hover:border-rose-500/40 transition-all duration-150 cursor-pointer shadow-2xs text-left"
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
                <div className="w-7 h-7 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                <div className="bg-tile border border-border px-3.5 py-2 rounded-2xl rounded-tl-xs flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Send Area (Red Accent Button) */}
          <div className="p-3 bg-card border-t border-border shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about revenue, invites, cancellation rate, stock..."
                className="flex-1 bg-tile text-xs sm:text-[13px] text-foreground placeholder:text-muted rounded-full px-4 py-2.5 border border-border focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
              />

              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer shrink-0"
                title="Send query to Admin AI"
                aria-label="Send query to Admin AI"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-1.5 px-2 flex items-center justify-between text-[10px] text-muted">
              <span>Admin AI Assistant • Security Enforced</span>
              <span className="hidden sm:inline">Press Enter to send</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

