"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CartItem, MobileProductData, SmsAlertData } from "@/lib/types";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "USER" | "ADMIN";
}

interface AppContextType {
  currentUser: UserProfile | null;
  login: (user: UserProfile) => void;
  logout: () => void;

  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  compareList: MobileProductData[];
  addToCompare: (product: MobileProductData) => boolean;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;

  isSmsDrawerOpen: boolean;
  setIsSmsDrawerOpen: (open: boolean) => void;
  smsAlerts: SmsAlertData[];
  unreadSmsCount: number;
  fetchSmsAlerts: () => Promise<void>;
  markSmsAsRead: (id: string) => Promise<void>;
  markAllSmsAsRead: () => Promise<void>;
  lastIncomingSms: SmsAlertData | null;
  dismissToast: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [compareList, setCompareList] = useState<MobileProductData[]>([]);
  const [isSmsDrawerOpen, setIsSmsDrawerOpen] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState<SmsAlertData[]>([]);
  const [unreadSmsCount, setUnreadSmsCount] = useState(0);
  const [lastIncomingSms, setLastIncomingSms] = useState<SmsAlertData | null>(null);

  // Load user, cart and compare list from localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("novamobile_user");
      if (savedUser) setCurrentUser(JSON.parse(savedUser));

      const savedCart = localStorage.getItem("novamobile_cart");
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedCompare = localStorage.getItem("novamobile_compare");
      if (savedCompare) setCompareList(JSON.parse(savedCompare));
    } catch (e) {
      console.error("Failed to load local storage state", e);
    }
  }, []);

  // Save cart changes
  useEffect(() => {
    try {
      localStorage.setItem("novamobile_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Failed to save cart to local storage", e);
    }
  }, [cart]);

  // Save compare list
  useEffect(() => {
    try {
      localStorage.setItem("novamobile_compare", JSON.stringify(compareList));
    } catch (e) {
      console.error("Failed to save compare to local storage", e);
    }
  }, [compareList]);

  // Fetch SMS alerts from backend
  const fetchSmsAlerts = useCallback(async () => {
    if (!currentUser) {
      setSmsAlerts([]);
      setUnreadSmsCount(0);
      return;
    }
    try {
      let queryUrl = "/api/sms";
      if (currentUser.role === "ADMIN") {
        queryUrl = "/api/sms?admin=true";
      } else {
        const params = new URLSearchParams();
        if (currentUser.id) params.set("userId", currentUser.id);
        if (currentUser.phone) params.set("phone", currentUser.phone);
        queryUrl = `/api/sms?${params.toString()}`;
      }
      const res = await fetch(queryUrl);
      const data = await res.json();
      if (data.success) {
        setSmsAlerts(data.alerts || []);
        setUnreadSmsCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error("Failed to fetch SMS alerts", e);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchSmsAlerts();
    // Poll for any simulated background SMS alerts every 15 seconds
    const interval = setInterval(fetchSmsAlerts, 15000);
    return () => clearInterval(interval);
  }, [fetchSmsAlerts]);

  const addToCart = (item: CartItem) => {
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
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
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
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCompare = (product: MobileProductData): boolean => {
    if (compareList.some((p) => p.id === product.id)) return false;
    if (compareList.length >= 3) {
      alert("You can compare up to 3 smartphones at a time.");
      return false;
    }
    setCompareList((prev) => [...prev, product]);
    return true;
  };

  const removeFromCompare = (productId: string) => {
    setCompareList((prev) => prev.filter((p) => p.id !== productId));
  };

  const clearCompare = () => {
    setCompareList([]);
  };

  const markSmsAsRead = async (id: string) => {
    try {
      await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_READ", id }),
      });
      setSmsAlerts((prev) =>
        prev.map((sms) => (sms.id === id ? { ...sms, isRead: true } : sms))
      );
      setUnreadSmsCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllSmsAsRead = async () => {
    try {
      await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_ALL_READ" }),
      });
      setSmsAlerts((prev) => prev.map((sms) => ({ ...sms, isRead: true })));
      setUnreadSmsCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const dismissToast = () => {
    setLastIncomingSms(null);
  };

  const login = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem("novamobile_user", JSON.stringify(user));
    } catch (e) {}
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem("novamobile_user");
    } catch (e) {}
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        login,
        logout,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        isCartOpen,
        setIsCartOpen,
        compareList,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isSmsDrawerOpen,
        setIsSmsDrawerOpen,
        smsAlerts,
        unreadSmsCount,
        fetchSmsAlerts,
        markSmsAsRead,
        markAllSmsAsRead,
        lastIncomingSms,
        dismissToast,
      }}
    >
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