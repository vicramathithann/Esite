const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const NEW_PHONES_2026 = [
  // ==========================================
  // 1. FLAGSHIP PHONES (October 2026)
  // ==========================================
  {
    id: "samsung-galaxy-s26-ultra",
    brand: "Samsung",
    model: "Galaxy S26 Ultra",
    name: "Samsung Galaxy S26 Ultra",
    series: "Titanium Silver Shadow",
    tagline: "Samsung's 2026 definitive AI flagship. Snapdragon 8 Elite Gen 2, 200MP Quad Telephoto with 100x Space Zoom, built-in S-Pen, and Gorilla Armor 2.",
    price: 134999,
    originalPrice: 144999,
    rating: 4.9,
    reviewCount: 420,
    imageUrl: "/phones/samsung-galaxy-s26-ultra.svg",
    displaySize: "6.8-inch Dynamic AMOLED 2X QHD+ 1-120Hz LTPO, 3200 nits, Anti-Reflective Gorilla Armor 2",
    processor: "Qualcomm Snapdragon 8 Elite Gen 2 for Galaxy (3nm)",
    camera: "200MP OIS (F1.7) + 50MP Periscope (5x) + 50MP Telephoto (3x) + 50MP Ultra-Wide | 12MP Dual Pixel AF",
    battery: "5200 mAh, 65W Wired Fast Charging, 25W Fast Wireless, Reverse Wireless",
    operatingSystem: "One UI 8.5 based on Android 16 (7 Generations OS Upgrades)",
    description: "Samsung Galaxy S26 Ultra represents the peak of mobile engineering. Built with aerospace-grade titanium, custom Snapdragon 8 Elite Gen 2 silicon, S-Pen stylus, and a 200MP Quad-telephoto camera with Galaxy AI 2.0 generative editing.",
    stock: 45,
    inStock: true,
    isFeatured: true,
    ram: "12GB / 16GB",
    storage: "256GB / 512GB / 1TB",
    badge: "GALAXY AI 200MP QUAD",
    accentColor: "#8e9094",
    gradientA: "#a6a8ac",
    gradientB: "#3c3e42",
    screenGradientA: "#222428",
    screenGradientB: "#0c0d10",
    colors: [
      { name: "Titanium Silver Shadow", hex: "#8e9094" },
      { name: "Titanium Black", hex: "#2b2b2c" },
      { name: "Titanium Amber", hex: "#c89650" },
      { name: "Titanium Violet", hex: "#695a79" }
    ],
    storageOptions: [
      { size: "256GB", price: 134999 },
      { size: "512GB", price: 149999 },
      { size: "1TB", price: 169999 }
    ],
    highlightFeatures: [
      "Snapdragon 8 Elite Gen 2 (3nm) with custom NPU for on-device Galaxy AI",
      "200MP Quad Telephoto Camera setup with 100x Space Zoom and 8K 60fps video",
      "Anti-Reflective Corning Gorilla Armor 2 QHD+ 120Hz LTPO display with 3200 nits",
      "Integrated S-Pen stylus with air actions and 7 years of Android OS upgrades"
    ]
  },
  {
    id: "iphone-18-pro-max",
    brand: "Apple",
    model: "iPhone 18 Pro Max",
    name: "Apple iPhone 18 Pro Max",
    series: "Cosmic Titanium",
    tagline: "Apple's 2026 crown jewel. Powered by the A20 Pro 2nm architecture, 48MP Pro Fusion Gen 3 triple camera, 3500 nits ProMotion display, and Apple Intelligence 2.0.",
    price: 159900,
    originalPrice: 169900,
    rating: 4.9,
    reviewCount: 510,
    imageUrl: "/phones/iphone-18-pro-max.svg",
    displaySize: "6.9-inch Super Retina XDR OLED 120Hz ProMotion, 3500 nits, Under-Display Face ID",
    processor: "Apple A20 Pro (2nm) with 6-core GPU & Apple Intelligence 2.0",
    camera: "48MP Fusion Gen 3 OIS + 48MP Ultra-Wide + 48MP 5x Tetraprism Periscope Telephoto | 24MP Center Stage",
    battery: "4850 mAh, 35W MagSafe 2 & USB-C 4.0 Thunderbolt",
    operatingSystem: "iOS 20 with Apple Intelligence 2.0",
    description: "Forged in Grade 5 Cosmic Titanium with thinner borders than ever. iPhone 18 Pro Max delivers groundbreaking A20 Pro 2nm processing, 48MP triple telephoto optics, 3500 nits peak brightness, and next-generation Apple Intelligence.",
    stock: 40,
    inStock: true,
    isFeatured: true,
    ram: "12GB Unified Memory",
    storage: "256GB / 512GB / 1TB / 2TB",
    badge: "TITANIUM A20 PRO 2NM",
    accentColor: "#444954",
    gradientA: "#5e6575",
    gradientB: "#1c1e24",
    screenGradientA: "#21242c",
    screenGradientB: "#090a0d",
    colors: [
      { name: "Cosmic Titanium", hex: "#444954" },
      { name: "Desert Gold", hex: "#cfb9a5" },
      { name: "Natural Titanium", hex: "#9e9a95" },
      { name: "Space Black", hex: "#232426" }
    ],
    storageOptions: [
      { size: "256GB", price: 159900 },
      { size: "512GB", price: 179900 },
      { size: "1TB", price: 199900 },
      { size: "2TB", price: 224900 }
    ],
    highlightFeatures: [
      "Apple A20 Pro 2nm silicon with 6-core GPU and hardware-accelerated ray tracing",
      "All-48MP Pro Triple Camera with 5x Tetraprism optical zoom and 4K 120fps Dolby Vision",
      "6.9-inch 3500-nit ProMotion Display with Under-Display Face ID technology",
      "Grade 5 Titanium unibody chassis with enhanced Camera Control touch sensor"
    ]
  },
  {
    id: "iphone-18-pro",
    brand: "Apple",
    model: "iPhone 18 Pro",
    name: "Apple iPhone 18 Pro",
    series: "Natural Titanium",
    tagline: "Compact powerhouse with A20 Pro 2nm chip, all-48MP triple camera system, and ultra-bright 6.3-inch ProMotion display.",
    price: 134900,
    originalPrice: 144900,
    rating: 4.8,
    reviewCount: 390,
    imageUrl: "/phones/iphone-18-pro.svg",
    displaySize: "6.3-inch Super Retina XDR OLED 120Hz ProMotion, 3500 nits peak, Ceramic Shield 2",
    processor: "Apple A20 Pro (2nm) with 6-core GPU & Neural Engine",
    camera: "48MP Fusion Gen 3 + 48MP Ultra-Wide + 48MP 5x Periscope Telephoto | 24MP Center Stage",
    battery: "3750 mAh, 30W MagSafe & Qi2 Wireless",
    operatingSystem: "iOS 20 with Apple Intelligence 2.0",
    description: "The ideal compact flagship. Featuring the exact same A20 Pro 2nm architecture, complete 48MP triple optics with 5x optical periscope zoom, and a brilliant 6.3-inch 3500-nit display inside a lighter titanium chassis.",
    stock: 35,
    inStock: true,
    isFeatured: true,
    ram: "12GB Unified Memory",
    storage: "128GB / 256GB / 512GB / 1TB",
    badge: "PRO CAMERA SYSTEM 2NM",
    accentColor: "#9e9a95",
    gradientA: "#b8b5b0",
    gradientB: "#4a4844",
    screenGradientA: "#282624",
    screenGradientB: "#0e0d0c",
    colors: [
      { name: "Natural Titanium", hex: "#9e9a95" },
      { name: "Cosmic Titanium", hex: "#444954" },
      { name: "White Titanium", hex: "#e3e4e5" },
      { name: "Space Black", hex: "#232426" }
    ],
    storageOptions: [
      { size: "128GB", price: 134900 },
      { size: "256GB", price: 144900 },
      { size: "512GB", price: 164900 },
      { size: "1TB", price: 184900 }
    ],
    highlightFeatures: [
      "Apple A20 Pro 2nm processor with Pro hardware ray tracing",
      "Full 48MP Triple Pro Camera with 5x optical periscope zoom",
      "Compact 6.3-inch ProMotion 120Hz display with 3500 nits peak brightness",
      "Grade 5 Titanium frame with dedicated Action and Camera Control buttons"
    ]
  },
  {
    id: "vivo-x300-ultra",
    brand: "Vivo",
    model: "X300 Ultra",
    name: "Vivo X300 Ultra",
    series: "Zeiss Master Edition",
    tagline: "Professional mobile photography titan. 200MP Zeiss APO Periscope + 1-inch Sony LYT-900 sensor with Snapdragon 8 Elite and BlueOcean 6000mAh battery.",
    price: 99999,
    originalPrice: 109999,
    rating: 4.9,
    reviewCount: 280,
    imageUrl: "/phones/vivo-x300-ultra.svg",
    displaySize: "6.78-inch 2K LTPO AMOLED, 1-120Hz, 4500 nits peak, Zeiss Master Color",
    processor: "Qualcomm Snapdragon 8 Elite (3nm) + Vivo V4 Pro Imaging NPU",
    camera: "200MP Zeiss APO Periscope Telephoto (1/1.4\" OIS) + 50MP Sony LYT-900 1-inch OIS + 50MP Ultra-Wide | 50MP Eye AF",
    battery: "6000 mAh BlueOcean Silicon-Carbon, 100W FlashCharge, 50W Wireless",
    operatingSystem: "Funtouch OS 16 (Android 16)",
    description: "Engineered in partnership with Zeiss. Featuring a revolutionary 200MP APO Periscope telephoto lens paired with a 1-inch Sony LYT-900 sensor, custom Vivo V4 Pro imaging chip, and a massive 6000mAh BlueOcean silicon battery.",
    stock: 30,
    inStock: true,
    isFeatured: true,
    ram: "16GB / 24GB LPDDR5X",
    storage: "256GB / 512GB / 1TB UFS 4.1",
    badge: "ZEISS 200MP APO OPTICS",
    accentColor: "#b59e7a",
    gradientA: "#d4be99",
    gradientB: "#5c4d34",
    screenGradientA: "#28231a",
    screenGradientB: "#0e0b07",
    colors: [
      { name: "Titanium Dune", hex: "#b59e7a" },
      { name: "Eclipse Black", hex: "#1c1d1f" },
      { name: "Moonlight White", hex: "#ebebeb" }
    ],
    storageOptions: [
      { size: "256GB", price: 99999 },
      { size: "512GB", price: 109999 },
      { size: "1TB", price: 124999 }
    ],
    highlightFeatures: [
      "200MP Zeiss APO Periscope Telephoto with 100x zoom and floating lens elements",
      "Sony LYT-900 1-inch primary camera sensor with f/1.75 physical aperture",
      "Snapdragon 8 Elite flagship silicon with custom Vivo V4 Pro imaging NPU",
      "6000mAh BlueOcean Silicon-Carbon battery with 100W wired and 50W wireless flash charging"
    ]
  },
  {
    id: "oppo-find-x9-ultra",
    brand: "Oppo",
    model: "Find X9 Ultra",
    name: "OPPO Find X9 Ultra",
    series: "Hasselblad Quad Periscope",
    tagline: "World's premier Quad 50MP Hasselblad camera system with dual periscope telephotos, Snapdragon 8 Elite, and 5850mAh Glacier battery.",
    price: 94999,
    originalPrice: 104999,
    rating: 4.8,
    reviewCount: 250,
    imageUrl: "/phones/oppo-find-x9-ultra.svg",
    displaySize: "6.82-inch Quad-Curved AMOLED, 120Hz LTPO, 4500 nits, Dolby Vision",
    processor: "Qualcomm Snapdragon 8 Elite (3nm) with MariSilicon X3 NPU",
    camera: "Quad 50MP: 50MP Sony LYT-900 1-inch OIS + 50MP 3x Periscope + 50MP 6x Periscope + 50MP Ultra-Wide | 32MP RGBW",
    battery: "5850 mAh Glacier Battery, 100W SUPERVOOC, 50W AIRVOOC Wireless",
    operatingSystem: "ColorOS 16 based on Android 16",
    description: "The pinnacle of mobile zoom capability. Boasts Dual Periscope Telephoto lenses (3x and 6x optical) tuned by Hasselblad, coupled with a 1-inch LYT-900 sensor and an enormous 5850mAh Glacier silicon battery.",
    stock: 28,
    inStock: true,
    isFeatured: true,
    ram: "16GB LPDDR5X",
    storage: "512GB / 1TB UFS 4.1",
    badge: "HASSELBLAD DUAL PERISCOPE",
    accentColor: "#8b5a2b",
    gradientA: "#b07338",
    gradientB: "#4a2e12",
    screenGradientA: "#291b0c",
    screenGradientB: "#0f0802",
    colors: [
      { name: "Desert Brown Vegan Leather", hex: "#8b5a2b" },
      { name: "Ocean Blue", hex: "#2b4c7e" },
      { name: "Obsidian Black", hex: "#1f2022" }
    ],
    storageOptions: [
      { size: "512GB", price: 94999 },
      { size: "1TB", price: 109999 }
    ],
    highlightFeatures: [
      "Dual Periscope Quad 50MP Hasselblad Camera setup with 3x & 6x optical lenses",
      "1-inch Sony LYT-900 main sensor with Optical Image Stabilization",
      "5850mAh Glacier battery with 100W SUPERVOOC + 50W wireless charging",
      "6.82-inch Quad-Curved 120Hz LTPO display with 4500 nits peak brightness"
    ]
  },
  {
    id: "samsung-galaxy-z-fold-8-ultra",
    brand: "Samsung",
    model: "Galaxy Z Fold 8 Ultra",
    name: "Samsung Galaxy Z Fold 8 Ultra",
    series: "Titanium Fold Edition",
    tagline: "Ultra-slim foldable perfection. 8.0-inch creaseless inner display, 200MP pro camera, titanium frame, and Snapdragon 8 Elite for Galaxy.",
    price: 174999,
    originalPrice: 189999,
    rating: 4.9,
    reviewCount: 210,
    imageUrl: "/phones/samsung-galaxy-z-fold-8-ultra.svg",
    displaySize: "8.0-inch Dynamic AMOLED 2X 120Hz LTPO Inner (2800 nits) + 6.5-inch Outer AMOLED 120Hz",
    processor: "Qualcomm Snapdragon 8 Elite for Galaxy (3nm)",
    camera: "200MP OIS (Main) + 12MP Ultra-Wide + 50MP 5x Periscope Telephoto | 10MP Cover + 4MP UDC",
    battery: "4800 mAh Dual-cell, 45W Wired, 15W Wireless, IP48 Water/Dust",
    operatingSystem: "One UI 8.5 Fold Edition (Android 16)",
    description: "Samsung's most ambitious foldable to date. Clocking in under 9.2mm folded with a creaseless 8.0-inch main canvas, 200MP camera resolution, Armor Titanium frame, and S-Pen productivity with Galaxy AI multi-window orchestration.",
    stock: 20,
    inStock: true,
    isFeatured: true,
    ram: "16GB LPDDR5X",
    storage: "512GB / 1TB UFS 4.1",
    badge: "ULTRA SLIM 200MP FOLD",
    accentColor: "#1c2833",
    gradientA: "#2e4053",
    gradientB: "#0e151a",
    screenGradientA: "#17202a",
    screenGradientB: "#080c10",
    colors: [
      { name: "Titanium Crafted Black", hex: "#1f2124" },
      { name: "Titanium Silver", hex: "#9aa0a6" },
      { name: "Titanium Navy", hex: "#1c2833" }
    ],
    storageOptions: [
      { size: "512GB", price: 174999 },
      { size: "1TB", price: 194999 }
    ],
    highlightFeatures: [
      "Ultra-thin 8.0-inch creaseless Dynamic AMOLED 2X folding display",
      "200MP flagship camera sensor on a foldable device",
      "Armor Titanium frame with zero-gap waterdrop hinge mechanism",
      "Galaxy AI multi-window productivity with S-Pen stylus support"
    ]
  },
  {
    id: "vivo-x-fold-6",
    brand: "Vivo",
    model: "X Fold 6",
    name: "Vivo X Fold 6",
    series: "Zeiss Carbon Fold",
    tagline: "Record-setting 8.9mm folded thickness. Zeiss Triple 50MP with periscope zoom, 5700mAh semi-solid silicon battery, and Snapdragon 8 Elite.",
    price: 159999,
    originalPrice: 169999,
    rating: 4.8,
    reviewCount: 175,
    imageUrl: "/phones/vivo-x-fold-6.svg",
    displaySize: "8.03-inch 2K+ E7 AMOLED 120Hz LTPO Folding + 6.53-inch FHD+ 120Hz Outer",
    processor: "Qualcomm Snapdragon 8 Elite (3nm)",
    camera: "50MP Zeiss OIS Main + 64MP 3x Periscope Telephoto OIS + 50MP Ultra-Wide | Dual 32MP",
    battery: "5700 mAh Semi-Solid Silicon-Carbon, 100W FlashCharge, 50W Wireless",
    operatingSystem: "Funtouch OS 16 Fold (Android 16)",
    description: "The world's slimmest high-battery book-style foldable. At just 8.9mm folded and 219g, it packs a massive 5700mAh semi-solid silicon battery, Zeiss periscope telephoto optics, and dual ultrasonic fingerprint scanners.",
    stock: 22,
    inStock: true,
    isFeatured: true,
    ram: "16GB LPDDR5X",
    storage: "512GB / 1TB",
    badge: "8.9MM ULTRA THIN FOLD",
    accentColor: "#71717a",
    gradientA: "#8e8e96",
    gradientB: "#34343a",
    screenGradientA: "#222226",
    screenGradientB: "#0c0c0e",
    colors: [
      { name: "Feather White", hex: "#f5f5f7" },
      { name: "Solar Black", hex: "#18181b" },
      { name: "Titanium Grey", hex: "#71717a" }
    ],
    storageOptions: [
      { size: "512GB", price: 159999 },
      { size: "1TB", price: 174999 }
    ],
    highlightFeatures: [
      "World's slimmest high-battery fold at under 9mm folded thickness",
      "Zeiss camera optics with 64MP 3x periscope telephoto sensor",
      "5700mAh semi-solid silicon-carbon battery with 100W flash charging",
      "Carbon fiber zero-crease teardrop hinge mechanism"
    ]
  },

  // ==========================================
  // 2. MID-RANGE PHONES (October 2026)
  // ==========================================
  {
    id: "motorola-edge-70-pro-plus",
    brand: "Motorola",
    model: "Edge 70 Pro+",
    name: "Motorola Edge 70 Pro+",
    series: "Pantone Edition",
    tagline: "Flagship performance at mid-range pricing. MediaTek Dimensity 9400, 144Hz 1.5K pOLED, triple 50MP cameras, and 125W TurboPower.",
    price: 44999,
    originalPrice: 49999,
    rating: 4.8,
    reviewCount: 195,
    imageUrl: "/phones/motorola-edge-70-pro-plus.svg",
    displaySize: "6.7-inch 1.5K pOLED 144Hz, HDR10+, 10-bit Color, Pantone Validated",
    processor: "MediaTek Dimensity 9400 (3nm)",
    camera: "50MP OIS Main + 50MP Ultra-Wide Macro + 50MP 3x Telephoto OIS | 50MP Quad Pixel",
    battery: "5000 mAh, 125W TurboPower, 50W Wireless, IP68 Waterproof",
    operatingSystem: "Hello UI on Android 16 (4 OS Updates)",
    description: "Defying price brackets with a full flagship Dimensity 9400 3nm chip, triple 50MP camera array with dedicated 3x telephoto zoom, 144Hz 1.5K pOLED Pantone-tuned display, and 125W TurboPower charging.",
    stock: 32,
    inStock: true,
    isFeatured: true,
    ram: "12GB / 16GB",
    storage: "256GB / 512GB",
    badge: "DIMENSITY 9400 144HZ",
    accentColor: "#8a7fa3",
    gradientA: "#aa9fc4",
    gradientB: "#453f53",
    screenGradientA: "#292434",
    screenGradientB: "#0e0c12",
    colors: [
      { name: "Pantone Marshmallow", hex: "#ece8df" },
      { name: "Black Oyster", hex: "#212326" },
      { name: "Luxe Lavender", hex: "#8a7fa3" }
    ],
    storageOptions: [
      { size: "256GB", price: 44999 },
      { size: "512GB", price: 49999 }
    ],
    highlightFeatures: [
      "MediaTek Dimensity 9400 flagship 3nm chipset with ray tracing",
      "All-50MP Triple Camera with 3x optical telephoto lens and 4K 60fps",
      "144Hz 1.5K curved pOLED with Pantone Color validation",
      "125W TurboPower wired + 50W wireless charging with IP68 rating"
    ]
  },
  {
    id: "oneplus-nord-6",
    brand: "OnePlus",
    model: "Nord 6",
    name: "OnePlus Nord 6",
    series: "Metallic Unibody",
    tagline: "All-metal unibody craftsmanship, Snapdragon 7+ Gen 4, 50MP Sony LYT-700 OIS camera, and 100W SUPERVOOC charging.",
    price: 32999,
    originalPrice: 35999,
    rating: 4.7,
    reviewCount: 340,
    imageUrl: "/phones/oneplus-nord-6.svg",
    displaySize: "6.74-inch 1.5K AMOLED 120Hz, 2600 nits, Aqua Touch 2.0",
    processor: "Qualcomm Snapdragon 7+ Gen 4 (4nm)",
    camera: "50MP Sony LYT-700 OIS + 8MP Ultra-Wide + 2MP Macro | 16MP EIS Selfie",
    battery: "5500 mAh, 100W SUPERVOOC Fast Charge",
    operatingSystem: "OxygenOS 16 based on Android 16 (4 Years OS)",
    description: "The return of the metal flagship. OnePlus Nord 6 combines aircraft-grade aluminum unibody styling with snappy Snapdragon 7+ Gen 4 performance, Alert Slider, 100W SUPERVOOC, and clean OxygenOS 16.",
    stock: 50,
    inStock: true,
    isFeatured: false,
    ram: "8GB / 12GB LPDDR5X",
    storage: "128GB / 256GB UFS 4.0",
    badge: "ALL METAL 100W SUPERVOOC",
    accentColor: "#c0c4c8",
    gradientA: "#dbe0e6",
    gradientB: "#565c63",
    screenGradientA: "#24272c",
    screenGradientB: "#0c0d0f",
    colors: [
      { name: "Mercurial Silver", hex: "#c0c4c8" },
      { name: "Obsidian Midnight", hex: "#1e2022" },
      { name: "Oasis Green", hex: "#4a6e5d" }
    ],
    storageOptions: [
      { size: "128GB", price: 32999 },
      { size: "256GB", price: 36999 }
    ],
    highlightFeatures: [
      "All-metal slim unibody design with physical alert slider",
      "Qualcomm Snapdragon 7+ Gen 4 processor with Cryo-velocity VC cooling",
      "50MP Sony LYT-700 camera with Optical Image Stabilization",
      "5500mAh battery with 100W SUPERVOOC 0-100% in 28 mins"
    ]
  },
  {
    id: "iqoo-15r-neo-10",
    brand: "iQOO",
    model: "15R (Neo 10)",
    name: "iQOO 15R / Neo 10",
    series: "Speed Edition",
    tagline: "Gaming supremacy. Snapdragon 8 Gen 3 paired with Supercomputing Chip Q2, 144Hz 1.5K LTPO AMOLED, and monster 6100mAh battery with 120W charge.",
    price: 39999,
    originalPrice: 44999,
    rating: 4.8,
    reviewCount: 310,
    imageUrl: "/phones/iqoo-15r-neo-10.svg",
    displaySize: "6.78-inch 1.5K 144Hz 8T LTPO AMOLED, 3000Hz Instant Touch, 4500 nits",
    processor: "Qualcomm Snapdragon 8 Gen 3 (4nm) + Supercomputing Chip Q2",
    camera: "50MP Sony IMX921 OIS + 8MP Ultra-Wide | 16MP HD Selfie",
    battery: "6100 mAh Dual-Cell, 120W FlashCharge (0-100% in 25 mins)",
    operatingSystem: "Funtouch OS 16 (Android 16)",
    description: "Built for competitive eSports and raw endurance. Features Snapdragon 8 Gen 3 with dedicated Q2 gaming interpolation, 144Hz 1.5K display, 50MP Sony IMX921 camera, and an incredible 6100mAh battery with 120W flash charging.",
    stock: 45,
    inStock: true,
    isFeatured: true,
    ram: "12GB / 16GB LPDDR5X",
    storage: "256GB / 512GB UFS 4.0",
    badge: "144HZ Q2 GAMING 120W",
    accentColor: "#e65100",
    gradientA: "#ff7d33",
    gradientB: "#7a2700",
    screenGradientA: "#3b1704",
    screenGradientB: "#140700",
    colors: [
      { name: "Track Orange", hex: "#e65100" },
      { name: "Conqueror Black", hex: "#191a1d" },
      { name: "Rally Blue", hex: "#1565c0" }
    ],
    storageOptions: [
      { size: "256GB", price: 39999 },
      { size: "512GB", price: 44999 }
    ],
    highlightFeatures: [
      "Qualcomm Snapdragon 8 Gen 3 flagship platform with 6K VC vapor chamber",
      "Supercomputing Chip Q2 for 144 FPS game frame interpolation",
      "Massive 6100mAh dual-cell battery with 120W FlashCharge",
      "1.5K 144Hz 8T LTPO display with 4500 nits peak brightness"
    ]
  },
  {
    id: "nothing-phone-4a-pro",
    brand: "Nothing",
    model: "Phone (4a) Pro",
    name: "Nothing Phone (4a) Pro",
    series: "Glyph Matrix",
    tagline: "Transparent design icon with upgraded Glyph Interface 3.0, Dimensity 7350 Pro, dual 50MP cameras with 2.5x telephoto, and symmetrical bezels.",
    price: 34999,
    originalPrice: 38999,
    rating: 4.8,
    reviewCount: 290,
    imageUrl: "/phones/nothing-phone-4a-pro.svg",
    displaySize: "6.7-inch Flexible AMOLED 120Hz, 2400 nits, 100% Symmetrical 1.9mm Bezels",
    processor: "MediaTek Dimensity 7350 Pro 5G (4nm)",
    camera: "50MP Sony OIS Main + 50MP 2.5x Telephoto & Ultra-Wide Dual Sensor | 32MP 4K Selfie",
    battery: "5200 mAh, 65W Fast Charge, Glyph Interface 3.0",
    operatingSystem: "Nothing OS 3.5 (Android 16)",
    description: "The evolution of transparent design. Nothing Phone (4a) Pro integrates a full Glyph Matrix on the back, Dimensity 7350 Pro speed, a dedicated 50MP 2.5x telephoto camera, and completely symmetrical 1.9mm borders.",
    stock: 35,
    inStock: true,
    isFeatured: true,
    ram: "8GB / 12GB",
    storage: "256GB / 512GB",
    badge: "GLYPH MATRIX 3.0 50MP",
    accentColor: "#f2f3f5",
    gradientA: "#ffffff",
    gradientB: "#71747a",
    screenGradientA: "#242528",
    screenGradientB: "#0d0e0f",
    colors: [
      { name: "Glyph White", hex: "#f2f3f5" },
      { name: "Dark Smoke", hex: "#1e2024" },
      { name: "Special Yellow Accent", hex: "#facc15" }
    ],
    storageOptions: [
      { size: "256GB", price: 34999 },
      { size: "512GB", price: 39999 }
    ],
    highlightFeatures: [
      "Iconic transparent aesthetic with customizable Glyph Matrix lighting",
      "50MP Dual Camera setup with 2.5x dedicated optical telephoto",
      "Dimensity 7350 Pro 5G with clean bloatware-free Nothing OS 3.5",
      "6.7-inch flexible AMOLED with razor-thin symmetrical 1.9mm bezels"
    ]
  },
  {
    id: "samsung-galaxy-a37",
    brand: "Samsung",
    model: "Galaxy A37",
    name: "Samsung Galaxy A37 5G",
    series: "Awesome Series",
    tagline: "Everyday excellence. Exynos 1580 4nm, 50MP OIS camera, 6.6-inch Super AMOLED 120Hz, and IP67 water resistance.",
    price: 27999,
    originalPrice: 30999,
    rating: 4.6,
    reviewCount: 220,
    imageUrl: "/phones/samsung-galaxy-a37.svg",
    displaySize: "6.6-inch Super AMOLED FHD+ 120Hz, Vision Booster, 1600 nits",
    processor: "Samsung Exynos 1580 (4nm) Octa-core",
    camera: "50MP OIS Main + 8MP Ultra-Wide + 5MP Macro | 13MP Selfie",
    battery: "5000 mAh, 35W Fast Charging, IP67 Dust/Water",
    operatingSystem: "One UI 8 (Android 16) with 5 Years OS Updates",
    description: "Samsung Galaxy A37 delivers trusted reliability. Equipped with an Exynos 1580 4nm processor, vibrant 6.6-inch Super AMOLED screen, 50MP camera with Optical Image Stabilization, and guaranteed 5 generations of Android upgrades.",
    stock: 40,
    inStock: true,
    isFeatured: false,
    ram: "8GB",
    storage: "128GB / 256GB",
    badge: "SUPER AMOLED 120HZ IP67",
    accentColor: "#90caf9",
    gradientA: "#b3e5fc",
    gradientB: "#3949ab",
    screenGradientA: "#1a237e",
    screenGradientB: "#090d2e",
    colors: [
      { name: "Awesome Iceblue", hex: "#90caf9" },
      { name: "Awesome Lilac", hex: "#ce93d8" },
      { name: "Awesome Navy", hex: "#1a237e" }
    ],
    storageOptions: [
      { size: "128GB", price: 27999 },
      { size: "256GB", price: 31999 }
    ],
    highlightFeatures: [
      "50MP OIS camera with AI Nightography enhancement",
      "6.6-inch Super AMOLED 120Hz display with Vision Booster",
      "IP67 dust and water resistance rating for worry-free usage",
      "Guaranteed 5 generations of Android OS updates and security patches"
    ]
  },
  {
    id: "samsung-galaxy-a57",
    brand: "Samsung",
    model: "Galaxy A57",
    name: "Samsung Galaxy A57 5G",
    series: "Metal Frame Edition",
    tagline: "Premium mid-range standard. Exynos 1680 with AMD RDNA graphics, metal frame, 50MP OIS, Samsung Knox Vault, and 5200mAh battery.",
    price: 36999,
    originalPrice: 41999,
    rating: 4.7,
    reviewCount: 260,
    imageUrl: "/phones/samsung-galaxy-a57.svg",
    displaySize: "6.6-inch Super AMOLED FHD+ 120Hz, Corning Gorilla Glass Victus+, 2000 nits",
    processor: "Samsung Exynos 1680 (4nm) with AMD Xclipse 540 GPU",
    camera: "50MP OIS (1/1.56\") + 12MP Ultra-Wide + 5MP Macro | 32MP 4K Selfie",
    battery: "5200 mAh, 45W Fast Charging, Metal Frame, IP67",
    operatingSystem: "One UI 8 (Android 16) with Knox Vault Security",
    description: "The gold standard of the Galaxy A-series. Crafted with a premium metal frame, Gorilla Glass Victus+ front and back, Exynos 1680 with AMD graphics, 50MP flagship-grade sensor, and 45W fast charging.",
    stock: 35,
    inStock: true,
    isFeatured: false,
    ram: "8GB / 12GB",
    storage: "128GB / 256GB",
    badge: "AMD RDNA METAL FRAME",
    accentColor: "#81d4fa",
    gradientA: "#a7e3fc",
    gradientB: "#2962ff",
    screenGradientA: "#1a2a4f",
    screenGradientB: "#090f1d",
    colors: [
      { name: "Awesome Iceblue", hex: "#81d4fa" },
      { name: "Awesome Lemon", hex: "#fff59d" },
      { name: "Awesome Charcoal", hex: "#263238" }
    ],
    storageOptions: [
      { size: "128GB", price: 36999 },
      { size: "256GB", price: 41999 }
    ],
    highlightFeatures: [
      "Solid metal frame with Gorilla Glass Victus+ front and back",
      "Exynos 1680 with AMD RDNA graphics architecture for smooth gaming",
      "50MP OIS flagship-grade main camera sensor with 4K 60fps recording",
      "45W fast charging with Samsung Knox Vault hardware-level security"
    ]
  },
  {
    id: "vivo-v80-5g",
    brand: "Vivo",
    model: "V80 5G",
    name: "Vivo V80 5G",
    series: "Zeiss Portrait Studio",
    tagline: "Master of portraits. Dimensity 8400, Zeiss 50MP dual cameras, Studio-grade Aura Light, 5500mAh BlueOcean battery, and IP69 rating.",
    price: 38999,
    originalPrice: 42999,
    rating: 4.7,
    reviewCount: 210,
    imageUrl: "/phones/vivo-v80-5g.svg",
    displaySize: "6.78-inch 1.5K 3D Curved AMOLED 120Hz, Zeiss Natural Color, 4500 nits",
    processor: "MediaTek Dimensity 8400 (4nm)",
    camera: "50MP Zeiss OIS Main + 50MP Zeiss Ultra-Wide + Studio Smart Aura Light | 50MP Eye AF",
    battery: "5500 mAh BlueOcean, 80W FlashCharge, IP68/IP69 Water/Dust",
    operatingSystem: "Funtouch OS 16 (Android 16)",
    description: "Redefining portrait photography with co-engineered Zeiss optics and intelligent Studio Aura Light. Equipped with a 1.5K 120Hz 3D curved screen, Dimensity 8400, and dual IP68/IP69 extreme water ingress resistance.",
    stock: 38,
    inStock: true,
    isFeatured: false,
    ram: "8GB / 12GB",
    storage: "256GB / 512GB",
    badge: "ZEISS DUAL 50MP IP69",
    accentColor: "#b388ff",
    gradientA: "#d1b3ff",
    gradientB: "#4a148c",
    screenGradientA: "#280d4f",
    screenGradientB: "#0e031c",
    colors: [
      { name: "Lotus Purple", hex: "#b388ff" },
      { name: "Ganges Blue", hex: "#4fc3f7" },
      { name: "Titanium Grey", hex: "#455a64" }
    ],
    storageOptions: [
      { size: "256GB", price: 38999 },
      { size: "512GB", price: 43999 }
    ],
    highlightFeatures: [
      "Zeiss All-50MP dual camera system with Studio Aura Light",
      "50MP Eye-AF front camera with wide group-selfie angle",
      "Extreme durability with dual IP68 and IP69 waterproof ratings",
      "5500mAh BlueOcean battery with 80W FlashCharge"
    ]
  },
  {
    id: "motorola-edge-70-pro",
    brand: "Motorola",
    model: "Edge 70 Pro",
    name: "Motorola Edge 70 Pro",
    series: "Ultra Slim Curve",
    tagline: "Ultra-slim ergonomic curve with Snapdragon 8s Gen 3, triple 50MP cameras, 144Hz pOLED, and 125W TurboPower.",
    price: 39999,
    originalPrice: 44999,
    rating: 4.7,
    reviewCount: 230,
    imageUrl: "/phones/motorola-edge-70-pro.svg",
    displaySize: "6.7-inch 1.5K pOLED 144Hz, HDR10+, Pantone SkinTone Validated",
    processor: "Qualcomm Snapdragon 8s Gen 3 (4nm)",
    camera: "50MP OIS Main + 50MP Ultra-Wide Macro + 10MP 3x Telephoto OIS | 50MP Auto-Focus",
    battery: "4700 mAh, 125W TurboPower, 15W Wireless, IP68",
    operatingSystem: "Hello UI (Android 16)",
    description: "Sleek, powerful, and impeccably calibrated. The Edge 70 Pro features Snapdragon 8s Gen 3 processing, a 144Hz 1.5K curved pOLED screen, 3x optical telephoto lens, and 125W TurboPower charging.",
    stock: 35,
    inStock: true,
    isFeatured: false,
    ram: "12GB",
    storage: "256GB / 512GB",
    badge: "144HZ POLED 125W TURBO",
    accentColor: "#1a1a1d",
    gradientA: "#3b3b42",
    gradientB: "#0d0d0f",
    screenGradientA: "#1e1e24",
    screenGradientB: "#09090b",
    colors: [
      { name: "Pantone Luxe Lavender", hex: "#8a7fa3" },
      { name: "Black Beauty", hex: "#1a1a1d" },
      { name: "Vanilla Cream", hex: "#fdfbf7" }
    ],
    storageOptions: [
      { size: "256GB", price: 39999 },
      { size: "512GB", price: 44999 }
    ],
    highlightFeatures: [
      "Qualcomm Snapdragon 8s Gen 3 flagship silicon",
      "50MP Triple camera system with 3x optical telephoto zoom",
      "144Hz 1.5K curved pOLED with Pantone Color validation",
      "125W TurboPower charging 0-100% in 18 minutes"
    ]
  },
  {
    id: "google-pixel-10a",
    brand: "Google Pixel",
    model: "Pixel 10a",
    name: "Google Pixel 10a",
    series: "Gemini AI Assistant",
    tagline: "The smartest phone in its class. Google Tensor G5 chip (3nm TSMC), Gemini AI built-in, class-leading 64MP camera, and 7 years of feature drops.",
    price: 44999,
    originalPrice: 49999,
    rating: 4.8,
    reviewCount: 275,
    imageUrl: "/phones/google-pixel-10a.svg",
    displaySize: "6.2-inch Actua OLED 120Hz (60-120Hz), 2000 nits peak, Gorilla Glass 7i",
    processor: "Google Tensor G5 (3nm TSMC) + Titan M3 Security Co-processor",
    camera: "64MP Quad PD Main OIS + 13MP Ultra-Wide 120° FOV | 13MP Ultra-Wide",
    battery: "4600 mAh, 30W Fast Wired, Qi Wireless Charging, IP67",
    operatingSystem: "Clean Android 16 with 7 Years OS & Security Updates",
    description: "Flagship intelligence at a mid-tier price. Built on Google's custom Tensor G5 3nm TSMC chip with next-gen Gemini Nano AI, iconic Pixel camera image processing, Magic Editor, Best Take, and 7 years of software support.",
    stock: 30,
    inStock: true,
    isFeatured: true,
    ram: "8GB LPDDR5X",
    storage: "128GB / 256GB",
    badge: "TENSOR G5 GEMINI AI",
    accentColor: "#81d4fa",
    gradientA: "#b3e5fc",
    gradientB: "#0288d1",
    screenGradientA: "#0d3c61",
    screenGradientB: "#041421",
    colors: [
      { name: "Porcelain", hex: "#f4f1ea" },
      { name: "Obsidian", hex: "#202124" },
      { name: "Aloe", hex: "#c8e6c9" },
      { name: "Bay Blue", hex: "#81d4fa" }
    ],
    storageOptions: [
      { size: "128GB", price: 44999 },
      { size: "256GB", price: 49999 }
    ],
    highlightFeatures: [
      "Google Tensor G5 3nm TSMC processor with Titan M3 security",
      "Industry-leading Pixel camera tuning with Magic Editor & Best Take",
      "7 years of guaranteed OS updates, feature drops, and security fixes",
      "Compact 6.2-inch 120Hz Actua OLED display with 2000 nits brightness"
    ]
  },

  // ==========================================
  // 3. BUDGET PHONES (October 2026)
  // ==========================================
  {
    id: "motorola-edge-70-fusion",
    brand: "Motorola",
    model: "Edge 70 Fusion",
    name: "Motorola Edge 70 Fusion",
    series: "Endless Edge",
    tagline: "Flagship curve under ₹25K. Snapdragon 7s Gen 3, Sony LYTIA 700C 50MP OIS, 144Hz 3D curved pOLED, and genuine IP68 underwater protection.",
    price: 23999,
    originalPrice: 26999,
    rating: 4.7,
    reviewCount: 380,
    imageUrl: "/phones/motorola-edge-70-fusion.svg",
    displaySize: "6.67-inch FHD+ 144Hz Endless Edge 3D Curved pOLED, 1600 nits",
    processor: "Qualcomm Snapdragon 7s Gen 3 (4nm)",
    camera: "50MP Sony LYTIA 700C OIS + 13MP Ultra-Wide Macro | 32MP Quad Pixel 4K",
    battery: "5200 mAh, 68W TurboPower, IP68 Water/Dust Resistance",
    operatingSystem: "Hello UI on Android 16",
    description: "The undisputed value benchmark. Featuring a gorgeous 144Hz 3D curved pOLED screen, Sony LYTIA 700C OIS camera, Snapdragon 7s Gen 3 efficiency, and genuine IP68 underwater protection under ₹25,000.",
    stock: 50,
    inStock: true,
    isFeatured: true,
    ram: "8GB / 12GB",
    storage: "128GB / 256GB",
    badge: "144HZ CURVE IP68 SONY",
    accentColor: "#2e7d32",
    gradientA: "#4caf50",
    gradientB: "#1b5e20",
    screenGradientA: "#0f3813",
    screenGradientB: "#051407",
    colors: [
      { name: "Marshmallow Blue", hex: "#b0bec5" },
      { name: "Forest Green Vegan Leather", hex: "#2e7d32" },
      { name: "Hot Pink", hex: "#f06292" }
    ],
    storageOptions: [
      { size: "128GB", price: 23999 },
      { size: "256GB", price: 26999 }
    ],
    highlightFeatures: [
      "Sony LYTIA 700C 50MP OIS flagship sensor with 4K recording",
      "144Hz Endless Edge 3D curved pOLED display with HDR10+",
      "IP68 underwater protection (1.5m for 30 minutes)",
      "68W TurboPower charging with 5200mAh battery"
    ]
  },
  {
    id: "realme-p4-power",
    brand: "Realme",
    model: "P4 Power (P4R)",
    name: "Realme P4 Power / P4R",
    series: "Power Edition",
    tagline: "Battery behemoth. Massive 6000mAh battery with 67W SUPERVOOC, Dimensity 7050 Ultra 5G, 120Hz AMOLED, and Rainwater Smart Touch.",
    price: 18999,
    originalPrice: 21999,
    rating: 4.6,
    reviewCount: 290,
    imageUrl: "/phones/realme-p4-power.svg",
    displaySize: "6.67-inch FHD+ 120Hz AMOLED, 2000 nits peak, Rainwater Smart Touch",
    processor: "MediaTek Dimensity 7050 Ultra 5G (6nm)",
    camera: "50MP Sony OIS Main + 2MP Portrait Depth | 16MP AI Selfie",
    battery: "6000 mAh Monster Battery, 67W SUPERVOOC Fast Charge",
    operatingSystem: "Realme UI 7.0 (Android 16)",
    description: "Designed for relentless battery life and smooth day-to-day usability. With a 6000mAh high-density cell, 67W fast charging, Dimensity 7050 Ultra speed, 50MP Sony OIS camera, and a 120Hz AMOLED panel.",
    stock: 60,
    inStock: true,
    isFeatured: false,
    ram: "8GB / 12GB",
    storage: "128GB / 256GB",
    badge: "6000MAH 67W SUPERVOOC",
    accentColor: "#ffb74d",
    gradientA: "#ffd54f",
    gradientB: "#e65100",
    screenGradientA: "#4d2600",
    screenGradientB: "#1a0d00",
    colors: [
      { name: "Phoenix Gold", hex: "#ffb74d" },
      { name: "Peacock Green", hex: "#00897b" },
      { name: "Midnight Navy", hex: "#0d47a1" }
    ],
    storageOptions: [
      { size: "128GB", price: 18999 },
      { size: "256GB", price: 21999 }
    ],
    highlightFeatures: [
      "6000mAh high-density battery with 67W SUPERVOOC charging",
      "120Hz AMOLED display with 2000 nits peak brightness",
      "Sony 50MP camera with Optical Image Stabilization",
      "7-layer 3D VC cooling system for sustained gaming"
    ]
  },
  {
    id: "moto-g37-power",
    brand: "Motorola",
    model: "Moto G37 Power",
    name: "Moto G37 Power",
    series: "Marathon Power",
    tagline: "Unstoppable battery life. 6000mAh battery, Dimensity 6300 5G, 120Hz display with stereo speakers and Dolby Atmos at an incredible budget price.",
    price: 12999,
    originalPrice: 14999,
    rating: 4.5,
    reviewCount: 320,
    imageUrl: "/phones/moto-g37-power.svg",
    displaySize: "6.56-inch HD+ 120Hz IPS LCD, Stereo Speakers with Dolby Atmos",
    processor: "MediaTek Dimensity 6300 5G (6nm)",
    camera: "50MP Quad Pixel Main + 2MP Macro Sensor | 16MP Selfie",
    battery: "6000 mAh Powerhouse, 33W TurboPower Charger in box",
    operatingSystem: "Clean Android 16 with Moto Gestures",
    description: "The battery marathon champion under ₹13,000. Features a colossal 6000mAh battery that delivers up to 3 days of uptime, 5G speeds via Dimensity 6300, stereo speakers with Dolby Atmos, and ad-free software.",
    stock: 65,
    inStock: true,
    isFeatured: false,
    ram: "6GB / 8GB",
    storage: "128GB",
    badge: "6000MAH MARATHON 5G",
    accentColor: "#66bb6a",
    gradientA: "#81c784",
    gradientB: "#2e7d32",
    screenGradientA: "#1b4d20",
    screenGradientB: "#091c0c",
    colors: [
      { name: "Ocean Green", hex: "#66bb6a" },
      { name: "Ice Blue", hex: "#80d8ff" },
      { name: "Charcoal Grey", hex: "#37474f" }
    ],
    storageOptions: [
      { size: "128GB", price: 12999 }
    ],
    highlightFeatures: [
      "6000mAh marathon battery lasting up to 3 days per charge",
      "5G connectivity with MediaTek Dimensity 6300 processor",
      "Stereo speakers with Dolby Atmos spatial audio",
      "Clean bloatware-free Android 16 with signature Moto Gestures"
    ]
  },
  {
    id: "samsung-galaxy-f70-pro",
    brand: "Samsung",
    model: "Galaxy F70 Pro",
    name: "Samsung Galaxy F70 Pro 5G",
    series: "Flipkart F-Series",
    tagline: "Gaming and endurance powerhouse. Exynos 1480 with AMD Xclipse 530 GPU, 6.7-inch Super AMOLED+ 120Hz, and 6000mAh battery.",
    price: 24999,
    originalPrice: 28999,
    rating: 4.6,
    reviewCount: 240,
    imageUrl: "/phones/samsung-galaxy-f70-pro.svg",
    displaySize: "6.7-inch Super AMOLED Plus FHD+ 120Hz, 1500 nits, Gorilla Glass 5",
    processor: "Samsung Exynos 1480 with AMD Xclipse 530 GPU (4nm)",
    camera: "50MP OIS Main + 8MP Ultra-Wide + 2MP Macro | 32MP 4K Selfie Camera",
    battery: "6000 mAh Monster Battery, 45W Fast Charging",
    operatingSystem: "One UI 8 (Android 16) with Voice Focus",
    description: "Packed with gamer-focused AMD Xclipse graphics, a sweeping 6.7-inch Super AMOLED+ 120Hz screen, 50MP OIS camera, 45W charging, and Samsung's signature 6000mAh battery endurance.",
    stock: 45,
    inStock: true,
    isFeatured: false,
    ram: "8GB",
    storage: "128GB / 256GB",
    badge: "AMD GPU 6000MAH 45W",
    accentColor: "#76ff03",
    gradientA: "#b2ff59",
    gradientB: "#33691e",
    screenGradientA: "#1b5e20",
    screenGradientB: "#052608",
    colors: [
      { name: "Cyber Black", hex: "#212121" },
      { name: "Neon Green", hex: "#76ff03" },
      { name: "Laser Blue", hex: "#00b0ff" }
    ],
    storageOptions: [
      { size: "128GB", price: 24999 },
      { size: "256GB", price: 27999 }
    ],
    highlightFeatures: [
      "Exynos 1480 4nm processor with AMD RDNA GPU gaming graphics",
      "6000mAh battery supporting 45W super-fast charging",
      "6.7-inch Super AMOLED Plus 120Hz vivid screen",
      "50MP OIS camera with 4K recording front & rear"
    ]
  },
  {
    id: "samsung-galaxy-m47",
    brand: "Samsung",
    model: "Galaxy M47",
    name: "Samsung Galaxy M47 5G",
    series: "Monster Series",
    tagline: "Unmatched endurance. 6000mAh battery, 50MP No Shake OIS camera, 6.6-inch Super AMOLED 120Hz, and Knox Security.",
    price: 19999,
    originalPrice: 23999,
    rating: 4.6,
    reviewCount: 280,
    imageUrl: "/phones/samsung-galaxy-m47.svg",
    displaySize: "6.6-inch FHD+ Super AMOLED 120Hz, 1200 nits, Gorilla Glass Victus",
    processor: "Qualcomm Snapdragon 6 Gen 1 (4nm)",
    camera: "50MP OIS No Shake Cam + 8MP Ultra-Wide + 2MP Depth | 16MP Selfie",
    battery: "6000 mAh Monster Battery, 25W Fast Charging",
    operatingSystem: "One UI 8 (Android 16) with 4 OS upgrades",
    description: "The Amazon Monster series hero. Combining Qualcomm Snapdragon 4nm architecture, 50MP No-Shake optical stabilization camera, 6000mAh battery, and a gorgeous 120Hz Super AMOLED screen under ₹20,000.",
    stock: 55,
    inStock: true,
    isFeatured: false,
    ram: "6GB / 8GB",
    storage: "128GB / 256GB",
    badge: "NO SHAKE CAM 6000MAH",
    accentColor: "#1565c0",
    gradientA: "#1e88e5",
    gradientB: "#0d47a1",
    screenGradientA: "#0a2d59",
    screenGradientB: "#031021",
    colors: [
      { name: "Moonlight Silver", hex: "#cfd8dc" },
      { name: "Thunder Black", hex: "#263238" },
      { name: "Denim Blue", hex: "#1565c0" }
    ],
    storageOptions: [
      { size: "128GB", price: 19999 },
      { size: "256GB", price: 22999 }
    ],
    highlightFeatures: [
      "6000mAh battery for 2+ days of heavy usage",
      "50MP No Shake Cam with hardware Optical Image Stabilization",
      "Vibrant 6.6-inch Super AMOLED 120Hz display with Gorilla Glass Victus",
      "Samsung Knox Security with Secure Folder and Alt-Z privacy"
    ]
  },
  {
    id: "redmi-note-17-pro",
    brand: "Redmi",
    model: "Note 17 Pro",
    name: "Redmi Note 17 Pro 5G",
    series: "SuperNote Edition",
    tagline: "The flagship killer SuperNote. 200MP OIS camera, MediaTek Dimensity 7300-Ultra, 1.5K CrystalRes 120Hz AMOLED, 90W HyperCharge, and IP68 protection.",
    price: 26999,
    originalPrice: 29999,
    rating: 4.7,
    reviewCount: 410,
    imageUrl: "/phones/redmi-note-17-pro.svg",
    displaySize: "6.67-inch 1.5K CrystalRes AMOLED 120Hz, Dolby Vision, Gorilla Glass Victus 2",
    processor: "MediaTek Dimensity 7300-Ultra 5G (4nm)",
    camera: "200MP Samsung HP3 OIS (1/1.4\") + 8MP Ultra-Wide + 2MP Macro | 16MP AI Selfie",
    battery: "5500 mAh, 90W HyperCharge (0-100% in 22 mins), IP68 Water Resistance",
    operatingSystem: "Xiaomi HyperOS 2.0 (Android 16)",
    description: "Setting the new benchmark for mid-range capability. Packed with a 200MP Samsung HP3 camera with 4x in-sensor lossless zoom, 1.5K Dolby Vision AMOLED display, 90W HyperCharge, and IP68 water/dust resistance.",
    stock: 45,
    inStock: true,
    isFeatured: true,
    ram: "8GB / 12GB",
    storage: "128GB / 256GB",
    badge: "200MP OIS 90W IP68",
    accentColor: "#26a69a",
    gradientA: "#4db6ac",
    gradientB: "#00695c",
    screenGradientA: "#004d40",
    screenGradientB: "#001a16",
    colors: [
      { name: "Titanium Silver", hex: "#b0bec5" },
      { name: "Midnight Black", hex: "#1e2022" },
      { name: "Aurora Green", hex: "#26a69a" }
    ],
    storageOptions: [
      { size: "128GB", price: 26999 },
      { size: "256GB", price: 29999 }
    ],
    highlightFeatures: [
      "200MP Samsung HP3 OIS camera with 4x in-sensor lossless zoom",
      "90W HyperCharge 5500mAh battery 0-100% in 22 mins",
      "1.5K CrystalRes AMOLED with Dolby Vision & HDR10+",
      "IP68 flagship dust and water resistance rating"
    ]
  },
  {
    id: "redmi-note-15",
    brand: "Redmi",
    model: "Note 15",
    name: "Redmi Note 15 5G",
    series: "Classic Note",
    tagline: "Affordable brilliance. Qualcomm Snapdragon 4 Gen 3, 120Hz FHD+ AMOLED, 50MP AI dual camera, and 5100mAh battery with 45W charging.",
    price: 15999,
    originalPrice: 18999,
    rating: 4.5,
    reviewCount: 350,
    imageUrl: "/phones/redmi-note-15.svg",
    displaySize: "6.67-inch FHD+ 120Hz AMOLED, 1800 nits, Low Blue Light Certified",
    processor: "Qualcomm Snapdragon 4 Gen 3 (4nm)",
    camera: "50MP Dual AI Camera + 2MP Depth | 13MP Selfie",
    battery: "5100 mAh, 45W Turbo Charging in box",
    operatingSystem: "Xiaomi HyperOS 2.0 (Android 16)",
    description: "The classic Note formula perfected. Delivers a vibrant 120Hz AMOLED display with 1800 nits brightness, Snapdragon 4 Gen 3 5G efficiency, 50MP AI photography, and a 45W fast charger included in the box.",
    stock: 60,
    inStock: true,
    isFeatured: false,
    ram: "6GB / 8GB",
    storage: "128GB / 256GB",
    badge: "120HZ AMOLED 45W TURBO",
    accentColor: "#64b5f6",
    gradientA: "#90caf9",
    gradientB: "#1976d2",
    screenGradientA: "#0d47a1",
    screenGradientB: "#041b3d",
    colors: [
      { name: "Prism Blue", hex: "#64b5f6" },
      { name: "Arctic White", hex: "#fafafa" },
      { name: "Stealth Black", hex: "#212121" }
    ],
    storageOptions: [
      { size: "128GB", price: 15999 },
      { size: "256GB", price: 17999 }
    ],
    highlightFeatures: [
      "Qualcomm Snapdragon 4 Gen 3 efficient 4nm architecture",
      "6.67-inch FHD+ 120Hz AMOLED display with 1800 nits brightness",
      "50MP AI Dual camera with Night Mode 2.0",
      "45W fast charger included in retail box"
    ]
  },
  {
    id: "tecno-spark-50s-5g",
    brand: "Tecno",
    model: "Spark 50 / 50S",
    name: "Tecno Spark 50 / Spark 50S 5G",
    series: "Spark Dynamic",
    tagline: "Ultra-affordable 5G with style. MediaTek Dimensity 6300, 120Hz Dynamic Port Display, 50MP AI Dual Camera, and 5000mAh battery under ₹11,000.",
    price: 10999,
    originalPrice: 12999,
    rating: 4.4,
    reviewCount: 190,
    imageUrl: "/phones/tecno-spark-50s-5g.svg",
    displaySize: "6.6-inch HD+ 120Hz Dynamic Port Display with Interactive Notifications",
    processor: "MediaTek Dimensity 6300 5G (6nm)",
    camera: "50MP AI Dual Camera with Dual Flash | 8MP Glowing Selfie with Dual LED Flash",
    battery: "5000 mAh, 18W Fast Charging",
    operatingSystem: "HiOS 15 based on Android 16",
    description: "Bringing high-speed 5G to everyone. Features a 120Hz Dynamic Port screen with contextual island notifications, MediaTek Dimensity 6300 processor, 50MP AI dual camera, and dual stereo speakers under ₹11,000.",
    stock: 50,
    inStock: true,
    isFeatured: false,
    ram: "6GB / 8GB (with Memory Fusion)",
    storage: "128GB",
    badge: "5G UNDER 11K 120HZ",
    accentColor: "#7e57c2",
    gradientA: "#9575cd",
    gradientB: "#4527a0",
    screenGradientA: "#261361",
    screenGradientB: "#0e0524",
    colors: [
      { name: "Nebula Purple", hex: "#7e57c2" },
      { name: "Galaxy Black", hex: "#212121" },
      { name: "Meta Blue", hex: "#29b6f6" }
    ],
    storageOptions: [
      { size: "128GB", price: 10999 }
    ],
    highlightFeatures: [
      "Fast 5G speeds under ₹11,000 with Dimensity 6300",
      "120Hz smooth display with Dynamic Port interactive animations",
      "50MP AI dual camera with dual LED flash",
      "Dual stereo speakers with DTS sound processing"
    ]
  },
  {
    id: "nothing-phone-4b",
    brand: "Nothing",
    model: "Phone (4b)",
    name: "Nothing Phone (4b)",
    series: "Essential Glyph",
    tagline: "The entry point to Nothing design. Dimensity 7200 Ultra, Essential Glyph lighting, 50MP OIS camera, and transparent back under ₹22,000.",
    price: 21999,
    originalPrice: 24999,
    rating: 4.7,
    reviewCount: 260,
    imageUrl: "/phones/nothing-phone-4b.svg",
    displaySize: "6.7-inch 120Hz AMOLED, 1300 nits, Transparent Back Design",
    processor: "MediaTek Dimensity 7200 Ultra 5G (4nm)",
    camera: "50MP Main OIS + 8MP Ultra-Wide | 16MP Selfie",
    battery: "5000 mAh, 45W Fast Charging, Essential Glyph Interface",
    operatingSystem: "Nothing OS 3.0 (Android 16)",
    description: "Nothing's most accessible device ever. Brings iconic transparent design and Essential Glyph notification lights to the sub-₹22K segment, powered by Dimensity 7200 Ultra and a 50MP OIS Sony camera.",
    stock: 45,
    inStock: true,
    isFeatured: true,
    ram: "6GB / 8GB",
    storage: "128GB / 256GB",
    badge: "TRANSPARENT GLYPH 50MP",
    accentColor: "#2b2d30",
    gradientA: "#42454a",
    gradientB: "#141517",
    screenGradientA: "#1b1c1e",
    screenGradientB: "#09090a",
    colors: [
      { name: "Milk White", hex: "#f8f9fa" },
      { name: "Dark Ash", hex: "#2b2d30" }
    ],
    storageOptions: [
      { size: "128GB", price: 21999 },
      { size: "256GB", price: 24999 }
    ],
    highlightFeatures: [
      "Unique transparent industrial design with Essential Glyph lights",
      "50MP OIS main camera with 4K recording",
      "MediaTek Dimensity 7200 Ultra 5G processor",
      "Nothing OS 3.0 clean aesthetic with zero pre-installed bloatware"
    ]
  },
  {
    id: "iqoo-z11-z10r",
    brand: "iQOO",
    model: "Z11 / Z10R",
    name: "iQOO Z11 / iQOO Z10R",
    series: "Turbo Performance",
    tagline: "Segment-first gaming performance. Dimensity 7200, 50MP Sony IMX882 OIS camera, 120Hz Ultra Vision AMOLED, and 44W FlashCharge.",
    price: 17999,
    originalPrice: 20999,
    rating: 4.6,
    reviewCount: 280,
    imageUrl: "/phones/iqoo-z11-z10r.svg",
    displaySize: "6.67-inch 120Hz Ultra Vision AMOLED, 1800 nits, HDR10+",
    processor: "MediaTek Dimensity 7200 5G (4nm)",
    camera: "50MP Sony IMX882 OIS + 2MP Bokeh Sensor | 16MP Selfie",
    battery: "5500 mAh, 44W FlashCharge in box",
    operatingSystem: "Funtouch OS 16 (Android 16)",
    description: "Crushing benchmarks in the ₹18K segment. Boasts 730K+ AnTuTu performance with Dimensity 7200 4nm, Sony IMX882 50MP OIS camera, 120Hz AMOLED display, and 5500mAh battery with 44W flash charging.",
    stock: 50,
    inStock: true,
    isFeatured: false,
    ram: "6GB / 8GB LPDDR4X",
    storage: "128GB / 256GB",
    badge: "DIMENSITY 7200 SONY OIS",
    accentColor: "#388e3c",
    gradientA: "#4caf50",
    gradientB: "#1b5e20",
    screenGradientA: "#0f3813",
    screenGradientB: "#051407",
    colors: [
      { name: "Brushed Green", hex: "#388e3c" },
      { name: "Graphene Black", hex: "#1e2022" }
    ],
    storageOptions: [
      { size: "128GB", price: 17999 },
      { size: "256GB", price: 19999 }
    ],
    highlightFeatures: [
      "MediaTek Dimensity 7200 4nm processor with 730K+ AnTuTu score",
      "Sony IMX882 50MP sensor with 4K OIS video stabilization",
      "120Hz Ultra Vision AMOLED with 1800 nits peak brightness",
      "5500mAh large capacity battery with 44W FlashCharge"
    ]
  }
];

function generateSvg(phone) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <!-- Background Radial Studio Lighting -->
    <radialGradient id="bg-grad-${phone.id}" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="65%" stop-color="#f4f6f8"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </radialGradient>
    
    <!-- Phone Body Gradient -->
    <linearGradient id="body-grad-${phone.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${phone.gradientA}"/>
      <stop offset="50%" stop-color="${phone.accentColor}"/>
      <stop offset="100%" stop-color="${phone.gradientB}"/>
    </linearGradient>

    <!-- Screen Glass Gradient -->
    <linearGradient id="screen-grad-${phone.id}" x1="15%" y1="10%" x2="85%" y2="90%">
      <stop offset="0%" stop-color="${phone.screenGradientA}"/>
      <stop offset="100%" stop-color="${phone.screenGradientB}"/>
    </linearGradient>

    <!-- Camera Lens Reflection -->
    <radialGradient id="lens-grad" cx="35%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#4a6572"/>
      <stop offset="40%" stop-color="#1c2833"/>
      <stop offset="85%" stop-color="#080c10"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>

    <!-- Filter Shadow -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.18"/>
    </filter>

    <filter id="lens-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="600" height="600" fill="url(#bg-grad-${phone.id})"/>

  <!-- Studio Floor Shadow -->
  <ellipse cx="300" cy="515" rx="175" ry="18" fill="#0f172a" opacity="0.12"/>
  <ellipse cx="300" cy="515" rx="120" ry="10" fill="#0f172a" opacity="0.16"/>

  <!-- Main Smartphone Device -->
  <g filter="url(#shadow)">
    <!-- Outer Metal Frame (Phone Body) -->
    <rect x="180" y="65" width="240" height="440" rx="36" fill="url(#body-grad-${phone.id})" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.4"/>
    
    <!-- Screen Bezel -->
    <rect x="186" y="71" width="228" height="428" rx="31" fill="#05070a" stroke="#1e293b" stroke-width="2"/>

    <!-- Dynamic AMOLED Screen -->
    <rect x="189" y="74" width="222" height="422" rx="28" fill="url(#screen-grad-${phone.id})"/>

    <!-- Wallpaper Geometry / Wave Details -->
    <path d="M 189 250 Q 240 190, 300 230 T 411 180 L 411 496 L 189 496 Z" fill="${phone.accentColor}" opacity="0.25"/>
    <path d="M 189 310 Q 250 270, 330 320 T 411 290 L 411 496 L 189 496 Z" fill="${phone.gradientA}" opacity="0.38"/>

    <!-- Screen Glass Glare Sheen -->
    <path d="M 191 76 L 330 76 L 230 494 L 191 494 Z" fill="#ffffff" opacity="0.04"/>

    <!-- Dynamic Island / Punch Hole -->
    <circle cx="300" cy="92" r="5" fill="#020406" stroke="#1e293b" stroke-width="1"/>
    <circle cx="301" cy="91" r="1.5" fill="#3b82f6" opacity="0.8"/>

    <!-- Ear Piece Speaker -->
    <rect x="285" y="78" width="30" height="2" rx="1" fill="#111827"/>

    <!-- Clock Widget -->
    <text x="300" y="150" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle" opacity="0.95">10:48</text>
    <text x="300" y="172" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#cbd5e1" text-anchor="middle" letter-spacing="1">OCTOBER 2026</text>

    <!-- Center Phone Badge Pill -->
    <g transform="translate(300, 280)">
      <rect x="-80" y="-18" width="160" height="36" rx="18" fill="#000000" fill-opacity="0.65" stroke="${phone.accentColor}" stroke-width="1.5"/>
      <text x="0" y="-1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#febd69" text-anchor="middle" letter-spacing="1.5">${phone.brand.toUpperCase()}</text>
      <text x="0" y="12" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="1">OCTOBER 2026 EDITION</text>
    </g>

    <!-- In-Display Fingerprint Glow -->
    <circle cx="300" cy="435" r="15" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.75"/>
    <circle cx="300" cy="435" r="5" fill="#38bdf8" opacity="0.25"/>
  </g>

  <!-- Angled Camera Dial Overlay Representing Rear Optic Island -->
  <g transform="translate(415, 105)" filter="url(#lens-shadow)">
    <rect x="-34" y="0" width="68" height="110" rx="16" fill="url(#body-grad-${phone.id})" stroke="#ffffff" stroke-width="1" stroke-opacity="0.5"/>
    <circle cx="0" cy="26" r="15" fill="url(#lens-grad)" stroke="${phone.accentColor}" stroke-width="1.5"/>
    <circle cx="0" cy="26" r="6" fill="#05080c" stroke="#3b82f6" stroke-width="0.8"/>
    <circle cx="0" cy="60" r="13" fill="url(#lens-grad)" stroke="${phone.accentColor}" stroke-width="1.5"/>
    <circle cx="0" cy="60" r="5" fill="#05080c" stroke="#38bdf8" stroke-width="0.8"/>
    <circle cx="0" cy="88" r="8" fill="url(#lens-grad)"/>
    <circle cx="14" cy="88" r="3" fill="#fef08a" stroke="#eab308" stroke-width="0.8"/>
  </g>

  <!-- Top Feature Tag Ribbon -->
  <g transform="translate(300, 42)">
    <rect x="-120" y="-13" width="240" height="26" rx="13" fill="#131921" stroke="#febd69" stroke-width="1"/>
    <text x="0" y="4" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="800" fill="#febd69" text-anchor="middle" letter-spacing="1">${phone.badge}</text>
  </g>

  <!-- Bottom Hardware Spec Label Pill -->
  <g transform="translate(300, 555)">
    <rect x="-160" y="-17" width="320" height="34" rx="17" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
    <text x="0" y="4" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#0f1111" text-anchor="middle">${phone.name}</text>
  </g>
</svg>`;
}

async function main() {
  console.log("=== UPDATING VN MOBILES CATALOG WITH OCTOBER 2026 PHONES ===");

  const phonesDir = path.join(process.cwd(), 'public', 'phones');
  if (!fs.existsSync(phonesDir)) {
    fs.mkdirSync(phonesDir, { recursive: true });
  }

  // 1. Generate SVGs
  console.log(`Generating ${NEW_PHONES_2026.length} studio-grade phone mockups in public/phones/...`);
  for (const phone of NEW_PHONES_2026) {
    const svgContent = generateSvg(phone);
    const svgPath = path.join(phonesDir, `${phone.id}.svg`);
    fs.writeFileSync(svgPath, svgContent, 'utf8');
  }
  console.log("✓ All SVG mockups created successfully.");

  // 2. Read existing catalog from src/lib/catalogData.ts
  const catalogFile = path.join(process.cwd(), 'src', 'lib', 'catalogData.ts');
  let currentProducts = [];
  try {
    const fileText = fs.readFileSync(catalogFile, 'utf8');
    const jsonMatch = fileText.match(/export const DEFAULT_PRODUCTS: MobileProductData\[\] = (\[[\s\S]*\]);/);
    if (jsonMatch) {
      currentProducts = eval(jsonMatch[1]);
    }
  } catch (e) {
    console.warn("Could not parse existing catalogData.ts, will re-create with new phones.");
  }

  // Filter out any existing matching IDs so we don't have duplicates
  const newIds = new Set(NEW_PHONES_2026.map(p => p.id));
  const remainingOld = currentProducts.filter(p => !newIds.has(p.id));

  // Build merged array with the new October 2026 phones at the top
  const formattedNew = NEW_PHONES_2026.map(phone => ({
    id: phone.id,
    name: phone.name,
    brand: phone.brand,
    series: phone.series,
    tagline: phone.tagline,
    basePrice: phone.price,
    originalPrice: phone.originalPrice,
    rating: phone.rating,
    reviewCount: phone.reviewCount,
    imageUrl: phone.imageUrl,
    galleryImages: [phone.imageUrl],
    colors: phone.colors,
    storageOptions: phone.storageOptions,
    ram: phone.ram,
    display: phone.displaySize,
    processor: phone.processor,
    camera: phone.camera,
    battery: phone.battery,
    os: phone.operatingSystem,
    network5G: "Dual 5G SIM (SA/NSA)",
    warrantyMonths: 12,
    inStock: true,
    stock: phone.stock,
    isFeatured: phone.isFeatured,
    highlightFeatures: phone.highlightFeatures,
  }));

  const allProducts = [...formattedNew, ...remainingOld];

  const tsContent = `import { MobileProductData } from "./types";\n\nexport const DEFAULT_PRODUCTS: MobileProductData[] = ${JSON.stringify(allProducts, null, 2)};\n`;
  fs.writeFileSync(catalogFile, tsContent, 'utf8');
  console.log(`✓ Updated src/lib/catalogData.ts with ${allProducts.length} total products (26 brand new October 2026 phones placed at the front).`);

  // 3. Upsert into SQLite database (both Mobile and MobileProduct tables)
  console.log("Upserting phones into SQLite database (Mobile and MobileProduct tables)...");

  for (const phone of NEW_PHONES_2026) {
    // Upsert into 'mobiles' table
    await prisma.mobile.upsert({
      where: { id: phone.id },
      update: {
        brand: phone.brand,
        model: phone.model,
        variant: phone.series,
        ram: phone.ram,
        storage: phone.storage,
        price: phone.price,
        imageUrl: phone.imageUrl,
        displaySize: phone.displaySize,
        processor: phone.processor,
        camera: phone.camera,
        battery: phone.battery,
        operatingSystem: phone.operatingSystem,
        description: phone.description,
        stock: phone.stock,
        rating: phone.rating,
        reviewCount: phone.reviewCount,
        originalPrice: phone.originalPrice,
      },
      create: {
        id: phone.id,
        brand: phone.brand,
        model: phone.model,
        variant: phone.series,
        ram: phone.ram,
        storage: phone.storage,
        price: phone.price,
        imageUrl: phone.imageUrl,
        displaySize: phone.displaySize,
        processor: phone.processor,
        camera: phone.camera,
        battery: phone.battery,
        operatingSystem: phone.operatingSystem,
        description: phone.description,
        stock: phone.stock,
        rating: phone.rating,
        reviewCount: phone.reviewCount,
        originalPrice: phone.originalPrice,
      },
    });

    // Upsert into 'MobileProduct' table
    await prisma.mobileProduct.upsert({
      where: { id: phone.id },
      update: {
        name: phone.name,
        brand: phone.brand,
        model: phone.model,
        series: phone.series,
        tagline: phone.tagline,
        basePrice: phone.price,
        originalPrice: phone.originalPrice,
        rating: phone.rating,
        reviewCount: phone.reviewCount,
        imageUrl: phone.imageUrl,
        galleryImages: JSON.stringify([phone.imageUrl]),
        colors: JSON.stringify(phone.colors),
        storageOptions: JSON.stringify(phone.storageOptions),
        ram: phone.ram,
        display: phone.displaySize,
        processor: phone.processor,
        camera: phone.camera,
        battery: phone.battery,
        os: phone.operatingSystem,
        network5G: "Dual 5G SIM (SA/NSA)",
        warrantyMonths: 12,
        inStock: true,
        stock: phone.stock,
        isFeatured: phone.isFeatured,
        highlightFeatures: JSON.stringify(phone.highlightFeatures),
      },
      create: {
        id: phone.id,
        name: phone.name,
        brand: phone.brand,
        model: phone.model,
        series: phone.series,
        tagline: phone.tagline,
        basePrice: phone.price,
        originalPrice: phone.originalPrice,
        rating: phone.rating,
        reviewCount: phone.reviewCount,
        imageUrl: phone.imageUrl,
        galleryImages: JSON.stringify([phone.imageUrl]),
        colors: JSON.stringify(phone.colors),
        storageOptions: JSON.stringify(phone.storageOptions),
        ram: phone.ram,
        display: phone.displaySize,
        processor: phone.processor,
        camera: phone.camera,
        battery: phone.battery,
        os: phone.operatingSystem,
        network5G: "Dual 5G SIM (SA/NSA)",
        warrantyMonths: 12,
        inStock: true,
        stock: phone.stock,
        isFeatured: phone.isFeatured,
        highlightFeatures: JSON.stringify(phone.highlightFeatures),
      },
    });
  }

  const finalMpCount = await prisma.mobileProduct.count();
  const finalMCount = await prisma.mobile.count();
  console.log(`✓ Database successfully updated! Total MobileProducts in DB: ${finalMpCount}, Mobiles in DB: ${finalMCount}`);
  console.log("=== CATALOG UPDATE COMPLETE ===");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

