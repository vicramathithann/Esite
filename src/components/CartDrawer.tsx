"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import { X, Trash2, Plus, Minus, ShieldCheck, ShoppingBag, AlertCircle } from "lucide-react";

export default function CartDrawer() {
  const { 
    currentUser,
    cart, 
    isCartOpen, 
    setIsCartOpen, 
    removeFromCart, 
    updateQuantity, 
    cartTotal, 
    cartCount,
    clearCart
  } = useApp();

  const hasOutOfStockItems = cart.some(
    (item) => item.inStock === false || (item.stock !== undefined && item.stock <= 0)
  );

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-card h-full flex flex-col shadow-2xl border-l border-border animate-scale-up text-foreground">
        {/* Drawer Header */}
        <div className="p-6 bg-card border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-tile flex items-center justify-center text-foreground">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground leading-tight">
                Bag
              </h2>
              <span className="text-xs text-muted">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-muted hover:text-foreground hover:bg-tile rounded-full cursor-pointer transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free Delivery & Protection Banner */}
        <div className="px-6 py-3 bg-tile border-b border-border flex items-center gap-2.5 text-xs text-foreground">
          <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
          <span>Free express shipping & automated warranty protection included.</span>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted">
              <div className="w-16 h-16 rounded-full bg-tile flex items-center justify-center mb-4 text-muted">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-1">Your bag is empty</h4>
              <p className="text-xs text-muted max-w-xs mb-6">
                Discover the latest flagship smartphones and choose your device.
              </p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="py-2.5 px-6 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-semibold text-xs cursor-pointer transition-all duration-200 shadow-xs"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-card border border-border rounded-[20px] shadow-xs flex gap-3.5 relative"
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 bg-tile border border-border/50 rounded-[16px] p-2 relative shrink-0 flex items-center justify-center overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-foreground line-clamp-1">{item.name}</h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-muted hover:text-[#B8914A] hover:bg-[#C9A66B]/20 p-1 cursor-pointer transition-all duration-200 rounded-full"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[11px] text-muted mt-0.5">
                      <span>{item.selectedStorage.size} • {item.selectedColor.name}</span>
                    </div>

                    {item.inStock === false || (item.stock !== undefined && item.stock <= 0) ? (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>Currently Out of Stock</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#8C6226] dark:text-[#D4B483] font-medium mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C9A66B]"></span>
                        <span>In Stock</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                    <span className="text-sm font-bold text-foreground">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                    </span>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1 border border-[#C9A66B]/30 rounded-full px-2 py-0.5 bg-[#C9A66B]/10">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="text-[#8C6226] dark:text-[#D4B483] hover:bg-[#C9A66B]/20 p-0.5 cursor-pointer rounded-full transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-semibold px-1 text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="text-[#8C6226] dark:text-[#D4B483] hover:bg-[#C9A66B]/20 p-0.5 cursor-pointer rounded-full transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Checkout button */}
        {cart.length > 0 && (
          <div className="p-6 bg-card border-t border-border space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-base font-bold text-foreground">
                <span>Total:</span>
                <span className="text-[#C9A66B] dark:text-[#D4B483]">₹{cartTotal.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-[11px] text-muted">
                EMI from ₹{Math.round(cartTotal / 24).toLocaleString("en-IN")}/mo. Free shipping & warranty protection.
              </p>
            </div>

            {hasOutOfStockItems && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[14px] text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Some items in your bag are currently out of stock. Please remove them before checkout.
                </span>
              </div>
            )}

            <div className="space-y-2">
              {hasOutOfStockItems ? (
                <button
                  type="button"
                  onClick={() => alert("Please remove currently out-of-stock smartphones from your cart before proceeding to checkout.")}
                  className="py-3 px-6 text-xs font-medium w-full text-center block rounded-full bg-[#C9A66B]/15 text-[#8C6226]/50 dark:text-[#D4B483]/50 border border-[#C9A66B]/30 cursor-not-allowed"
                >
                  Checkout Unavailable (Out of Stock)
                </button>
              ) : (
                <Link
                  href={
                    !currentUser
                      ? "/login?redirect=/checkout"
                      : !currentUser.emailVerified
                      ? `/verify-email?email=${encodeURIComponent(currentUser.email)}&redirect=/checkout`
                      : "/checkout"
                  }
                  onClick={() => setIsCartOpen(false)}
                  className="py-3 px-6 text-xs font-semibold w-full text-center block rounded-full bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] cursor-pointer transition-all duration-200 shadow-sm"
                >
                  Review Bag and Checkout
                </Link>
              )}

              <button
                onClick={clearCart}
                className="text-xs text-[#8C6226] dark:text-[#D4B483] hover:underline block mx-auto cursor-pointer pt-1 transition-colors"
              >
                Remove all items
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}