"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  Search, 
  ArrowLeft, 
  X, 
  Clock, 
  TrendingUp, 
  ChevronRight,
  Smartphone
} from "lucide-react";
import { DEFAULT_PRODUCTS } from "@/lib/catalogData";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const POPULAR_SEARCHES = [
  "iPhone 18 Pro Max",
  "Samsung Galaxy S26 Ultra",
  "Google Pixel 10a",
  "OnePlus 13",
  "5G Phones under 25000",
  "Xiaomi 15 Ultra",
  "120Hz AMOLED",
  "Nothing Phone (3)"
];

const STORAGE_KEY = "vn_recent_searches";

export default function SearchOverlay({ isOpen, onClose, initialQuery = "" }: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 6));
      }
    } catch {}
  }, [isOpen]);

  // Handle auto-focus and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
      setQuery("");
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const removeRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter((s) => s !== term);
      setRecentSearches(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const clearAllRecent = () => {
    try {
      setRecentSearches([]);
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const executeSearch = (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;
    saveRecentSearch(term);
    onClose();
    router.push(`/?search=${encodeURIComponent(term)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      executeSearch(query);
    }
  };

  // Live filtered suggestions
  const suggestions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return DEFAULT_PRODUCTS.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        (p.processor && p.processor.toLowerCase().includes(q))
      );
    }).slice(0, 6);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-150">
      {/* Top Search Input Bar */}
      <div className="h-14 sm:h-16 px-3 sm:px-4 border-b border-border flex items-center gap-2 bg-card/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-foreground hover:bg-tile active:bg-tile/80 transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit} className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search phones, brands (Apple, Samsung...)"
            className="w-full h-10 pl-3 pr-9 text-sm bg-tile border border-border focus:border-[#C9A66B] dark:focus:border-[#D4B483] rounded-full text-foreground placeholder:text-muted focus:outline-none transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-3 p-1 rounded-full text-muted hover:text-foreground cursor-pointer"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {query.trim() && (
          <button
            type="button"
            onClick={() => executeSearch(query)}
            className="px-3 py-1.5 text-xs font-bold bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] rounded-full shrink-0 shadow-xs cursor-pointer"
          >
            Search
          </button>
        )}
      </div>

      {/* Results / Suggestions / Recent Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-5">
        {/* If user is typing: show matching product suggestions */}
        {query.trim() ? (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2 px-1">
              Suggestions ({suggestions.length})
            </div>
            {suggestions.length > 0 ? (
              <div className="divide-y divide-border/60 rounded-xl bg-card border border-border overflow-hidden">
                {suggestions.map((p) => (
                  <Link
                    key={p.id}
                    href={`/mobile/${p.id}`}
                    onClick={() => {
                      saveRecentSearch(p.name);
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-tile active:bg-tile/80 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white p-1 border border-border/40 shrink-0 flex items-center justify-center overflow-hidden">
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        width={36}
                        height={36}
                        className="object-contain w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">{p.name}</div>
                      <div className="text-[11px] text-muted flex items-center gap-2">
                        <span>{p.brand}</span>
                        <span>•</span>
                        <span className="font-semibold text-foreground">₹{p.basePrice.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => executeSearch(query)}
                  className="w-full p-3 text-center text-xs font-bold text-[#C9A66B] dark:text-[#D4B483] bg-tile hover:bg-tile/80 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>See all results for &quot;{query}&quot;</span>
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-muted">
                <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No direct matches for &quot;{query}&quot;</p>
                <button
                  type="button"
                  onClick={() => executeSearch(query)}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] text-xs font-semibold rounded-full shadow-xs cursor-pointer"
                >
                  Search catalog anyway
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Recent Searches</span>
                  </span>
                  <button
                    type="button"
                    onClick={clearAllRecent}
                    className="text-[11px] text-[#C9A66B] dark:text-[#D4B483] hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      onClick={() => executeSearch(term)}
                      className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-tile border border-border text-xs text-foreground hover:border-[#C9A66B] cursor-pointer active:scale-95 transition-all"
                    >
                      <span>{term}</span>
                      <button
                        type="button"
                        onClick={(e) => removeRecentSearch(e, term)}
                        className="p-0.5 rounded-full hover:bg-card text-muted hover:text-foreground cursor-pointer"
                        aria-label={`Remove ${term}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2 px-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#C9A66B] dark:text-[#D4B483]" />
                <span>Trending & Popular</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => executeSearch(term)}
                    className="px-3 py-1.5 rounded-full bg-tile hover:bg-[#C9A66B]/10 hover:border-[#C9A66B]/40 border border-border text-xs font-medium text-foreground transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Search className="w-3 h-3 text-muted" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Brand Links */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2 px-1">
                Top Brands
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {["Apple", "Samsung", "Google Pixel", "OnePlus"].map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(`/?brand=${encodeURIComponent(brand)}`);
                    }}
                    className="p-2.5 rounded-xl bg-card border border-border hover:border-[#C9A66B] text-xs font-bold text-foreground transition-all cursor-pointer"
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
