const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.order.findFirst();
  if (existing) {
    console.log("Existing order found, skipping seed.");
    return;
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const order = await prisma.order.create({
    data: {
      orderNumber: "NOVA-928104",
      customerName: "Vicram",
      customerPhone: "+91 98765 43210",
      customerEmail: "vicram@example.com",
      address: "24, Indiranagar 100ft Road",
      city: "Tamil Nadu",
      pincode: "600001",
      state: "chennai",
      totalAmount: 144900,
      paymentMethod: "UPI (PhonePe)",
      paymentStatus: "PAID",
      orderStatus: "DELIVERED",
      createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // Ordered 15 days ago
      items: {
        create: [
          {
            productId: "iphone-16-pro-max",
            productName: "Apple iPhone 16 Pro Max",
            productBrand: "Apple",
            productImageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80",
            selectedColor: "Natural Titanium",
            selectedStorage: "256GB",
            price: 144900,
            quantity: 1,
            imeiNumber: "867492019482014",
            warrantyMonths: 12,
            warrantyStartDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
            warrantyExpiryDate: expiry,
            warrantyStatus: "ACTIVE",
          }
        ]
      }
    }
  });

  console.log("Sample order created with IMEI:", order.orderNumber);
}

main().finally(async () => {
  await prisma.$disconnect();
});