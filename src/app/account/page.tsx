"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Lock,
  Camera,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Package,
  Heart,
  Calendar,
  ArrowRight,
  X,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Check,
} from "lucide-react";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import { useApp } from "@/context/AppContext";
import AccountLayout from "@/components/AccountLayout";

interface DeliveryAddress {
  id: string;
  label: "Home" | "Work" | "Other";
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export default function AccountPage() {
  const { currentUser, login, wishlistCount } = useApp();

  // Avatar states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Crop & Preview Modal States
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [cropShape, setCropShape] = useState<"circle" | "square">("circle");
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Personal Information Inline Edit States
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoName, setInfoName] = useState("");
  const [infoEmail, setInfoEmail] = useState("");
  const [infoPhone, setInfoPhone] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoSuccess, setInfoSuccess] = useState<string | null>(null);

  // Delivery Addresses States
  const [addresses, setAddresses] = useState<DeliveryAddress[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const savedUserStr = localStorage.getItem("novamobile_user");
      const uId = savedUserStr ? JSON.parse(savedUserStr)?.id : null;
      if (uId) {
        const saved = localStorage.getItem(`vn_user_addresses_${uId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return [];
  });
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrLabel, setAddrLabel] = useState<"Home" | "Work" | "Other">("Home");
  const [addrName, setAddrName] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrPincode, setAddrPincode] = useState("");
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);
  const [addrSuccess, setAddrSuccess] = useState<string | null>(null);

  // Security (Change Password) States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Account Summary Metrics
  const [totalOrdersCount, setTotalOrdersCount] = useState<number>(0);
  const [activeWarrantiesCount, setActiveWarrantiesCount] = useState<number>(0);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(true);

  // Self-Service Account Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Computed displayed addresses list (derives default from currentUser if list is empty)
  const displayedAddresses: DeliveryAddress[] =
    addresses.length > 0
      ? addresses
      : currentUser?.address
      ? [
          {
            id: "addr-default-1",
            label: "Home",
            recipientName: currentUser.name || "Customer",
            phone: currentUser.phone || "",
            street: currentUser.address,
            city: "Bengaluru",
            state: "Karnataka",
            pincode: "560001",
            isDefault: true,
          },
        ]
      : [];

  const handleToggleEditInfo = () => {
    if (!isEditingInfo && currentUser) {
      setInfoName(currentUser.name || "");
      setInfoEmail(currentUser.email || "");
      setInfoPhone(currentUser.phone || "");
      setInfoError(null);
      setInfoSuccess(null);
    }
    setIsEditingInfo((prev) => !prev);
  };

  // Persist addresses
  const persistAddresses = useCallback(
    (nextList: DeliveryAddress[]) => {
      setAddresses(nextList);
      if (currentUser?.id) {
        localStorage.setItem(`vn_user_addresses_${currentUser.id}`, JSON.stringify(nextList));
      }
    },
    [currentUser]
  );

  // Load Account Summary Data (Orders count, Warranties count)
  useEffect(() => {
    let isMounted = true;
    async function fetchSummary() {
      if (!currentUser?.id) {
        setMetricsLoading(false);
        return;
      }
      try {
        setMetricsLoading(true);
        const params = new URLSearchParams();
        if (currentUser.id) params.set("userId", currentUser.id);
        if (currentUser.email) params.set("email", currentUser.email);

        const res = await fetch(`/api/orders?${params.toString()}`, { credentials: "include" });
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.orders)) {
          setTotalOrdersCount(data.orders.length);
          let activeWar = 0;
          for (const ord of data.orders) {
            if (ord.orderStatus !== "CANCELLED" && Array.isArray(ord.items)) {
              for (const it of ord.items) {
                if (it.warrantyStatus === "ACTIVE") activeWar++;
              }
            }
          }
          setActiveWarrantiesCount(activeWar);
        }
      } catch (err) {
        console.warn("Summary metrics fetch error:", err);
      } finally {
        if (isMounted) setMetricsLoading(false);
      }
    }
    fetchSummary();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, currentUser?.email]);

  // Handle Photo Picker Selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    setAvatarSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected if cancelled
    e.target.value = "";

    // 1. Validate file size (max 2 MB)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image file exceeds 2 MB limit. Please choose a smaller photo.");
      return;
    }

    // 2. Validate MIME type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setAvatarError("Please select a valid image file (JPG, PNG, or WEBP).");
      return;
    }

    // Read image for preview & crop
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setRawImageSrc(result);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setCropModalOpen(true);
    };
    reader.onerror = () => {
      setAvatarError("Failed to read image file. Please try another photo.");
    };
    reader.readAsDataURL(file);
  };

  // Crop & Save to Server
  const handleSaveCroppedPhoto = async () => {
    if (!rawImageSrc || !imageElementRef.current) return;

    try {
      setAvatarUploading(true);
      setAvatarError(null);

      // Create high-res canvas (400x400)
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize canvas context");

      const img = imageElementRef.current;
      const naturalWidth = img.naturalWidth || 400;
      const naturalHeight = img.naturalHeight || 400;

      // Base scale to cover 400x400
      const baseScale = Math.max(400 / naturalWidth, 400 / naturalHeight);
      const currentScale = baseScale * zoom;

      const drawWidth = naturalWidth * currentScale;
      const drawHeight = naturalHeight * currentScale;

      // Center with pan offset
      const drawX = (400 - drawWidth) / 2 + pan.x;
      const drawY = (400 - drawHeight) / 2 + pan.y;

      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // Convert canvas to Blob
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
      );

      if (!blob) throw new Error("Canvas export failed");

      // Send to authenticated API
      const formData = new FormData();
      formData.append("file", blob, "profile.jpg");

      const res = await fetch("/api/auth/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.avatar) {
        if (currentUser) {
          login({ ...currentUser, avatar: data.avatar });
        }
        setAvatarSuccess("Profile picture updated successfully!");
        setCropModalOpen(false);
        setRawImageSrc(null);
        setTimeout(() => setAvatarSuccess(null), 4000);
      } else {
        setAvatarError(data.error || "Failed to upload profile picture.");
      }
    } catch (err) {
      console.error("Avatar save error:", err);
      setAvatarError("An error occurred while uploading. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  };

  // Remove Photo
  const handleRemovePhoto = async () => {
    if (!currentUser?.avatar) return;
    if (!confirm("Are you sure you want to remove your profile photo?")) return;

    try {
      setAvatarUploading(true);
      setAvatarError(null);
      const res = await fetch("/api/auth/profile/avatar", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        login({ ...currentUser, avatar: undefined });
        setAvatarSuccess("Profile photo removed.");
        setTimeout(() => setAvatarSuccess(null), 3000);
      } else {
        setAvatarError(data.error || "Failed to remove photo.");
      }
    } catch (err) {
      console.error(err);
      setAvatarError("Failed to remove photo. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  };

  // Drag Handlers for Crop Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Save Personal Information
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setInfoError(null);
    setInfoSuccess(null);

    const cleanName = infoName.trim();
    const cleanEmail = infoEmail.trim().toLowerCase();
    const cleanPhone = infoPhone.trim().replace(/[^0-9]/g, "");

    if (!cleanName || cleanName.length < 2) {
      setInfoError("Please enter a valid full name (at least 2 characters).");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setInfoError("Please enter a valid email address.");
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      setInfoError("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setInfoSaving(true);
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          address: currentUser.address || "",
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        login(data.user);
        setInfoSuccess("Personal information updated successfully!");
        setIsEditingInfo(false);
        setTimeout(() => setInfoSuccess(null), 3500);
      } else {
        setInfoError(data.error || "Failed to update profile.");
      }
    } catch {
      setInfoError("Network error. Please try again.");
    } finally {
      setInfoSaving(false);
    }
  };

  // Address Modal Helpers
  const openAddAddressModal = () => {
    setEditingAddressId(null);
    setAddrLabel("Home");
    setAddrName(currentUser?.name || "");
    setAddrPhone(currentUser?.phone || "");
    setAddrStreet("");
    setAddrCity("");
    setAddrState("");
    setAddrPincode("");
    setAddrIsDefault(addresses.length === 0);
    setAddrError(null);
    setIsAddressModalOpen(true);
  };

  const openEditAddressModal = (addr: DeliveryAddress) => {
    setEditingAddressId(addr.id);
    setAddrLabel(addr.label);
    setAddrName(addr.recipientName);
    setAddrPhone(addr.phone);
    setAddrStreet(addr.street);
    setAddrCity(addr.city);
    setAddrState(addr.state);
    setAddrPincode(addr.pincode);
    setAddrIsDefault(addr.isDefault);
    setAddrError(null);
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrError(null);

    const cleanStreet = addrStreet.trim();
    const cleanCity = addrCity.trim();
    const cleanState = addrState.trim();
    const cleanPincode = addrPincode.trim().replace(/[^0-9]/g, "");
    const cleanName = addrName.trim();
    const cleanPhone = addrPhone.trim();

    if (!cleanStreet || cleanStreet.length < 5) {
      setAddrError("Please enter a complete street address.");
      return;
    }
    if (!cleanCity) {
      setAddrError("Please enter your city.");
      return;
    }
    if (!cleanState) {
      setAddrError("Please enter your state.");
      return;
    }
    if (!cleanPincode || cleanPincode.length !== 6) {
      setAddrError("Please enter a valid 6-digit postal PIN code.");
      return;
    }

    const fullFormattedAddress = `${cleanStreet}, ${cleanCity}, ${cleanState} - ${cleanPincode}`;

    let updatedList: DeliveryAddress[];
    if (editingAddressId) {
      // Edit existing
      updatedList = addresses.map((a) => {
        if (a.id === editingAddressId) {
          return {
            ...a,
            label: addrLabel,
            recipientName: cleanName || (currentUser?.name || "Customer"),
            phone: cleanPhone || (currentUser?.phone || ""),
            street: cleanStreet,
            city: cleanCity,
            state: cleanState,
            pincode: cleanPincode,
            isDefault: addrIsDefault,
          };
        }
        return addrIsDefault ? { ...a, isDefault: false } : a;
      });
    } else {
      // Add new
      const newAddr: DeliveryAddress = {
        id: `addr-${Date.now()}`,
        label: addrLabel,
        recipientName: cleanName || (currentUser?.name || "Customer"),
        phone: cleanPhone || (currentUser?.phone || ""),
        street: cleanStreet,
        city: cleanCity,
        state: cleanState,
        pincode: cleanPincode,
        isDefault: addrIsDefault || addresses.length === 0,
      };

      updatedList = addrIsDefault
        ? [...addresses.map((a) => ({ ...a, isDefault: false })), newAddr]
        : [...addresses, newAddr];
    }

    persistAddresses(updatedList);

    // If default, sync to user profile in backend database
    if (addrIsDefault || addresses.length === 0) {
      try {
        if (currentUser) {
          const res = await fetch("/api/auth/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              phone: currentUser.phone,
              address: fullFormattedAddress,
            }),
          });
          const data = await res.json();
          if (data.success && data.user) {
            login(data.user);
          }
        }
      } catch (err) {
        console.warn("Failed to sync default address to backend profile:", err);
      }
    }

    setAddrSuccess(editingAddressId ? "Address updated successfully!" : "Address added successfully!");
    setIsAddressModalOpen(false);
    setTimeout(() => setAddrSuccess(null), 3000);
  };

  const handleSetDefaultAddress = async (id: string) => {
    const target = addresses.find((a) => a.id === id);
    if (!target) return;

    const nextList = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    persistAddresses(nextList);

    const fullFormatted = `${target.street}, ${target.city}, ${target.state} - ${target.pincode}`;
    if (currentUser) {
      try {
        const res = await fetch("/api/auth/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone,
            address: fullFormatted,
          }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          login(data.user);
        }
      } catch (err) {
        console.warn("Error setting default address:", err);
      }
    }
  };

  const handleDeleteAddress = (id: string) => {
    if (!confirm("Are you sure you want to delete this delivery address?")) return;
    const target = addresses.find((a) => a.id === id);
    const remaining = addresses.filter((a) => a.id !== id);

    // If we deleted the default and there are remaining, promote first one
    if (target?.isDefault && remaining.length > 0) {
      remaining[0].isDefault = true;
      handleSetDefaultAddress(remaining[0].id);
    }
    persistAddresses(remaining);
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setPasswordUpdating(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPasswordSuccess("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(null), 4000);
      } else {
        setPasswordError(data.error || "Failed to update password.");
      }
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setPasswordUpdating(false);
    }
  };

  return (
    <AccountLayout>
      <div className="space-y-6">
        {/* Hidden File Picker for Avatar Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoSelect}
          className="hidden"
          aria-hidden="true"
        />

        {/* Global Feedback Banners */}
        {avatarSuccess && (
          <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-2xl flex items-center gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{avatarSuccess}</span>
          </div>
        )}
        {avatarError && (
          <div className="p-3.5 bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold rounded-2xl flex items-center justify-between gap-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{avatarError}</span>
            </div>
            <button
              onClick={() => setAvatarError(null)}
              className="p-1 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 1. Dark Profile Header Card */}
        {currentUser ? (
          <div className="bg-gradient-to-r from-[#0B1220] via-[#121B2E] to-[#0B1220] border border-[#1F2A44] rounded-2xl p-6 sm:p-7 text-white shadow-md transition-all duration-200">
            {/* Avatar with Camera Overlay + User Details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Large Avatar with Upload Action */}
              <div className="relative group shrink-0">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name || "Customer"}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-[#C9A66B] dark:border-[#D4B483] shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#C9A66B] to-[#E2C799] text-[#0B1220] flex items-center justify-center text-3xl sm:text-4xl font-extrabold shadow-md">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}

                {/* Camera Overlay Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] flex items-center justify-center shadow-md border-2 border-[#121B2E] transition-transform duration-200 hover:scale-110 cursor-pointer disabled:opacity-50"
                  title="Upload profile picture (JPG, PNG, WEBP, max 2 MB)"
                  aria-label="Upload profile picture"
                >
                  {avatarUploading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* User Details: Name, Administrator Badge (if admin), Email, Phone, Address */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {currentUser.name}
                  </h1>
                  {currentUser.role === "ADMIN" && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      👑 Administrator
                    </span>
                  )}
                  {currentUser.avatar && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-[11px] text-slate-400 hover:text-red-400 underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      Remove photo
                    </button>
                  )}
                </div>

                <div className="text-xs sm:text-sm text-slate-300 space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#C9A66B] dark:text-[#D4B483] shrink-0" />
                    <span className="truncate">{currentUser.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#C9A66B] dark:text-[#D4B483] shrink-0" />
                    <span>{currentUser.phone || "No phone added"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#C9A66B] dark:text-[#D4B483] shrink-0 mt-0.5" />
                    {currentUser.address ? (
                      <span className="max-w-md line-clamp-1 text-slate-300" title={currentUser.address}>
                        {currentUser.address}
                      </span>
                    ) : (
                      <button
                        onClick={openAddAddressModal}
                        className="text-[#C9A66B] hover:underline cursor-pointer"
                      >
                        + Add Delivery Address
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Guest Banner */
          <div className="bg-card p-6 rounded-2xl border border-border flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-tile border border-border flex items-center justify-center text-muted shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-base text-foreground">You are browsing as Guest</h2>
                <p className="text-xs text-muted">Sign in to manage your personal info, delivery addresses, and account security.</p>
              </div>
            </div>
            <Link
              href="/login?redirect=/account"
              className="px-5 py-2.5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              Sign In to Your Account
            </Link>
          </div>
        )}

        {/* 2. Clean 2-Column Grid of Account Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Personal Information */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C9A66B]/15 dark:bg-[#D4B483]/15 text-[#8C6226] dark:text-[#E5CBA2] flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-foreground">Personal Information</h2>
                    <p className="text-[11px] text-muted">Your registered identity and primary contact details</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleEditInfo}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-[#8C6226] dark:text-[#E5CBA2] hover:bg-tile transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{isEditingInfo ? "Cancel" : "Edit"}</span>
                </button>
              </div>

              {infoSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{infoSuccess}</span>
                </div>
              )}
              {infoError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{infoError}</span>
                </div>
              )}

              {isEditingInfo ? (
                /* Inline Edit Form */
                <form onSubmit={handleSavePersonalInfo} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={infoName}
                      onChange={(e) => setInfoName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-tile border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={infoEmail}
                      onChange={(e) => setInfoEmail(e.target.value)}
                      disabled={currentUser?.role === "ADMIN" && (currentUser?.email || "").toLowerCase() === "rrroyce20@gmail.com"}
                      className="w-full px-3.5 py-2 bg-tile border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/30 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={15}
                      value={infoPhone}
                      onChange={(e) => setInfoPhone(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full px-3.5 py-2 bg-tile border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/30 font-mono"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingInfo(false)}
                      disabled={infoSaving}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-tile text-foreground cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={infoSaving}
                      className="px-4 py-1.5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] text-[#FFFCFA] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {infoSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      <span>Save Info</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Read-Only Overview */
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-tile border border-border/70 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-muted uppercase font-semibold">Full Name</div>
                      <div className="font-bold text-foreground text-sm mt-0.5">{currentUser?.name || "—"}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-tile border border-border/70 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-muted uppercase font-semibold">Email Address</div>
                      <div className="font-bold text-foreground text-sm mt-0.5">{currentUser?.email || "—"}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                      Verified
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-tile border border-border/70 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-muted uppercase font-semibold">Mobile Phone</div>
                      <div className="font-bold text-foreground text-sm mt-0.5 font-mono">{currentUser?.phone || "—"}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-tile text-muted font-semibold border border-border">
                      PAN-India OTP
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Delivery Addresses */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C9A66B]/15 dark:bg-[#D4B483]/15 text-[#8C6226] dark:text-[#E5CBA2] flex items-center justify-center font-bold">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-foreground">Delivery Addresses</h2>
                    <p className="text-[11px] text-muted">Addresses saved for fast 1-click mobile checkout</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openAddAddressModal}
                  className="px-3.5 py-1.5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] text-[#FFFCFA] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Address</span>
                </button>
              </div>

              {addrSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{addrSuccess}</span>
                </div>
              )}

              {/* Address List */}
              {displayedAddresses.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-border rounded-2xl space-y-2.5">
                  <MapPin className="w-8 h-8 mx-auto text-muted opacity-40" />
                  <p className="text-xs text-muted">No delivery address saved yet.</p>
                  <button
                    onClick={openAddAddressModal}
                    className="px-3.5 py-1.5 bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Add Your First Address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        addr.isDefault
                          ? "border-[#C9A66B] dark:border-[#D4B483] bg-[#C9A66B]/5 dark:bg-[#D4B483]/5"
                          : "border-border bg-tile/40 hover:border-border/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA]">
                              {addr.label.toUpperCase()}
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              {addr.recipientName}
                            </span>
                            {addr.isDefault && (
                              <span className="text-[10px] font-bold text-[#8C6226] dark:text-[#E5CBA2] bg-[#C9A66B]/15 px-2 py-0.5 rounded-full border border-[#C9A66B]/30">
                                Default Delivery Address
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-foreground leading-relaxed">
                            {addr.street}, {addr.city}, {addr.state} - <span className="font-mono">{addr.pincode}</span>
                          </p>
                          <p className="text-[11px] text-muted">Phone: <span className="font-mono">{addr.phone}</span></p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="text-[11px] font-semibold text-[#8C6226] dark:text-[#E5CBA2] hover:underline cursor-pointer px-1.5 py-1"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditAddressModal(addr)}
                            className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-tile transition-colors cursor-pointer"
                            title="Edit Address"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1.5 text-muted hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete Address"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Security */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C9A66B]/15 dark:bg-[#D4B483]/15 text-[#8C6226] dark:text-[#E5CBA2] flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-foreground">Account Security</h2>
                    <p className="text-[11px] text-muted">Update password & account credentials</p>
                  </div>
                </div>
              </div>

              {passwordSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}
              {passwordError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3.5 pr-10 py-2 bg-tile border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 chars"
                        className="w-full px-3.5 pr-10 py-2 bg-tile border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-3.5 pr-10 py-2 bg-tile border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted">Requires at least 6 characters</span>
                  <button
                    type="submit"
                    disabled={passwordUpdating}
                    className="px-4 py-2 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] text-[#FFFCFA] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {passwordUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Account Deletion Callout at Bottom of Security Card */}
            <div className="pt-4 mt-6 border-t border-border flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-foreground">Need to delete your account?</div>
                <div className="text-[11px] text-muted">Permanently erase your orders, warranties & personal data</div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>

          {/* Card 4: Account Summary */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C9A66B]/15 dark:bg-[#D4B483]/15 text-[#8C6226] dark:text-[#E5CBA2] flex items-center justify-center font-bold">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-foreground">Account Summary</h2>
                    <p className="text-[11px] text-muted">Overview of your VN Mobiles customer activity</p>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Metric 1: Member Since */}
                <div className="p-4 rounded-xl bg-tile border border-border/70 space-y-1">
                  <div className="text-[11px] font-semibold text-muted flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#C9A66B]" />
                    <span>Member Since</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-foreground">
                    {currentUser?.createdAt
                      ? new Date(currentUser.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })
                      : "2026"}
                  </div>
                  <p className="text-[10px] text-muted">Authenticated buyer</p>
                </div>

                {/* Metric 2: Total Orders */}
                <Link
                  href="/orders"
                  className="p-4 rounded-xl bg-tile border border-border/70 space-y-1 hover:border-[#C9A66B] transition-colors group block"
                >
                  <div className="text-[11px] font-semibold text-muted flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-[#C9A66B]" />
                      <span>Total Orders</span>
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="text-base sm:text-lg font-bold text-foreground">
                    {metricsLoading ? "—" : totalOrdersCount}
                  </div>
                  <p className="text-[10px] text-[#8C6226] dark:text-[#E5CBA2] font-semibold group-hover:underline">
                    View order history →
                  </p>
                </Link>

                {/* Metric 3: Active Warranties */}
                <Link
                  href="/account/warranties"
                  className="p-4 rounded-xl bg-tile border border-border/70 space-y-1 hover:border-[#C9A66B] transition-colors group block"
                >
                  <div className="text-[11px] font-semibold text-muted flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Active Shields</span>
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="text-base sm:text-lg font-bold text-foreground">
                    {metricsLoading ? "—" : activeWarrantiesCount}
                  </div>
                  <p className="text-[10px] text-[#8C6226] dark:text-[#E5CBA2] font-semibold group-hover:underline">
                    Manage warranties →
                  </p>
                </Link>

                {/* Metric 4: Wishlist Items */}
                <Link
                  href="/account/wishlist"
                  className="p-4 rounded-xl bg-tile border border-border/70 space-y-1 hover:border-[#C9A66B] transition-colors group block"
                >
                  <div className="text-[11px] font-semibold text-muted flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-red-500" />
                      <span>Wishlist</span>
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="text-base sm:text-lg font-bold text-foreground">
                    {wishlistCount}
                  </div>
                  <p className="text-[10px] text-[#8C6226] dark:text-[#E5CBA2] font-semibold group-hover:underline">
                    View saved phones →
                  </p>
                </Link>
              </div>
            </div>

            {/* Quick Links Footer */}
            <div className="pt-4 mt-6 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted">Need help with an order?</span>
              <Link href="/orders" className="font-semibold text-[#8C6226] dark:text-[#E5CBA2] hover:underline">
                Go to Orders & Tracking
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Crop & Preview Modal */}
      {cropModalOpen && rawImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#C9A66B]" />
                <h3 className="font-bold text-sm text-foreground">Crop Profile Picture</h3>
              </div>
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-tile transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Crop Viewport */}
            <div className="p-5 flex flex-col items-center">
              <p className="text-xs text-muted mb-3 text-center">
                Drag to reposition or adjust zoom to fit your profile avatar.
              </p>

              <div
                className="relative w-64 h-64 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center cursor-move border border-border select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  ref={imageElementRef}
                  src={rawImageSrc}
                  alt="Crop preview"
                  draggable={false}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                    maxWidth: "none",
                    transition: isDragging ? "none" : "transform 0.1s ease-out",
                  }}
                  className="pointer-events-none"
                />

                {/* Mask Overlay */}
                <div
                  className={`pointer-events-none absolute inset-0 border-4 border-[#C9A66B] ${
                    cropShape === "circle" ? "rounded-full" : "rounded-2xl"
                  } shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]`}
                />
              </div>

              {/* Controls: Zoom slider & Shape selector */}
              <div className="w-full mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-muted shrink-0" />
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-[#C9A66B] cursor-pointer"
                  />
                  <ZoomIn className="w-4 h-4 text-muted shrink-0" />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Crop Shape:</span>
                  <div className="flex items-center gap-1.5 bg-tile p-1 rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setCropShape("circle")}
                      className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                        cropShape === "circle"
                          ? "bg-[#C9A66B] text-[#FFFCFA]"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      Circle
                    </button>
                    <button
                      type="button"
                      onClick={() => setCropShape("square")}
                      className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                        cropShape === "square"
                          ? "bg-[#C9A66B] text-[#FFFCFA]"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      Square
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-tile border-t border-border flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                disabled={avatarUploading}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-tile text-foreground cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCroppedPhoto}
                disabled={avatarUploading}
                className="px-5 py-2 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {avatarUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Photo...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Photo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Add / Edit Delivery Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C9A66B]" />
                <h3 className="font-bold text-sm text-foreground">
                  {editingAddressId ? "Edit Delivery Address" : "Add New Delivery Address"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-tile transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="p-5 space-y-3.5 text-xs">
              {addrError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addrError}</span>
                </div>
              )}

              {/* Label Selector: Home, Work, Other */}
              <div>
                <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Address Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Home", "Work", "Other"] as const).map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddrLabel(lbl)}
                      className={`py-2 text-xs font-semibold rounded-xl border text-center transition-colors cursor-pointer ${
                        addrLabel === lbl
                          ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] border-transparent font-bold shadow-xs"
                          : "border-border text-foreground hover:bg-tile"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    required
                    value={addrName}
                    onChange={(e) => setAddrName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3.5 py-2 bg-tile border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-2 bg-tile border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/30 font-mono"
                  />
                </div>
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                  Street Address / Flat / Building <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  placeholder="House/Flat No., Apartment, Street, Landmark"
                  className="w-full px-3.5 py-2 bg-tile border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/30 resize-none"
                />
              </div>

              {/* City, State, PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3 py-2 bg-tile border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    placeholder="e.g. Karnataka"
                    className="w-full px-3 py-2 bg-tile border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={addrPincode}
                    onChange={(e) => setAddrPincode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="6 digits"
                    className="w-full px-3 py-2 bg-tile border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#C9A66B]/30 font-mono"
                  />
                </div>
              </div>

              {/* Default Checkbox */}
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={addrIsDefault}
                  onChange={(e) => setAddrIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C9A66B] accent-[#C9A66B] cursor-pointer"
                />
                <span className="text-xs font-medium text-foreground">Make this my default delivery address</span>
              </label>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-tile text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingAddressId ? "Save Changes" : "Add Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Self-Service Account Deletion Modal */}
      {currentUser && (
        <DeleteAccountModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          currentUser={currentUser}
        />
      )}
    </AccountLayout>
  );
}
