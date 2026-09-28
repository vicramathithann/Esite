const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const catalog = [
  // ==========================================
  // APPLE
  // ==========================================
  {
    id: "iphone-16-pro-max",
    brand: "Apple",
    model: "iPhone 16 Pro Max",
    variant: "Desert Titanium",
    ram: "8GB",
    storage: "256GB / 512GB / 1TB",
    price: 144900,
    originalPrice: 159900,
    rating: 4.9,
    reviewCount: 380,
    imageUrl: "/phones/iphone-16-pro-max.jpg",
    displaySize: "6.9-inch Super Retina XDR OLED 120Hz ProMotion",
    processor: "Apple A18 Pro (3nm) with 6-core GPU & Apple Intelligence",
    camera: "48MP Fusion + 48MP Ultra-Wide + 12MP 5x Telephoto | 12MP TrueDepth",
    battery: "4685 mAh, 25W MagSafe Wireless & USB-C 3.0",
    operatingSystem: "iOS 18 with Apple Intelligence",
    description: "The ultimate iPhone. Forged in grade 5 titanium with thinner borders, A18 Pro chip, 48MP Fusion camera with Camera Control button, and unmatched battery endurance.",
    stock: 25,
    colors: [
      { name: "Desert Titanium", hex: "#cfb9a5" },
      { name: "Natural Titanium", hex: "#9e9a95" },
      { name: "White Titanium", hex: "#e3e4e5" },
      { name: "Black Titanium", hex: "#3b3a38" }
    ],
    storageOptions: [
      { size: "256GB", price: 144900 },
      { size: "512GB", price: 164900 },
      { size: "1TB", price: 184900 }
    ],
    highlightFeatures: [
      "Grade 5 Titanium frame with Camera Control sensor button",
      "Apple A18 Pro chip with 6-core GPU & hardware ray tracing",
      "48MP Fusion camera with 4K 120 fps Dolby Vision recording",
      "Industry-leading battery life up to 33 hours video playback"
    ]
  },
  {
    id: "iphone-16-pro",
    brand: "Apple",
    model: "iPhone 16 Pro",
    variant: "Natural Titanium",
    ram: "8GB",
    storage: "128GB / 256GB / 512GB",
    price: 119900,
    originalPrice: 129900,
    rating: 4.8,
    reviewCount: 290,
    imageUrl: "/phones/iphone-16-pro.jpg",
    displaySize: "6.3-inch Super Retina XDR OLED 120Hz ProMotion",
    processor: "Apple A18 Pro (3nm) with Neural Engine",
    camera: "48MP Fusion + 48MP Ultra-Wide + 12MP 5x Telephoto",
    battery: "3582 mAh, MagSafe & Qi2 Wireless",
    operatingSystem: "iOS 18 with Apple Intelligence",
    description: "Pro performance in a compact 6.3-inch titanium chassis. Features 5x optical telephoto, 48MP Ultra-wide macro, and dedicated Camera Control.",
    stock: 30,
    colors: [
      { name: "Natural Titanium", hex: "#9e9a95" },
      { name: "Desert Titanium", hex: "#cfb9a5" },
      { name: "Black Titanium", hex: "#3b3a38" }
    ],
    storageOptions: [
      { size: "128GB", price: 119900 },
      { size: "256GB", price: 129900 },
      { size: "512GB", price: 149900 }
    ],
    highlightFeatures: [
      "Compact 6.3-inch ProMotion display with ultra-thin bezels",
      "5x tetraprism optical zoom now standard on Pro",
      "A18 Pro silicon built for private Apple Intelligence",
      "Studio-quality 4-mic array with Audio Mix sound studio"
    ]
  },
  {
    id: "iphone-16-plus",
    brand: "Apple",
    model: "iPhone 16 Plus",
    variant: "Ultramarine",
    ram: "8GB",
    storage: "128GB / 256GB / 512GB",
    price: 89900,
    originalPrice: 99900,
    rating: 4.7,
    reviewCount: 210,
    imageUrl: "/phones/iphone-16-plus.jpg",
    displaySize: "6.7-inch Super Retina XDR OLED, Dynamic Island",
    processor: "Apple A18 (3nm) with 5-core GPU",
    camera: "48MP Fusion 2x Optical + 12MP Ultra-Wide with Macro",
    battery: "4674 mAh, All-day plus battery life",
    operatingSystem: "iOS 18",
    description: "Big screen, massive battery life, and vibrant color-infused back glass. Features Camera Control, Action button, and 48MP Fusion camera system.",
    stock: 40,
    colors: [
      { name: "Ultramarine", hex: "#445582" },
      { name: "Teal", hex: "#87a5a3" },
      { name: "Pink", hex: "#d88898" },
      { name: "Black", hex: "#1f2022" }
    ],
    storageOptions: [
      { size: "128GB", price: 89900 },
      { size: "256GB", price: 99900 },
      { size: "512GB", price: 119900 }
    ],
    highlightFeatures: [
      "Large 6.7-inch Super Retina XDR display with 2000 nits peak",
      "A18 chip with 16-core Neural Engine",
      "Camera Control button for instant visual intelligence",
      "Spatial photo and video capture for Apple Vision Pro"
    ]
  },
  {
    id: "iphone-16",
    brand: "Apple",
    model: "iPhone 16",
    variant: "Teal",
    ram: "8GB",
    storage: "128GB / 256GB",
    price: 79900,
    originalPrice: 89900,
    rating: 4.8,
    reviewCount: 340,
    imageUrl: "/phones/iphone-16.jpg",
    displaySize: "6.1-inch Super Retina XDR OLED, Dynamic Island",
    processor: "Apple A18 (3nm)",
    camera: "48MP Fusion 2x Telephoto + 12MP Ultra-Wide Macro",
    battery: "3561 mAh, Fast charge 50% in 30 mins",
    operatingSystem: "iOS 18",
    description: "Meet iPhone 16. Designed with Apple Intelligence, customizable Action button, Camera Control, and aerospace-grade aluminum with color-infused back glass.",
    stock: 45,
    colors: [
      { name: "Teal", hex: "#87a5a3" },
      { name: "Ultramarine", hex: "#445582" },
      { name: "Pink", hex: "#d88898" },
      { name: "White", hex: "#fafafa" },
      { name: "Black", hex: "#1f2022" }
    ],
    storageOptions: [
      { size: "128GB", price: 79900 },
      { size: "256GB", price: 89900 }
    ],
    highlightFeatures: [
      "Customizable Action button and new Camera Control",
      "Next-generation Photographic Styles with real-time tone controls",
      "Latest A18 chip with 30% faster CPU than iPhone 15",
      "Ceramic Shield 2x tougher than any other smartphone glass"
    ]
  },
  {
    id: "iphone-15",
    brand: "Apple",
    model: "iPhone 15",
    variant: "Blue",
    ram: "6GB",
    storage: "128GB / 256GB",
    price: 58999,
    originalPrice: 69900,
    rating: 4.7,
    reviewCount: 650,
    imageUrl: "/phones/iphone-15.jpg",
    displaySize: "6.1-inch Super Retina XDR OLED, Dynamic Island",
    processor: "Apple A16 Bionic (4nm)",
    camera: "48MP Main with 2x Telephoto + 12MP Ultra-Wide",
    battery: "3349 mAh, USB-C Charging",
    operatingSystem: "iOS 17 (Upgradable to iOS 18)",
    description: "Dynamic Island, 48MP Main camera, and durable color-infused glass design with USB-C universal connector.",
    stock: 50,
    colors: [
      { name: "Blue", hex: "#d3e0e6" },
      { name: "Black", hex: "#2b2b2d" },
      { name: "Green", hex: "#dbe4d5" }
    ],
    storageOptions: [
      { size: "128GB", price: 58999 },
      { size: "256GB", price: 68999 }
    ],
    highlightFeatures: [
      "Dynamic Island bubbles up alerts and Live Activities",
      "Super-high-resolution 48MP photos with 2x optical-quality zoom",
      "USB-C connector charges your iPhone, Mac, and iPad with one cable",
      "A16 Bionic chip powers computational photography"
    ]
  },

  // ==========================================
  // SAMSUNG
  // ==========================================
  {
    id: "samsung-galaxy-s24-ultra",
    brand: "Samsung",
    model: "Galaxy S24 Ultra",
    variant: "Titanium Gray",
    ram: "12GB",
    storage: "256GB / 512GB / 1TB",
    price: 129999,
    originalPrice: 139999,
    rating: 4.8,
    reviewCount: 420,
    imageUrl: "/phones/samsung-galaxy-s24-ultra.jpg",
    displaySize: "6.8-inch Dynamic AMOLED 2X 120Hz Flat, Gorilla Armor anti-reflective",
    processor: "Snapdragon 8 Gen 3 for Galaxy (4nm)",
    camera: "200MP OIS + 50MP 5x Periscope + 10MP 3x + 12MP Ultra-wide",
    battery: "5000 mAh, 45W Fast Wired + 15W Wireless",
    operatingSystem: "Android 14, One UI 6.1 (7 Years OS Updates)",
    description: "The apex of Android flagships with built-in S-Pen, titanium shield, anti-reflective Corning Gorilla Armor, and Galaxy AI live translate & Circle to Search.",
    stock: 35,
    colors: [
      { name: "Titanium Gray", hex: "#7a7876" },
      { name: "Titanium Black", hex: "#32302e" },
      { name: "Titanium Violet", hex: "#5b5063" },
      { name: "Titanium Yellow", hex: "#d8ceab" }
    ],
    storageOptions: [
      { size: "256GB", price: 129999 },
      { size: "512GB", price: 139999 },
      { size: "1TB", price: 159999 }
    ],
    highlightFeatures: [
      "Corning Gorilla Armor reduces 75% reflections on flat 6.8\" AMOLED",
      "Quad Telephoto system with 50MP 5x optical zoom & 100x Space Zoom",
      "Integrated S-Pen stylus for precision notes and drawing",
      "Galaxy AI suite with generative photo editing and live call translation"
    ]
  },
  {
    id: "samsung-galaxy-z-fold-6",
    brand: "Samsung",
    model: "Galaxy Z Fold 6",
    variant: "Silver Shadow",
    ram: "12GB",
    storage: "256GB / 512GB",
    price: 164999,
    originalPrice: 179999,
    rating: 4.8,
    reviewCount: 150,
    imageUrl: "/phones/samsung-galaxy-z-fold-6.png",
    displaySize: "7.6-inch Dynamic AMOLED 2X 120Hz Foldable + 6.3-inch Cover Screen",
    processor: "Snapdragon 8 Gen 3 for Galaxy (4nm)",
    camera: "50MP Dual Pixel OIS + 10MP 3x Telephoto + 12MP Ultra-wide",
    battery: "4400 mAh, 25W Fast Charging",
    operatingSystem: "Android 14, One UI 6.1.1 (7 Years OS Updates)",
    description: "Ultra-slim foldable power. Lighter, brighter, and tougher with IP48 water/dust resistance, Dual Screen Interpreter, and desktop-level multitasking.",
    stock: 15,
    colors: [
      { name: "Silver Shadow", hex: "#b5b7b9" },
      { name: "Navy", hex: "#1e293b" },
      { name: "Pink", hex: "#eed5d9" }
    ],
    storageOptions: [
      { size: "256GB", price: 164999 },
      { size: "512GB", price: 176999 }
    ],
    highlightFeatures: [
      "Zero-gap dual rail FlexHinge with Armor Aluminum frame",
      "Dual screen interpreter translates face-to-face across both displays",
      "Snapdragon 8 Gen 3 with 1.6x larger vapor chamber for ray-traced gaming",
      "7 years of major Android OS and security upgrades guaranteed"
    ]
  },
  {
    id: "samsung-galaxy-s24",
    brand: "Samsung",
    model: "Galaxy S24",
    variant: "Onyx Black",
    ram: "8GB",
    storage: "128GB / 256GB",
    price: 74999,
    originalPrice: 79999,
    rating: 4.7,
    reviewCount: 310,
    imageUrl: "/phones/samsung-galaxy-s24.jpg",
    displaySize: "6.2-inch Dynamic AMOLED 2X 1-120Hz LTPO, 2600 nits",
    processor: "Exynos 2400 Deca-Core / Snapdragon 8 Gen 3 (4nm)",
    camera: "50MP Dual Pixel OIS + 10MP 3x + 12MP Ultra-wide",
    battery: "4000 mAh, 25W Fast Charging",
    operatingSystem: "Android 14, One UI 6.1",
    description: "Compact flagship perfection. One-handed 6.2-inch LTPO AMOLED display with uniform bezels, Armor Aluminum 2, and full Galaxy AI capabilities.",
    stock: 40,
    colors: [
      { name: "Onyx Black", hex: "#222222" },
      { name: "Marble Gray", hex: "#d2d2d4" },
      { name: "Cobalt Violet", hex: "#494254" }
    ],
    storageOptions: [
      { size: "128GB", price: 74999 },
      { size: "256GB", price: 79999 }
    ],
    highlightFeatures: [
      "Pocket-friendly 167g lightweight build with satin Armor Aluminum",
      "1-120Hz LTPO Dynamic AMOLED 2X with Vision Booster up to 2600 nits",
      "50MP high-res camera with 2x and 3x optical quality zoom",
      "Full suite of Galaxy AI: Circle to Search, Note Assist, Photo Assist"
    ]
  },
  {
    id: "samsung-galaxy-s23-fe",
    brand: "Samsung",
    model: "Galaxy S23 FE",
    variant: "Mint",
    ram: "8GB",
    storage: "128GB / 256GB",
    price: 39999,
    originalPrice: 59999,
    rating: 4.6,
    reviewCount: 510,
    imageUrl: "/phones/samsung-galaxy-s23-fe.jpg",
    displaySize: "6.4-inch Dynamic AMOLED 2X 120Hz FHD+",
    processor: "Samsung Exynos 2200 (4nm)",
    camera: "50MP OIS + 8MP 3x Telephoto + 12MP Ultra-wide",
    battery: "4500 mAh, 25W Fast Charging",
    operatingSystem: "Android 14, One UI 6.1 with Galaxy AI",
    description: "Flagship DNA at an accessible price. Premium aluminum frame, Gorilla Glass 5, IP68 water resistance, and dedicated 3x telephoto zoom lens.",
    stock: 60,
    colors: [
      { name: "Mint", hex: "#a4cbb7" },
      { name: "Graphite", hex: "#353839" },
      { name: "Purple", hex: "#7a6279" }
    ],
    storageOptions: [
      { size: "128GB", price: 39999 },
      { size: "256GB", price: 44999 }
    ],
    highlightFeatures: [
      "True 3x optical zoom telephoto camera with Nightography",
      "Galaxy AI update brought Circle to Search and Live Translate",
      "IP68 dust and water resistance with aluminum frame",
      "Dynamic AMOLED 2X with Adaptive 120Hz refresh"
    ]
  },
  {
    id: "samsung-galaxy-a55-5g",
    brand: "Samsung",
    model: "Galaxy A55 5G",
    variant: "Awesome Iceblue",
    ram: "8GB / 12GB",
    storage: "128GB / 256GB",
    price: 36999,
    originalPrice: 42999,
    rating: 4.6,
    reviewCount: 390,
    imageUrl: "/phones/samsung-galaxy-a55-5g.jpg",
    displaySize: "6.6-inch FHD+ Super AMOLED 120Hz, Gorilla Glass Victus+",
    processor: "Samsung Exynos 1480 with AMD Xclipse 530 GPU",
    camera: "50MP OIS + 12MP Ultra-wide + 5MP Macro | 32MP Selfie",
    battery: "5000 mAh, 25W Fast Charging",
    operatingSystem: "Android 14, One UI 6.1 (4 OS Upgrades)",
    description: "Metal frame premium design meets Knox Vault security. Powered by Exynos 1480 with AMD GPU and vibrant 6.6-inch Super AMOLED screen.",
    stock: 70,
    colors: [
      { name: "Awesome Iceblue", hex: "#b4d3e8" },
      { name: "Awesome Navy", hex: "#232d3f" },
      { name: "Awesome Lilac", hex: "#d5cce6" }
    ],
    storageOptions: [
      { size: "128GB", price: 36999 },
      { size: "256GB", price: 39999 }
    ],
    highlightFeatures: [
      "Solid metallic frame with Corning Gorilla Glass Victus+ front & back",
      "Hardware-isolated Samsung Knox Vault security for biometrics & PINs",
      "Big 5000mAh battery with up to 2 days of real-world usage",
      "IP67 dust and water resistance rating"
    ]
  },
  {
    id: "samsung-galaxy-a35-5g",
    brand: "Samsung",
    model: "Galaxy A35 5G",
    variant: "Awesome Navy",
    ram: "8GB",
    storage: "128GB / 256GB",
    price: 27999,
    originalPrice: 33999,
    rating: 4.5,
    reviewCount: 280,
    imageUrl: "/phones/samsung-galaxy-a35-5g.jpg",
    displaySize: "6.6-inch FHD+ Super AMOLED 120Hz Infinity-O",
    processor: "Samsung Exynos 1380 5G (5nm)",
    camera: "50MP OIS + 8MP Ultra-wide + 5MP Macro",
    battery: "5000 mAh, 25W Fast Charging",
    operatingSystem: "Android 14, One UI 6.1",
    description: "Vibrant Infinity-O Super AMOLED 120Hz display with Key Island design, 50MP OIS camera, and IP67 water resistance.",
    stock: 75,
    colors: [
      { name: "Awesome Navy", hex: "#232d3f" },
      { name: "Awesome Iceblue", hex: "#b4d3e8" },
      { name: "Awesome Lemon", hex: "#f0e68c" }
    ],
    storageOptions: [
      { size: "128GB", price: 27999 },
      { size: "256GB", price: 30999 }
    ],
    highlightFeatures: [
      "6.6-inch Super AMOLED display with 1000 nits high-brightness mode",
      "50MP main sensor with optical image stabilization (OIS)",
      "4 generations of Android OS updates and 5 years of security patches",
      "IP67 water and dust resistance"
    ]
  },
  {
    id: "samsung-galaxy-m15-5g",
    brand: "Samsung",
    model: "Galaxy M15 5G",
    variant: "Celestial Blue",
    ram: "6GB",
    storage: "128GB",
    price: 12499,
    originalPrice: 15999,
    rating: 4.4,
    reviewCount: 680,
    imageUrl: "/phones/samsung-galaxy-m15-5g.jpg",
    displaySize: "6.5-inch Super AMOLED 90Hz FHD+ Display",
    processor: "MediaTek Dimensity 6100+ 5G (6nm)",
    camera: "50MP Main + 5MP Ultra-Wide + 2MP Macro | 13MP Selfie",
    battery: "6000 mAh Monster Battery, 25W Fast Charging",
    operatingSystem: "Android 14, One UI 6.0",
    description: "The segment's only Super AMOLED display paired with a massive 6000mAh battery for unmatched multi-day endurance.",
    stock: 90,
    colors: [
      { name: "Celestial Blue", hex: "#6389a8" },
      { name: "Stone Grey", hex: "#4b515d" },
      { name: "Blue Topaz", hex: "#35688f" }
    ],
    storageOptions: [
      { size: "128GB", price: 12499 }
    ],
    highlightFeatures: [
      "Segment-leading 6.5-inch Super AMOLED display with rich colors",
      "Massive 6000mAh battery lasting over 2 full days of heavy use",
      "MediaTek Dimensity 6100+ with 10 5G bands support",
      "4 OS updates & 5 years security patches promised"
    ]
  },

  // ==========================================
  // GOOGLE PIXEL
  // ==========================================
  {
    id: "google-pixel-9-pro-xl",
    brand: "Google Pixel",
    model: "Pixel 9 Pro XL",
    variant: "Obsidian",
    ram: "16GB",
    storage: "256GB / 512GB",
    price: 124999,
    originalPrice: 134999,
    rating: 4.8,
    reviewCount: 190,
    imageUrl: "/phones/google-pixel-9-pro-xl.jpg",
    displaySize: "6.8-inch Super Actua LTPO OLED 1-120Hz, 3000 nits peak",
    processor: "Google Tensor G4 with Titan M2 Coprocessor",
    camera: "50MP Octa PD + 48MP Quad PD 5x Telephoto + 48MP Ultra-wide with Macro Focus",
    battery: "5060 mAh, 37W Fast Wired + Fast Qi Wireless",
    operatingSystem: "Android 14 (7 Years OS, Security & Pixel Drops)",
    description: "Google's pinnacle AI smartphone. Tensor G4 chip with 16GB RAM for Gemini Nano multimodal intelligence, iconic camera bar with 30x Super Res Zoom, and sculpted matte glass.",
    stock: 25,
    colors: [
      { name: "Obsidian", hex: "#222325" },
      { name: "Porcelain", hex: "#f0eee9" },
      { name: "Hazel", hex: "#7d8471" },
      { name: "Rose Quartz", hex: "#e7d0d0" }
    ],
    storageOptions: [
      { size: "256GB", price: 124999 },
      { size: "512GB", price: 139999 }
    ],
    highlightFeatures: [
      "Google Tensor G4 built with DeepMind to run Gemini Nano on-device",
      "Pro triple camera with 8K Video Boost and Night Sight Video",
      "Add Me feature merges photos so everyone is in the group picture",
      "7 full years of Android OS updates, Pixel Feature Drops, and security"
    ]
  },
  {
    id: "google-pixel-9-pro",
    brand: "Google Pixel",
    model: "Pixel 9 Pro",
    variant: "Hazel",
    ram: "16GB",
    storage: "128GB / 256GB",
    price: 109999,
    originalPrice: 119999,
    rating: 4.8,
    reviewCount: 160,
    imageUrl: "/phones/google-pixel-9-pro.jpg",
    displaySize: "6.3-inch Super Actua LTPO OLED 1-120Hz, 3000 nits",
    processor: "Google Tensor G4 with Titan M2",
    camera: "50MP + 48MP 5x Telephoto + 48MP Ultra-wide | 42MP Dual PD Selfie",
    battery: "4700 mAh, 27W Fast Charging",
    operatingSystem: "Android 14 (7 Years Updates)",
    description: "All the pro cameras and Gemini AI capabilities of the XL in a compact, hand-friendly 6.3-inch design with silky matte glass and polished metal frame.",
    stock: 30,
    colors: [
      { name: "Hazel", hex: "#7d8471" },
      { name: "Porcelain", hex: "#f0eee9" },
      { name: "Obsidian", hex: "#222325" }
    ],
    storageOptions: [
      { size: "128GB", price: 109999 },
      { size: "256GB", price: 119999 }
    ],
    highlightFeatures: [
      "Compact 6.3-inch Super Actua display with pro 5x telephoto camera",
      "Pixel Studio generative AI image creator built directly into the phone",
      "42MP ultra-wide front camera with autofocus for crisp 4K selfies",
      "Guaranteed 7 years of Android OS and security upgrades"
    ]
  },
  {
    id: "google-pixel-9",
    brand: "Google Pixel",
    model: "Pixel 9",
    variant: "Peony",
    ram: "12GB",
    storage: "128GB / 256GB",
    price: 79999,
    originalPrice: 84999,
    rating: 4.7,
    reviewCount: 220,
    imageUrl: "/phones/google-pixel-9.jpg",
    displaySize: "6.3-inch Actua OLED 60-120Hz, 2700 nits peak",
    processor: "Google Tensor G4 with 12GB RAM",
    camera: "50MP Octa PD Main + 48MP Quad PD Ultra-wide with Macro",
    battery: "4700 mAh, 27W Fast Charging",
    operatingSystem: "Android 14 with Gemini",
    description: "Completely redesigned with satin metal and glossy glass back. Upgraded with 12GB RAM for snappy on-device AI, Magic Editor, and 48MP Ultra-wide sensor.",
    stock: 35,
    colors: [
      { name: "Peony", hex: "#f1abb8" },
      { name: "Wintergreen", hex: "#c4d8c8" },
      { name: "Porcelain", hex: "#f0eee9" },
      { name: "Obsidian", hex: "#222325" }
    ],
    storageOptions: [
      { size: "128GB", price: 79999 },
      { size: "256GB", price: 89999 }
    ],
    highlightFeatures: [
      "New modern industrial design with polished glass and satin edges",
      "Upgraded 48MP ultra-wide sensor delivers stunning macro shots",
      "Generative Magic Editor lets you reimagine backgrounds and lighting",
      "7 years of Pixel drops and software updates"
    ]
  },
  {
    id: "google-pixel-8a",
    brand: "Google Pixel",
    model: "Pixel 8a",
    variant: "Bay Blue",
    ram: "8GB",
    storage: "128GB / 256GB",
    price: 42999,
    originalPrice: 52999,
    rating: 4.6,
    reviewCount: 430,
    imageUrl: "/phones/google-pixel-8a.jpg",
    displaySize: "6.1-inch Actua OLED 120Hz, Corning Gorilla Glass 3",
    processor: "Google Tensor G3 with Titan M2",
    camera: "64MP Quad PD Main OIS + 13MP Ultra-Wide | 13MP Selfie",
    battery: "4492 mAh, 18W Fast Charging + Wireless Qi",
    operatingSystem: "Android 14 (7 Years OS Updates)",
    description: "The AI bargain. Premium matte composite back, rounded corners, Tensor G3 silicon, Best Take, Audio Magic Eraser, and 7 years of flagship support.",
    stock: 50,
    colors: [
      { name: "Bay Blue", hex: "#8db5df" },
      { name: "Aloe Green", hex: "#bad6b7" },
      { name: "Obsidian", hex: "#222325" }
    ],
    storageOptions: [
      { size: "128GB", price: 42999 },
      { size: "256GB", price: 47999 }
    ],
    highlightFeatures: [
      "Best Take feature combines similar group shots into one perfect photo",
      "Audio Magic Eraser cleans background street noise and wind from videos",
      "Smooth 120Hz refresh rate Actua display with 2000 nits peak brightness",
      "Full 7-year software update roadmap identical to flagship models"
    ]
  },

  // ==========================================
  // ONEPLUS
  // ==========================================
  {
    id: "oneplus-13",
    brand: "OnePlus",
    model: "OnePlus 13",
    variant: "Midnight Black",
    ram: "16GB",
    storage: "256GB / 512GB",
    price: 69999,
    originalPrice: 76999,
    rating: 4.9,
    reviewCount: 140,
    imageUrl: "/phones/oneplus-13.jpg",
    displaySize: "6.82-inch 2K Oriental LTPO OLED 120Hz, DisplayMate A++",
    processor: "Snapdragon 8 Elite (3nm) Oryon CPU up to 4.32GHz",
    camera: "50MP Sony LYT-808 OIS + 50MP Periscope 3x + 50MP Ultra-wide Hasselblad",
    battery: "6000 mAh Glacier Silicon-Carbon Battery, 100W SuperVOOC + 50W AIRVOOC",
    operatingSystem: "OxygenOS 15 based on Android 15",
    description: "Next-generation powerhouse. Powered by Snapdragon 8 Elite, massive 6000mAh Glacier battery, IP68/IP69 water resistance, and triple 50MP Hasselblad optics.",
    stock: 40,
    colors: [
      { name: "Midnight Black", hex: "#1c1d1f" },
      { name: "Arctic Dawn White", hex: "#f2f4f7" },
      { name: "Emerald Green", hex: "#1f4339" }
    ],
    storageOptions: [
      { size: "256GB", price: 69999 },
      { size: "512GB", price: 76999 }
    ],
    highlightFeatures: [
      "Snapdragon 8 Elite octa-core CPU breaking Antutu 3 Million mark",
      "Huge 6000mAh Silicon-Carbon battery with 100W flash charging",
      "IP68 + IP69 dual certified against high-pressure hot water jets",
      "New micro-curved 2K Oriental display readable even with wet hands"
    ]
  },
  {
    id: "oneplus-12",
    brand: "OnePlus",
    model: "OnePlus 12",
    variant: "Flowy Emerald",
    ram: "12GB",
    storage: "256GB / 512GB",
    price: 64999,
    originalPrice: 69999,
    rating: 4.8,
    reviewCount: 380,
    imageUrl: "/phones/oneplus-12.jpg",
    displaySize: "6.82-inch 2K 120Hz ProXDR Display, 4500 nits",
    processor: "Snapdragon 8 Gen 3 (4nm) with Dual Cryo-velocity VC",
    camera: "50MP Sony LYT-808 OIS + 64MP 3x Periscope Telephoto + 48MP Ultra-wide Hasselblad",
    battery: "5400 mAh, 100W SuperVOOC Wired + 50W AIRVOOC Wireless",
    operatingSystem: "OxygenOS 14 based on Android 14",
    description: "Flagship all-rounder with 4th Gen Hasselblad camera, revolutionary 4500 nits display, Dual Cryo-velocity vapor chamber, and blazing 100W charging.",
    stock: 55,
    colors: [
      { name: "Flowy Emerald", hex: "#2b5e48" },
      { name: "Silky Black", hex: "#202224" }
    ],
    storageOptions: [
      { size: "256GB", price: 64999 },
      { size: "512GB", price: 69999 }
    ],
    highlightFeatures: [
      "Sony LYT-808 sensor delivers exceptional dynamic range with Hasselblad color",
      "Omni-bearing Dual Cryo-velocity VC cooling (9140 mm²) keeps frame rates locked",
      "5400mAh battery charges to 100% in just 26 minutes",
      "Aqua Touch allows reliable screen inputs in pouring rain"
    ]
  },
  {
    id: "oneplus-12r",
    brand: "OnePlus",
    model: "OnePlus 12R",
    variant: "Cool Blue",
    ram: "8GB / 16GB",
    storage: "128GB / 256GB",
    price: 39999,
    originalPrice: 42999,
    rating: 4.7,
    reviewCount: 520,
    imageUrl: "/phones/oneplus-12r.jpg",
    displaySize: "6.78-inch 1.5K LTPO4 AMOLED 1-120Hz, 4500 nits peak",
    processor: "Snapdragon 8 Gen 2 (4nm)",
    camera: "50MP Sony IMX890 OIS + 8MP Ultra-wide + 2MP Macro",
    battery: "5500 mAh, 100W SuperVOOC",
    operatingSystem: "OxygenOS 14",
    description: "The performance flagship. Features the largest battery in any OnePlus phone, Snapdragon 8 Gen 2 gaming chip, 1.5K 4th Gen LTPO display, and 100W charging.",
    stock: 65,
    colors: [
      { name: "Cool Blue", hex: "#6fa1d2" },
      { name: "Iron Gray", hex: "#3b3d40" }
    ],
    storageOptions: [
      { size: "128GB", price: 39999 },
      { size: "256GB", price: 42999 }
    ],
    highlightFeatures: [
      "Snapdragon 8 Gen 2 flagship chip with Trinity Engine optimization",
      "Massive 5500mAh battery delivers up to 2 days of endurance",
      "World-first 4th Gen LTPO 1-120Hz screen adjusts refresh in 1ms",
      "100W fast charging recharges the entire 5500mAh cell in 26 minutes"
    ]
  },
  {
    id: "oneplus-nord-4",
    brand: "OnePlus",
    model: "OnePlus Nord 4 5G",
    variant: "Mercurial Silver",
    ram: "8GB / 12GB",
    storage: "128GB / 256GB",
    price: 29999,
    originalPrice: 32999,
    rating: 4.6,
    reviewCount: 310,
    imageUrl: "/phones/oneplus-nord-4.jpg",
    displaySize: "6.74-inch 1.5K 120Hz Ultra-bright AMOLED, 2150 nits",
    processor: "Snapdragon 7+ Gen 3 5G (4nm)",
    camera: "50MP Sony LYT-600 OIS + 8MP Ultra-wide | 16MP Selfie",
    battery: "5500 mAh, 100W SuperVOOC Fast Charging",
    operatingSystem: "OxygenOS 14.1 (4 OS Upgrades Guaranteed)",
    description: "The only all-metal unibody smartphone in the 5G era. Precision crafted from single aluminum plate with Snapdragon 7+ Gen 3 and 100W charging.",
    stock: 70,
    colors: [
      { name: "Mercurial Silver", hex: "#c8ccd0" },
      { name: "Oasis Green", hex: "#7da88e" },
      { name: "Obsidian Midnight", hex: "#1f2124" }
    ],
    storageOptions: [
      { size: "128GB", price: 29999 },
      { size: "256GB", price: 32999 }
    ],
    highlightFeatures: [
      "Sleek 7.99mm full-metal unibody chassis with nano-etched textures",
      "Snapdragon 7+ Gen 3 chip sharing Cortex-X4 architecture with 8 Gen 3",
      "5500mAh battery keeps over 80% health after 4 years of daily charges",
      "4 major Android OS updates & 6 years of security patches"
    ]
  },
  {
    id: "oneplus-nord-ce4-lite",
    brand: "OnePlus",
    model: "OnePlus Nord CE4 Lite 5G",
    variant: "Mega Blue",
    ram: "8GB",
    storage: "128GB",
    price: 17999,
    originalPrice: 20999,
    rating: 4.5,
    reviewCount: 450,
    imageUrl: "/phones/oneplus-nord-ce4-lite.jpg",
    displaySize: "6.67-inch AMOLED 120Hz, 2100 nits peak, Aqua Touch",
    processor: "Qualcomm Snapdragon 695 5G (6nm)",
    camera: "50MP Sony LYT-600 OIS + 2MP Depth Camera",
    battery: "5500 mAh, 80W SuperVOOC + 5W Reverse Charging",
    operatingSystem: "OxygenOS 14 based on Android 14",
    description: "Segment-shattering 2100 nits AMOLED screen with Aqua Touch, Sony LYT-600 OIS camera, 5500mAh battery, and 80W flash charging in the box.",
    stock: 80,
    colors: [
      { name: "Mega Blue", hex: "#1c60be" },
      { name: "Super Silver", hex: "#d8dce2" }
    ],
    storageOptions: [
      { size: "128GB", price: 17999 }
    ],
    highlightFeatures: [
      "Class-leading 2100 nits peak brightness 120Hz AMOLED display",
      "Sony LYT-600 50MP sensor with optical image stabilization (OIS)",
      "Huge 5500mAh battery with 80W charging reaching full in 52 mins",
      "300% Ultra Volume Mode dual stereo speakers & 3.5mm audio jack"
    ]
  },

  // ==========================================
  // XIAOMI & REDMI
  // ==========================================
  {
    id: "xiaomi-14-ultra",
    brand: "Xiaomi",
    model: "Xiaomi 14 Ultra",
    variant: "White Photography Edition",
    ram: "16GB",
    storage: "512GB",
    price: 99999,
    originalPrice: 119999,
    rating: 4.8,
    reviewCount: 180,
    imageUrl: "/phones/xiaomi-14-ultra.jpg",
    displaySize: "6.73-inch WQHD+ 120Hz LTPO AMOLED, 3000 nits",
    processor: "Snapdragon 8 Gen 3 (4nm) with Dual-Channel IceLoop",
    camera: "Leica Quad 50MP: 1-inch LYT-900 Stepless f/1.63-f/4.0 + 50MP 3.2x Tele + 50MP 5x Periscope + 50MP Ultra-wide",
    battery: "5000 mAh, 90W HyperCharge + 80W Wireless",
    operatingSystem: "Xiaomi HyperOS based on Android 14",
    description: "The camera milestone. 1-inch Sony LYT-900 sensor with variable stepless aperture, Quad 50MP Leica Summilux lenses, and professional 8K all-camera video.",
    stock: 20,
    colors: [
      { name: "White Vegan Leather", hex: "#f0ede8" },
      { name: "Black Vegan Leather", hex: "#222325" }
    ],
    storageOptions: [
      { size: "512GB", price: 99999 }
    ],
    highlightFeatures: [
      "1-inch Sony LYT-900 sensor with mechanical 1024-step variable aperture",
      "Quad 50MP Leica optics covering 12mm to 120mm focal lengths",
      "Dual-Channel IceLoop cooling pump separates SoC and camera cooling",
      "Titanium-like Xiaomi Shield Glass with 10x higher drop resistance"
    ]
  },
  {
    id: "xiaomi-14",
    brand: "Xiaomi",
    model: "Xiaomi 14",
    variant: "Jade Green",
    ram: "12GB",
    storage: "512GB",
    price: 59999,
    originalPrice: 69999,
    rating: 4.7,
    reviewCount: 260,
    imageUrl: "/phones/xiaomi-14.jpg",
    displaySize: "6.36-inch 1.5K LTPO AMOLED 1-120Hz, 3000 nits, ultra-narrow 1.61mm bezels",
    processor: "Snapdragon 8 Gen 3 (4nm)",
    camera: "Leica Triple 50MP: Light Fusion 900 OIS + 50MP 75mm Floating Telephoto + 50MP Ultra-wide",
    battery: "4610 mAh, 90W Wired + 50W Wireless HyperCharge",
    operatingSystem: "Xiaomi HyperOS",
    description: "Compact flagship mastery. 6.36-inch 1.5K screen with 1.61mm razor bezels, Leica 75mm floating telephoto macro lens, and 90W charging.",
    stock: 45,
    colors: [
      { name: "Jade Green", hex: "#5a7a67" },
      { name: "Black", hex: "#202124" },
      { name: "White", hex: "#f5f5f7" }
    ],
    storageOptions: [
      { size: "512GB", price: 59999 }
    ],
    highlightFeatures: [
      "Compact 6.36-inch design with symmetrical 1.61mm ultra-thin borders",
      "Leica 75mm floating telephoto focuses from 10cm macro to infinity",
      "Snapdragon 8 Gen 3 flagship platform with IceLoop thermal system",
      "90W wired HyperCharge tops up from 0 to 100% in 31 minutes"
    ]
  },
  {
    id: "redmi-note-13-pro-plus",
    brand: "Redmi",
    model: "Redmi Note 13 Pro+ 5G",
    variant: "Fusion Purple",
    ram: "8GB / 12GB",
    storage: "256GB / 512GB",
    price: 30999,
    originalPrice: 35999,
    rating: 4.6,
    reviewCount: 580,
    imageUrl: "/phones/redmi-note-13-pro-plus.jpg",
    displaySize: "6.67-inch 1.5K 120Hz 3D Curved AMOLED, Gorilla Glass Victus",
    processor: "MediaTek Dimensity 7200-Ultra (4nm)",
    camera: "200MP Samsung ISOCELL HP3 OIS + 8MP Ultra-wide + 2MP Macro",
    battery: "5000 mAh, 120W HyperCharge (19 mins full)",
    operatingSystem: "Xiaomi HyperOS",
    description: "Redmi's first IP68 rated curved screen smartphone. Packs a 200MP OIS camera with 4x lossless sensor zoom and 120W charging.",
    stock: 70,
    colors: [
      { name: "Fusion Purple Vegan Leather", hex: "#9b8ba9" },
      { name: "Fusion Black", hex: "#242528" },
      { name: "Fusion White", hex: "#f0f0f2" }
    ],
    storageOptions: [
      { size: "256GB", price: 30999 },
      { size: "512GB", price: 33999 }
    ],
    highlightFeatures: [
      "200MP main camera with in-sensor 4x lossless zoom and OIS",
      "Flagship 120W HyperCharge recharges full 5000mAh battery in 19 mins",
      "IP68 dust and water resistance with 3D curved 1.5K AMOLED display",
      "Corning Gorilla Glass Victus with in-display heart rate detection"
    ]
  },
  {
    id: "redmi-13c-5g",
    brand: "Redmi",
    model: "Redmi 13C 5G",
    variant: "Starfrost Green",
    ram: "4GB / 6GB",
    storage: "128GB",
    price: 10499,
    originalPrice: 13999,
    rating: 4.4,
    reviewCount: 720,
    imageUrl: "/phones/redmi-13c-5g.jpg",
    displaySize: "6.74-inch HD+ 90Hz Dynamic Refresh, Corning Gorilla Glass",
    processor: "MediaTek Dimensity 6100+ 5G (6nm)",
    camera: "50MP f/1.8 AI Dual Camera | 5MP Selfie",
    battery: "5000 mAh, 18W Fast Charging",
    operatingSystem: "MIUI 14 based on Android 13",
    description: "India's accessible 5G superstar. Star Trail design with 50MP AI Dual Camera, smooth 90Hz display, and 5000mAh battery.",
    stock: 100,
    colors: [
      { name: "Starfrost Green", hex: "#385e50" },
      { name: "Starlight Black", hex: "#1a1a1a" },
      { name: "Startrail Silver", hex: "#d1d5db" }
    ],
    storageOptions: [
      { size: "128GB", price: 10499 }
    ],
    highlightFeatures: [
      "MediaTek Dimensity 6100+ processor with Antutu 400K+ benchmark",
      "50MP AI primary camera with portrait and night shooting modes",
      "Massive 5000mAh battery with Type-C 18W charging support",
      "Dual 5G SIM standby with side-mounted fingerprint unlock"
    ]
  },

  // ==========================================
  // REALME
  // ==========================================
  {
    id: "realme-gt-6",
    brand: "Realme",
    model: "Realme GT 6",
    variant: "Fluid Silver",
    ram: "8GB / 12GB / 16GB",
    storage: "256GB / 512GB",
    price: 40999,
    originalPrice: 44999,
    rating: 4.7,
    reviewCount: 340,
    imageUrl: "/phones/realme-gt-6.jpg",
    displaySize: "6.78-inch 1.5K 8T LTPO 120Hz, 6000 nits peak brightness",
    processor: "Snapdragon 8s Gen 3 (4nm) with Iceberg Vapor Cooling",
    camera: "50MP Sony LYT-808 OIS + 50MP 2x Telephoto + 8MP Ultra-wide",
    battery: "5500 mAh, 120W SUPERVOOC (50% in 10 mins)",
    operatingSystem: "Realme UI 5.0 based on Android 14",
    description: "The AI flagship killer. World-record 6000 nits 8T LTPO display, Snapdragon 8s Gen 3 chip, Sony LYT-808 optics, and 120W charge.",
    stock: 50,
    colors: [
      { name: "Fluid Silver", hex: "#c0c4c8" },
      { name: "Razor Green", hex: "#233d31" }
    ],
    storageOptions: [
      { size: "256GB", price: 40999 },
      { size: "512GB", price: 44999 }
    ],
    highlightFeatures: [
      "Record-breaking 6000 nits peak brightness display with SGS eye protection",
      "Snapdragon 8s Gen 3 processor achieves over 1.6 Million Antutu score",
      "Sony LYT-808 50MP sensor with HyperTone image engine",
      "120W SUPERVOOC recharges 5500mAh cell to 50% in just 10 minutes"
    ]
  },
  {
    id: "realme-12-pro-5g",
    brand: "Realme",
    model: "Realme 12 Pro+ 5G",
    variant: "Submarine Blue",
    ram: "8GB / 12GB",
    storage: "256GB",
    price: 29999,
    originalPrice: 34999,
    rating: 4.6,
    reviewCount: 460,
    imageUrl: "/phones/realme-12-pro-5g.jpg",
    displaySize: "6.7-inch FHD+ 120Hz Curved OLED, 2160Hz PWM Dimming",
    processor: "Snapdragon 7s Gen 2 (4nm)",
    camera: "64MP Periscope Portrait 3x OIS + 50MP Sony IMX890 OIS + 8MP Ultra-wide",
    battery: "5000 mAh, 67W SUPERVOOC",
    operatingSystem: "Realme UI 5.0",
    description: "Luxury watch design by Ollivier Saveo. Flagship 64MP periscope telephoto lens with 120x SuperZoom and Sony IMX890 sensor.",
    stock: 65,
    colors: [
      { name: "Submarine Blue", hex: "#1f3b5c" },
      { name: "Navigator Beige", hex: "#d8cca3" }
    ],
    storageOptions: [
      { size: "256GB", price: 29999 }
    ],
    highlightFeatures: [
      "Omni-directional 64MP periscope telephoto camera with 3x optical & 120x digital zoom",
      "Swiss luxury watch inspired fluted bezel and premium vegan leather finish",
      "Sony IMX890 50MP OIS sensor for crisp nighttime portrait shots",
      "120Hz curved AMOLED display with 2160Hz high-frequency eye protection"
    ]
  },
  {
    id: "realme-narzo-70x-5g",
    brand: "Realme",
    model: "Realme Narzo 70x 5G",
    variant: "Ice Blue",
    ram: "6GB",
    storage: "128GB",
    price: 11999,
    originalPrice: 14999,
    rating: 4.5,
    reviewCount: 610,
    imageUrl: "/phones/realme-narzo-70x-5g.jpg",
    displaySize: "6.72-inch FHD+ 120Hz Ultra Smooth Display",
    processor: "MediaTek Dimensity 6100+ 5G (6nm)",
    camera: "50MP AI Primary Camera + 2MP Depth | 8MP Selfie",
    battery: "5000 mAh, 45W SUPERVOOC Fast Charge",
    operatingSystem: "Realme UI 5.0 based on Android 14",
    description: "Fastest charging 5G phone under 12K. 45W SUPERVOOC, smooth 120Hz FHD+ display, IP54 dust and splash proof rating, and stereo speakers.",
    stock: 90,
    colors: [
      { name: "Ice Blue", hex: "#a4c4de" },
      { name: "Forest Green", hex: "#3b5c47" }
    ],
    storageOptions: [
      { size: "128GB", price: 11999 }
    ],
    highlightFeatures: [
      "Class-leading 45W SUPERVOOC charges 50% in approximately 30 minutes",
      "Silky smooth 120Hz FHD+ screen with dynamic refresh rate switching",
      "IP54 dust and splash water protection with Rainwater Smart Touch",
      "Dual stereo speakers with Hi-Res audio certification"
    ]
  },

  // ==========================================
  // VIVO
  // ==========================================
  {
    id: "vivo-x100-pro",
    brand: "Vivo",
    model: "Vivo X100 Pro",
    variant: "Asteroid Black",
    ram: "16GB",
    storage: "512GB",
    price: 89999,
    originalPrice: 96999,
    rating: 4.8,
    reviewCount: 190,
    imageUrl: "/phones/vivo-x100-pro.jpg",
    displaySize: "6.78-inch 1.5K LTPO AMOLED 120Hz, 3000 nits, Zeiss T*",
    processor: "MediaTek Dimensity 9300 (4nm) + Vivo V3 Imaging Chip",
    camera: "50MP 1-inch Sony IMX989 OIS + 50MP Zeiss APO Floating Telephoto + 50MP Ultra-wide",
    battery: "5400 mAh BlueVolt Battery, 100W FlashCharge + 50W Wireless",
    operatingSystem: "Funtouch OS 14 based on Android 14",
    description: "Co-engineered with Zeiss. Features the revolutionary Zeiss APO certified floating telephoto lens, 1-inch main sensor, and 4K cinematic portrait video.",
    stock: 25,
    colors: [
      { name: "Asteroid Black", hex: "#1f2022" },
      { name: "Sunset Orange", hex: "#e26d36" }
    ],
    storageOptions: [
      { size: "512GB", price: 89999 }
    ],
    highlightFeatures: [
      "Zeiss APO floating periscope camera achieves true chromatic aberration correction",
      "1-inch Sony IMX989 sensor with Zeiss T* anti-reflective optical lens coating",
      "Vivo V3 6nm custom imaging chip enables 4K Movie Portrait video",
      "5400mAh high-density BlueVolt battery with 100W dual-cell flash charging"
    ]
  },
  {
    id: "vivo-v40-pro-5g",
    brand: "Vivo",
    model: "Vivo V40 Pro 5G",
    variant: "Ganges Blue",
    ram: "8GB / 12GB",
    storage: "256GB / 512GB",
    price: 49999,
    originalPrice: 54999,
    rating: 4.7,
    reviewCount: 320,
    imageUrl: "/phones/vivo-v40-pro-5g.jpg",
    displaySize: "6.78-inch 1.5K 120Hz 3D Curved AMOLED, 4500 nits peak",
    processor: "MediaTek Dimensity 9200+ (4nm)",
    camera: "Zeiss 50MP Sony IMX921 OIS + 50MP 2x Telephoto + 50MP Ultra-wide + 50MP Group Selfie",
    battery: "5500 mAh BlueVolt Battery, 80W FlashCharge",
    operatingSystem: "Funtouch OS 14",
    description: "All 50MP Zeiss Quad-Camera setup with Smart Aura Light. Ultra-slim 7.58mm 3D curved body housing a mammoth 5500mAh BlueVolt battery and IP68 rating.",
    stock: 45,
    colors: [
      { name: "Ganges Blue", hex: "#3a6b88" },
      { name: "Titanium Grey", hex: "#72777f" }
    ],
    storageOptions: [
      { size: "256GB", price: 49999 },
      { size: "512GB", price: 54999 }
    ],
    highlightFeatures: [
      "Quad 50MP Zeiss camera system including 50MP autofocus front selfie lens",
      "Smart Aura Light portrait system dynamically adjusts color temperature",
      "Slim 7.58mm curved body with IP68/IP69 dual water resistance",
      "MediaTek Dimensity 9200+ flagship grade silicon with Antutu 1.5M+"
    ]
  },
  {
    id: "vivo-t3-5g",
    brand: "Vivo",
    model: "Vivo T3 5G",
    variant: "Cosmic Blue",
    ram: "8GB",
    storage: "128GB / 256GB",
    price: 19999,
    originalPrice: 22999,
    rating: 4.5,
    reviewCount: 480,
    imageUrl: "/phones/vivo-t3-5g.jpg",
    displaySize: "6.67-inch FHD+ AMOLED 120Hz, 1800 nits, In-display Fingerprint",
    processor: "MediaTek Dimensity 7200 5G (4nm)",
    camera: "50MP Sony IMX882 OIS + 2MP Bokeh Camera | 16MP Selfie",
    battery: "5000 mAh, 44W FlashCharge",
    operatingSystem: "Funtouch OS 14",
    description: "Fastest phone in the segment with 734K+ Antutu score. Vibrant 120Hz AMOLED display, Sony OIS camera, and stereo speakers.",
    stock: 80,
    colors: [
      { name: "Cosmic Blue", hex: "#224270" },
      { name: "Crystal Flake", hex: "#b4d8e8" }
    ],
    storageOptions: [
      { size: "128GB", price: 19999 },
      { size: "256GB", price: 21999 }
    ],
    highlightFeatures: [
      "MediaTek Dimensity 7200 4nm processor leading performance under ₹20,000",
      "Sony IMX882 50MP OIS sensor for super-steady night photos and 4K video",
      "Ultra-bright 1800 nits 120Hz AMOLED panel with in-display fingerprint sensor",
      "Dual stereo speakers with audio booster"
    ]
  },

  // ==========================================
  // MOTOROLA
  // ==========================================
  {
    id: "motorola-edge-50-ultra",
    brand: "Motorola",
    model: "Motorola Edge 50 Ultra",
    variant: "Nordic Wood",
    ram: "16GB",
    storage: "512GB",
    price: 59999,
    originalPrice: 64999,
    rating: 4.7,
    reviewCount: 160,
    imageUrl: "/phones/motorola-edge-50-ultra.jpg",
    displaySize: "6.7-inch 1.5K Super HD pOLED 144Hz Pantone Validated",
    processor: "Snapdragon 8s Gen 3 (4nm) with Moto AI",
    camera: "50MP OIS + 64MP 3x Periscope OIS + 50MP Ultra-wide/Macro | 50MP Selfie",
    battery: "4500 mAh, 125W TurboPower + 50W Wireless Charging",
    operatingSystem: "Hello UI based on Android 14",
    description: "Handcrafted real wood back edition. World's first Pantone validated camera and display, 144Hz pOLED, 125W charging, and IP68 underwater protection.",
    stock: 35,
    colors: [
      { name: "Nordic Wood", hex: "#ba9f83" },
      { name: "Peach Fuzz Pantone", hex: "#fdb597" },
      { name: "Forest Grey Vegan Leather", hex: "#3c4342" }
    ],
    storageOptions: [
      { size: "512GB", price: 59999 }
    ],
    highlightFeatures: [
      "Genuine FSC-certified real wood back finish infused with subtle fragrance",
      "Triple 50MP/64MP camera system with Pantone validated colors and skin tones",
      "144Hz 1.5K curved pOLED display with Gorilla Glass Victus",
      "125W wired TurboPower plus 50W wireless charging capability"
    ]
  },
  {
    id: "motorola-edge-50-pro",
    brand: "Motorola",
    model: "Motorola Edge 50 Pro",
    variant: "Luxe Lavender",
    ram: "12GB",
    storage: "256GB",
    price: 31999,
    originalPrice: 36999,
    rating: 4.6,
    reviewCount: 380,
    imageUrl: "/phones/motorola-edge-50-pro.jpg",
    displaySize: "6.7-inch 1.5K 144Hz 3D Curved pOLED, 2000 nits peak",
    processor: "Snapdragon 7 Gen 3 (4nm)",
    camera: "50MP f/1.4 OIS + 10MP 3x Telephoto + 13MP Ultra-wide/Macro | 50MP Autofocus Selfie",
    battery: "4500 mAh, 125W TurboPower + 50W Wireless",
    operatingSystem: "Hello UI based on Android 14",
    description: "Segment's most stylish curved phone. Silicone vegan leather, aluminum frame, 125W wired + 50W wireless charging, and 50MP f/1.4 camera.",
    stock: 60,
    colors: [
      { name: "Luxe Lavender", hex: "#a49bb5" },
      { name: "Moonlight Pearl Handcrafted", hex: "#eae6df" },
      { name: "Black Beauty", hex: "#232427" }
    ],
    storageOptions: [
      { size: "256GB", price: 31999 }
    ],
    highlightFeatures: [
      "True 144Hz 1.5K curved pOLED with 100% DCI-P3 color gamut",
      "50MP primary sensor with widest-in-segment f/1.4 aperture for low light",
      "Rare in segment 50W wireless charging support + 125W wired charging",
      "IP68 underwater protection with aircraft-grade aluminum frame"
    ]
  },
  {
    id: "moto-g34-5g",
    brand: "Motorola",
    model: "Motorola Moto G34 5G",
    variant: "Ocean Green",
    ram: "8GB",
    storage: "128GB",
    price: 11999,
    originalPrice: 14999,
    rating: 4.5,
    reviewCount: 520,
    imageUrl: "/phones/moto-g34-5g.jpg",
    displaySize: "6.5-inch HD+ 120Hz Display with Dolby Atmos stereo",
    processor: "Snapdragon 695 5G (6nm)",
    camera: "50MP Quad Pixel + 2MP Macro | 16MP Selfie",
    battery: "5000 mAh, 20W TurboPower",
    operatingSystem: "Android 14 Clean UI",
    description: "India's most affordable Snapdragon 5G. Vegan leather luxury with 120Hz display, clean ad-free software, and Moto Gestures.",
    stock: 90,
    colors: [
      { name: "Ocean Green Vegan Leather", hex: "#2b585c" },
      { name: "Charcoal Black", hex: "#1f2122" },
      { name: "Ice Blue", hex: "#a2c1db" }
    ],
    storageOptions: [
      { size: "128GB", price: 11999 }
    ],
    highlightFeatures: [
      "Qualcomm Snapdragon 695 5G processor with 13 5G bands",
      "Premium soft vegan leather finish on back panel",
      "Smooth 120Hz display with stereo speakers tuned by Dolby Atmos",
      "Clean pure Android 14 interface with zero bloatware or adware"
    ]
  },

  // ==========================================
  // NOTHING
  // ==========================================
  {
    id: "nothing-phone-2a-plus",
    brand: "Nothing",
    model: "Nothing Phone (2a) Plus",
    variant: "Metallic Grey",
    ram: "8GB / 12GB",
    storage: "256GB",
    price: 27999,
    originalPrice: 29999,
    rating: 4.7,
    reviewCount: 220,
    imageUrl: "/phones/nothing-phone-2a-plus.jpg",
    displaySize: "6.7-inch Flexible AMOLED 120Hz, 1300 nits, Glyph Interface",
    processor: "MediaTek Dimensity 7350 Pro 5G (4nm)",
    camera: "50MP Samsung GN9 OIS + 50MP Ultra-wide | 50MP 4K Selfie",
    battery: "5000 mAh, 50W Fast Charging",
    operatingSystem: "Nothing OS 2.6 based on Android 14",
    description: "Upgraded metallic finish with iconic Glyph lighting. Dimensity 7350 Pro 5G chip, triple 50MP camera setup (including 50MP selfie), and clean Nothing OS.",
    stock: 50,
    colors: [
      { name: "Metallic Grey", hex: "#63676c" },
      { name: "Metallic Black", hex: "#222326" }
    ],
    storageOptions: [
      { size: "256GB", price: 27999 }
    ],
    highlightFeatures: [
      "Iconic Glyph Interface with programmable LED light strips for notifications & timer",
      "Triple 50MP camera system with 4K recording on both front and rear lenses",
      "Dimensity 7350 Pro co-engineered with Nothing for 10% faster graphics",
      "Distinctive transparent design with premium metallic circuit finish"
    ]
  },
  {
    id: "nothing-phone-2a",
    brand: "Nothing",
    model: "Nothing Phone (2a)",
    variant: "White Transparent",
    ram: "8GB",
    storage: "128GB / 256GB",
    price: 23999,
    originalPrice: 25999,
    rating: 4.6,
    reviewCount: 440,
    imageUrl: "/phones/nothing-phone-2a.jpg",
    displaySize: "6.7-inch Flexible AMOLED 30-120Hz, symmetrical 2.1mm bezels",
    processor: "MediaTek Dimensity 7200 Pro 5G (4nm)",
    camera: "50MP OIS + 50MP Ultra-Wide | 32MP Selfie",
    battery: "5000 mAh, 45W Fast Charging",
    operatingSystem: "Nothing OS 2.6",
    description: "Fresh design perspective. Transparent back showing the phone's internal architecture, symmetrical bezels, dual 50MP cameras, and Glyph lights.",
    stock: 65,
    colors: [
      { name: "White", hex: "#f2f3f5" },
      { name: "Black", hex: "#1f2022" },
      { name: "Special Edition (Red/Yellow/Blue)", hex: "#e0d7c7" }
    ],
    storageOptions: [
      { size: "128GB", price: 23999 },
      { size: "256GB", price: 25999 }
    ],
    highlightFeatures: [
      "Transparent casing exposes the phone's camera module and ribbon cables",
      "Custom 4nm Dimensity 7200 Pro delivers power and exceptional efficiency",
      "3-part Glyph Interface acts as flash, volume meter, and timer",
      "Clean Nothing OS with bespoke widgets, monochrome icons, and no bloatware"
    ]
  },

  // ==========================================
  // iQOO
  // ==========================================
  {
    id: "iqoo-12-5g",
    brand: "iQOO",
    model: "iQOO 12 5G",
    variant: "Legend White",
    ram: "12GB / 16GB",
    storage: "256GB / 512GB",
    price: 52999,
    originalPrice: 59999,
    rating: 4.8,
    reviewCount: 310,
    imageUrl: "/phones/iqoo-12-5g.jpg",
    displaySize: "6.78-inch 1.5K LTPO AMOLED 144Hz, 3000 nits, 2160Hz PWM",
    processor: "Snapdragon 8 Gen 3 (4nm) + Supercomputing Chip Q1",
    camera: "50MP Astrography Camera OIS + 64MP 3x Periscope Telephoto + 50MP Ultra-wide",
    battery: "5000 mAh, 120W FlashCharge in the box",
    operatingSystem: "Funtouch OS 14 based on Android 14",
    description: "BMW M Motorsport Legend Edition. Powered by Snapdragon 8 Gen 3 with dedicated Q1 gaming chip for 144fps game frame interpolation and 64MP periscope telephoto.",
    stock: 40,
    colors: [
      { name: "Legend White (BMW M Motorsport)", hex: "#f4f5f8" },
      { name: "Alpha Black", hex: "#1c1d1f" }
    ],
    storageOptions: [
      { size: "256GB", price: 52999 },
      { size: "512GB", price: 57999 }
    ],
    highlightFeatures: [
      "Snapdragon 8 Gen 3 with Supercomputing Chip Q1 enabling 144fps gaming",
      "64MP Periscope Telephoto camera with 3x optical and 100x digital zoom",
      "BMW M Motorsport tri-color stripe with porcelain enamel glass finish",
      "120W FlashCharge juices the battery from 0 to 100% in just 27 minutes"
    ]
  },
  {
    id: "iqoo-z9-5g",
    brand: "iQOO",
    model: "iQOO Z9 5G",
    variant: "Brushed Green",
    ram: "8GB",
    storage: "128GB / 256GB",
    price: 19999,
    originalPrice: 24999,
    rating: 4.5,
    reviewCount: 490,
    imageUrl: "/phones/iqoo-z9-5g.jpg",
    displaySize: "6.67-inch FHD+ 120Hz AMOLED, 1800 nits peak",
    processor: "MediaTek Dimensity 7200 5G (4nm)",
    camera: "50MP Sony IMX882 OIS + 2MP Bokeh Camera",
    battery: "5000 mAh, 44W FlashCharge",
    operatingSystem: "Funtouch OS 14",
    description: "Segment's performance champion with 730K+ Antutu benchmark. Sony OIS 50MP camera, 1800 nits AMOLED screen, and brushed textured design.",
    stock: 75,
    colors: [
      { name: "Brushed Green", hex: "#3b6d57" },
      { name: "Graphene Blue", hex: "#26354a" }
    ],
    storageOptions: [
      { size: "128GB", price: 19999 },
      { size: "256GB", price: 21999 }
    ],
    highlightFeatures: [
      "Dimensity 7200 4nm architecture provides leading gaming performance in class",
      "Sony IMX882 sensor with 4K recording and Optical Image Stabilization",
      "Dual stereo speakers with 300% volume mode for immersive gaming audio",
      "Ultra-slim 7.83mm lightweight body with brushed metallic back pattern"
    ]
  },

  // ==========================================
  // OPPO
  // ==========================================
  {
    id: "oppo-find-x7-ultra",
    brand: "Oppo",
    model: "Oppo Find X7 Ultra",
    variant: "Ocean Blue",
    ram: "16GB",
    storage: "512GB",
    price: 79999,
    originalPrice: 89999,
    rating: 4.8,
    reviewCount: 140,
    imageUrl: "/phones/oppo-find-x7-ultra.jpg",
    displaySize: "6.82-inch 2K LTPO AMOLED 120Hz, 4500 nits peak, Dolby Vision",
    processor: "Snapdragon 8 Gen 3 (4nm)",
    camera: "Quad 50MP Main: 1-inch LYT-900 OIS + 50MP 3x Periscope + 50MP 6x Periscope + 50MP Ultra-wide Hasselblad",
    battery: "5000 mAh, 100W SuperVOOC + 50W AirVOOC",
    operatingSystem: "ColorOS 14 based on Android 14",
    description: "The world's first smartphone with dual periscope telephoto cameras. Quad 50MP camera system tuned by Hasselblad with 1-inch Sony LYT-900 sensor.",
    stock: 25,
    colors: [
      { name: "Ocean Blue Leather", hex: "#2b547e" },
      { name: "Sepia Brown Leather", hex: "#70483c" }
    ],
    storageOptions: [
      { size: "512GB", price: 79999 }
    ],
    highlightFeatures: [
      "World-first Dual Periscope zoom system (65mm 3x and 135mm 6x lenses)",
      "Sony LYT-900 1-inch main sensor with exceptional dynamic range",
      "Hasselblad Master Camera System with natural color calibration",
      "Dual-material design combining premium tailored leather and glass"
    ]
  },
  {
    id: "oppo-reno-12-pro",
    brand: "Oppo",
    model: "Oppo Reno 12 Pro 5G",
    variant: "Sunset Gold",
    ram: "12GB",
    storage: "256GB / 512GB",
    price: 36999,
    originalPrice: 40999,
    rating: 4.6,
    reviewCount: 320,
    imageUrl: "/phones/oppo-reno-12-pro.jpg",
    displaySize: "6.7-inch Quad-Curved Infinite View AMOLED 120Hz",
    processor: "MediaTek Dimensity 7300-Energy 5G (4nm)",
    camera: "50MP Sony LYT-600 OIS + 50MP 2x Telephoto Portrait + 8MP Ultra-wide | 50MP Autofocus Selfie",
    battery: "5000 mAh, 80W SuperVOOC Flash Charge",
    operatingSystem: "ColorOS 14.1 with AI Portrait Suite",
    description: "AI Portrait Expert. All-around Armour body with Splash Touch, dual 50MP Sony portrait cameras, and integrated GenAI Studio tools.",
    stock: 55,
    colors: [
      { name: "Sunset Gold", hex: "#e2b87f" },
      { name: "Space Brown", hex: "#463836" }
    ],
    storageOptions: [
      { size: "256GB", price: 36999 },
      { size: "512GB", price: 39999 }
    ],
    highlightFeatures: [
      "GenAI features including AI Eraser 2.0, AI Best Face, and AI Studio avatars",
      "High-strength sponge bionic cushioning structure survives extreme drops",
      "Dual 50MP portrait camera setup with dedicated telephoto sensor",
      "Splash Touch allows flawless touchscreen navigation with wet fingers"
    ]
  },

  // ==========================================
  // SONY, ASUS, NOKIA
  // ==========================================
  {
    id: "sony-xperia-1-vi",
    brand: "Sony",
    model: "Sony Xperia 1 VI",
    variant: "Platinum Silver",
    ram: "12GB",
    storage: "256GB",
    price: 139999,
    originalPrice: 149999,
    rating: 4.7,
    reviewCount: 95,
    imageUrl: "/phones/sony-xperia-1-vi.jpg",
    displaySize: "6.5-inch FHD+ LTPO OLED 1-120Hz Powered by BRAVIA, 240Hz Touch",
    processor: "Snapdragon 8 Gen 3 (4nm) with vapor chamber cooling",
    camera: "48MP Exmor T for mobile + 12MP 85-170mm True Optical Continuous Zoom Telephoto + 12MP Zeiss T*",
    battery: "5000 mAh, 30W Fast Charging + Qi Wireless",
    operatingSystem: "Android 14 (3 OS Upgrades, 4 Years Security)",
    description: "Pro photography engineering by Alpha camera makers. Features world-first true optical continuous zoom lens (85mm to 170mm), dedicated physical two-stage shutter button, and 3.5mm headphone jack with Hi-Res Audio.",
    stock: 15,
    colors: [
      { name: "Platinum Silver", hex: "#cfd2d6" },
      { name: "Black", hex: "#222325" }
    ],
    storageOptions: [
      { size: "256GB", price: 139999 }
    ],
    highlightFeatures: [
      "Continuous optical zoom from 85mm to 170mm without digital degradation",
      "Dedicated physical two-stage camera shutter button with tactile knurling",
      "Exmor T for mobile stacked transistor sensor captures incredible night detail",
      "Full-stage front stereo speakers and 3.5mm gold-plated headphone jack"
    ]
  },
  {
    id: "asus-rog-phone-8-pro",
    brand: "Asus",
    model: "Asus ROG Phone 8 Pro",
    variant: "Phantom Black",
    ram: "16GB",
    storage: "512GB",
    price: 94999,
    originalPrice: 104999,
    rating: 4.8,
    reviewCount: 130,
    imageUrl: "/phones/asus-rog-phone-8-pro.jpg",
    displaySize: "6.78-inch Samsung Flexible AMOLED 165Hz LTPO, 2500 nits",
    processor: "Snapdragon 8 Gen 3 (4nm) with GameCool 8 cooling system",
    camera: "50MP Sony IMX890 with 6-Axis Gimbal Stabilizer + 32MP 3x OIS + 13MP Ultra-wide",
    battery: "5500 mAh, 65W HyperCharge + 15W Qi Wireless",
    operatingSystem: "ROG UI based on Android 14",
    description: "The ultimate gaming phone transformed into a sleek daily flagship. AniMe Matrix programmable mini-LED back display, ultrasonic AirTrigger shoulder buttons, and 6-axis gimbal camera.",
    stock: 20,
    colors: [
      { name: "Phantom Black with AniMe Matrix", hex: "#1a1b1e" }
    ],
    storageOptions: [
      { size: "512GB", price: 94999 }
    ],
    highlightFeatures: [
      "AniMe Vision customizable 341 mini-LED display on rear glass",
      "AirTrigger ultrasonic shoulder triggers simulate physical console buttons",
      "Built-in 6-Axis Hybrid Gimbal Stabilizer 3.0 keeps video rock-steady",
      "IP68 dust and water resistance in a redesigned 8.9mm slim form factor"
    ]
  },
  {
    id: "nokia-g42-5g",
    brand: "Nokia",
    model: "Nokia G42 5G",
    variant: "So Purple",
    ram: "6GB",
    storage: "128GB",
    price: 12999,
    originalPrice: 15999,
    rating: 4.4,
    reviewCount: 390,
    imageUrl: "/phones/nokia-g42-5g.jpg",
    displaySize: "6.56-inch HD+ 90Hz, Corning Gorilla Glass 3",
    processor: "Qualcomm Snapdragon 480+ 5G (8nm)",
    camera: "50MP AI Triple Camera + 2MP Depth + 2MP Macro | 8MP Selfie",
    battery: "5000 mAh, 3-Day Battery Life, 20W Fast Charging",
    operatingSystem: "Android 14 Pure Clean OS with zero bloatware",
    description: "QuickFix DIY repairable smartphone. Built with 65% recycled plastic, 3-day battery life, clean stock Android experience, and 50MP AI camera.",
    stock: 80,
    colors: [
      { name: "So Purple", hex: "#7a5c8e" },
      { name: "So Grey", hex: "#4a4c50" }
    ],
    storageOptions: [
      { size: "128GB", price: 12999 }
    ],
    highlightFeatures: [
      "QuickFix repairability lets users easily swap screen or battery via iFixit guides",
      "Massive 5000mAh battery delivers up to 3 days of battery life per charge",
      "OZO 3D audio recording captures true spatial sound",
      "Clean stock Android 14 with guaranteed monthly security updates"
    ]
  }
];

async function seed() {
  console.log(`Starting database seed with ${catalog.length} smartphones...`);

  // Clear existing records to ensure fresh state
  await prisma.orderItem.deleteMany({});
  await prisma.smsAlert.deleteMany({});
  await prisma.mobileProduct.deleteMany({});
  await prisma.mobile.deleteMany({});

  for (const phone of catalog) {
    // 1. Seed 'mobiles' table (exact schema requested)
    await prisma.mobile.create({
      data: {
        id: phone.id,
        brand: phone.brand,
        model: phone.model,
        variant: phone.variant,
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
        originalPrice: phone.originalPrice
      }
    });

    // 2. Seed 'MobileProduct' table (for backward compatibility with orders & cart)
    await prisma.mobileProduct.create({
      data: {
        id: phone.id,
        name: `${phone.brand} ${phone.model}`,
        brand: phone.brand,
        series: phone.variant,
        tagline: phone.description.slice(0, 140),
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
        inStock: phone.stock > 0,
        isFeatured: phone.price > 80000,
        highlightFeatures: JSON.stringify(phone.highlightFeatures)
      }
    });
  }

  console.log(`Successfully seeded ${catalog.length} smartphones into 'mobiles' and 'MobileProduct' SQL tables!`);
}

seed()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });