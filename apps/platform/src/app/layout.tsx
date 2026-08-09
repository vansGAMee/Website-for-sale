import type { Metadata } from "next";
import "./admin/admin.css";
import { business } from "@business";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `${business.name} · Админ`, robots: { index: false, follow: false } };
export default function PlatformLayout({ children }: { children: React.ReactNode }) { return <html lang="ru"><body>{children}</body></html>; }
