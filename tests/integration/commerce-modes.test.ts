import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkout, CheckoutError } from "../../apps/platform/src/server/checkout/service";
import { db, disconnectDatabase } from "../../apps/platform/src/server/shared/db";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
describe.skipIf(!enabled)("commerce modes and test orders", () => {
  let productId = ""; let zoneId = ""; let modifierOptionIds: string[] = [];
  beforeAll(async () => {
    const product = await db.product.findFirstOrThrow({ where: { isAvailable: true, isOrderable: true, requiresPriceConfirmation: false, pricingType: "FIXED", saleUnit: "PIECE" }, include: { modifierGroups: { include: { modifierGroup: { include: { options: { where: { isAvailable: true }, take: 1 } } } } } } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { isActive: true } });
    productId = product.id; zoneId = zone.id; modifierOptionIds = product.modifierGroups.filter(({ modifierGroup }) => modifierGroup.required).flatMap(({ modifierGroup }) => modifierGroup.options[0]?.id ?? []);
    await db.storeSettings.update({ where: { id: "singleton" }, data: { commerceMode: "ORDERS", demoOrdersEnabled: true } });
  });
  afterAll(async () => { await db.storeSettings.update({ where: { id: "singleton" }, data: { commerceMode: "ORDERS", demoOrdersEnabled: true } }); await disconnectDatabase(); });

  const request = (checkoutId: string) => ({
    checkoutId, items: [{ productId, quantity: 1, modifierOptionIds, unit: "PIECE" as const }],
    contact: { phone: "+79270000000" }, delivery: { zoneId, city: "Воронеж", street: "Самовывоз", house: "1", slotStart: nextOpenSlot(), comment: "acceptance" },
    paymentMethod: "CASH" as const, isTest: true,
    consents: { marketing: { accepted: false, version: "marketing-v1" as const }, offer: { accepted: true as const, version: "offer-v1" as const }, terms: { accepted: true as const, version: "terms-v1" as const } },
  });

  it("persists a test order and items without any provider attempt", async () => {
    const checkoutId = crypto.randomUUID(); const result = await checkout(request(checkoutId), { ip: "127.0.0.1", userAgent: "vitest" });
    const order = await db.order.findUniqueOrThrow({ where: { checkoutId }, include: { items: true, paymentAttempts: true } });
    expect(result.orderPublicId).toBe(order.publicId); expect(order.isTest).toBe(true); expect(order.items.length).toBe(1); expect(order.totalKopecks).toBeGreaterThan(0); expect(order.paymentAttempts).toHaveLength(0);
  });

  it("fails closed in MENU_ONLY before persistence", async () => {
    await db.storeSettings.update({ where: { id: "singleton" }, data: { commerceMode: "MENU_ONLY" } });
    const checkoutId = crypto.randomUUID(); await expect(checkout(request(checkoutId), { ip: "127.0.0.1", userAgent: "vitest" })).rejects.toMatchObject<Partial<CheckoutError>>({ code: "store_not_configured", status: 403 });
    expect(await db.order.findUnique({ where: { checkoutId } })).toBeNull();
  });
});

function nextOpenSlot(): string {
  const date = new Date(Date.now() + 24 * 60 * 60_000); date.setUTCHours(12, 0, 0, 0); return date.toISOString();
}
