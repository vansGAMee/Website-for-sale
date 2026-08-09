import { z } from "zod";
import { requireRole, hashAdminPassword, validateAdminMutation } from "@/server/admin/auth";
import { db } from "@/server/shared/db";
import { requestId } from "@/server/security/http";

const Schema = z.discriminatedUnion("operation", [z.object({ operation: z.literal("active"), isActive: z.boolean() }), z.object({ operation: z.literal("password"), password: z.string().min(14).max(256) })]);
export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }): Promise<Response> {
  const id = requestId(request);
  try {
    const admin = await validateAdminMutation(request); requireRole(admin, ["ADMIN"]); const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "validation" }, { status: 400 }); const { userId } = await context.params;
    if (userId === admin.id && parsed.data.operation === "active" && !parsed.data.isActive) return Response.json({ error: "cannot_revoke_self" }, { status: 409 });
    const updated = await db.$transaction(async (tx) => {
      const user = parsed.data.operation === "active" ? await tx.adminUser.update({ where: { id: userId }, data: { isActive: parsed.data.isActive } }) : await tx.adminUser.update({ where: { id: userId }, data: { passwordHash: await hashAdminPassword(parsed.data.password), passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null } });
      await tx.adminSession.updateMany({ where: { adminUserId: userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: parsed.data.operation === "active" ? "ADMIN_USER_ACCESS_CHANGED" : "ADMIN_USER_PASSWORD_RESET", targetType: "AdminUser", targetId: userId, metadata: parsed.data.operation === "active" ? { isActive: parsed.data.isActive } : {}, requestId: id } }); return user;
    });
    return Response.json({ id: updated.id, isActive: updated.isActive });
  } catch { return new Response(null, { status: 403 }); }
}
