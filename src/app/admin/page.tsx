"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  ShieldCheck,
  PlusCircle,
  Package,
  Boxes,
  Truck,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Search,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Send,
  X,
  Save,
  ChevronRight,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  UserCheck
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

const FAMOUS_BRANDS = [
  "Apple",
  "Samsung",
  "Google Pixel",
  "OnePlus",
  "Xiaomi",
  "Redmi",
  "Realme",
  "Vivo",
  "Oppo",
  "Motorola",
  "Nothing",
  "Sony",
  "Asus",
  "iQOO",
  "Nokia",
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const { currentUser, login } = useApp();

  const [activeTab, setActiveTab] = useState<"orders" | "stock" | "add-product">("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [mobiles, setMobiles] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingMobiles, setLoadingMobiles] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter states
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [stockSearch, setStockSearch] = useState("");
  const [stockBrandFilter, setStockBrandFilter] = useState("ALL");

  // Shipping Modal State
  const [shippingModalOrder, setShippingModalOrder] = useState<any | null>(null);
  const [shippingData, setShippingData] = useState({
    shippingCarrier: "BlueDart Express",
    trackingNumber: "",
    estimatedDelivery: "",
  });

  // Alter Order Modal State
  const [alterModalOrder, setAlterModalOrder] = useState<any | null>(null);
  const [alterFormData, setAlterFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    totalAmount: 0,
    paymentStatus: "PAID",
    orderStatus: "PROCESSING",
  });

  // Add Product Form State
  const [newProduct, setNewProduct] = useState({
    brand: "Apple",
    model: "",
    variant: "Midnight Black",
    ram: "12GB",
    storage: "256GB",
    price: 69999,
    originalPrice: 79999,
    stock: 50,
    imageUrl: "/phones/apple-iphone-16.jpg",
    displaySize: '6.7" Super Retina XDR OLED 120Hz',
    processor: "Apple A18 Pro 3nm",
    camera: "48MP Fusion + 48MP Ultra-wide + 12MP 5x Telephoto",
    battery: "4685 mAh, 30W Fast Charging",
    operatingSystem: "iOS 18",
    description: "Brand new flagship smartphone with cutting-edge camera and all-day battery life.",
  });
  const [addingProduct, setAddingProduct] = useState(false);
  const [productSuccessMsg, setProductSuccessMsg] = useState<string | null>(null);

  // 1. Fetch Orders
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch("/api/orders?admin=true");
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // 2. Fetch Mobiles for Stock
  const fetchMobiles = async () => {
    try {
      setLoadingMobiles(true);
      const res = await fetch("/api/mobiles?sort=newest");
      const data = await res.json();
      if (data.success) {
        setMobiles(data.mobiles);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMobiles(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMobiles();
  }, []);

  // Require Admin Check
  const isAdmin = currentUser && currentUser.role === "ADMIN";

  const handleAdminBypassLogin = () => {
    login({
      id: "admin-master",
      name: "VN Mobiles Administrator",
      email: "admin@vmmobiles.in",
      phone: "+91 99999 00000",
      role: "ADMIN",
    });
  };

  // -------------------------------------------------------------
  // Order Lifecycle Handlers
  // -------------------------------------------------------------
  const handleProcessOrder = async (orderId: string) => {
    try {
      setActionLoading(`process-${orderId}`);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: "PROCESSING" }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, orderStatus: "PROCESSING" } : o))
        );
      } else {
        alert(data.error || "Failed to process order.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenShippingModal = (order: any) => {
    setShippingModalOrder(order);
    const randomTrk = `BD-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    setShippingData({
      shippingCarrier: order.shippingCarrier || "BlueDart Express",
      trackingNumber: order.trackingNumber || randomTrk,
      estimatedDelivery: futureDate.toISOString().split("T")[0],
    });
  };

  const handleSubmitShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingModalOrder) return;

    try {
      setActionLoading(`ship-${shippingModalOrder.id}`);
      const res = await fetch(`/api/orders/${shippingModalOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus: "SHIPPED",
          shippingCarrier: shippingData.shippingCarrier,
          trackingNumber: shippingData.trackingNumber,
          estimatedDelivery: shippingData.estimatedDelivery,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === shippingModalOrder.id ? data.order : o))
        );
        setShippingModalOrder(null);
      } else {
        alert(data.error || "Failed to update shipping.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to mark this order as DELIVERED & COMPLETED?")) return;

    try {
      setActionLoading(`complete-${orderId}`);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: "DELIVERED" }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, orderStatus: "DELIVERED" } : o))
        );
      } else {
        alert(data.error || "Failed to complete order.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------
  // Alter & Delete Order Handlers
  // -------------------------------------------------------------
  const handleOpenAlterModal = (order: any) => {
    setAlterModalOrder(order);
    setAlterFormData({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      address: order.address,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus || "PAID",
      orderStatus: order.orderStatus,
    });
  };

  const handleSubmitAlterOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alterModalOrder) return;

    try {
      setActionLoading(`alter-${alterModalOrder.id}`);
      const res = await fetch(`/api/orders/${alterModalOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...alterFormData,
          alteredDetailsNotification: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === alterModalOrder.id ? data.order : o))
        );
        setAlterModalOrder(null);
        alert("Order details updated and customer notified!");
      } else {
        alert(data.error || "Failed to alter order details.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!confirm(`⚠️ DANGER: Are you sure you want to completely DELETE order #${orderNumber}? This will remove it from the SQL database.`)) return;

    try {
      setActionLoading(`delete-${orderId}`);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        alert(data.error || "Failed to delete order.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------
  // Stock Management Handlers
  // -------------------------------------------------------------
  const handleUpdateStock = async (mobileId: string, delta: number) => {
    const mobile = mobiles.find((m) => m.id === mobileId);
    if (!mobile) return;
    const newStock = Math.max(0, mobile.stock + delta);

    // Optimistic UI
    setMobiles((prev) =>
      prev.map((m) => (m.id === mobileId ? { ...m, stock: newStock } : m))
    );

    try {
      await fetch(`/api/mobiles/${mobileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock, inStock: newStock > 0 }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetExactStock = async (mobileId: string, exactStock: number) => {
    const mobile = mobiles.find((m) => m.id === mobileId);
    if (!mobile) return;

    setMobiles((prev) =>
      prev.map((m) => (m.id === mobileId ? { ...m, stock: exactStock } : m))
    );

    try {
      await fetch(`/api/mobiles/${mobileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: exactStock, inStock: exactStock > 0 }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProduct = async (mobileId: string, modelName: string) => {
    if (!confirm(`Are you sure you want to delete ${modelName} from the store?`)) return;

    try {
      const res = await fetch(`/api/mobiles/${mobileId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMobiles((prev) => prev.filter((m) => m.id !== mobileId));
      } else {
        alert(data.error || "Failed to delete product.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // -------------------------------------------------------------
  // Add Product Handler
  // -------------------------------------------------------------
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.model || !newProduct.price) {
      alert("Model and Price are required.");
      return;
    }

    try {
      setAddingProduct(true);
      setProductSuccessMsg(null);

      const res = await fetch("/api/mobiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });

      const data = await res.json();
      if (data.success) {
        setProductSuccessMsg(`Successfully added ${newProduct.brand} ${newProduct.model} to catalog!`);
        fetchMobiles();
        setNewProduct({
          ...newProduct,
          model: "",
          price: 49999,
          originalPrice: 59999,
        });
      } else {
        alert(data.error || "Failed to add product.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingProduct(false);
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter === "ALL") return true;
    return o.orderStatus === orderStatusFilter;
  });

  // Filtered Mobiles for Stock
  const filteredMobiles = mobiles.filter((m) => {
    const matchBrand = stockBrandFilter === "ALL" || m.brand === stockBrandFilter;
    const matchSearch =
      !stockSearch ||
      m.model.toLowerCase().includes(stockSearch.toLowerCase()) ||
      m.brand.toLowerCase().includes(stockSearch.toLowerCase());
    return matchBrand && matchSearch;
  });

  // Render Access Gate if not Admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#131921] flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-[#1f2833] border border-amber-500/40 rounded-xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/20 text-[#febd69] rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-bold text-white">Administrator Access Required</h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            You must be logged in with administrator credentials to access the product inventory, stock controls, and order dispatch desks.
          </p>

          <div className="space-y-3 pt-2">
            <Link
              href="/login?redirect=/admin"
              className="w-full btn-amazon-yellow py-2.5 px-4 text-xs font-bold rounded-lg flex items-center justify-center gap-2"
            >
              <span>Go to Universal Sign In (Admin Access)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleAdminBypassLogin}
              className="w-full py-2 px-4 bg-[#C9A66B]/15 hover:bg-[#C9A66B]/25 active:bg-[#A67C3D] text-[#C9A66B] dark:text-[#D4B483] border border-[#C9A66B]/40 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              ⚡ Instant 1-Click Admin Access (Demo Mode)
            </button>

            <Link href="/" className="block text-xs text-gray-400 hover:text-gray-200 pt-2">
              ← Return to Public Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaeded] pb-24">
      {/* Admin Dark Top Bar */}
      <div className="bg-[#131921] text-white border-b border-amber-500/30 py-3.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 text-[#131921] rounded-lg flex items-center justify-center font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white tracking-tight">VN MOBILES</span>
                <span className="bg-amber-500/20 text-[#febd69] text-[10px] font-bold px-2 py-0.5 rounded border border-[#febd69]/30">
                  ADMIN CONTROL DESK
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Logged in as: <strong className="text-gray-200">{currentUser?.email}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/"
              target="_blank"
              className="px-3 py-1.5 bg-[#C9A66B]/15 hover:bg-[#C9A66B]/25 text-[#FFFCFA] border border-[#C9A66B]/30 rounded flex items-center gap-1 font-medium transition-colors"
            >
              <span>View Live Storefront</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/orders"
              className="px-3 py-1.5 bg-[#C9A66B]/15 hover:bg-[#C9A66B]/25 text-[#FFFCFA] border border-[#C9A66B]/30 rounded font-medium transition-colors"
            >
              Customer Orders View
            </Link>
          </div>
        </div>
      </div>

      {/* Dedicated Admin Route Quick Links */}
      <div className="bg-card border-b border-border text-xs px-4 sm:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 font-medium text-muted">
            <span className="text-[#C9A66B] font-bold uppercase tracking-wider text-[10px] mr-1">Admin Desks:</span>
            <Link href="/admin/dashboard" className="px-2.5 py-1 rounded bg-[#C9A66B]/15 hover:bg-[#C9A66B] hover:text-[#FFFCFA] text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 transition whitespace-nowrap font-medium">📊 Dashboard</Link>
            <Link href="/admin/orders" className="px-2.5 py-1 rounded bg-[#C9A66B]/15 hover:bg-[#C9A66B] hover:text-[#FFFCFA] text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 transition whitespace-nowrap font-medium">📦 Orders</Link>
            <Link href="/admin/products" className="px-2.5 py-1 rounded bg-[#C9A66B]/15 hover:bg-[#C9A66B] hover:text-[#FFFCFA] text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 transition whitespace-nowrap font-medium">📱 Products</Link>
            <Link href="/admin/inventory" className="px-2.5 py-1 rounded bg-[#C9A66B]/15 hover:bg-[#C9A66B] hover:text-[#FFFCFA] text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 transition whitespace-nowrap font-medium">📦 Inventory</Link>
            <Link href="/admin/customers" className="px-2.5 py-1 rounded bg-[#C9A66B]/15 hover:bg-[#C9A66B] hover:text-[#FFFCFA] text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 transition whitespace-nowrap font-medium">👥 Customers</Link>
            <Link href="/admin/warranties" className="px-2.5 py-1 rounded bg-[#C9A66B]/15 hover:bg-[#C9A66B] hover:text-[#FFFCFA] text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 transition whitespace-nowrap font-medium">🛡️ Warranties</Link>
            <Link href="/admin/email-logs" className="px-2.5 py-1 rounded bg-[#C9A66B]/15 hover:bg-[#C9A66B] hover:text-[#FFFCFA] text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 transition whitespace-nowrap font-medium">✉️ Email Logs</Link>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="bg-[#232f3e] text-white px-4 sm:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto text-xs font-bold scrollbar-none py-1.5">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2.5 rounded-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "orders"
                ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs"
                : "text-gray-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Orders & Lifecycle Desk ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("stock")}
            className={`px-4 py-2.5 rounded-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "stock"
                ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs"
                : "text-gray-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Inventory & Stock Manager ({mobiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("add-product")}
            className={`px-4 py-2.5 rounded-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "add-product"
                ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs"
                : "text-gray-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Smartphone</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {/* ========================================================= */}
        {/* TAB 1: ORDERS & FULL LIFECYCLE DESK                       */}
        {/* ========================================================= */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {/* Header & Status Bar */}
            <div className="bg-white border border-gray-200 rounded-sm p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
              <div>
                <h2 className="text-base font-bold text-[#0f1111]">
                  Order Dispatch & Processing Center
                </h2>
                <p className="text-xs text-gray-500">
                  Receive order → Process order → Update shipping & courier → Mark delivered. Alter or delete anytime.
                </p>
              </div>

              {/* Status Filter Badges */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {["ALL", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setOrderStatusFilter(status)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                        orderStatusFilter === status
                          ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs"
                          : "bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/20"
                      }`}
                    >
                      {status === "ALL" ? "All Orders" : status.replace(/_/g, " ")}
                    </button>
                  )
                )}
                <button
                  onClick={fetchOrders}
                  className="p-1.5 text-[#8C6226] dark:text-[#E5CBA2] bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 rounded transition-colors"
                  title="Refresh Orders"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Orders List */}
            {loadingOrders ? (
              <div className="p-12 text-center text-xs text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#007185] mb-2" />
                Loading orders from database...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-sm p-10 text-center text-gray-500 text-xs space-y-2">
                <Package className="w-10 h-10 mx-auto text-gray-300" />
                <p className="font-bold text-sm text-gray-700">No orders found for this status.</p>
                <p>New orders placed on the website will instantly appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const isProcessing = order.orderStatus === "PROCESSING";
                  const isShipped = order.orderStatus === "SHIPPED";
                  const isOutForDelivery = order.orderStatus === "OUT_FOR_DELIVERY";
                  const isDelivered = order.orderStatus === "DELIVERED";

                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-gray-200 rounded-sm shadow-xs overflow-hidden"
                    >
                      {/* Order Header */}
                      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                          <div>
                            <span className="text-gray-500 block text-[10px]">ORDER NUMBER</span>
                            <span className="font-mono font-bold text-[#0f1111] text-sm">
                              #{order.orderNumber}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-[10px]">ORDER DATE</span>
                            <span className="font-medium text-gray-700">
                              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-[10px]">BUYER TOTAL</span>
                            <span className="font-bold text-[#b12704] text-sm">
                              {formatINR(order.totalAmount)}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge & Alter / Delete Actions */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              isDelivered
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : isShipped || isOutForDelivery
                                ? "bg-blue-50 text-blue-800 border-blue-300"
                                : isProcessing
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "bg-purple-50 text-purple-800 border-purple-300"
                            }`}
                          >
                            ● {order.orderStatus.replace(/_/g, " ")}
                          </span>

                          <button
                            onClick={() => handleOpenAlterModal(order)}
                            className="px-2.5 py-1 text-[11px] font-bold text-[#8C6226] dark:text-[#E5CBA2] bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 rounded-sm flex items-center gap-1 cursor-pointer transition-colors"
                            title="Edit customer, delivery address or amount"
                          >
                            <Edit3 className="w-3 h-3 text-[#C9A66B]" />
                            <span>Alter Details</span>
                          </button>

                          <button
                            onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                            className="px-2.5 py-1 text-[11px] font-bold text-[#8C6226] dark:text-[#E5CBA2] bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 rounded-sm flex items-center gap-1 cursor-pointer transition-colors"
                            title="Delete order from database"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Order Body */}
                      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
                        {/* Ordered Items (7 cols) */}
                        <div className="lg:col-span-7 space-y-3">
                          <h4 className="font-bold text-gray-700 pb-1 border-b border-gray-100">
                            Purchased Mobile Items ({order.items?.length || 0})
                          </h4>
                          {order.items?.map((item: any) => (
                            <div key={item.id} className="flex gap-3 items-center">
                              <div className="w-12 h-12 relative bg-gray-50 border border-gray-200 rounded shrink-0 overflow-hidden">
                                <Image
                                  src={item.productImageUrl}
                                  alt={item.productName}
                                  fill
                                  unoptimized
                                  className="object-contain"
                                />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-bold text-[#0f1111]">{item.productName}</h5>
                                <div className="text-gray-500 font-mono text-[11px]">
                                  {item.selectedStorage} • {item.selectedColor} • Qty: {item.quantity}
                                </div>
                                <div className="text-[11px] text-gray-600 mt-0.5">
                                  IMEI: <span className="font-mono font-bold bg-gray-100 px-1 rounded">{item.imeiNumber}</span>
                                </div>
                              </div>
                              <div className="text-right font-bold text-[#0f1111]">
                                {formatINR(item.price * item.quantity)}
                              </div>
                            </div>
                          ))}

                          {/* Shipping Details Bar */}
                          {order.shippingCarrier && (
                            <div className="mt-3 p-2.5 bg-blue-50/60 border border-blue-200 rounded text-blue-900 flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <Truck className="w-4 h-4 text-blue-700" />
                                <span>
                                  Carrier: <strong>{order.shippingCarrier}</strong> | Tracking:{" "}
                                  <strong className="font-mono">{order.trackingNumber}</strong>
                                </span>
                              </div>
                              <Link
                                href={`/track/${order.orderNumber}`}
                                target="_blank"
                                className="text-blue-700 hover:underline font-bold flex items-center gap-0.5"
                              >
                                View Tracking <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* Customer & Delivery Address (5 cols) */}
                        <div className="lg:col-span-5 bg-gray-50 border border-gray-200 rounded p-3 space-y-2 text-xs">
                          <div className="font-bold text-gray-700 pb-1 border-b border-gray-200 flex items-center justify-between">
                            <span>Delivery Destination</span>
                            <span className="text-[10px] text-emerald-700 font-mono">OTP Verified ✓</span>
                          </div>
                          <div>
                            <strong className="text-sm text-[#0f1111] block">{order.customerName}</strong>
                            <p className="text-gray-600 leading-relaxed mt-1">
                              {order.address}, {order.city}, {order.state} - {order.pincode}
                            </p>
                          </div>
                          <div className="pt-1 text-[11px] text-gray-600 space-y-0.5 border-t border-gray-200">
                            <div>Phone: <strong className="font-mono text-[#0f1111]">{order.customerPhone}</strong></div>
                            <div>Email: {order.customerEmail}</div>
                            <div>Payment: <span className="font-bold">{order.paymentMethod}</span> ({order.paymentStatus})</div>
                          </div>
                        </div>
                      </div>

                      {/* Order Lifecycle Action Pipeline Bar */}
                      <div className="bg-gray-100/70 border-t border-gray-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                          <span className="font-bold text-gray-800">Dispatch Pipeline:</span>
                          <span>1. Receive (Done)</span>
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                          <span className={isProcessing || isShipped || isDelivered ? "font-bold text-amber-700" : ""}>
                            2. Process
                          </span>
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                          <span className={isShipped || isDelivered ? "font-bold text-blue-700" : ""}>
                            3. Ship
                          </span>
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                          <span className={isDelivered ? "font-bold text-emerald-700" : ""}>
                            4. Complete
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          {order.orderStatus === "CONFIRMED" && (
                            <button
                              onClick={() => handleProcessOrder(order.id)}
                              disabled={actionLoading === `process-${order.id}`}
                              className="btn-amazon-yellow py-1 px-3 text-xs font-bold rounded-sm flex items-center gap-1"
                            >
                              <Clock className="w-3 h-3" />
                              <span>Process Order</span>
                            </button>
                          )}

                          {!isShipped && !isDelivered && (
                            <button
                              onClick={() => handleOpenShippingModal(order)}
                              className="bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] py-1 px-3 text-xs font-bold rounded-sm flex items-center gap-1 transition-colors shadow-xs"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Update Shipping & Tracking</span>
                            </button>
                          )}

                          {isShipped && (
                            <button
                              onClick={() => handleOpenShippingModal(order)}
                              className="bg-[#C9A66B]/15 hover:bg-[#C9A66B]/25 active:bg-[#A67C3D] text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 py-1 px-2.5 text-xs font-medium rounded-sm flex items-center gap-1 transition-colors"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Tracking</span>
                            </button>
                          )}

                          {!isDelivered && (
                            <button
                              onClick={() => handleCompleteOrder(order.id)}
                              disabled={actionLoading === `complete-${order.id}`}
                              className="bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] py-1 px-3 text-xs font-bold rounded-sm flex items-center gap-1 transition-colors shadow-xs"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Complete & Deliver</span>
                            </button>
                          )}

                          {isDelivered && (
                            <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Order Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: INVENTORY & STOCK MANAGER                          */}
        {/* ========================================================= */}
        {activeTab === "stock" && (
          <div className="bg-white border border-gray-200 rounded-sm p-5 space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-200">
              <div>
                <h2 className="text-base font-bold text-[#0f1111]">
                  Live Mobile Inventory & Stock Management
                </h2>
                <p className="text-xs text-gray-500">
                  Instantly update stock numbers, adjust prices, or remove smartphone models from catalog.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Search phone..."
                    className="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-[#e77600]"
                  />
                </div>

                <select
                  value={stockBrandFilter}
                  onChange={(e) => setStockBrandFilter(e.target.value)}
                  className="border border-gray-300 rounded py-1.5 px-2 text-xs focus:outline-none"
                >
                  <option value="ALL">All Brands ({mobiles.length})</option>
                  {FAMOUS_BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>

                <button
                  onClick={fetchMobiles}
                  className="p-1.5 text-[#8C6226] dark:text-[#E5CBA2] bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 rounded transition-colors cursor-pointer"
                  title="Reload Products"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingMobiles ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Mobiles Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3">Specs (RAM/ROM)</th>
                    <th className="py-2 px-3">Selling Price</th>
                    <th className="py-2 px-3 text-center">In-Stock Count</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMobiles.map((m) => {
                    const isLowStock = m.stock < 10;

                    return (
                      <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 relative bg-gray-100 border border-gray-200 rounded shrink-0 overflow-hidden">
                              <Image
                                src={m.imageUrl}
                                alt={m.model}
                                fill
                                unoptimized
                                className="object-contain"
                              />
                            </div>
                            <div>
                              <span className="font-bold text-[#0f1111] block">
                                {m.brand} {m.model}
                              </span>
                              <span className="text-[11px] text-gray-500">{m.variant}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-gray-600 font-mono text-[11px]">
                          {m.ram} / {m.storage}
                        </td>

                        <td className="py-3 px-3 font-bold text-[#b12704] text-sm">
                          {formatINR(m.price)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-gray-100 p-1 rounded border border-gray-200">
                            <button
                              onClick={() => handleUpdateStock(m.id, -1)}
                              className="w-6 h-6 bg-[#C9A66B]/15 hover:bg-[#C9A66B]/25 active:bg-[#A67C3D] border border-[#C9A66B]/35 rounded font-bold text-[#8C6226] dark:text-[#E5CBA2] flex items-center justify-center cursor-pointer text-xs transition-colors"
                            >
                              -
                            </button>
                            <span
                              className={`w-10 font-bold font-mono text-center text-sm ${
                                m.stock <= 0
                                  ? "text-red-700 font-black bg-red-100 px-1 rounded"
                                  : isLowStock
                                  ? "text-red-600 font-black"
                                  : "text-[#0f1111]"
                              }`}
                            >
                              {m.stock}
                            </span>
                            <button
                              onClick={() => handleUpdateStock(m.id, 1)}
                              className="w-6 h-6 bg-[#C9A66B]/15 hover:bg-[#C9A66B]/25 active:bg-[#A67C3D] border border-[#C9A66B]/35 rounded font-bold text-[#8C6226] dark:text-[#E5CBA2] flex items-center justify-center cursor-pointer text-xs transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <div className="mt-1">
                            {m.stock <= 0 ? (
                              <button
                                onClick={() => handleSetExactStock(m.id, 25)}
                                className="px-2 py-0.5 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-[10px] font-bold rounded shadow-xs transition-colors cursor-pointer"
                                title="Click to Restock to 25 units"
                              >
                                ⚠️ OUT OF STOCK (Click to Restock)
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSetExactStock(m.id, 0)}
                                className="px-1.5 py-0.5 bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] text-[10px] rounded border border-[#C9A66B]/30 transition-colors cursor-pointer"
                                title="Click to mark this phone Currently Out of Stock"
                              >
                                Set Out of Stock (0)
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteProduct(m.id, `${m.brand} ${m.model}`)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-[#C9A66B]/15 transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ADD NEW SMARTPHONE PRODUCT                         */}
        {/* ========================================================= */}
        {activeTab === "add-product" && (
          <div className="bg-white border border-gray-200 rounded-sm p-6 max-w-4xl mx-auto shadow-2xs space-y-6">
            <div className="pb-3 border-b border-gray-200">
              <h2 className="text-lg font-bold text-[#0f1111] flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#e67a00]" />
                Add New Smartphone to Storefront
              </h2>
              <p className="text-xs text-gray-500">
                Populate accurate brand models, pricing in INR, storage variants, and realistic specifications.
              </p>
            </div>

            {productSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded text-xs flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{productSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddProductSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Famous Brand</label>
                  <select
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#e77600]"
                  >
                    {FAMOUS_BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-gray-700">Model Name</label>
                  <input
                    type="text"
                    required
                    value={newProduct.model}
                    onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })}
                    placeholder="e.g. Galaxy S25 Ultra or iPhone 16 Pro"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#e77600]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Color Variant</label>
                  <input
                    type="text"
                    value={newProduct.variant}
                    onChange={(e) => setNewProduct({ ...newProduct, variant: e.target.value })}
                    placeholder="e.g. Natural Titanium"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">RAM</label>
                  <input
                    type="text"
                    value={newProduct.ram}
                    onChange={(e) => setNewProduct({ ...newProduct, ram: e.target.value })}
                    placeholder="e.g. 12GB"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Storage</label>
                  <input
                    type="text"
                    value={newProduct.storage}
                    onChange={(e) => setNewProduct({ ...newProduct, storage: e.target.value })}
                    placeholder="e.g. 256GB"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Initial Stock</label>
                  <input
                    type="number"
                    min={1}
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono font-bold text-[#b12704]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">MRP / Original Price (₹)</label>
                  <input
                    type="number"
                    min={1000}
                    value={newProduct.originalPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, originalPrice: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Product Image URL or Path</label>
                <input
                  type="text"
                  value={newProduct.imageUrl}
                  onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                  placeholder="/phones/apple-iphone-16.jpg"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Processor</label>
                  <input
                    type="text"
                    value={newProduct.processor}
                    onChange={(e) => setNewProduct({ ...newProduct, processor: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Display</label>
                  <input
                    type="text"
                    value={newProduct.displaySize}
                    onChange={(e) => setNewProduct({ ...newProduct, displaySize: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Camera Specs</label>
                  <input
                    type="text"
                    value={newProduct.camera}
                    onChange={(e) => setNewProduct({ ...newProduct, camera: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Battery & Charging</label>
                  <input
                    type="text"
                    value={newProduct.battery}
                    onChange={(e) => setNewProduct({ ...newProduct, battery: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Operating System</label>
                  <input
                    type="text"
                    value={newProduct.operatingSystem}
                    onChange={(e) => setNewProduct({ ...newProduct, operatingSystem: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Product Description</label>
                <textarea
                  rows={3}
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={addingProduct}
                className="btn-amazon-yellow py-2.5 px-6 text-sm font-bold rounded flex items-center gap-2"
              >
                {addingProduct ? "Adding to Store..." : "Publish Smartphone to Store"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: UPDATE SHIPPING & COURIER TRACKING                 */}
      {/* ========================================================= */}
      {shippingModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-200">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <h3 className="font-bold text-sm text-[#0f1111] flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Update Shipping: Order #{shippingModalOrder.orderNumber}</span>
              </h3>
              <button
                onClick={() => setShippingModalOrder(null)}
                className="text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitShipping} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Courier / Shipping Carrier</label>
                <select
                  value={shippingData.shippingCarrier}
                  onChange={(e) => setShippingData({ ...shippingData, shippingCarrier: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="BlueDart Express">BlueDart Express Air</option>
                  <option value="Delhivery 5G Logistics">Delhivery 5G Logistics</option>
                  <option value="Amazon Prime Logistics">Amazon Prime Logistics</option>
                  <option value="DTDC Premium Air">DTDC Premium Air</option>
                  <option value="Shadowfax Fast">Shadowfax Fast</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Tracking Number / AWB</label>
                <input
                  type="text"
                  required
                  value={shippingData.trackingNumber}
                  onChange={(e) => setShippingData({ ...shippingData, trackingNumber: e.target.value })}
                  placeholder="e.g. BD-89234812"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Estimated Delivery Date</label>
                <input
                  type="date"
                  value={shippingData.estimatedDelivery}
                  onChange={(e) => setShippingData({ ...shippingData, estimatedDelivery: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>

              <p className="text-[11px] text-gray-500 bg-amber-50 p-2.5 rounded border border-amber-200">
                ⚡ Saving will update order status to <strong>SHIPPED</strong> and automatically dispatch an email tracking update to the buyer.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShippingModalOrder(null)}
                  className="px-4 py-2 border border-[#C9A66B]/30 bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 rounded text-xs font-bold text-[#8C6226] dark:text-[#E5CBA2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === `ship-${shippingModalOrder.id}`}
                  className="px-5 py-2 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] rounded text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                >
                  {actionLoading ? "Dispatching..." : "Confirm Shipment & Notify Buyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ALTER / EDIT ORDER DETAILS                         */}
      {/* ========================================================= */}
      {alterModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <h3 className="font-bold text-sm text-[#0f1111] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Alter Customer & Order Details: #{alterModalOrder.orderNumber}</span>
              </h3>
              <button
                onClick={() => setAlterModalOrder(null)}
                className="text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAlterOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Buyer Full Name</label>
                  <input
                    type="text"
                    required
                    value={alterFormData.customerName}
                    onChange={(e) => setAlterFormData({ ...alterFormData, customerName: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Buyer Phone</label>
                  <input
                    type="tel"
                    required
                    value={alterFormData.customerPhone}
                    onChange={(e) => setAlterFormData({ ...alterFormData, customerPhone: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Buyer Email</label>
                <input
                  type="email"
                  value={alterFormData.customerEmail}
                  onChange={(e) => setAlterFormData({ ...alterFormData, customerEmail: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Delivery Street Address</label>
                <textarea
                  rows={2}
                  required
                  value={alterFormData.address}
                  onChange={(e) => setAlterFormData({ ...alterFormData, address: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">City</label>
                  <input
                    type="text"
                    required
                    value={alterFormData.city}
                    onChange={(e) => setAlterFormData({ ...alterFormData, city: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">State</label>
                  <input
                    type="text"
                    required
                    value={alterFormData.state}
                    onChange={(e) => setAlterFormData({ ...alterFormData, state: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Pincode</label>
                  <input
                    type="text"
                    required
                    value={alterFormData.pincode}
                    onChange={(e) => setAlterFormData({ ...alterFormData, pincode: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Total Amount (₹)</label>
                  <input
                    type="number"
                    value={alterFormData.totalAmount}
                    onChange={(e) => setAlterFormData({ ...alterFormData, totalAmount: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm font-bold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Payment Status</label>
                  <select
                    value={alterFormData.paymentStatus}
                    onChange={(e) => setAlterFormData({ ...alterFormData, paymentStatus: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                  >
                    <option value="PAID">PAID</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REFUNDED">REFUNDED</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Order Status</label>
                  <select
                    value={alterFormData.orderStatus}
                    onChange={(e) => setAlterFormData({ ...alterFormData, orderStatus: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm font-bold"
                  >
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="SHIPPED">SHIPPED</option>
                    <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setAlterModalOrder(null)}
                  className="px-4 py-2 border border-[#C9A66B]/30 bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 rounded text-xs font-bold text-[#8C6226] dark:text-[#E5CBA2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === `alter-${alterModalOrder.id}`}
                  className="px-5 py-2 btn-amazon-yellow text-xs font-bold rounded cursor-pointer"
                >
                  {actionLoading ? "Saving Changes..." : "Save Alterations"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
