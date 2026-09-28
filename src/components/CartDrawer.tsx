"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import { X, Trash2, Plus, Minus, ShieldCheck, ArrowRight, ShoppingBag, AlertCircle } from "lucide-react";
import { formatINR } from "@/lib/formatters";

export default function CartDrawer() {
  const { 
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-gray-300">
        {/* Amazon Cart Header */}
        <div className="p-4 bg-[#f0f2f2] border-b border-gray-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#131921]" />
            <h2 className="font-bold text-base text-[#0f1111]">
              Shopping Cart ({cartCount} {cartCount === 1 ? "item" : "items"})
            </h2>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1 text-gray-500 hover:text-black rounded-xs cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Delivery Banner */}
        <div className="px-4 py-2.5 bg-[#fef8f2] border-b border-[#fbd8b4] flex items-center gap-2 text-xs text-[#703800]">
          <ShieldCheck className="w-4 h-4 text-[#e67a00] shrink-0" />
          <span>Your order qualifies for <strong>FREE Delivery & Device Protection Alerts</strong>.</span>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
              <ShoppingBag className="w-12 h-12 text-gray-300 mb-3" />
              <h4 className="text-base font-bold text-[#0f1111] mb-1">Your VM Mobiles Cart is empty</h4>
              <p className="text-xs text-gray-500 max-w-xs mb-4">
                Explore our smartphone deals and add your favorite device to cart.
              </p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="btn-amazon-yellow py-2 px-6 text-xs font-bold"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white border border-gray-200 rounded-sm flex gap-3 relative"
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 bg-white border border-gray-100 p-1 relative shrink-0">
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
                      <h4 className="text-xs font-bold text-[#0f1111] line-clamp-1">{item.name}</h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[11px] text-gray-500 mt-0.5">
                      <span>{item.selectedStorage.size} • {item.selectedColor.name}</span>
                    </div>

                    {item.inStock === false || (item.stock !== undefined && item.stock <= 0) ? (
                      <div className="text-[11px] text-[#b12704] font-bold mt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
                        <span>Currently Out of Stock</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#007600] font-medium mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#007600]"></span>
                        <span>In Stock</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="text-sm font-bold text-[#0f1111]">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                    </span>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 border border-gray-300 rounded-sm px-1.5 py-0.5 bg-[#f0f2f2]">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="text-gray-600 hover:text-black p-0.5 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold px-1 text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="text-gray-600 hover:text-black p-0.5 cursor-pointer"
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
          <div className="p-4 bg-[#f0f2f2] border-t border-gray-300 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-base font-bold text-[#0f1111]">
                <span>Subtotal ({cartCount} items):</span>
                <span className="text-[#b12704]">₹{cartTotal.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-[11px] text-gray-500">EMI starts at ₹{Math.round(cartTotal / 24).toLocaleString("en-IN")}/month</p>
            </div>

            {hasOutOfStockItems && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Alert:</strong> Some smartphones in your cart are currently out of stock. Please remove them before proceeding to buy.
                </span>
              </div>
            )}

            <div className="space-y-2">
              {hasOutOfStockItems ? (
                <button
                  type="button"
                  onClick={() => alert("Please remove currently out-of-stock smartphones from your cart before proceeding to checkout.")}
                  className="py-2.5 px-4 text-xs font-bold w-full text-center block rounded-sm bg-gray-200 hover:bg-gray-300 text-gray-600 border border-gray-300 cursor-pointer shadow-xs"
                >
                  ⚠️ Proceed Blocked (Out of Stock Items in Cart)
                </button>
              ) : (
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="btn-amazon-yellow py-2.5 px-4 text-sm font-bold w-full text-center block cursor-pointer shadow-sm"
                >
                  Proceed to Buy ({cartCount} {cartCount === 1 ? "item" : "items"})
                </Link>
              )}

              <button
                onClick={clearCart}
                className="text-xs text-gray-500 hover:underline block mx-auto cursor-pointer"
              >
                Empty Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}