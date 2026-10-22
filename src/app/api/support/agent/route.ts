import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeInput, detectLlmAttack, isCustomerAskingAdminInfo } from "@/lib/aiSecurity";

// Scope verification: Checks whether query belongs to VN Mobiles domain
function isQueryVnMobilesRelated(query: string, historySummary: string): boolean {
  const q = (query + " " + historySummary).toLowerCase().trim();

  // Explicit off-topic keywords
  const offTopicKeywords = [
    "weather", "forecast", "recipe", "cook", "pasta", "pizza", "cake", "baking",
    "prime minister", "president", "politics", "election", "parliament", "cricket",
    "football", "world cup", "match score", "movie", "song", "actor", "actress",
    "astronomy", "planet mars", "jupiter", "python code", "javascript code",
    "write code", "programming in", "capital of", "who invented", "math homework",
    "calculus", "tell me a joke", "make a joke", "crypto", "bitcoin", "stock market",
    "airline", "flight ticket", "hotel booking"
  ];

  // Specific exception: if user mentions a phone brand or smartphone model
  const isPhoneModelMention = /galaxy|iphone|pixel|oneplus|vivo|oppo|motorola|redmi|realme|nothing|s26|nord/i.test(q);

  if (!isPhoneModelMention) {
    for (const kw of offTopicKeywords) {
      if (q.includes(kw)) {
        return false;
      }
    }
  }

  // Permitted domain keywords
  const onTopicKeywords = [
    "phone", "mobile", "smartphone", "handset", "device", "specs", "specification",
    "camera", "processor", "ram", "storage", "battery", "display", "screen", "price",
    "cost", "inr", "₹", "rate", "buy", "purchase", "shop", "stock", "deal", "discount",
    "apple", "iphone", "samsung", "galaxy", "pixel", "oneplus", "xiaomi", "redmi",
    "realme", "vivo", "oppo", "motorola", "moto", "nothing", "iqoo", "tecno", "sony",
    "flagship", "budget", "foldable", "flip", "ultra", "pro max", "order", "track",
    "tracking", "status", "package", "parcel", "ship", "shipping", "delivery", "courier",
    "dispatch", "arrive", "cancel", "cancellation", "refund", "money back", "return",
    "replacement", "replace", "damaged", "defective", "invoice", "ord", "transit", "delay",
    "warranty", "device shield", "shield", "guarantee", "imei", "serial", "protection",
    "repair", "service center", "expired", "coverage", "alert", "reminder", "hardware",
    "compare", "comparison", "in compare", "side by side", "wishlist", "favorite",
    "favourite", "heart", "save", "saved", "pay", "payment", "upi", "gpay", "google pay",
    "phonepe", "paytm", "bhim", "card", "credit", "debit", "netbanking", "net banking",
    "cod", "cash on delivery", "emi", "no cost emi", "cart", "checkout", "bank",
    "account", "login", "sign in", "signin", "register", "sign up", "signup",
    "password", "forgot", "reset", "otp", "verification", "profile", "invite",
    "username", "email", "vn", "vn mobiles", "store", "website", "support", "help",
    "contact", "customer care", "helpline", "toll free", "1800", "problem", "issue", "error"
  ];

  return onTopicKeywords.some((kw) => q.includes(kw));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages = [], user = null } = body;

    const rawLatestMessage = messages[messages.length - 1]?.content || "";
    const latestMessage = sanitizeInput(rawLatestMessage);
    const historyText = messages
      .slice(-4, -1)
      .map((m: any) => sanitizeInput(m.content))
      .join(" ");

    // Security Check 1: Detect prompt injection / jailbreak / extraction attacks
    const attackCheck = detectLlmAttack(latestMessage);
    if (attackCheck.isAttack) {
      return NextResponse.json({
        success: true,
        answer: "I can only help with customer-related questions on VN Mobiles. I don’t have access to admin information.",
        suggestions: [
          "📦 Track my order",
          "🛡️ Device Shield Warranty",
          "🔄 Cancel an order & refund",
          "⚖️ How to compare phones"
        ]
      });
    }

    // Security Check 2: Block any attempts to extract admin data / revenue / userbase / invites / settings
    if (isCustomerAskingAdminInfo(latestMessage) || isCustomerAskingAdminInfo(historyText)) {
      return NextResponse.json({
        success: true,
        answer: "I can only help with customer-related questions on VN Mobiles. I don’t have access to admin information.",
        suggestions: [
          "📦 Track my order",
          "🛡️ Device Shield Warranty",
          "🔄 Cancel an order & refund",
          "⚖️ How to compare phones"
        ]
      });
    }

    const q = latestMessage.toLowerCase().trim();

    // 1. Strict Scope Check
    const isGreeting = /^(hi|hello|hey|namaste|good morning|good afternoon|good evening|greeting)\b/i.test(q);
    const isThanks = /^(thanks|thank you|thx|great|awesome|helpful|ok thanks|okay thanks)\b/i.test(q);

    if (!isGreeting && !isThanks && !isQueryVnMobilesRelated(latestMessage, historyText)) {
      return NextResponse.json({
        success: true,
        answer: "I don’t have this kind of information. I can only help you with VN Mobiles related questions.",
        suggestions: [
          "📦 Track my order",
          "🛡️ Device Shield Warranty",
          "🔄 Cancel an order & refund",
          "⚖️ How to compare phones"
        ]
      });
    }

    // 2. Greeting Handler
    if (isGreeting) {
      const userName = user?.name ? ` **${user.name}**` : "";
      return NextResponse.json({
        success: true,
        answer:
          `Hello${userName}! 👋 I am your **VN Mobiles AI Support Agent**.\n\n` +
          `I am here to actively guide you step-by-step through our store—whether you need to track a package, cancel an order, check 1-Year Device Shield warranty, compare handsets, explore No-Cost EMI, or solve account issues.\n\n` +
          `What can I help you resolve right now?`,
        links: [
          { label: "My Orders", href: "/orders" },
          { label: "Compare Phones", href: "/compare" },
          { label: "Device Warranties", href: "/account/warranties" }
        ],
        suggestions: [
          "Where is my order?",
          "How do I cancel an order?",
          "How does Device Shield warranty work?",
          "How to compare two phones?"
        ]
      });
    }

    // 3. Gratitude Handler
    if (isThanks) {
      return NextResponse.json({
        success: true,
        answer:
          "You're very welcome! 😊 I'm always on standby to guide you with your VN Mobiles orders, smartphone specs, or warranty protection.\n\nIs there anything else I can assist you with today?",
        links: [
          { label: "Shop All Mobiles", href: "/" },
          { label: "View Wishlist", href: "/account/wishlist" }
        ],
        suggestions: [
          "Recommend flagship phones",
          "Delivery timelines across India",
          "Customer care helpline"
        ]
      });
    }

    // 4. Order ID Detection & Live DB Lookup (Active Agent Behavior)
    const orderIdMatch = (latestMessage + " " + historyText).match(/(?:#?ORD\d{4,6}|ORD\d{4,6})/i);
    if (orderIdMatch) {
      const orderNumber = orderIdMatch[0].toUpperCase().replace("#", "");
      try {
        const orderRecord = await prisma.order.findFirst({
          where: { orderNumber },
          include: { items: true, warranties: true }
        });

        if (orderRecord) {
          const itemNames = orderRecord.items.map((i) => i.productName).join(", ") || "Smartphone";
          const isCancelled = orderRecord.orderStatus === "CANCELLED" || orderRecord.orderStatus === "Cancelled";

          let statusDetail = "";
          if (isCancelled) {
            statusDetail =
              `• **Order Status:** **Cancelled**\n` +
              `• **Payment Status:** **${orderRecord.paymentStatus || "Refund Initiated"}**\n` +
              `• **Warranty Status:** Cancelled & Voided\n` +
              `• **Note:** Full refund has been initiated to your original payment method. If paid via UPI, refunds reflect within hours; bank cards take 2 to 5 business days.`;
          } else {
            statusDetail =
              `• **Order Status:** **${orderRecord.orderStatus}**\n` +
              `• **Items:** ${itemNames}\n` +
              `• **Carrier Tracking:** ${orderRecord.trackingNumber ? `${orderRecord.shippingCarrier || "Courier"} (#${orderRecord.trackingNumber})` : "Generating courier dispatch label"}\n` +
              `• **Device Shield Warranty:** 1-Year Active Protection (IMEI registered)`;
          }

          return NextResponse.json({
            success: true,
            answer:
              `I located your order **#${orderRecord.orderNumber}** in our live system! Here are the real-time details:\n\n` +
              statusDetail +
              `\n\n**Next Steps for You:**\n` +
              `• View full invoice and timeline in **[My Orders](/orders)**.\n` +
              (isCancelled
                ? `• If your refund has not reflected after 5 business days, our team at **support@vnmobiles.in** can supply your bank UTR number.`
                : `• If you need to cancel, you can do so in 1 click from your **[Orders Page](/orders)** before it is out for delivery.`) +
              `\n\n*Follow-up: Would you like help with anything else regarding order #${orderRecord.orderNumber}?*`,
            links: [
              { label: `View Order #${orderRecord.orderNumber}`, href: `/orders` },
              { label: "Account Overview", href: "/account" }
            ],
            suggestions: isCancelled
              ? ["When will my refund arrive?", "Check Device Shield Warranty", "Browse new smartphones"]
              : ["How do I cancel this order?", "Delivery timeline details", "Warranty coverage details"]
          });
        }
      } catch (e) {
        console.error("Order lookup error:", e);
      }
    }

    // 5. Specific Phone Model Lookup & Live Catalog Grounding
    const phoneKeywords = [
      "s26 ultra", "s26", "iphone 18 pro max", "iphone 18 pro", "iphone 18",
      "nord 6", "edge 70 pro+", "edge 70 fusion", "iqoo 15r", "nothing phone (4a) pro",
      "pixel 10a", "galaxy a57", "vivo x300 ultra", "oppo find x9 ultra", "z fold 8"
    ];

    const matchedPhoneKey = phoneKeywords.find((kw) => q.includes(kw));
    if (matchedPhoneKey) {
      try {
        const product = await prisma.mobileProduct.findFirst({
          where: {
            name: { contains: matchedPhoneKey.split(" ")[0] }
          }
        });

        if (product) {
          return NextResponse.json({
            success: true,
            answer:
              `Here is the latest live store information for **${product.name}**:\n\n` +
              `• **Price in ₹:** **₹${product.basePrice.toLocaleString("en-IN")}**\n` +
              `• **Brand:** ${product.brand}\n` +
              `• **Processor:** ${product.processor}\n` +
              `• **Camera:** ${product.camera}\n` +
              `• **Battery & Display:** ${product.battery} | ${product.display}\n` +
              `• **Warranty:** 1-Year Official Brand Warranty + VN Device Shield Protection\n` +
              `• **Availability:** ${product.inStock ? "✅ In Stock & Ready for Free Express Dispatch" : "Temporarily Out of Stock"}\n\n` +
              `**What you can do next:**\n` +
              `• Click **'Compare'** on the product card to benchmark it side-by-side with another phone.\n` +
              `• Click the **Heart (♥)** icon to add it to your saved wishlist.\n` +
              `• Order with No-Cost EMI options available at checkout.\n\n` +
              `*Follow-up: Would you like to compare ${product.name} with another flagship or check available EMI terms?*`,
            links: [
              { label: `View ${product.name}`, href: `/?search=${encodeURIComponent(product.name)}` },
              { label: "Side-by-Side Compare", href: "/compare" }
            ],
            suggestions: [
              `Compare ${product.name}`,
              "No-Cost EMI options",
              "Delivery timeline across India"
            ]
          });
        }
      } catch (e) {
        console.error("Product lookup error:", e);
      }
    }

    // 6. Multi-Turn Interactive Problem Resolution Guides

    // Problem A: Order Cancellation & Refund
    if (q.includes("cancel") || q.includes("refund") || q.includes("cancellation") || q.includes("money back")) {
      return NextResponse.json({
        success: true,
        answer:
          "Here is how to cancel an order and claim a full refund step-by-step:\n\n" +
          "• **Step 1:** Go to your **[My Orders](/orders)** page while logged in.\n" +
          "• **Step 2:** Under the **Active Orders** section, find the handset you want to cancel.\n" +
          "• **Step 3:** Click the red **'Cancel Order'** button.\n" +
          "• **Step 4:** Select your cancellation reason and confirm.\n" +
          "• **Step 5:** The order instantly moves to the **Cancelled** section.\n\n" +
          "**Refund & Warranty Status:**\n" +
          "• A 100% full refund is initiated automatically to your original payment method (instant for UPI, 2–5 bank business days for credit/debit cards).\n" +
          "• The associated Device Shield warranty is automatically cancelled & voided, and warehouse inventory is restored.\n\n" +
          "*Follow-up: Do you have your Order ID (e.g. #ORD12345) ready? If you tell me your Order ID, I can check its current cancellation eligibility right now!*",
        links: [
          { label: "Go to Orders Page", href: "/orders" },
          { label: "My Account", href: "/account" }
        ],
        suggestions: [
          "Where is my refund?",
          "I have my Order ID",
          "Track my package"
        ]
      });
    }

    // Problem B: Order Tracking & Delivery Status
    if (q.includes("track") || q.includes("where is my order") || q.includes("delivery status") || q.includes("package") || q.includes("courier")) {
      return NextResponse.json({
        success: true,
        answer:
          "Here is how to track your VN Mobiles delivery step-by-step:\n\n" +
          "• **Step 1:** Click the **Package icon** in the top navigation bar or go to **[My Orders](/orders)**.\n" +
          "• **Step 2:** Look for your Order ID (starts with **#ORD...**).\n" +
          "• **Step 3:** View your real-time milestone bar:\n" +
          "  *Confirmed ➔ Processing ➔ Packed ➔ Shipped ➔ Out for Delivery ➔ Delivered*\n" +
          "• **Step 4:** For shipped orders, click on the card to see carrier details (Bluedart, Delhivery, etc.) and your live tracking number.\n\n" +
          "**Delivery Timeline:** 2 to 4 business days for major metros and 3 to 6 business days for other regions across 24+ Indian cities.\n\n" +
          "*Follow-up: If you reply with your Order ID (e.g. #ORD59928), I will retrieve its live dispatch status for you immediately!*",
        links: [
          { label: "Track My Orders", href: "/orders" }
        ],
        suggestions: [
          "I have my Order ID",
          "How do I cancel my order?",
          "Delivery timelines across India"
        ]
      });
    }

    // Problem C: Device Shield Warranty & IMEI
    if (q.includes("warranty") || q.includes("imei") || q.includes("shield") || q.includes("guarantee") || q.includes("service center") || q.includes("repair")) {
      return NextResponse.json({
        success: true,
        answer:
          "Here is everything you need to know about your warranty on VN Mobiles:\n\n" +
          "• **1-Year Brand Manufacturer Warranty + VN Device Shield:** Included automatically with every smartphone purchased.\n" +
          "• **IMEI Hardware Registration:** Your phone's unique 15-digit IMEI is registered in the database at checkout.\n" +
          "• **Automated Alerts:** We email reminder alerts **6 months** and **1 day** before expiry so you never miss authorized service.\n" +
          "• **View Certificates:** Go to **[My Warranties](/account/warranties)** to review coverage status.\n" +
          "• **Service Center Claims:** Bring your digital invoice and handset to any official brand service center (Apple, Samsung, OnePlus, etc.) in India.\n" +
          "• **Cancelled Orders:** If an order is cancelled, warranty coverage is automatically closed and marked Cancelled.\n\n" +
          "*Follow-up: Do you need help finding your device's IMEI number or checking an existing warranty certificate?*",
        links: [
          { label: "View My Warranties", href: "/account/warranties" },
          { label: "Check Orders", href: "/orders" }
        ],
        suggestions: [
          "How to track my order?",
          "How does Compare feature work?",
          "15-Day Replacement guarantee"
        ]
      });
    }

    // Problem D: Compare Feature
    if (q.includes("compare") || q.includes("in compare") || q.includes("comparison") || q.includes("side by side")) {
      return NextResponse.json({
        success: true,
        answer:
          "Here is how to use the Side-by-Side Compare feature step-by-step:\n\n" +
          "• **Step 1:** Browse any phone on the storefront and click the **'Compare'** button on its card.\n" +
          "• **Step 2:** The button will turn to **'In Compare'** with a checkmark.\n" +
          "• **Step 3:** Select up to 4 devices to compare Processor, Cameras, Battery, Display, and Prices in ₹.\n" +
          "• **Step 4:** Click **'In Compare'** again on any card to remove it (it functions as an easy toggle).\n" +
          "• **Step 5:** Tap the **Layers icon** in the top navigation or click any 'In Compare' button to view the full **[Compare Page](/compare)**.\n\n" +
          "*Follow-up: Which two phones would you like to compare right now? (e.g. Galaxy S26 Ultra vs iPhone 18 Pro)*",
        links: [
          { label: "Open Compare Page", href: "/compare" },
          { label: "Browse All Mobiles", href: "/" }
        ],
        suggestions: [
          "Recommend flagship phones",
          "How to save to Wishlist?",
          "No-Cost EMI options"
        ]
      });
    }

    // Problem E: Wishlist
    if (q.includes("wishlist") || q.includes("favorite") || q.includes("favourite") || q.includes("heart") || q.includes("save")) {
      return NextResponse.json({
        success: true,
        answer:
          "Here is how to save and manage smartphones in your Wishlist:\n\n" +
          "• **Step 1:** Tap the **Heart (♥)** icon on the top-right of any phone card or detail page.\n" +
          "• **Step 2:** The heart turns red, confirming the handset is saved.\n" +
          "• **Step 3:** View your saved phones anytime by clicking the Heart icon in the header or visiting **[Saved Wishlist](/account/wishlist)**.\n" +
          "• **Step 4:** You can move items straight from your wishlist to your cart or add them to Compare.\n\n" +
          "*Follow-up: Are you signed in to your account? Signing in syncs your saved favorites across your laptop and phone.*",
        links: [
          { label: "View My Wishlist", href: "/account/wishlist" },
          { label: "Browse Phones", href: "/" }
        ],
        suggestions: [
          "How to compare phones?",
          "No-Cost EMI options",
          "Track my orders"
        ]
      });
    }

    // Problem F: Payments & No-Cost EMI
    if (q.includes("payment") || q.includes("pay") || q.includes("upi") || q.includes("emi") || q.includes("cod") || q.includes("card") || q.includes("netbanking")) {
      return NextResponse.json({
        success: true,
        answer:
          "Here is how payments and No-Cost EMI work on VN Mobiles:\n\n" +
          "• **UPI:** Google Pay, PhonePe, Paytm, BHIM (instant confirmation).\n" +
          "• **Cards:** Visa, Mastercard, RuPay, Maestro Credit & Debit Cards.\n" +
          "• **No-Cost EMI:** 3, 6, 9, or 12-month zero-interest plans on popular bank credit cards.\n" +
          "• **Cash on Delivery (COD):** Available for eligible pincodes across India.\n" +
          "• **Net Banking:** Supported across all leading Indian banks.\n\n" +
          "**Payment Issues?** If money was debited but no order was created, your bank automatically auto-reverses the transaction within 24 to 48 hours.\n\n" +
          "*Follow-up: Are you inquiring about EMI interest rates or experiencing a checkout payment issue?*",
        links: [
          { label: "View Cart / Checkout", href: "/cart" }
        ],
        suggestions: [
          "What is the delivery time?",
          "Order cancellation & refunds",
          "Device Shield Warranty details"
        ]
      });
    }

    // Problem G: 15-Day Replacement / Damaged Handsets
    if (q.includes("return") || q.includes("replace") || q.includes("replacement") || q.includes("damaged") || q.includes("defective") || q.includes("broken")) {
      return NextResponse.json({
        success: true,
        answer:
          "Here is how our 15-Day Free Replacement Guarantee works step-by-step:\n\n" +
          "• **Step 1:** VN Mobiles offers a **15-day free replacement window** from the delivery date for defective, transit-damaged, or incorrect handsets.\n" +
          "• **Step 2:** Keep your handset, original retail box, invoice, and all inbox accessories (charger, cable) intact.\n" +
          "• **Step 3:** Go to **[My Orders](/orders)**, select the delivered item, and click 'Request Replacement' or email **support@vnmobiles.in**.\n\n" +
          "*Follow-up: Did the device arrive with physical transit damage, or is there an internal software/hardware malfunction?*",
        links: [
          { label: "Go to My Orders", href: "/orders" },
          { label: "Email Support", href: "mailto:support@vnmobiles.in" }
        ],
        suggestions: [
          "Device Shield Warranty coverage",
          "Refund timeline",
          "Customer helpline number"
        ]
      });
    }

    // Problem H: Account & Login / Password Reset
    if (q.includes("account") || q.includes("login") || q.includes("password") || q.includes("forgot") || q.includes("otp") || q.includes("register") || q.includes("invite")) {
      return NextResponse.json({
        success: true,
        answer:
          "Here is how to manage your VN Mobiles account step-by-step:\n\n" +
          "• **Sign In:** Use your registered email and password, or choose **'Login with OTP'** for a 6-digit code sent to your email.\n" +
          "• **Forgot Password:** Go to **[Forgot Password](/forgot-password)**, enter your email, and click 'Send Reset Link' to receive a 1-hour secure reset email.\n" +
          "• **Exclusive Invite Link:** If you received an invite link, open it to create your unique username and activate storefront access.\n" +
          "• **Manage Profile:** Update your contact details, check orders, and view warranty certificates under **[My Account](/account)**.\n\n" +
          "*Follow-up: Are you having trouble with password sign-in or is your verification OTP not arriving?*",
        links: [
          { label: "Sign In / Login", href: "/login" },
          { label: "Forgot Password", href: "/forgot-password" },
          { label: "Account Overview", href: "/account" }
        ],
        suggestions: [
          "Track my orders",
          "Warranty information",
          "How to use Compare?"
        ]
      });
    }

    // Problem I: General Customer Support Contact
    if (q.includes("contact") || q.includes("call") || q.includes("customer care") || q.includes("phone number") || q.includes("toll free") || q.includes("helpline")) {
      return NextResponse.json({
        success: true,
        answer:
          "You can reach the VN Mobiles customer assistance desk directly:\n\n" +
          "• **Toll-Free Helpline:** **1800-VN-MOBILE** (1800-866-6245)\n" +
          "  *(Monday to Saturday, 9:00 AM – 9:00 PM IST)*\n" +
          "• **Email Assistance:** **support@vnmobiles.in**\n" +
          "  *(Average response time within 2 hours)*\n" +
          "• **Storefront Network:** Authorized partner across 24+ Indian cities.\n\n" +
          "*Follow-up: What specific issue can I help guide you through right now before you call or email?*",
        links: [
          { label: "Email Support Desk", href: "mailto:support@vnmobiles.in" },
          { label: "Storefront Home", href: "/" }
        ],
        suggestions: [
          "Track my order",
          "Device Shield Warranty details",
          "Cancel order & refund"
        ]
      });
    }

    // Default intelligent fall-through for VN Mobiles store
    return NextResponse.json({
      success: true,
      answer:
        "I am ready to help you resolve any issue on VN Mobiles! Here are the main areas I can guide you through step-by-step:\n\n" +
        "• **Orders & Live Tracking:** Real-time milestones from confirmed to delivered.\n" +
        "• **Cancellations & Refunds:** 1-click self-service cancellation and automatic refunds.\n" +
        "• **1-Year Device Shield Warranty:** Automatic IMEI registration and reminder alerts.\n" +
        "• **Compare Feature:** How to benchmark up to 4 phones side-by-side.\n" +
        "• **Wishlist & Cart:** Saving favorites and checkout.\n" +
        "• **Payments & Delivery:** UPI, Cards, COD, and Free Express Shipping.\n" +
        "• **15-Day Replacements:** Hassle-free claims for damaged or defective handsets.\n\n" +
        "*Follow-up: Could you describe the specific question or problem you have regarding your order or shopping?*",
      links: [
        { label: "My Orders", href: "/orders" },
        { label: "Compare Phones", href: "/compare" },
        { label: "Device Warranties", href: "/account/warranties" }
      ],
      suggestions: [
        "Track my order",
        "Cancel an order",
        "Warranty details",
        "How to compare phones?"
      ]
    });
  } catch (error) {
    console.error("AI Support Agent error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "AI Support Agent temporarily unavailable"
      },
      { status: 500 }
    );
  }
}

