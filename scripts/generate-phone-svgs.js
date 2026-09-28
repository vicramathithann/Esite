const fs = require('fs');
const path = require('path');

const phones = [
  {
    id: 'oneplus-12',
    name: 'OnePlus 12 5G',
    brand: 'OnePlus',
    badge: 'HASSELBLAD 4TH GEN',
    accentColor: '#2a5948',
    gradientA: '#2f6854',
    gradientB: '#0e241c',
    screenGradientA: '#15382b',
    screenGradientB: '#04140e',
    cameraStyle: 'circular-dial',
    specs: 'Snapdragon 8 Gen 3 | 5400mAh | 100W SUPERVOOC'
  },
  {
    id: 'oneplus-12r',
    name: 'OnePlus 12R 5G',
    brand: 'OnePlus',
    badge: '100W SUPERVOOC CHARGE',
    accentColor: '#1e3d59',
    gradientA: '#275277',
    gradientB: '#0e1f30',
    screenGradientA: '#1a3550',
    screenGradientB: '#091522',
    cameraStyle: 'circular-dial',
    specs: 'Snapdragon 8 Gen 2 | 5500mAh | 1.5K ProXDR'
  },
  {
    id: 'oneplus-nord-4',
    name: 'OnePlus Nord 4 5G',
    brand: 'OnePlus',
    badge: 'ALL-METAL UNIBODY 5G',
    accentColor: '#536570',
    gradientA: '#6b8290',
    gradientB: '#2f3b42',
    screenGradientA: '#384750',
    screenGradientB: '#1b2328',
    cameraStyle: 'dual-pill',
    specs: 'Snapdragon 7+ Gen 3 | 5500mAh | 100W'
  },
  {
    id: 'iphone-16-pro-max',
    name: 'Apple iPhone 16 Pro Max',
    brand: 'Apple',
    badge: 'TITANIUM A18 PRO',
    accentColor: '#9a9791',
    gradientA: '#b2afa8',
    gradientB: '#4a4845',
    screenGradientA: '#2c2a27',
    screenGradientB: '#141312',
    cameraStyle: 'triple-triangle',
    specs: '6.9" ProMotion OLED | 48MP Fusion | Camera Control'
  },
  {
    id: 'iphone-16',
    name: 'Apple iPhone 16',
    brand: 'Apple',
    badge: 'APPLE INTELLIGENCE',
    accentColor: '#305cde',
    gradientA: '#4a75f8',
    gradientB: '#142c75',
    screenGradientA: '#1e3880',
    screenGradientB: '#0a1638',
    cameraStyle: 'dual-pill',
    specs: 'A18 Bionic | 48MP 2x Telephoto | Dynamic Island'
  },
  {
    id: 'samsung-galaxy-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra',
    brand: 'Samsung',
    badge: 'GALAXY AI 200MP QUAD',
    accentColor: '#7d7b7a',
    gradientA: '#999695',
    gradientB: '#3a3938',
    screenGradientA: '#2c2c2e',
    screenGradientB: '#0f0f12',
    cameraStyle: 'quad-linear',
    specs: 'Snapdragon 8 Gen 3 | S-Pen | 100x Space Zoom'
  },
  {
    id: 'samsung-galaxy-z-fold-6',
    name: 'Samsung Galaxy Z Fold 6',
    brand: 'Samsung',
    badge: 'ULTRA FOLDABLE DUAL SCREEN',
    accentColor: '#536878',
    gradientA: '#728da3',
    gradientB: '#25323d',
    screenGradientA: '#263745',
    screenGradientB: '#0d151c',
    cameraStyle: 'triple-linear',
    specs: '7.6" Dynamic AMOLED 2X | Dual Screen | IP48'
  },
  {
    id: 'google-pixel-9-pro-xl',
    name: 'Google Pixel 9 Pro XL',
    brand: 'Google',
    badge: 'GEMINI AI TENSOR G4',
    accentColor: '#2b2e31',
    gradientA: '#41454a',
    gradientB: '#151719',
    screenGradientA: '#24272a',
    screenGradientB: '#0c0d0f',
    cameraStyle: 'pixel-visor',
    specs: 'Tensor G4 | 50MP + 48MP Tele | 3000 nits'
  },
  {
    id: 'nothing-phone-2a-plus',
    name: 'Nothing Phone (2a) Plus',
    brand: 'Nothing',
    badge: 'ICONIC GLYPH INTERFACE',
    accentColor: '#5a5d62',
    gradientA: '#74787e',
    gradientB: '#232426',
    screenGradientA: '#222325',
    screenGradientB: '#0d0d0e',
    cameraStyle: 'nothing-eyes',
    specs: 'Dimensity 7350 Pro | 50MP Dual | Nothing OS'
  },
  {
    id: 'xiaomi-14-ultra',
    name: 'Xiaomi 14 Ultra 5G',
    brand: 'Xiaomi',
    badge: 'LEICA VARIO-SUMMILUX 1"',
    accentColor: '#212121',
    gradientA: '#383838',
    gradientB: '#101010',
    screenGradientA: '#221a1a',
    screenGradientB: '#0a0606',
    cameraStyle: 'circular-dial',
    specs: '1-inch Sony LYT-900 | Leica Quad 50MP | 90W HyperCharge'
  },
  {
    id: 'vivo-x100-pro',
    name: 'Vivo X100 Pro 5G',
    brand: 'Vivo',
    badge: 'ZEISS 1-INCH SENSOR',
    accentColor: '#e0663b',
    gradientA: '#f27c52',
    gradientB: '#823013',
    screenGradientA: '#381c11',
    screenGradientB: '#140803',
    cameraStyle: 'circular-dial',
    specs: 'Dimensity 9300 | ZEISS APO Telephoto | 100W Flash'
  },
  {
    id: 'realme-gt-6',
    name: 'Realme GT 6 5G',
    brand: 'Realme',
    badge: '6000 NITS ULTRA DISPLAY',
    accentColor: '#8a9ba8',
    gradientA: '#a7bccd',
    gradientB: '#3f4b54',
    screenGradientA: '#1e2933',
    screenGradientB: '#090f14',
    cameraStyle: 'dual-pill',
    specs: 'Snapdragon 8s Gen 3 | 5500mAh | 120W SUPERVOOC'
  },
  {
    id: 'default-phone',
    name: 'VM Mobiles Flagship 5G',
    brand: 'VM Mobiles',
    badge: 'GENUINE INDIAN WARRANTY',
    accentColor: '#007185',
    gradientA: '#009bb8',
    gradientB: '#003a45',
    screenGradientA: '#0d2830',
    screenGradientB: '#041014',
    cameraStyle: 'circular-dial',
    specs: 'Verified Phone IMEI Security | Pre-Expiry SMS Alerts'
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
    <text x="300" y="150" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="800" fill="#ffffff" text-anchor="middle" opacity="0.95">10:48</text>
    <text x="300" y="172" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#cbd5e1" text-anchor="middle" letter-spacing="1">SUN, SEP 6</text>

    <!-- Center Phone Badge Pill -->
    <g transform="translate(300, 280)">
      <rect x="-70" y="-18" width="140" height="36" rx="18" fill="#000000" fill-opacity="0.65" stroke="${phone.accentColor}" stroke-width="1.5"/>
      <text x="0" y="-1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#febd69" text-anchor="middle" letter-spacing="1.5">${phone.brand.toUpperCase()}</text>
      <text x="0" y="12" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="1">5G FLAGSHIP</text>
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
    <rect x="-115" y="-13" width="230" height="26" rx="13" fill="#131921" stroke="#febd69" stroke-width="1"/>
    <text x="0" y="4" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" font-weight="800" fill="#febd69" text-anchor="middle" letter-spacing="1.2">${phone.badge}</text>
  </g>

  <!-- Bottom Hardware Spec Label Pill -->
  <g transform="translate(300, 555)">
    <rect x="-160" y="-17" width="320" height="34" rx="17" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
    <text x="0" y="4" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11.5" font-weight="800" fill="#0f1111" text-anchor="middle">${phone.name}</text>
  </g>
</svg>`;
}

const outDir = path.join(process.cwd(), 'public', 'phones');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const phone of phones) {
  const filePath = path.join(outDir, `${phone.id}.svg`);
  fs.writeFileSync(filePath, generateSvg(phone), 'utf8');
  console.log(`Generated: ${phone.id}.svg`);
}

console.log('All phone SVGs generated successfully in public/phones/');
