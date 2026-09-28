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
      customerName: "Vikram R.",
      customerPhone: "+91 98765 43210",
      customerEmail: "vikram@example.com",
      address: "24, Indiranagar 100ft Road",
      city: "Bengaluru",
      pincode: "560038",
      state: "Karnataka",
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
      },
      smsAlerts: {
        create: [
          {
            customerPhone: "+91 98765 43210",
            alertType: "PURCHASE_CONFIRMATION",
            title: "Order & Device Protection Confirmed",
            messageBody: `[NovaMobile] Order #NOVA-928104 Confirmed! Dear Vikram, your purchase of Apple iPhone 16 Pro Max (256GB) for Rs 1,44,900 is successful. Registered IMEI: 867492019482014. Your 1-Year Device Protection is ACTIVE until ${expiry.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}. We will alert you via SMS before your warranty expires!`,
            isRead: true,
            sentAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
          }
        ]
      }
    }
  });

  console.log("Sample order created with IMEI & SMS alert:", order.orderNumber);
}

main().finally(async () => {
  await prisma.$disconnect();
});