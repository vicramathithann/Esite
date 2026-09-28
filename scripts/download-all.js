const fs = require('fs');
const path = require('path');

const downloads = [
  // Apple
  { file: 'iphone-16-pro-max.jpg', url: 'https://m.media-amazon.com/images/I/71657TiFeHL._SX679_.jpg' },
  { file: 'iphone-16-pro-max-1tb.jpg', url: 'https://m.media-amazon.com/images/I/71657TiFeHL._SX679_.jpg' },
  { file: 'iphone-16-pro.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-pro.jpg' },
  { file: 'iphone-16-plus.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-plus.jpg' },
  { file: 'iphone-16.jpg', url: 'https://m.media-amazon.com/images/I/61bK6PMOC3L._SX679_.jpg' },
  { file: 'iphone-15.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15.jpg' },

  // Samsung
  { file: 'samsung-galaxy-s24-ultra.jpg', url: 'https://m.media-amazon.com/images/I/81vxWpPpgNL._SX679_.jpg' },
  { file: 'samsung-galaxy-s24.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-5g-sm-s921.jpg' },
  { file: 'samsung-galaxy-s23-fe.jpg', url: 'https://m.media-amazon.com/images/I/71qGismu6NL._SX679_.jpg' },
  { file: 'samsung-galaxy-z-fold-6.png', url: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Samsung_Galaxy_Z_Fold6.png' },
  { file: 'samsung-galaxy-m15-5g.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-m15.jpg' },
  { file: 'samsung-galaxy-a55-5g.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a55.jpg' },
  { file: 'samsung-galaxy-a35-5g.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a35.jpg' },

  // Google Pixel
  { file: 'google-pixel-9-pro-xl.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9-pro-xl-.jpg' },
  { file: 'google-pixel-9-pro.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9-pro-.jpg' },
  { file: 'google-pixel-9.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/google-pixel-9-.jpg' },
  { file: 'google-pixel-8a.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8a.jpg' },

  // OnePlus
  { file: 'oneplus-13.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/oneplus-13.jpg' },
  { file: 'oneplus-12.jpg', url: 'https://m.media-amazon.com/images/I/717Qo4MH97L._SX679_.jpg' },
  { file: 'oneplus-12r.jpg', url: 'https://m.media-amazon.com/images/I/71XNeka-BRL._SX679_.jpg' },
  { file: 'oneplus-nord-4.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/oneplus-nord4.jpg' },
  { file: 'oneplus-nord-ce4-lite.jpg', url: 'https://m.media-amazon.com/images/I/61Io5-ojWUL._SX679_.jpg' },

  // Xiaomi & Redmi
  { file: 'xiaomi-14-ultra.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14-ultra-new.jpg' },
  { file: 'xiaomi-14.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14.jpg' },
  { file: 'redmi-13c-5g.jpg', url: 'https://m.media-amazon.com/images/I/81T3olLXpUL._SX679_.jpg' },
  { file: 'redmi-note-13-pro-plus.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13-pro-plus.jpg' },

  // Realme
  { file: 'realme-gt-6.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/realme-gt6.jpg' },
  { file: 'realme-12-pro-5g.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/realme-12-pro-plus.jpg' },
  { file: 'realme-narzo-70x-5g.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/realme-narzo-70x.jpg' },

  // Vivo
  { file: 'vivo-x100-pro.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/vivo-x100-pro.jpg' },
  { file: 'vivo-v40-pro-5g.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/vivo-v40-pro.jpg' },
  { file: 'vivo-t3-5g.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/vivo-t3.jpg' },

  // Motorola
  { file: 'moto-g34-5g.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/motorola-moto-g64.jpg' },
  { file: 'motorola-edge-50-pro.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/motorola-edge-50-pro.jpg' },
  { file: 'motorola-edge-50-ultra.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/motorola-edge-50-ultra.jpg' },

  // Nothing
  { file: 'nothing-phone-2a.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/nothing-phone-2a.jpg' },
  { file: 'nothing-phone-2a-plus.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/nothing-phone-2a-plus.jpg' },

  // iQOO
  { file: 'iqoo-12-5g.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/vivo-iqoo12.jpg' },
  { file: 'iqoo-z9-5g.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/vivo-iqoo-z9.jpg' },

  // Oppo
  { file: 'oppo-find-x7-ultra.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/oppo-find-x7-ultra.jpg' },
  { file: 'oppo-reno-12-pro.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/oppo-reno12-pro-cn.jpg' },

  // Sony & Asus & Nokia
  { file: 'sony-xperia-1-vi.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/sony-xperia-1-vi.jpg' },
  { file: 'asus-rog-phone-8-pro.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/asus-rog-phone-8-pro.jpg' },
  { file: 'nokia-g42-5g.jpg', url: 'https://fdn2.gsmarena.com/vv/bigpic/nokia-g42-5g.jpg' }
];

async function downloadAll() {
  const destDir = path.join(process.cwd(), 'public', 'phones');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  let successCount = 0;
  for (const item of downloads) {
    try {
      const res = await fetch(item.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        const dest = path.join(destDir, item.file);
        fs.writeFileSync(dest, buffer);
        console.log(`[OK] ${item.file} (${buffer.length} bytes)`);
        successCount++;
      } else {
        console.log(`[FAIL ${res.status}] ${item.file}`);
      }
    } catch (err) {
      console.log(`[ERR] ${item.file}: ${err.message}`);
    }
  }
  console.log(`Finished: ${successCount} / ${downloads.length} images saved successfully.`);
}

downloadAll();
