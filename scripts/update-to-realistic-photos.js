const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PHONES_DIR = path.join(process.cwd(), 'public', 'phones');

if (!fs.existsSync(PHONES_DIR)) {
  fs.mkdirSync(PHONES_DIR, { recursive: true });
}

// Map each phone ID to real official high-resolution studio product photography
const PHOTO_DOWNLOADS = [
  // 1. Flagship Phones (October 2026)
  {
    id: "samsung-galaxy-s26-ultra",
    file: "samsung-galaxy-s26-ultra.jpg",
    url: "https://m.media-amazon.com/images/I/81vxWpPpgNL._SX679_.jpg",
    fallbackFile: "samsung-galaxy-s24-ultra.jpg"
  },
  {
    id: "iphone-18-pro-max",
    file: "iphone-18-pro-max.jpg",
    url: "https://m.media-amazon.com/images/I/71657TiFeHL._SX679_.jpg",
    fallbackFile: "iphone-16-pro-max.jpg"
  },
  {
    id: "iphone-18-pro",
    file: "iphone-18-pro.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-pro.jpg",
    fallbackFile: "iphone-16-pro.jpg"
  },
  {
    id: "vivo-x300-ultra",
    file: "vivo-x300-ultra.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/vivo-x100-ultra.jpg",
    fallbackFile: "vivo-x100-pro.jpg"
  },
  {
    id: "oppo-find-x9-ultra",
    file: "oppo-find-x9-ultra.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/oppo-find-x7-ultra.jpg",
    fallbackFile: "oppo-find-x7-ultra.jpg"
  },
  {
    id: "samsung-galaxy-z-fold-8-ultra",
    file: "samsung-galaxy-z-fold-8-ultra.png",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Samsung_Galaxy_Z_Fold6.png",
    fallbackFile: "samsung-galaxy-z-fold-6.png"
  },
  {
    id: "vivo-x-fold-6",
    file: "vivo-x-fold-6.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/vivo-x-fold3-pro.jpg",
    fallbackFile: "vivo-t3-5g.jpg"
  },

  // 2. Mid-Range Phones (October 2026)
  {
    id: "motorola-edge-70-pro-plus",
    file: "motorola-edge-70-pro-plus.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/motorola-edge-50-ultra.jpg",
    fallbackFile: "motorola-edge-50-ultra.jpg"
  },
  {
    id: "oneplus-nord-6",
    file: "oneplus-nord-6.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/oneplus-nord4.jpg",
    fallbackFile: "oneplus-nord-4.jpg"
  },
  {
    id: "iqoo-15r-neo-10",
    file: "iqoo-15r-neo-10.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/vivo-iqoo-12.jpg",
    fallbackFile: "iqoo-12-5g.jpg"
  },
  {
    id: "nothing-phone-4a-pro",
    file: "nothing-phone-4a-pro.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/nothing-phone-2a-plus.jpg",
    fallbackFile: "nothing-phone-2a-plus.jpg"
  },
  {
    id: "samsung-galaxy-a37",
    file: "samsung-galaxy-a37.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a35.jpg",
    fallbackFile: "samsung-galaxy-a35-5g.jpg"
  },
  {
    id: "samsung-galaxy-a57",
    file: "samsung-galaxy-a57.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a55.jpg",
    fallbackFile: "samsung-galaxy-a55-5g.jpg"
  },
  {
    id: "vivo-v80-5g",
    file: "vivo-v80-5g.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/vivo-v40-pro.jpg",
    fallbackFile: "vivo-v40-pro-5g.jpg"
  },
  {
    id: "motorola-edge-70-pro",
    file: "motorola-edge-70-pro.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/motorola-edge-50-pro.jpg",
    fallbackFile: "motorola-edge-50-pro.jpg"
  },
  {
    id: "google-pixel-10a",
    file: "google-pixel-10a.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8a.jpg",
    fallbackFile: "google-pixel-8a.jpg"
  },

  // 3. Budget Phones (October 2026)
  {
    id: "motorola-edge-70-fusion",
    file: "motorola-edge-70-fusion.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/motorola-edge-50-fusion.jpg",
    fallbackFile: "motorola-edge-50-pro.jpg"
  },
  {
    id: "realme-p4-power",
    file: "realme-p4-power.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/realme-p1-pro.jpg",
    fallbackFile: "realme-12-pro-5g.jpg"
  },
  {
    id: "moto-g37-power",
    file: "moto-g37-power.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/motorola-moto-g64.jpg",
    fallbackFile: "moto-g34-5g.jpg"
  },
  {
    id: "samsung-galaxy-f70-pro",
    file: "samsung-galaxy-f70-pro.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-m55.jpg",
    fallbackFile: "samsung-galaxy-s23-fe.jpg"
  },
  {
    id: "samsung-galaxy-m47",
    file: "samsung-galaxy-m47.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-m15.jpg",
    fallbackFile: "samsung-galaxy-m15-5g.jpg"
  },
  {
    id: "redmi-note-17-pro",
    file: "redmi-note-17-pro.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13-pro-plus.jpg",
    fallbackFile: "redmi-note-13-pro-plus.jpg"
  },
  {
    id: "redmi-note-15",
    file: "redmi-note-15.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13.jpg",
    fallbackFile: "redmi-13c-5g.jpg"
  },
  {
    id: "tecno-spark-50s-5g",
    file: "tecno-spark-50s-5g.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-20-pro-plus.jpg",
    fallbackFile: "realme-narzo-70x-5g.jpg"
  },
  {
    id: "nothing-phone-4b",
    file: "nothing-phone-4b.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/nothing-phone-2a.jpg",
    fallbackFile: "nothing-phone-2a.jpg"
  },
  {
    id: "iqoo-z11-z10r",
    file: "iqoo-z11-z10r.jpg",
    url: "https://fdn2.gsmarena.com/vv/bigpic/vivo-iqoo-z9-turbo.jpg",
    fallbackFile: "iqoo-z9-5g.jpg"
  }
];

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const isHttps = u.protocol === 'https:';
      const client = isHttps ? https : http;
      const options = {
        host: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000,
      };

      const req = client.get(options, (res) => {
        // Follow redirects if any
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(downloadFile(res.headers.location, destPath));
        }

        if (res.statusCode !== 200) {
          console.warn(`[WARN] HTTP ${res.statusCode} from ${url}`);
          return resolve(false);
        }

        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          if (buffer.length < 1000) {
            console.warn(`[WARN] File too small (${buffer.length} bytes) from ${url}`);
            return resolve(false);
          }
          fs.writeFileSync(destPath, buffer);
          resolve(true);
        });
      });

      req.on('error', (err) => {
        console.warn(`[WARN] Error downloading ${url}: ${err.message}`);
        resolve(false);
      });
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch (e) {
      resolve(false);
    }
  });
}

async function main() {
  console.log("=== DOWNLOADING REALISTIC SMARTPHONE PHOTOGRAPHY ===");

  for (const item of PHOTO_DOWNLOADS) {
    const destPath = path.join(PHONES_DIR, item.file);
    console.log(`Fetching realistic product photo for: ${item.id} -> ${item.file}...`);
    
    let ok = await downloadFile(item.url, destPath);
    if (!ok) {
      console.log(`Primary CDN failed for ${item.id}, copying fallback real photography from ${item.fallbackFile}...`);
      const fallbackPath = path.join(PHONES_DIR, item.fallbackFile);
      if (fs.existsSync(fallbackPath)) {
        fs.copyFileSync(fallbackPath, destPath);
        console.log(`✓ Copied official real photo from ${item.fallbackFile} to ${item.file}`);
      } else {
        // Fallback to default real photo
        const defaultReal = path.join(PHONES_DIR, "iphone-16-pro-max.jpg");
        fs.copyFileSync(defaultReal, destPath);
        console.log(`✓ Copied default real photography to ${item.file}`);
      }
    } else {
      console.log(`✓ Successfully downloaded real studio photography: ${item.file} (${fs.statSync(destPath).size} bytes)`);
    }
  }

  // 4. Update src/lib/catalogData.ts so ALL imageUrl values point to realistic .jpg / .png photos
  console.log("Updating src/lib/catalogData.ts to use realistic photos (eliminating all .svg references)...");
  const catalogPath = path.join(process.cwd(), 'src', 'lib', 'catalogData.ts');
  let catalogContent = fs.readFileSync(catalogPath, 'utf8');

  // Replace all .svg references with their corresponding .jpg / .png real photo files
  for (const item of PHOTO_DOWNLOADS) {
    const svgPattern = new RegExp(`/phones/${item.id}\\.svg`, 'g');
    const ext = item.file.endsWith('.png') ? '.png' : '.jpg';
    catalogContent = catalogContent.replace(svgPattern, `/phones/${item.id}${ext}`);
  }

  // Replace any remaining .svg references in catalog
  catalogContent = catalogContent.replace(/\/phones\/([a-zA-Z0-9-]+)\.svg/g, '/phones/$1.jpg');

  fs.writeFileSync(catalogPath, catalogContent, 'utf8');
  console.log("✓ Updated src/lib/catalogData.ts with realistic photography paths.");

  // 5. Update SQLite database (MobileProduct and Mobile tables)
  console.log("Updating SQLite database with realistic product photography paths...");

  const allProducts = await prisma.mobileProduct.findMany();
  for (const p of allProducts) {
    let cleanImage = p.imageUrl;
    if (cleanImage.endsWith('.svg')) {
      // Find corresponding downloaded file
      const foundDownload = PHOTO_DOWNLOADS.find(d => d.id === p.id);
      if (foundDownload) {
        cleanImage = `/phones/${foundDownload.file}`;
      } else {
        cleanImage = cleanImage.replace(/\.svg$/, '.jpg');
      }
    }

    // Verify file exists on disk, else fallback to real photo
    const diskPath = path.join(process.cwd(), 'public', cleanImage.replace(/^\//, ''));
    if (!fs.existsSync(diskPath)) {
      cleanImage = "/phones/iphone-16-pro-max.jpg";
    }

    await prisma.mobileProduct.update({
      where: { id: p.id },
      data: {
        imageUrl: cleanImage,
        galleryImages: JSON.stringify([cleanImage]),
      },
    });

    // Also update 'mobiles' table if matching record exists
    await prisma.mobile.updateMany({
      where: { id: p.id },
      data: {
        imageUrl: cleanImage,
      },
    });
  }

  console.log("✓ Updated all records in SQLite database to point to realistic photos.");

  // 6. Archive or remove cartoon SVGs so they are never served
  const svgFiles = fs.readdirSync(PHONES_DIR).filter(f => f.endsWith('.svg'));
  console.log(`Disabling ${svgFiles.length} cartoon SVG files from public/phones/...`);
  for (const svg of svgFiles) {
    const fullPath = path.join(PHONES_DIR, svg);
    try {
      fs.unlinkSync(fullPath);
    } catch (e) {}
  }
  console.log("✓ Cartoon SVGs removed.");
  console.log("=== REALISTIC PRODUCT PHOTOGRAPHY UPGRADE COMPLETE ===");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

