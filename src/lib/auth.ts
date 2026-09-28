import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) {
    // Fallback for simple legacy test passwords if any
    return password === storedHash;
  }
  const [salt, originalHash] = storedHash.split(":");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

export async function ensureAdminUser() {
  try {
    const adminEmail = "admin@vmmobiles.in";
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existing) {
      const hashedPassword = hashPassword("admin123");
      await prisma.user.create({
        data: {
          name: "VM Mobiles Administrator",
          email: adminEmail,
          phone: "+91 99999 00000",
          password: hashedPassword,
          role: "ADMIN",
        },
      });
      console.log("Default admin account created: admin@vmmobiles.in / admin123");
    }
  } catch (e) {
    console.error("Error seeding admin account:", e);
  }
}
