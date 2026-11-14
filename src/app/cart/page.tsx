"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Truck,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Heart,
  Tag
} from "lucide-react";
import { formatINR } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";
import AccountLayout from "@/components/AccountLayout";

export default function CartPage() {
  const { 
    currentUser, 
    cart, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    cartTotal, 
    cartCount,
    toggleWishlist 
  } = useApp();

  const [isPriceDetailsOpen, setIsPriceDetailsOpen] = useState(false);

  const handleSaveForLater = (item: any) => {
    toggleWishlist(item.productId);
    removeFromCart(item.id);
  };

  const checkoutHref = !currentUser
    ? "/login?redirect=/checkout"
    : !currentUser.emailVerified
    ? `/verify-email?email=${encodeURIComponent(currentUser.email)}&redirect=/checkout`
    : "/checkout";

  return (
    <AccountLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-[#8C6226] dark:text-[#D4B483] hover:text-[#B8914A] font-semibold cursor-pointer px-3 py-1.5 rounded-full bg-[#C9A66B]/15 hover:bg-[#C9A66B]/25 border border-[#C9A66B]/30 transition-all"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Header Card */}
        <div className="bg-card border border-border rounded-[20px] p-6 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#C9A66B]/15 flex items-center justify-center text-[#8C6226] dark:text-[#D4B483]">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Review Your Cart</h1>
              <p className="text-xs text-muted mt-0.5">
                Authentic flagships with 1-Year Device Shield warranty and express dispatch.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] rounded-full shadow-2xs">
            {cartCount} Items
          </span>
        </div>

        {cart.length === 0 ? (
          <div className="bg-card border border-border rounded-[20px] p-12 text-center shadow-xs">
            <ShoppingBag className="w-12 h-12 text-muted/60 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground mb-1">Your Cart is Empty</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mb-6">
              You haven&apos;t added any smartphones or mobile accessories yet.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-full transition-all duration-200 shadow-xs"
            >
              <Smartphone className="w-4 h-4" /> Browse Smartphones
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-24 sm:pb-0">
            {/* Cart Items List */}
            <div className="lg:col-span-8 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-xl sm:rounded-[20px] p-3 sm:p-5 flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-tile border border-border/50 rounded-xl p-1.5 shrink-0 flex items-center justify-center">
                      <Image
                        src={item.imageUrl || "/images/placeholder.png"}
                        alt={item.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-[#8C6226] dark:text-[#D4B483] tracking-wider block">
                        {item.brand}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1">{item.name}</h3>
                      <p className="text-[11px] sm:text-xs text-muted mt-0.5 truncate">
                        {item.selectedStorage?.size} • {item.selectedColor?.name}
                      </p>
                      
                      <div className="pt-1 flex items-baseline gap-2">
                        <span className="text-sm sm:text-base font-bold text-foreground">
                          {formatINR(item.price * item.quantity)}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-[10px] text-muted font-normal">
                            ({formatINR(item.price)} each)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row: Stepper & Remove / Save For Later */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center border border-[#C9A66B]/30 bg-[#C9A66B]/10 rounded-full p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#D4B483] rounded-full transition cursor-pointer"
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-foreground">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#D4B483] rounded-full transition cursor-pointer"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => handleSaveForLater(item)}
                        className="text-muted hover:text-[#C9A66B] active:text-[#8C6226] font-medium transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Heart className="w-3.5 h-3.5" />
                        <span>Save for later</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-muted hover:text-red-500 active:text-red-600 font-medium transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Phone Collapsible Price Details Block (<sm) */}
              <div className="sm:hidden bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsPriceDetailsOpen(!isPriceDetailsOpen)}
                  className="w-full flex items-center justify-between text-xs font-bold text-foreground cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-accent" />
                    <span>Price Details ({cartCount} items)</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isPriceDetailsOpen ? "rotate-180" : ""}`} />
                </button>

                {isPriceDetailsOpen && (
                  <div className="space-y-2 pt-2 border-t border-border text-xs text-muted animate-in fade-in duration-150">
                    <div className="flex justify-between">
                      <span>Items Subtotal</span>
                      <span className="text-foreground font-semibold">{formatINR(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">FREE</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Device Shield Warranty (1-Yr)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">INCLUDED</span>
                    </div>
                    <div className="pt-2 border-t border-border flex justify-between text-sm font-bold text-foreground">
                      <span>Total Amount</span>
                      <span className="text-[#C9A66B] dark:text-[#D4B483]">{formatINR(cartTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Order Summary & Checkout Card (sm and up) */}
            <div className="hidden sm:block lg:col-span-4 bg-card border border-border rounded-[20px] p-6 space-y-4 shadow-xs">
              <h2 className="text-base font-bold text-foreground">Order Summary</h2>

              <div className="space-y-2.5 text-xs border-b border-border pb-4">
                <div className="flex justify-between text-muted">
                  <span>Subtotal ({cartCount} items)</span>
                  <span className="text-foreground font-bold">{formatINR(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Standard Express Delivery</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Device Shield Warranty</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">INCLUDED</span>
                </div>
              </div>

              <div className="flex justify-between text-base font-bold text-foreground pt-1">
                <span>Total Amount</span>
                <span className="text-[#C9A66B] dark:text-[#D4B483]">{formatINR(cartTotal)}</span>
              </div>

              <Link
                href={checkoutHref}
                className="w-full py-3.5 px-4 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-semibold rounded-full flex items-center justify-center gap-2 transition-all duration-200 shadow-sm cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="pt-2 text-[11px] text-muted flex items-center justify-center gap-2">
                <Truck className="w-3.5 h-3.5 text-accent" /> Free Pan-India Express Delivery
              </div>
            </div>

            {/* Phone Sticky Bottom Bar (<sm) */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border px-4 py-2.5 z-40 flex items-center justify-between gap-3 shadow-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setIsPriceDetailsOpen(!isPriceDetailsOpen)}
                  className="text-[10px] text-muted flex items-center gap-0.5 underline cursor-pointer"
                >
                  <span>View price details</span>
                  <ChevronUp className="w-3 h-3" />
                </button>
                <div className="text-base font-extrabold text-[#C9A66B] dark:text-[#D4B483] leading-tight">
                  {formatINR(cartTotal)}
                </div>
              </div>

              <Link
                href={checkoutHref}
                className="py-2.5 px-6 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] active:scale-95 text-[#FFFCFA] text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>Place Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
