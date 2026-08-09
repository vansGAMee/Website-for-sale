import "dotenv/config";

const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_PLATFORM_API_URL",
  "PLATFORM_API_URL",
  "ADMIN_BASE_URL",
  "ALLOWED_STOREFRONT_ORIGINS",
  "PII_KEY_RING_JSON",
  "PHONE_LOOKUP_HMAC_KEY",
  "ADMIN_SESSION_HMAC_KEY",
  "MFA_ENCRYPTION_KEY",
  "CSRF_HMAC_KEY",
];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  process.stderr.write(`Не заполнены обязательные переменные:\n${missing.map((name) => `- ${name}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Базовые переменные storefront/platform/БД заполнены. Секреты не выводились.\n");
}
const paymentMissing = ["YOOKASSA_SHOP_ID", "YOOKASSA_SECRET_KEY", "TBANK_TERMINAL_KEY", "TBANK_PASSWORD"].filter((name) => !process.env[name]?.trim());
if (paymentMissing.length) process.stdout.write(`ONLINE_PAYMENT потребует: ${paymentMissing.join(", ")}\n`);
if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) process.stdout.write("Загрузка фото потребует BLOB_READ_WRITE_TOKEN.\n");
