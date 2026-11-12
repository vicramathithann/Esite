import { prisma } from "@/lib/prisma";

const BOUNCE_SETTING_KEY = "suppressed_emails_list";

export interface SuppressedEmailRecord {
  email: string;
  reason: string;
  source: "webhook_bounce" | "webhook_complaint" | "manual";
  suppressedAt: string;
}

/**
 * Checks if an email address is currently suppressed due to hard bounce or spam complaint.
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  // Also immediately treat soft-deleted placeholder emails as suppressed
  if (cleanEmail.includes("@deleted.") || cleanEmail.startsWith("deleted-")) {
    return true;
  }

  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: BOUNCE_SETTING_KEY },
    });

    if (!setting || !setting.value) return false;

    let list: SuppressedEmailRecord[] = [];
    if (typeof setting.value === "string") {
      list = JSON.parse(setting.value);
    } else if (Array.isArray(setting.value)) {
      list = setting.value as SuppressedEmailRecord[];
    }

    return list.some((item) => item.email.toLowerCase() === cleanEmail);
  } catch (error) {
    console.warn("[BOUNCE CHECK WARNING] Could not query suppressed emails list:", error);
    return false;
  }
}

/**
 * Adds an email address to the bounce / complaint suppression list and marks
 * matching EmailNotification records as BOUNCED.
 */
export async function suppressEmail(
  email: string,
  reason = "Hard bounce or complaint received",
  source: "webhook_bounce" | "webhook_complaint" | "manual" = "webhook_bounce"
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { success: false, message: "Email is required." };

  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: BOUNCE_SETTING_KEY },
    });

    let list: SuppressedEmailRecord[] = [];
    if (setting?.value) {
      if (typeof setting.value === "string") {
        try {
          list = JSON.parse(setting.value);
        } catch {}
      } else if (Array.isArray(setting.value)) {
        list = setting.value as SuppressedEmailRecord[];
      }
    }

    const existingIndex = list.findIndex((item) => item.email.toLowerCase() === cleanEmail);
    const newEntry: SuppressedEmailRecord = {
      email: cleanEmail,
      reason,
      source,
      suppressedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      list[existingIndex] = newEntry;
    } else {
      list.push(newEntry);
    }

    await prisma.siteSetting.upsert({
      where: { key: BOUNCE_SETTING_KEY },
      create: {
        key: BOUNCE_SETTING_KEY,
        value: JSON.stringify(list),
        description: "List of bounced or complained email addresses suppressed from sending",
      },
      update: {
        value: JSON.stringify(list),
      },
    });

    // Update existing pending or recently failed notifications in EmailNotification table to BOUNCED
    try {
      const recentLogs = await prisma.emailNotification.findMany({
        where: { recipientEmail: cleanEmail },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      for (const log of recentLogs) {
        if (log.status !== "BOUNCED") {
          await prisma.emailNotification.update({
            where: { id: log.id },
            data: {
              status: "BOUNCED",
              errorMessage: `[BOUNCED] ${reason}`,
            },
          });
        }
      }
    } catch (dbErr) {
      console.warn("[BOUNCE UPDATE LOGS WARNING]", dbErr);
    }

    console.log(`[EMAIL SUPPRESSION] Successfully suppressed ${cleanEmail} (${reason})`);
    return { success: true, message: `Email ${cleanEmail} suppressed.` };
  } catch (error: any) {
    console.error("[EMAIL SUPPRESSION ERROR]", error);
    return { success: false, message: error?.message || "Failed to suppress email." };
  }
}

/**
 * Retrieves the list of currently suppressed email addresses.
 */
export async function getSuppressedEmails(): Promise<SuppressedEmailRecord[]> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: BOUNCE_SETTING_KEY },
    });
    if (!setting || !setting.value) return [];
    if (typeof setting.value === "string") return JSON.parse(setting.value);
    if (Array.isArray(setting.value)) return setting.value as SuppressedEmailRecord[];
    return [];
  } catch {
    return [];
  }
}
