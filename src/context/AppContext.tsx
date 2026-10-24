"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { CartItem, MobileProductData } from "@/lib/types";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "USER" | "ADMIN";
  emailVerified?: boolean;
}

export const DEFAULT_SITE_SETTINGS: Record<string, string> = {
  showWishlist: "true",
  showCompare: "true",
  showDealsBanner: "true",
  showReviews: "true",
  showDealsCountdown: "true",
  showAnnouncement: "true",
  announcementText: "⚡ Free Express Delivery across India | 1-Year Official Brand Warranty",
};

interface AppContextType {
  currentUser: UserProfile | null;
  login: (user: UserProfile) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  siteSettings: Record<string, string>;
  refreshSiteSettings: () => Promise<void>;

  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  wishlistCount: number;

  compareList: MobileProductData[];
  addToCompare: (product: MobileProductData) => boolean;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [compareList, setCompareList] = useState<MobileProductData[]>([]);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>(DEFAULT_SITE_SETTINGS);

  // Load user, cart, wishlist, compare list, and cached site settings from localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("novamobile_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.role === "ADMIN" && (parsed.email || "").toLowerCase() !== "rrroyce20@gmail.com") {
          parsed.role = "USER";
        }
        setCurrentUser(parsed);
      }

      const savedCart = localStorage.getItem("novamobile_cart");
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedWishlist = localStorage.getItem("novamobile_wishlist");
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));

      const savedCompare = localStorage.getItem("novamobile_compare");
      if (savedCompare) setCompareList(JSON.parse(savedCompare));

      const savedSettings = localStorage.getItem("novamobile_site_settings");
      if (savedSettings) setSiteSettings(JSON.parse(savedSettings));
    } catch (e) {
      console.error("Failed to load local storage state", e);
    }
  }, []);

  // Refresh storefront visibility settings from backend
  const refreshSiteSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setSiteSettings(data.settings);
        try {
          localStorage.setItem("novamobile_site_settings", JSON.stringify(data.settings));
        } catch {}
      }
    } catch (e) {
      console.error("Failed to refresh site settings:", e);
    }
  }, []);

  // Fetch settings on mount and listen to cross-tab / local update events
  useEffect(() => {
    refreshSiteSettings();
    const handleSync = () => refreshSiteSettings();
    window.addEventListener("vn_settings_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("vn_settings_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [refreshSiteSettings]);

  // Save cart changes
  useEffect(() => {
    try {
      localStorage.setItem("novamobile_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Failed to save cart to local storage", e);
    }
  }, [cart]);

  // Save wishlist changes
  useEffect(() => {
    try {
      localStorage.setItem("novamobile_wishlist", JSON.stringify(wishlist));
    } catch (e) {
      console.error("Failed to save wishlist to local storage", e);
    }
  }, [wishlist]);

  // Save compare list
  useEffect(() => {
    try {
      localStorage.setItem("novamobile_compare", JSON.stringify(compareList));
    } catch (e) {
      console.error("Failed to save compare to local storage", e);
    }
  }, [compareList]);

  // Refresh current user info from backend
  const refreshUser = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/auth/me?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem("novamobile_user", JSON.stringify(data.user));
      }
    } catch (e) {
      console.error("Failed to refresh user:", e);
    }
  }, [currentUser?.id]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, item];
    });
    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  const isInWishlist = useCallback((productId: string) => {
    return wishlist.includes(productId);
  }, [wishlist]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const wishlistCount = wishlist.length;

  const addToCompare = useCallback((product: MobileProductData): boolean => {
    let success = false;
    setCompareList((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      if (prev.length >= 3) {
        alert("You can compare up to 3 smartphones at a time.");
        return prev;
      }
      success = true;
      return [...prev, product];
    });
    return success;
  }, []);

  const removeFromCompare = useCallback((productId: string) => {
    setCompareList((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
  }, []);

  const login = useCallback((user: UserProfile) => {
    const isRealAdmin =
      user.role === "ADMIN" &&
      (user.email || "").toLowerCase() === "rrroyce20@gmail.com";
    const sanitizedUser: UserProfile = {
      ...user,
      role: isRealAdmin ? "ADMIN" : "USER",
    };
    setCurrentUser(sanitizedUser);
    try {
      localStorage.setItem("novamobile_user", JSON.stringify(sanitizedUser));
    } catch {}
  }, []);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem("novamobile_user");
    } catch {}
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Failed to clear server session:", e);
    }
  }, []);

  const contextValue = useMemo<AppContextType>(() => ({
    currentUser,
    login,
    logout,
    refreshUser,
    siteSettings,
    refreshSiteSettings,
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
    isCartOpen,
    setIsCartOpen,
    wishlist,
    toggleWishlist,
    isInWishlist,
    wishlistCount,
    compareList,
    addToCompare,
    removeFromCompare,
    clearCompare,
  }), [
    currentUser,
    login,
    logout,
    refreshUser,
    siteSettings,
    refreshSiteSettings,
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
    isCartOpen,
    wishlist,
    toggleWishlist,
    isInWishlist,
    wishlistCount,
    compareList,
    addToCompare,
    removeFromCompare,
    clearCompare,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}