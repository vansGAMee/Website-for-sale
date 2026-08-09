import Link from "next/link";
import { business } from "@business";

export function LegalDocument({ title, version, children }: { title: string; version: string; children: React.ReactNode }) {
  return <article className="legal-copy shell max-w-4xl py-16"><Link href="/" className="eyebrow">← На главную</Link><p className="my-8 text-sm text-[var(--muted)]">Редакция: {version}{business.legalOperatorName ? ` · Оператор: ${business.legalOperatorName}` : ""}</p><h1>{title}</h1>{children}</article>;
}
