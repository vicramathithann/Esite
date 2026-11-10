export interface ProductColor {
  name: string;
  hex: string;
}

export interface StorageOption {
  size: string;
  price: number;
}

export interface ProductImageData {
  url: string;
  alt?: string;
  isPrimary: boolean;
  order: number;
  colorKey?: string;
}

export interface ProductVariantData {
  id: string;
  productId?: string;
  ram: string;
  storage: string;
  basePrice: number;
  originalPrice?: number;
  stock: number;
  inStock: boolean;
  sku?: string;
  isDefault: boolean;
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
  images?: ProductImageData[];
  colors: ProductColor[];
  storageOptions: StorageOption[];
  variants?: ProductVariantData[];
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
  variantId?: string;
  name: string;
  brand: string;
  imageUrl: string;
  selectedColor: ProductColor;
  selectedStorage: StorageOption;
  selectedRam?: string;
  price: number;
  quantity: number;
  warrantyMonths: number;
  inStock?: boolean;
  stock?: number;
}
