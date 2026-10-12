"use client";

import React from "react";
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
} from "lucide-react";
import { formatINR } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";

export default function CartPage() {
  const { currentUser, cart, updateQuantity, removeFromCart, clearCart, cartTotal, cartCount } = useApp();

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-[1280px] mx-auto space-y-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cart Items List */}
            <div className="lg:col-span-8 space-y-3.5">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-[20px] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 bg-tile border border-border/50 rounded-[16px] p-2 flex-shrink-0">
                      <Image
                        src={item.imageUrl || "/images/placeholder.png"}
                        alt={item.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#8C6226] dark:text-[#D4B483] tracking-wider">
                        {item.brand}
                      </span>
                      <h3 className="text-sm font-bold text-foreground">{item.name}</h3>
                      <p className="text-xs text-muted mt-0.5">
                        {item.selectedStorage?.size} • {item.selectedColor?.name}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" /> 1-Year Device Shield Included
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3">
                    <div className="text-base font-bold text-foreground">
                      {formatINR(item.price * item.quantity)}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-[#C9A66B]/30 bg-[#C9A66B]/10 rounded-full p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#D4B483] rounded-full transition cursor-pointer"
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-xs font-bold text-foreground">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#D4B483] rounded-full transition cursor-pointer"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 hover:bg-[#C9A66B]/20 text-muted hover:text-[#B8914A] rounded-full transition cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary & Checkout Card */}
            <div className="lg:col-span-4 bg-card border border-border rounded-[20px] p-6 space-y-4 shadow-xs">
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
                href={
                  !currentUser
                    ? "/login?redirect=/checkout"
                    : !currentUser.emailVerified
                    ? `/verify-email?email=${encodeURIComponent(currentUser.email)}&redirect=/checkout`
                    : "/checkout"
                }
                className="w-full py-3.5 px-4 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-semibold rounded-full flex items-center justify-center gap-2 transition-all duration-200 shadow-sm cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="pt-2 text-[11px] text-muted flex items-center justify-center gap-2">
                <Truck className="w-3.5 h-3.5 text-accent" /> Free Pan-India Express Delivery
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
