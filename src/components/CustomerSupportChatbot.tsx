"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  MessageCircle,
  X,
  Send,
  RotateCcw,
  Sparkles,
  Bot,
  ArrowRight,
  User,
  ShieldCheck,
  Package,
  Layers,
  Heart
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  links?: { label: string; href: string }[];
  suggestions?: string[];
}

export default function CustomerSupportChatbot() {
  const pathname = usePathname();
  const { currentUser } = useApp();

  // IMPORTANT: Completely exclude from all Admin routes
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize friendly, personalized greeting
  useEffect(() => {
    const userName = currentUser?.name ? ` **${currentUser.name}**` : "";
    const initialGreeting: ChatMessage = {
      id: "greeting-init",
      sender: "bot",
      text:
        `Hello${userName}! 👋 I am your **VN Mobiles AI Support Agent**.\n\n` +
        `I am here to understand your issue and actively guide you step-by-step on what to do next inside VN Mobiles—including live order tracking, 1-click cancellations & refunds, 1-Year Device Shield warranty, comparing smartphones, No-Cost EMI, or account help.\n\n` +
        `How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestions: [
        "📦 Track my order",
        "🔄 Cancel an order & refund",
        "🛡️ Device Shield Warranty",
        "⚖️ Compare smartphones",
        "💳 Payment & No-Cost EMI",
        "🚚 Delivery timeline"
      ]
    };
    setMessages([initialGreeting]);
  }, [currentUser]);

  // Smooth scroll to bottom on new message
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

  // Multi-turn message handler communicating with our AI Agent API
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputValue).trim();
    if (!messageText) return;

    const userMessage: ChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsTyping(true);

    try {
      // Build conversation payload preserving multi-turn context
      const payloadMessages = updatedMessages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));

      const res = await fetch("/api/support/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          user: currentUser ? { id: currentUser.id, name: currentUser.name, email: currentUser.email } : null
        })
      });

      const data = await res.json();

      if (data.success && data.answer) {
        const botMessage: ChatMessage = {
          id: "bot-" + Date.now(),
          sender: "bot",
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          links: data.links,
          suggestions: data.suggestions
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        throw new Error(data.error || "Failed to receive AI agent response");
      }
    } catch (err) {
      console.error("AI Support Agent fetch error:", err);

      // Resilient fallback if network fails
      const fallbackMessage: ChatMessage = {
        id: "bot-" + Date.now(),
        sender: "bot",
        text:
          "I am here to guide you with VN Mobiles! You can check orders, track packages, cancel orders, review Device Shield warranty, or compare smartphones.\n\n" +
          "*Follow-up: Could you tell me your Order ID (starts with #ORD) or what phone you need help with?*",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        links: [
          { label: "Track Orders", href: "/orders" },
          { label: "Compare Phones", href: "/compare" },
          { label: "View Warranties", href: "/account/warranties" }
        ],
        suggestions: [
          "Track my order",
          "Device Shield Warranty details",
          "Order cancellation & refund"
        ]
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    const userName = currentUser?.name ? ` **${currentUser.name}**` : "";
    const resetGreeting: ChatMessage = {
      id: "greeting-" + Date.now(),
      sender: "bot",
      text:
        `Conversation refreshed. 😊 How else can I guide you on VN Mobiles today${userName}?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestions: [
        "Track my order",
        "Device Shield Warranty",
        "How to compare phones?",
        "Cancel an order & refund"
      ]
    };
    setMessages([resetGreeting]);
  };

  // Helper function to format bold text and linebreaks cleanly
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
      {/* Floating Trigger Button (Always fixed at Bottom-Right Corner with elevated z-[9999] and premium animations) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-button-entrance animate-float-gentle">
          {/* Subtle Ambient Glow Aura */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#C9A66B] via-[#E5CBA2] to-[#B8914A] blur-xs animate-pulse-glow pointer-events-none" />

          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open VN Mobiles AI Support Agent"
            className="relative group flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] shadow-[0_8px_25px_rgba(201,166,107,0.38)] hover:shadow-[0_14px_35px_rgba(201,166,107,0.6)] hover:scale-105 active:scale-95 hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer border border-[#FFFCFA]/25 focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/50 overflow-hidden"
          >
            {/* Shimmer Light Reflection Sweep on Hover */}
            <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <span className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] group-hover:left-[150%] transition-all duration-700 ease-in-out" />
            </span>

            {/* Icon with Smooth Scale & Rotate on Hover */}
            <div className="relative shrink-0">
              <MessageCircle className="w-5 h-5 text-[#FFFCFA] transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12" />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
              )}
            </div>

            {/* Label */}
            <span className="text-xs font-bold tracking-wide transition-colors duration-200">
              AI Support
            </span>
          </button>
        </div>
      )}

      {/* Mobile Dark Backdrop to easily dismiss chat by tapping outside */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/25 backdrop-blur-2xs z-[9998] sm:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Floating AI Agent Window (Strictly constrained so header and close button never push off-screen) */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="VN Mobiles AI Support Agent"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] w-[calc(100vw-2rem)] sm:w-[410px] h-[min(560px,calc(100dvh-5rem))] sm:h-[min(580px,calc(100dvh-6rem))] max-h-[calc(100dvh-2rem)] bg-card border border-border rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header with Clear Close (X) Button and Live Status */}
          <div className="px-4 py-3 bg-gradient-to-r from-card via-tile/50 to-card border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-[#C9A66B]/15 border border-[#C9A66B]/30 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-foreground">VN Mobiles AI Agent</h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/25">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active Problem Solver • Storefront
                </p>
              </div>
            </div>

            {/* Clear Action Buttons in Header */}
            <div className="flex items-center gap-1.5">
              {/* Reset Conversation */}
              <button
                onClick={handleResetChat}
                className="w-8 h-8 rounded-full text-muted hover:text-foreground hover:bg-tile border border-transparent hover:border-border flex items-center justify-center transition-colors cursor-pointer"
                title="Restart conversation"
                aria-label="Restart conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Prominent, Highly Accessible Close (X) Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-tile hover:bg-rose-500/10 text-muted hover:text-rose-600 border border-border flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                title="Close Support Chat"
                aria-label="Close Support Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="bg-[#C9A66B]/10 border-b border-[#C9A66B]/20 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-[#8C6226] dark:text-[#E5CBA2]">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#C9A66B]" />
              Ask me to track, cancel, refund, or guide you through any issue
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
                  className={`relative max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#C9A66B] text-[#FFFCFA] rounded-tr-xs"
                      : "bg-tile/80 border border-border text-foreground rounded-tl-xs"
                  }`}
                >
                  <div className="text-xs space-y-1">
                    {formatMessageText(msg.text)}
                  </div>

                  {/* Optional Action / Direct Deep Links */}
                  {msg.links && msg.links.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-border/60 flex flex-wrap gap-1.5">
                      {msg.links.map((link, idx) => (
                        <Link
                          key={idx}
                          href={link.href}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-card border border-border hover:border-[#C9A66B] text-[#8C6226] dark:text-[#E5CBA2] transition-colors"
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
                        className="px-2.5 py-1 rounded-full text-[11px] bg-card hover:bg-[#C9A66B]/10 text-foreground hover:text-[#8C6226] dark:hover:text-[#E5CBA2] border border-border hover:border-[#C9A66B]/40 transition-all duration-150 cursor-pointer shadow-2xs text-left"
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
                <div className="w-7 h-7 rounded-full bg-tile border border-border flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-tile border border-border px-3.5 py-2 rounded-2xl rounded-tl-xs flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A66B] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A66B] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A66B] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Send Area */}
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
                placeholder="Describe your issue (e.g. track #ORD59928, cancel order)..."
                className="flex-1 bg-tile text-xs sm:text-[13px] text-foreground placeholder:text-muted rounded-full px-4 py-2.5 border border-border focus:border-[#C9A66B] focus:ring-2 focus:ring-[#C9A66B]/20 outline-none transition-all"
              />

              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="p-2.5 rounded-full bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer shrink-0"
                title="Send message"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-1.5 px-2 flex items-center justify-between text-[10px] text-muted">
              <span>VN Mobiles Support • 1800-VN-MOBILE</span>
              <span className="hidden sm:inline">Press Enter to send</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
