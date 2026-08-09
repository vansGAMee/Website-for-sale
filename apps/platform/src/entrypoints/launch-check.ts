import "dotenv/config";
import { db, disconnectDatabase } from "../server/shared/db";
import { PiiCipher } from "../server/crypto/envelope";

const baseEnv = ["DATABASE_URL", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_PLATFORM_API_URL", "PLATFORM_API_URL", "ADMIN_BASE_URL", "ALLOWED_STOREFRONT_ORIGINS", "PII_KEY_RING_JSON", "PHONE_LOOKUP_HMAC_KEY", "ADMIN_SESSION_HMAC_KEY", "MFA_ENCRYPTION_KEY", "CSRF_HMAC_KEY"];
const businessEnv = ["BUSINESS_LEGAL_NAME", "BUSINESS_INN", "BUSINESS_REGISTRATION_NUMBER", "BUSINESS_LEGAL_ADDRESS", "BUSINESS_EMAIL", "BUSINESS_PHONE"];
const providerEnv: Record<"YOOKASSA" | "TBANK", string[]> = { YOOKASSA: ["YOOKASSA_SHOP_ID", "YOOKASSA_SECRET_KEY"], TBANK: ["TBANK_TERMINAL_KEY", "TBANK_PASSWORD"] };

async function launchCheck(): Promise<void> {
  const failures: string[] = [];
  for (const name of baseEnv) if (!process.env[name]?.trim()) failures.push(`${name}: missing`);
  try { if (process.env.PII_KEY_RING_JSON) new PiiCipher(process.env.PII_KEY_RING_JSON); } catch { failures.push("PII_KEY_RING_JSON: invalid"); }
  if (!process.env.DATABASE_URL) return finish(failures);
  try {
    const [settings, admins, zones, hours, products, documents, routes] = await Promise.all([
      db.storeSettings.findUnique({ where: { id: "singleton" } }),
      db.adminUser.count({ where: { role: "ADMIN", isActive: true, mfaEnrolledAt: { not: null } } }),
      db.deliveryZone.count({ where: { isActive: true } }), db.operatingHours.count(), db.product.count({ where: { isAvailable: true } }),
      db.legalDocumentVersion.count({ where: { approved: true } }), db.paymentRouting.findMany({ where: { isActive: true } }),
    ]);
    if (!settings) failures.push("StoreSettings: run npm run setup:db");
    if (!admins) failures.push("ADMIN: bootstrap an active MFA administrator");
    if (!products) failures.push("Product: no available menu items");
    if (settings?.commerceMode !== "MENU_ONLY") {
      if (!zones) failures.push("DeliveryZone: no active pickup/delivery zone");
      if (hours !== 7) failures.push("OperatingHours: configure all seven days");
      for (const name of businessEnv) if (!process.env[name]?.trim()) failures.push(`${name}: required before real orders`);
      if (documents < 5 || process.env.LEGAL_DOCS_APPROVED !== "true") failures.push("LEGAL_DOCS_APPROVED: approve all five legal document versions before real orders");
    }
    if (settings?.commerceMode === "ONLINE_PAYMENT") {
      for (const method of ["CARD", "SBP"] as const) {
        const route = routes.find((item) => item.method === method);
        if (!route) failures.push(`PaymentRouting: ${method} is inactive`);
        else for (const name of providerEnv[route.provider]) if (!process.env[name]?.trim()) failures.push(`${name}: required by ${method} routing`);
      }
      if (!settings.taxSystemCode) failures.push("StoreSettings.taxSystemCode: required for online payment");
    }
  } catch { failures.push("Database: connection or schema check failed"); }
  finish(failures);
}

function finish(failures: string[]) {
  if (failures.length) { process.stderr.write(`PRODUCTION LAUNCH BLOCKED\n${failures.map((item) => `- ${item}`).join("\n")}\n`); process.exitCode = 1; }
  else process.stdout.write("Production launch check passed.\n");
}

launchCheck().finally(disconnectDatabase);
