const fs = require('fs');
const path = require('path');

const phones = [
  // 1. Budget Tier (₹10,000 - ₹15,000)
  {
    id: 'redmi-13c-5g',
    name: 'Redmi 13C 5G',
    brand: 'Xiaomi',
    price: 10499,
    originalPrice: 13999,
    colorName: 'Starfrost Green',
    bodyColor: '#385e50',
    bodyGradientA: '#4a7565',
    bodyGradientB: '#254238',
    screenA: '#1e382e',
    screenB: '#0b1914',
    cameraStyle: 'redmi-dual',
    frameColor: '#5c8776',
    isBudget: true,
  },
  {
    id: 'moto-g34-5g',
    name: 'Motorola Moto G34 5G',
    brand: 'Motorola',
    price: 11999,
    originalPrice: 14999,
    colorName: 'Ocean Green',
    bodyColor: '#2b585c',
    bodyGradientA: '#386f74',
    bodyGradientB: '#1a373a',
    screenA: '#183336',
    screenB: '#091517',
    cameraStyle: 'moto-dual',
    frameColor: '#457f85',
    isBudget: true,
  },
  {
    id: 'samsung-galaxy-m15-5g',
    name: 'Samsung Galaxy M15 5G',
    brand: 'Samsung',
    price: 12999,
    originalPrice: 15999,
    colorName: 'Celestial Blue',
    bodyColor: '#304c6e',
    bodyGradientA: '#3d5e87',
    bodyGradientB: '#1c2e44',
    screenA: '#1a293d',
    screenB: '#0a121c',
    cameraStyle: 'samsung-triple-vert',
    frameColor: '#4a6f9c',
    isBudget: true,
  },
  {
    id: 'realme-narzo-70x-5g',
    name: 'Realme Narzo 70x 5G',
    brand: 'Realme',
    price: 11999,
    originalPrice: 14999,
    colorName: 'Forest Green',
    bodyColor: '#1e4839',
    bodyGradientA: '#275c49',
    bodyGradientB: '#112b22',
    screenA: '#143026',
    screenB: '#06140f',
    cameraStyle: 'realme-circle',
    frameColor: '#33735c',
    isBudget: true,
  },

  // 2. Mid-Range Tier (₹15,000 - ₹30,000)
  {
    id: 'oneplus-nord-ce4-lite',
    name: 'OnePlus Nord CE4 Lite 5G',
    brand: 'OnePlus',
    price: 19999,
    originalPrice: 21999,
    colorName: 'Mega Blue',
    bodyColor: '#1d5894',
    bodyGradientA: '#256eb8',
    bodyGradientB: '#113961',
    screenA: '#15385e',
    screenB: '#081729',
    cameraStyle: 'oneplus-vert-pill',
    frameColor: '#3883d1',
  },
  {
    id: 'vivo-t3-5g',
    name: 'Vivo T3 5G',
    brand: 'Vivo',
    price: 19999,
    originalPrice: 22999,
    colorName: 'Cosmic Blue',
    bodyColor: '#1d3d63',
    bodyGradientA: '#295385',
    bodyGradientB: '#10243d',
    screenA: '#152b47',
    screenB: '#081321',
    cameraStyle: 'vivo-square-cam',
    frameColor: '#386da6',
  },
  {
    id: 'nothing-phone-2a',
    name: 'Nothing Phone (2a) 5G',
    brand: 'Nothing',
    price: 23999,
    originalPrice: 25999,
    colorName: 'Milk White',
    bodyColor: '#d6d8db',
    bodyGradientA: '#e8eaed',
    bodyGradientB: '#a3a7ad',
    screenA: '#1f2022',
    screenB: '#0a0a0b',
    cameraStyle: 'nothing-eyes',
    frameColor: '#c2c5c9',
  },
  {
    id: 'realme-12-pro-5g',
    name: 'Realme 12 Pro 5G',
    brand: 'Realme',
    price: 23999,
    originalPrice: 27999,
    colorName: 'Submarine Blue',
    bodyColor: '#183b5e',
    bodyGradientA: '#214d7a',
    bodyGradientB: '#0f2740',
    screenA: '#142c47',
    screenB: '#061321',
    cameraStyle: 'realme-circle-gold',
    frameColor: '#c5a059',
  },
  {
    id: 'oneplus-nord-4',
    name: 'OnePlus Nord 4 5G',
    brand: 'OnePlus',
    price: 29999,
    originalPrice: 32999,
    colorName: 'Mercurial Silver',
    bodyColor: '#536570',
    bodyGradientA: '#6b8290',
    bodyGradientB: '#2f3b42',
    screenA: '#384750',
    screenB: '#1b2328',
    cameraStyle: 'oneplus-nord-metal',
    frameColor: '#8a9ea8',
  },

  // 3. Upper Mid-Range Tier (₹30,000 - ₹60,000)
  {
    id: 'oneplus-12r',
    name: 'OnePlus 12R 5G',
    brand: 'OnePlus',
    price: 39999,
    originalPrice: 42999,
    colorName: 'Cool Blue',
    bodyColor: '#1e3d59',
    bodyGradientA: '#275277',
    bodyGradientB: '#0e1f30',
    screenA: '#1a3550',
    screenB: '#091522',
    cameraStyle: 'oneplus-dial',
    frameColor: '#437aa8',
  },
  {
    id: 'samsung-galaxy-s23-fe',
    name: 'Samsung Galaxy S23 FE 5G',
    brand: 'Samsung',
    price: 39999,
    originalPrice: 59999,
    colorName: 'Mint Green',
    bodyColor: '#4f7d6d',
    bodyGradientA: '#649c89',
    bodyGradientB: '#345449',
    screenA: '#2b473e',
    screenB: '#0f1f1a',
    cameraStyle: 'samsung-triple-vert',
    frameColor: '#78b09d',
  },
  {
    id: 'realme-gt-6',
    name: 'Realme GT 6 5G',
    brand: 'Realme',
    price: 40999,
    originalPrice: 44999,
    colorName: 'Fluid Silver',
    bodyColor: '#8a9ba8',
    bodyGradientA: '#a7bccd',
    bodyGradientB: '#3f4b54',
    screenA: '#1e2933',
    screenB: '#090f14',
    cameraStyle: 'realme-gt-mirror',
    frameColor: '#b8c9d6',
  },
  {
    id: 'vivo-v40-pro-5g',
    name: 'Vivo V40 Pro 5G',
    brand: 'Vivo',
    price: 49999,
    originalPrice: 54999,
    colorName: 'Ganges Blue',
    bodyColor: '#2d617a',
    bodyGradientA: '#3b7d9c',
    bodyGradientB: '#1a3b4c',
    screenA: '#1f4354',
    screenB: '#0b1a21',
    cameraStyle: 'vivo-zeiss-ring',
    frameColor: '#4ea0c7',
  },

  // 4. Flagship Tier (₹60,000 - ₹1,00,000)
  {
    id: 'oneplus-12',
    name: 'OnePlus 12 5G',
    brand: 'OnePlus',
    price: 64999,
    originalPrice: 69999,
    colorName: 'Flowy Emerald',
    bodyColor: '#2a5948',
    bodyGradientA: '#387861',
    bodyGradientB: '#122c22',
    screenA: '#18382c',
    screenB: '#06140e',
    cameraStyle: 'oneplus-dial',
    frameColor: '#4da686',
  },
  {
    id: 'xiaomi-14',
    name: 'Xiaomi 14 5G',
    brand: 'Xiaomi',
    price: 69999,
    originalPrice: 79999,
    colorName: 'Jade Green',
    bodyColor: '#36594d',
    bodyGradientA: '#467363',
    bodyGradientB: '#1e332c',
    screenA: '#243b33',
    screenB: '#0d1714',
    cameraStyle: 'xiaomi-square-leica',
    frameColor: '#58917d',
  },
  {
    id: 'samsung-galaxy-s24',
    name: 'Samsung Galaxy S24 5G',
    brand: 'Samsung',
    price: 74999,
    originalPrice: 79999,
    colorName: 'Onyx Black',
    bodyColor: '#232526',
    bodyGradientA: '#383b3d',
    bodyGradientB: '#141517',
    screenA: '#1c1d1f',
    screenB: '#0a0a0b',
    cameraStyle: 'samsung-triple-vert',
    frameColor: '#4f5254',
  },
  {
    id: 'iphone-16',
    name: 'Apple iPhone 16',
    brand: 'Apple',
    price: 79900,
    originalPrice: 84900,
    colorName: 'Ultramarine',
    bodyColor: '#274bb8',
    bodyGradientA: '#3863eb',
    bodyGradientB: '#142c75',
    screenA: '#1b337a',
    screenB: '#081230',
    cameraStyle: 'apple-dual-vertical',
    frameColor: '#4e77fc',
  },
  {
    id: 'google-pixel-9',
    name: 'Google Pixel 9 5G',
    brand: 'Google',
    price: 79999,
    originalPrice: 89999,
    colorName: 'Wintergreen',
    bodyColor: '#43695b',
    bodyGradientA: '#558271',
    bodyGradientB: '#274037',
    screenA: '#2a4239',
    screenB: '#0d1713',
    cameraStyle: 'pixel-visor-dual',
    frameColor: '#6fa893',
  },
  {
    id: 'vivo-x100-pro',
    name: 'Vivo X100 Pro 5G',
    brand: 'Vivo',
    price: 89999,
    originalPrice: 96999,
    colorName: 'Sunset Orange',
    bodyColor: '#e0663b',
    bodyGradientA: '#f27c52',
    bodyGradientB: '#823013',
    screenA: '#381c11',
    screenB: '#140803',
    cameraStyle: 'vivo-zeiss-sunburst',
    frameColor: '#ff9066',
  },

  // 5. Ultra Flagship & Foldable Tier (₹1,00,000 - ₹2,00,000)
  {
    id: 'xiaomi-14-ultra',
    name: 'Xiaomi 14 Ultra 5G',
    brand: 'Xiaomi',
    price: 99999,
    originalPrice: 119999,
    colorName: 'Vegan Leather Black',
    bodyColor: '#1c1c1c',
    bodyGradientA: '#2e2e2e',
    bodyGradientB: '#0a0a0a',
    screenA: '#211e1e',
    screenB: '#0d0a0a',
    cameraStyle: 'xiaomi-leica-giant',
    frameColor: '#525252',
  },
  {
    id: 'google-pixel-9-pro-xl',
    name: 'Google Pixel 9 Pro XL',
    brand: 'Google',
    price: 124999,
    originalPrice: 134999,
    colorName: 'Obsidian Black',
    bodyColor: '#2b2e31',
    bodyGradientA: '#41454a',
    bodyGradientB: '#151719',
    screenA: '#24272a',
    screenB: '#0c0d0f',
    cameraStyle: 'pixel-visor-triple',
    frameColor: '#5b6166',
  },
  {
    id: 'samsung-galaxy-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra 5G',
    brand: 'Samsung',
    price: 129999,
    originalPrice: 144999,
    colorName: 'Titanium Gray',
    bodyColor: '#6e6c6b',
    bodyGradientA: '#878584',
    bodyGradientB: '#3a3837',
    screenA: '#292827',
    screenB: '#0f0e0e',
    cameraStyle: 'samsung-quad-armor',
    frameColor: '#a6a3a1',
  },
  {
    id: 'iphone-16-pro-max',
    name: 'Apple iPhone 16 Pro Max',
    brand: 'Apple',
    price: 144900,
    originalPrice: 159900,
    colorName: 'Natural Titanium',
    bodyColor: '#8a8781',
    bodyGradientA: '#a3a098',
    bodyGradientB: '#4f4c47',
    screenA: '#2b2926',
    screenB: '#121110',
    cameraStyle: 'apple-pro-triple',
    frameColor: '#bfbcba',
  },
  {
    id: 'samsung-galaxy-z-fold-6',
    name: 'Samsung Galaxy Z Fold 6 5G',
    brand: 'Samsung',
    price: 164999,
    originalPrice: 179999,
    colorName: 'Silver Shadow',
    bodyColor: '#536878',
    bodyGradientA: '#728da3',
    bodyGradientB: '#25323d',
    screenA: '#263745',
    screenB: '#0d151c',
    cameraStyle: 'samsung-fold-dual',
    frameColor: '#8fa8bd',
  },
  {
    id: 'iphone-16-pro-max-1tb',
    name: 'Apple iPhone 16 Pro Max 1TB',
    brand: 'Apple',
    price: 184900,
    originalPrice: 199900,
    colorName: 'Desert Titanium',
    bodyColor: '#9e8976',
    bodyGradientA: '#b59f8c',
    bodyGradientB: '#57483b',
    screenA: '#2d251e',
    screenB: '#120e0b',
    cameraStyle: 'apple-pro-triple',
    frameColor: '#cfb9a5',
  }
];

function renderCameraModule(phone) {
  const { cameraStyle, bodyColor, bodyGradientA, frameColor } = phone;

  if (cameraStyle === 'apple-pro-triple') {
    return `
      <!-- Apple Pro Triangular Camera Island -->
      <g transform="translate(425, 90)" filter="url(#lens-shadow)">
        <rect x="-38" y="-38" width="76" height="76" rx="22" fill="${bodyGradientA}" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.6"/>
        <!-- 3 Giant Sapphire Lenses -->
        <!-- Top Lens -->
        <circle cx="-16" cy="-16" r="13" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="2"/>
        <circle cx="-16" cy="-16" r="5" fill="#030508" stroke="#3b82f6" stroke-width="0.8"/>
        <!-- Bottom Lens -->
        <circle cx="-16" cy="16" r="13" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="2"/>
        <circle cx="-16" cy="16" r="5" fill="#030508" stroke="#38bdf8" stroke-width="0.8"/>
        <!-- Right Telephoto Lens -->
        <circle cx="16" cy="0" r="13" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="2"/>
        <circle cx="16" cy="0" r="5" fill="#030508" stroke="#3b82f6" stroke-width="0.8"/>
        <!-- True Tone Flash -->
        <circle cx="16" cy="-22" r="4.5" fill="#fef08a" stroke="#ca8a04" stroke-width="0.8"/>
        <!-- LiDAR Sensor -->
        <circle cx="16" cy="22" r="3.5" fill="#0f172a"/>
        <!-- Mic Hole -->
        <circle cx="27" cy="12" r="1.5" fill="#000000"/>
      </g>`;
  }

  if (cameraStyle === 'apple-dual-vertical') {
    return `
      <!-- Apple Vertical Dual Camera Island -->
      <g transform="translate(425, 95)" filter="url(#lens-shadow)">
        <rect x="-24" y="-38" width="48" height="76" rx="24" fill="${bodyGradientA}" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.6"/>
        <circle cx="0" cy="-17" r="14" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="2"/>
        <circle cx="0" cy="-17" r="5.5" fill="#030508" stroke="#3b82f6" stroke-width="0.8"/>
        <circle cx="0" cy="17" r="14" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="2"/>
        <circle cx="0" cy="17" r="5.5" fill="#030508" stroke="#38bdf8" stroke-width="0.8"/>
        <circle cx="14" cy="0" r="3.5" fill="#fef08a" stroke="#ca8a04" stroke-width="0.8"/>
      </g>`;
  }

  if (cameraStyle === 'samsung-quad-armor' || cameraStyle === 'samsung-triple-vert') {
    return `
      <!-- Samsung Floating Camera Lenses -->
      <g transform="translate(425, 75)" filter="url(#lens-shadow)">
        <circle cx="0" cy="0" r="14" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="2.5"/>
        <circle cx="0" cy="0" r="5.5" fill="#020406" stroke="#3b82f6" stroke-width="0.8"/>

        <circle cx="0" cy="34" r="14" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="2.5"/>
        <circle cx="0" cy="34" r="5.5" fill="#020406" stroke="#38bdf8" stroke-width="0.8"/>

        <circle cx="0" cy="68" r="14" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="2.5"/>
        <circle cx="0" cy="68" r="5.5" fill="#020406" stroke="#3b82f6" stroke-width="0.8"/>

        ${cameraStyle === 'samsung-quad-armor' ? `
          <circle cx="26" cy="17" r="4" fill="#fef08a" stroke="#ca8a04" stroke-width="0.8"/>
          <circle cx="26" cy="51" r="9" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="2"/>
          <circle cx="26" cy="51" r="3.5" fill="#020406"/>
        ` : `
          <circle cx="24" cy="17" r="4" fill="#fef08a" stroke="#ca8a04" stroke-width="0.8"/>
        `}
      </g>`;
  }

  if (cameraStyle === 'samsung-fold-dual') {
    return `
      <g transform="translate(425, 80)" filter="url(#lens-shadow)">
        <rect x="-18" y="-10" width="36" height="96" rx="18" fill="${bodyGradientA}" stroke="${frameColor}" stroke-width="1.5"/>
        <circle cx="0" cy="10" r="11" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="2"/>
        <circle cx="0" cy="38" r="11" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="2"/>
        <circle cx="0" cy="66" r="11" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="2"/>
      </g>`;
  }

  if (cameraStyle === 'oneplus-dial') {
    return `
      <!-- OnePlus Circular Hasselblad Camera Dial -->
      <g transform="translate(415, 110)" filter="url(#lens-shadow)">
        <!-- Outer Circular Metal Dial -->
        <circle cx="0" cy="0" r="46" fill="#14181c" stroke="${frameColor}" stroke-width="3"/>
        <circle cx="0" cy="0" r="43" fill="#1e2226" stroke="#334155" stroke-width="1"/>
        <!-- 4 Internal Optic Apertures -->
        <circle cx="-18" cy="-16" r="12" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="1.5"/>
        <circle cx="18" cy="-16" r="12" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="1.5"/>
        <circle cx="-18" cy="16" r="12" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="1.5"/>
        <circle cx="18" cy="16" r="8" fill="#0f172a"/>
        <circle cx="18" cy="16" r="3.5" fill="#fef08a"/>
        <!-- Hasselblad 'H' Logo in center -->
        <text x="0" y="4" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">H</text>
      </g>`;
  }

  if (cameraStyle === 'oneplus-nord-metal' || cameraStyle === 'oneplus-vert-pill') {
    return `
      <g transform="translate(425, 90)" filter="url(#lens-shadow)">
        <rect x="-22" y="-32" width="44" height="74" rx="22" fill="${bodyGradientA}" stroke="${frameColor}" stroke-width="2"/>
        <circle cx="0" cy="-14" r="13" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="1.5"/>
        <circle cx="0" cy="18" r="13" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="1.5"/>
        <circle cx="14" cy="2" r="3" fill="#fef08a"/>
      </g>`;
  }

  if (cameraStyle === 'pixel-visor-triple' || cameraStyle === 'pixel-visor-dual') {
    return `
      <!-- Google Pixel Iconic Camera Visor -->
      <g transform="translate(415, 95)" filter="url(#lens-shadow)">
        <!-- Horizontal Visor Plateau -->
        <rect x="-50" y="-18" width="100" height="36" rx="18" fill="#14181d" stroke="${frameColor}" stroke-width="2"/>
        <!-- Glass Pill for Lenses -->
        <rect x="-42" y="-12" width="${cameraStyle === 'pixel-visor-triple' ? '68' : '54'}" height="24" rx="12" fill="#020406"/>
        <circle cx="-28" cy="0" r="8.5" fill="url(#sapphire-lens)" stroke="#3b82f6" stroke-width="0.8"/>
        <circle cx="-10" cy="0" r="8.5" fill="url(#sapphire-lens)" stroke="#38bdf8" stroke-width="0.8"/>
        ${cameraStyle === 'pixel-visor-triple' ? `
          <rect x="7" y="-6" width="12" height="12" rx="3" fill="url(#sapphire-lens)"/>
          <circle cx="34" cy="0" r="3.5" fill="#fef08a"/>
        ` : `
          <circle cx="26" cy="0" r="3.5" fill="#fef08a"/>
        `}
      </g>`;
  }

  if (cameraStyle === 'xiaomi-leica-giant' || cameraStyle === 'vivo-zeiss-sunburst') {
    return `
      <!-- Giant 1-inch Optical Dial (Leica / ZEISS) -->
      <g transform="translate(415, 110)" filter="url(#lens-shadow)">
        <circle cx="0" cy="0" r="48" fill="#121212" stroke="${frameColor}" stroke-width="3"/>
        <circle cx="0" cy="0" r="45" fill="#1a1a1a" stroke="#eab308" stroke-width="1.2"/>
        <!-- 4 Lenses -->
        <circle cx="0" cy="-22" r="11" fill="url(#sapphire-lens)" stroke="#475569" stroke-width="1"/>
        <circle cx="-22" cy="0" r="11" fill="url(#sapphire-lens)" stroke="#475569" stroke-width="1"/>
        <circle cx="22" cy="0" r="11" fill="url(#sapphire-lens)" stroke="#475569" stroke-width="1"/>
        <circle cx="0" cy="22" r="11" fill="url(#sapphire-lens)" stroke="#475569" stroke-width="1"/>
        <!-- Center Leica / ZEISS Text Badge -->
        <rect x="-16" y="-6" width="32" height="12" rx="2" fill="#cc0c39"/>
        <text x="0" y="3" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">LEICA</text>
      </g>`;
  }

  if (cameraStyle === 'nothing-eyes') {
    return `
      <!-- Nothing Phone (2a) Transparent Pill Eyes + Glyph Strips -->
      <g transform="translate(415, 105)" filter="url(#lens-shadow)">
        <!-- Horizontal Pill Housing -->
        <rect x="-42" y="-20" width="84" height="40" rx="20" fill="#202224" stroke="#ffffff" stroke-width="2"/>
        <!-- Dual Eyes -->
        <circle cx="-16" cy="0" r="12" fill="url(#sapphire-lens)" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="-16" cy="0" r="5" fill="#020406" stroke="#38bdf8" stroke-width="0.8"/>
        <circle cx="16" cy="0" r="12" fill="url(#sapphire-lens)" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="16" cy="0" r="5" fill="#020406" stroke="#3b82f6" stroke-width="0.8"/>
        <!-- Glowing Glyph Strips -->
        <path d="M -35 -26 A 40 40 0 0 1 35 -26" fill="none" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/>
        <path d="M -35 26 A 40 40 0 0 0 35 26" fill="none" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/>
        <circle cx="36" cy="0" r="2.5" fill="#ef4444"/>
      </g>`;
  }

  // Default Real Camera Dial (Realme / Vivo / Moto / Xiaomi standard)
  return `
    <!-- Standard Famous Brand Camera Island -->
    <g transform="translate(420, 95)" filter="url(#lens-shadow)">
      <rect x="-28" y="-34" width="56" height="72" rx="18" fill="${bodyGradientA}" stroke="${frameColor}" stroke-width="2"/>
      <circle cx="0" cy="-14" r="13" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="1.5"/>
      <circle cx="0" cy="-14" r="5.5" fill="#020406" stroke="#38bdf8" stroke-width="0.8"/>
      <circle cx="0" cy="18" r="13" fill="url(#sapphire-lens)" stroke="${frameColor}" stroke-width="1.5"/>
      <circle cx="0" cy="18" r="5.5" fill="#020406" stroke="#3b82f6" stroke-width="0.8"/>
      <circle cx="18" cy="2" r="3.5" fill="#fef08a" stroke="#ca8a04" stroke-width="0.6"/>
    </g>`;
}

function generatePhotorealisticSvg(phone) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <!-- Amazon Pure White Studio Background with Soft Ambient Gradient -->
    <radialGradient id="studio-bg-${phone.id}" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#edf2f7"/>
    </radialGradient>

    <!-- Metallic Smartphone Frame Gradient -->
    <linearGradient id="metal-frame-${phone.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="25%" stop-color="${phone.frameColor}"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.7"/>
      <stop offset="75%" stop-color="${phone.bodyColor}"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>

    <!-- Real Glass AMOLED Screen Gradient -->
    <linearGradient id="glass-screen-${phone.id}" x1="20%" y1="10%" x2="80%" y2="90%">
      <stop offset="0%" stop-color="${phone.screenA}"/>
      <stop offset="100%" stop-color="${phone.screenB}"/>
    </linearGradient>

    <!-- Rear Bodyplate Gradient -->
    <linearGradient id="bodyplate-${phone.id}" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="${phone.bodyGradientA}"/>
      <stop offset="50%" stop-color="${phone.bodyColor}"/>
      <stop offset="100%" stop-color="${phone.bodyGradientB}"/>
    </linearGradient>

    <!-- Genuine Sapphire Optical Camera Lens -->
    <radialGradient id="sapphire-lens" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="25%" stop-color="#1e3a8a"/>
      <stop offset="60%" stop-color="#090d16"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>

    <!-- Studio Floor Soft Contact Shadows -->
    <filter id="floor-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.18"/></feComponentTransfer>
    </filter>

    <!-- Realistic Device Chassis Drop Shadow -->
    <filter id="device-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#090d14" flood-opacity="0.22"/>
    </filter>

    <!-- Lens Shadow for Elevation -->
    <filter id="lens-shadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Clean Amazon Studio White Canvas -->
  <rect width="600" height="600" fill="url(#studio-bg-${phone.id})"/>

  <!-- Photorealistic Studio Floor Drop Shadow -->
  <ellipse cx="295" cy="520" rx="180" ry="18" fill="#0f172a" filter="url(#floor-shadow)"/>
  <ellipse cx="295" cy="520" rx="125" ry="10" fill="#020617" opacity="0.22"/>

  <!-- Physical Buttons on Outer Metal Frame -->
  <!-- Volume Up/Down on Left Side -->
  <rect x="174" y="145" width="3" height="34" rx="1.5" fill="${phone.frameColor}"/>
  <rect x="174" y="188" width="3" height="34" rx="1.5" fill="${phone.frameColor}"/>
  <!-- Power / Lock Button on Right Side -->
  <rect x="423" y="165" width="3" height="46" rx="1.5" fill="${phone.frameColor}"/>

  <!-- Main Smartphone Hardware Chassis (Front View) -->
  <g filter="url(#device-shadow)">
    <!-- 1. Outer Metal/Titanium Polished Bezel -->
    <rect x="176" y="58" width="248" height="454" rx="38" fill="url(#metal-frame-${phone.id})" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.6"/>
    
    <!-- 2. Dark Inner Display Gasket Bezel -->
    <rect x="181" y="63" width="238" height="444" rx="34" fill="#020408" stroke="#0f172a" stroke-width="1.5"/>

    <!-- 3. Dynamic AMOLED Glass Screen -->
    <rect x="184" y="66" width="232" height="438" rx="31" fill="url(#glass-screen-${phone.id})"/>

    <!-- 4. Photorealistic OLED Wallpaper with Glass Glow -->
    <g opacity="0.85">
      <!-- Curved Wave Glow -->
      <path d="M 184 260 Q 230 180, 300 240 T 416 190 L 416 504 L 184 504 Z" fill="${phone.bodyGradientA}" opacity="0.32"/>
      <path d="M 184 320 Q 250 270, 330 330 T 416 290 L 416 504 L 184 504 Z" fill="${phone.bodyColor}" opacity="0.45"/>
      <circle cx="360" cy="200" r="55" fill="${phone.frameColor}" opacity="0.2"/>
    </g>

    <!-- 5. Diagonal Photographic Glass Glare / Sheen -->
    <path d="M 185 68 L 320 68 L 220 502 L 185 502 Z" fill="#ffffff" opacity="0.05"/>

    <!-- 6. Real Ear-piece Speaker Mesh -->
    <rect x="286" y="72" width="28" height="2" rx="1" fill="#1e293b"/>

    <!-- 7. Real Punch Hole / Dynamic Island Front Optic -->
    ${phone.brand === 'Apple' ? `
      <!-- Apple Dynamic Island Pill -->
      <rect x="274" y="78" width="52" height="15" rx="7.5" fill="#000000"/>
      <circle cx="284" cy="85.5" r="4" fill="#030712" stroke="#1e293b" stroke-width="0.8"/>
      <circle cx="284.5" cy="85" r="1.5" fill="#3b82f6" opacity="0.85"/>
      <circle cx="316" cy="85.5" r="3" fill="#030712"/>
    ` : `
      <!-- Android Centered Punch Hole -->
      <circle cx="300" cy="84" r="5" fill="#000000" stroke="#0f172a" stroke-width="1"/>
      <circle cx="300.5" cy="83.5" r="2" fill="#3b82f6" opacity="0.9"/>
    `}

    <!-- 8. Real Lockscreen Time & Date -->
    <text x="300" y="146" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="40" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="-1" opacity="0.95">10:48</text>
    <text x="300" y="168" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#cbd5e1" text-anchor="middle" letter-spacing="1.5">SUN, SEP 6</text>

    <!-- 9. Real Brand Logo Watermark on Screen -->
    <g transform="translate(300, 275)">
      <rect x="-65" y="-17" width="130" height="34" rx="17" fill="#000000" fill-opacity="0.65" stroke="${phone.frameColor}" stroke-width="1.2"/>
      <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="2">${phone.brand.toUpperCase()}</text>
      <text x="0" y="11" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="1">5G OFF-LINE</text>
    </g>

    <!-- 10. In-Display Fingerprint Scanner Sensor -->
    <circle cx="300" cy="440" r="16" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.8"/>
    <circle cx="300" cy="440" r="6" fill="#38bdf8" opacity="0.3"/>
  </g>

  <!-- Real Angled Rearplate Camera Island Showcase -->
  ${renderCameraModule(phone)}

  <!-- Authentic Brand Badge Header Pill -->
  <g transform="translate(300, 34)">
    <rect x="-110" y="-12" width="220" height="24" rx="12" fill="#131921" stroke="#febd69" stroke-width="1"/>
    <text x="0" y="4" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="#febd69" text-anchor="middle" letter-spacing="1.5">${phone.brand.toUpperCase()} OFFICIAL 5G</text>
  </g>

  <!-- Amazon Product Price Banner Footer -->
  <g transform="translate(300, 565)">
    <rect x="-160" y="-17" width="320" height="34" rx="17" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" filter="url(#lens-shadow)"/>
    <text x="0" y="-1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11.5" font-weight="800" fill="#0f1111" text-anchor="middle">${phone.name} (${phone.colorName})</text>
    <text x="0" y="12" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#b12704" text-anchor="middle">₹${phone.price.toLocaleString('en-IN')}</text>
  </g>
</svg>`;
}

const outDir = path.join(process.cwd(), 'public', 'phones');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const phone of phones) {
  const filePath = path.join(outDir, `${phone.id}.svg`);
  fs.writeFileSync(filePath, generatePhotorealisticSvg(phone), 'utf8');
  console.log(`Rendered: ${phone.id}.svg (₹${phone.price.toLocaleString('en-IN')})`);
}

// Generate default phone
fs.writeFileSync(
  path.join(outDir, 'default-phone.svg'),
  generatePhotorealisticSvg({
    id: 'default-phone',
    name: 'VM Mobiles Flagship 5G',
    brand: 'VM Mobiles',
    price: 49999,
    originalPrice: 59999,
    colorName: 'Titanium Blue',
    bodyColor: '#1e3d59',
    bodyGradientA: '#275277',
    bodyGradientB: '#0e1f30',
    screenA: '#1a3550',
    screenB: '#091522',
    cameraStyle: 'standard-famous',
    frameColor: '#437aa8',
  }),
  'utf8'
);

console.log('Successfully generated all 25 photorealistic smartphones in public/phones/!');
