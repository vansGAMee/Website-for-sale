import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import * as OTPAuth from "otpauth";
import { z } from "zod";
import { authenticateAdminRequest, hashAdminPassword, requireRole, validateAdminMutation } from "@/server/admin/auth";
import { associatedData, PiiCipher } from "@/server/crypto/envelope";
import { runtimeEnv } from "@/server/shared/env";
import { db } from "@/server/shared/db";
import { requestId } from "@/server/security/http";

const Create = z.object({ email: z.string().email().max(254), password: z.string().min(14).max(256), role: z.enum(["ADMIN", "MANAGER"]), refundPermission: z.boolean() });
export async function GET(request: Request): Promise<Response> { try { const admin = await authenticateAdminRequest(request); requireRole(admin, ["ADMIN"]); return Response.json(await db.adminUser.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, emailNormalized: true, role: true, isActive: true, mfaEnrolledAt: true, createdAt: true, permissions: true } }), { headers: { "Cache-Control": "no-store" } }); } catch { return new Response(null, { status: 403 }); } }

export async function POST(request: Request): Promise<Response> {
  const id = requestId(request);
  try {
    const admin = await validateAdminMutation(request); requireRole(admin, ["ADMIN"]); const parsed = Create.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "validation" }, { status: 400 });
    const email = parsed.data.email.trim().toLowerCase(); const userId = crypto.randomUUID();
    const mfa = parsed.data.role === "ADMIN" ? await createMfa(userId, email) : null;
    const created = await db.$transaction(async (tx) => {
      const user = await tx.adminUser.create({ data: { id: userId, emailNormalized: email, passwordHash: await hashAdminPassword(parsed.data.password), role: parsed.data.role, mfaRequired: parsed.data.role === "ADMIN", ...(mfa ? { totpCredential: { create: { secretEncrypted: mfa.secretEncrypted } }, recoveryCodes: { create: mfa.recoveryHashes.map((codeHash) => ({ codeHash })) } } : {}), ...(parsed.data.refundPermission ? { permissions: { create: { code: "REFUND_ORDER" } } } : {}) } });
      await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: "ADMIN_USER_CREATED", targetType: "AdminUser", targetId: user.id, metadata: { role: parsed.data.role, refundPermission: parsed.data.refundPermission }, requestId: id } }); return user;
    });
    return Response.json({ id: created.id, email: created.emailNormalized, role: created.role, ...(mfa ? { enrollmentUri: mfa.enrollmentUri, recoveryCodes: mfa.recoveryCodes } : {}) }, { status: 201 });
  } catch { return new Response(null, { status: 403 }); }
}

async function createMfa(userId: string, email: string) {
  const mfaKey = runtimeEnv().MFA_ENCRYPTION_KEY; if (!mfaKey) throw new Error("MFA_ENCRYPTION_KEY is unavailable");
  const secret = new OTPAuth.Secret({ size: 20 }); const totp = new OTPAuth.TOTP({ issuer: "Ресторан", label: email, algorithm: "SHA1", digits: 6, period: 30, secret });
  const cipher = new PiiCipher(JSON.stringify({ activeKeyId: "mfa-v1", keys: { "mfa-v1": mfaKey } }));
  const recoveryCodes = Array.from({ length: 10 }, () => randomBytes(8).toString("hex"));
  return { secretEncrypted: cipher.encrypt(secret.base32, associatedData(userId, "totp")), enrollmentUri: totp.toString(), recoveryCodes, recoveryHashes: await Promise.all(recoveryCodes.map((code) => hash(code))) };
}
