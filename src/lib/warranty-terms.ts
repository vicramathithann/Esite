/**
 * Single source of truth for VN Mobiles Warranty Coverage terms.
 * Used across the customer warranty page, the Print certificate, the Email Certificate,
 * and warranty activation emails.
 */

export const WARRANTY_TERMS = {
  covered: [
    "Manufacturing defects in materials or workmanship (for example the phone will not turn on, charging port fails, buttons stop working, camera, speaker or display problems such as dead pixels, if not caused by impact).",
    "Hardware failures that occur during normal use.",
    "Free repair (or replacement at the brand's discretion) at authorized service centres within the warranty period.",
    "Battery issues caused by a defect, not normal degradation. Some brands cover the battery for the full period or for 6 to 12 months.",
    "Software problems that are the manufacturer's fault, not user-installed apps or rooting.",
  ],
  notCovered: [
    "Physical or accidental damage (cracked or broken screen, dents, bends, drops, pressure damage).",
    "Liquid, moisture or water damage, even on water-resistant phones (water resistance ratings are not a warranty against water damage).",
    "Cosmetic damage or normal wear and tear (scratches, scuffs, fading).",
    "Unauthorized repairs, modifications, rooting, custom ROMs or opening the device.",
    "Use of non-original or non-approved chargers, cables, batteries or accessories.",
    "Damage from power surges, incorrect voltage, fire, floods, earthquakes or other external or natural causes.",
    "Software issues caused by the user (malware, third-party apps, viruses) or data loss.",
    "Devices with a removed, defaced or tampered IMEI, serial number or warranty seals.",
    "Grey-market or parallel-import phones (often no Indian manufacturer warranty).",
  ],
} as const;

export const { covered: WARRANTY_COVERED, notCovered: WARRANTY_NOT_COVERED } = WARRANTY_TERMS;

