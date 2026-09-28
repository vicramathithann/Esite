const fs = require('fs');
const seedContent = fs.readFileSync('prisma/seed.js', 'utf8');
const catalogMatch = seedContent.match(/const catalog = (\[[\s\S]*?\]);\s*async function seed/);
if (!catalogMatch) {
  console.error('Could not extract catalog');
  process.exit(1);
}
const catalog = eval(catalogMatch[1]);
console.log('Extracted', catalog.length, 'phones');

const tsContent = 'import { MobileProductData } from "./types";\n\nexport const DEFAULT_PRODUCTS: MobileProductData[] = ' + 
  JSON.stringify(catalog.map(p => ({
    id: p.id,
    name: p.brand + ' ' + p.model,
    brand: p.brand,
    series: p.variant,
    tagline: p.description,
    basePrice: p.price,
    originalPrice: p.originalPrice || p.price + 5000,
    rating: p.rating,
    reviewCount: p.reviewCount,
    imageUrl: p.imageUrl,
    galleryImages: [p.imageUrl],
    colors: p.colors || [{ name: p.variant, hex: '#1a1a1a' }],
    storageOptions: p.storageOptions || [{ size: p.storage, price: p.price }],
    ram: p.ram,
    display: p.displaySize,
    processor: p.processor,
    camera: p.camera,
    battery: p.battery,
    os: p.operatingSystem,
    network5G: 'Dual 5G SIM (SA/NSA)',
    warrantyMonths: 12,
    inStock: p.stock > 0,
    isFeatured: p.price > 80000,
    highlightFeatures: p.highlightFeatures || [p.processor, p.camera, p.battery]
  })), null, 2) + ';\n';

fs.writeFileSync('src/lib/catalogData.ts', tsContent, 'utf8');
console.log('Successfully updated src/lib/catalogData.ts with real photos!');
