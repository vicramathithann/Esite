export interface ProductColor {
  name: string;
  hex: string;
}

export interface StorageOption {
  size: string;
  price: number;
}

export interface MobileData {
  id: string;
  brand: string;
  model: string;
  variant: string;
  ram: string;
  storage: string;
  price: number;
  imageUrl: string;
  displaySize: string;
  processor: string;
  camera: string;
  battery: string;
  operatingSystem: string;
  description: string;
  stock: number;
  rating?: number;
  reviewCount?: number;
  originalPrice?: number | null;
  createdAt?: string | Date;
}

export interface MobileProductData {
  id: string;
  name: string;
  brand: string;
  series: string;
  tagline: string;
  basePrice: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  galleryImages: string[];
  colors: ProductColor[];
  storageOptions: StorageOption[];
  ram: string;
  display: string;
  processor: string;
  camera: string;
  battery: string;
  os: string;
  network5G: string;
  warrantyMonths: number;
  inStock: boolean;
  stock?: number;
  isFeatured: boolean;
  highlightFeatures: string[];
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  brand: string;
  imageUrl: string;
  selectedColor: ProductColor;
  selectedStorage: StorageOption;
  price: number;
  quantity: number;
  warrantyMonths: number;
  inStock?: boolean;
  stock?: number;
}

export interface OrderItemData {
  id: string;
  productId: string;
  productName: string;
  productBrand: string;
  productImageUrl: string;
  selectedColor: string;
  selectedStorage: string;
  price: number;
  quantity: number;
  imeiNumber: string;
  warrantyMonths: number;
  warrantyStartDate: string;
  warrantyExpiryDate: string;
  warrantyStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";
}

export interface OrderData {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  phoneVerified?: boolean;
  customerEmail: string;
  address: string;
  city: string;
  pincode: string;
  state: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  items: OrderItemData[];
}

export interface SmsAlertData {
  id: string;
  orderId?: string | null;
  customerPhone: string;
  alertType: "PURCHASE_CONFIRMATION" | "OTP_VERIFICATION" | "EXPIRY_WARNING_7D" | "EXPIRY_ALERT_24H" | "EXPIRED_NOTICE" | "CUSTOM_ALERT";
  title: string;
  messageBody: string;
  isRead: boolean;
  sentAt: string;
}