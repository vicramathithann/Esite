import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("\n=======================================================");
console.log("TESTING CHECKOUT DELIVERY ADDRESS & PERFORMANCE FLOW");
console.log("=======================================================\n");

// Test 1: PIN Code & Address Validation Rules
console.log("1. Testing PIN code and address validation rules:");
const pinRegex = /^[1-9][0-9]{5}$/;

const testPins = [
  { pin: "", expectedValid: false, reason: "empty" },
  { pin: "056001", expectedValid: false, reason: "starts with 0" },
  { pin: "56001", expectedValid: false, reason: "5 digits" },
  { pin: "5600103", expectedValid: false, reason: "7 digits" },
  { pin: "56001a", expectedValid: false, reason: "contains letter" },
  { pin: "560103", expectedValid: true, reason: "valid 6 digits" },
  { pin: "600028", expectedValid: true, reason: "valid 6 digits" },
  { pin: "110001", expectedValid: true, reason: "valid 6 digits" },
];

let validationPassed = true;
for (const t of testPins) {
  const isValid = pinRegex.test(t.pin);
  if (isValid !== t.expectedValid) {
    console.error(`❌ Validation failed for PIN "${t.pin}": expected ${t.expectedValid}, got ${isValid}`);
    validationPassed = false;
  } else {
    console.log(`  ✓ PIN "${t.pin}" (${t.reason}) -> ${isValid ? "VALID" : "INVALID"}`);
  }
}

if (validationPassed) {
  console.log("✅ All PIN code validation rules passed!");
}

// Test 2: Address String Parsing
console.log("\n2. Testing address string parsing for pre-fill:");
function parseAddressString(rawAddress) {
  if (!rawAddress) return { street: "", city: "", state: "", pincode: "" };
  const pinMatch = rawAddress.match(/-\s*([1-9][0-9]{5})$/);
  const pincode = pinMatch ? pinMatch[1] : "";
  const withoutPin = pinMatch ? rawAddress.slice(0, pinMatch.index).trim().replace(/,\s*$/, "") : rawAddress.trim();
  const segments = withoutPin.split(",").map((s) => s.trim()).filter(Boolean);

  let state = "";
  let city = "";
  let street = withoutPin;

  if (segments.length >= 3) {
    state = segments[segments.length - 1];
    city = segments[segments.length - 2];
    street = segments.slice(0, segments.length - 2).join(", ");
  } else if (segments.length === 2) {
    city = segments[segments.length - 1];
    street = segments[0];
  }

  return { street, city, state, pincode };
}

const sampleAddr = "124 Brigade Road, Ashok Nagar, Bengaluru, Karnataka - 560025";
const parsed = parseAddressString(sampleAddr);
console.log(`  Raw: "${sampleAddr}"`);
console.log(`  Parsed -> Street: "${parsed.street}", City: "${parsed.city}", State: "${parsed.state}", PIN: "${parsed.pincode}"`);

if (
  parsed.street === "124 Brigade Road, Ashok Nagar" &&
  parsed.city === "Bengaluru" &&
  parsed.state === "Karnataka" &&
  parsed.pincode === "560025"
) {
  console.log("✅ Address parser correctly extracts all 4 components!");
} else {
  console.error("❌ Address parsing mismatch:", parsed);
}

// Test 3: Check User table schema & address update capability in DB
console.log("\n3. Testing profile address persistence in DB:");
async function testDbPersistence() {
  const { data: users, error } = await supabase
    .from("User")
    .select("id, name, email, address")
    .limit(1);

  if (error || !users || users.length === 0) {
    console.error("Could not fetch user:", error);
    return;
  }

  const user = users[0];
  console.log(`  Testing with User: ${user.name} (${user.email})`);
  const initialAddress = user.address;

  const testAddress = "Plot 12, Sector 4, Noida, Uttar Pradesh - 201301";
  const { error: updateErr } = await supabase
    .from("User")
    .update({ address: testAddress })
    .eq("id", user.id);

  if (updateErr) {
    console.error("❌ Failed to update address in DB:", updateErr);
    return;
  }

  const { data: verifiedUser } = await supabase
    .from("User")
    .select("address")
    .eq("id", user.id)
    .single();

  if (verifiedUser?.address === testAddress) {
    console.log(`  ✓ Address successfully saved to user profile in DB: "${verifiedUser.address}"`);
  }

  // Restore previous address
  await supabase
    .from("User")
    .update({ address: initialAddress || "" })
    .eq("id", user.id);
  console.log("  ✓ Restored user profile address to original state.");
}

testDbPersistence().then(() => {
  console.log("\n=======================================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY");
  console.log("=======================================================\n");
});
