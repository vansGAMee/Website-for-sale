import { put } from "@vercel/blob";
import { validateAdminMutation } from "@/server/admin/auth";
import { db } from "@/server/shared/db";
import { NextResponse } from "next/server";
import { requestId } from "@/server/security/http";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const maxBytes = 8 * 1024 * 1024;

export async function POST(request: Request, props: { params: Promise<{ productId: string }> }) {
  try {
    const admin = await validateAdminMutation(request);
    const { productId } = await props.params;
    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Файл не выбран" }, { status: 400 });
    if (!allowedTypes.has(file.type) || file.size > maxBytes) return NextResponse.json({ error: "Нужен JPG, PNG, WebP или AVIF до 8 МБ" }, { status: 400 });
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Vercel Blob не подключён" }, { status: 503 });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const blob = await put(`products/${productId}/${Date.now()}-${safeName}`, file, { access: "public", addRandomSuffix: true, token: process.env.BLOB_READ_WRITE_TOKEN });
    await db.$transaction([
      db.product.update({ where: { id: productId }, data: { imagePath: blob.url, version: { increment: 1 } } }),
      db.adminAuditLog.create({ data: { adminUserId: admin.id, action: "PRODUCT_IMAGE_UPDATED", targetType: "Product", targetId: productId, requestId: requestId(request), metadata: { contentType: file.type, size: file.size } } }),
    ]);
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось загрузить фото" }, { status: 500 });
  }
}
