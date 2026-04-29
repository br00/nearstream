"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Particles from "./components/particles";
import { LogoMark, LogoFull } from "./components/logo";
import { type Locale, detectLocale, t } from "./i18n";

function EmailForm({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorKey, setErrorKey] = useState<"errorInvalid" | "errorGeneric">(
    "errorGeneric",
  );
  const s = t[locale];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("success");
        return;
      }
      setErrorKey(res.status === 400 ? "errorInvalid" : "errorGeneric");
      setStatus("error");
    } catch {
      setErrorKey("errorGeneric");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        className={`flex items-center gap-3 font-mono text-xs text-foreground ${className}`}
      >
        <span className="inline-block h-1 w-1 rounded-full bg-glow shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
        {s.received}
      </div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder={s.inputPlaceholder}
          className="flex-1 border-b border-border bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted/30 outline-none focus:border-foreground transition-colors font-mono"
        />
        <button
          type="submit"
          className="border border-border px-4 py-2 text-[11px] font-mono uppercase tracking-[0.2em] text-muted transition-all hover:border-foreground hover:text-foreground hover:shadow-[0_0_12px_rgba(255,255,255,0.06)] cursor-pointer"
        >
          {s.send}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-2 font-mono text-[11px] text-muted">{s[errorKey]}</p>
      )}
    </div>
  );
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  const s = t[locale];
  const otherLocale: Locale = locale === "en" ? "it" : "en";

  return (
    <>
      <Particles />

      <div className="relative z-10 flex flex-col min-h-full">
        {/* ─── Nav ─── */}
        <nav className="w-full px-6 py-6 flex items-center justify-between">
          <LogoFull size={24} />
          <button
            onClick={() => setLocale(otherLocale)}
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted/40 transition-colors hover:text-foreground cursor-pointer"
          >
            {otherLocale}
          </button>
        </nav>

        {/* ─── Hero ─── */}
        <section className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-lg py-20">
            <LogoMark size={64} />

            <h1 className="mt-8 text-2xl font-normal tracking-tight text-foreground leading-snug whitespace-pre-line">
              {s.heroTitle}
            </h1>

            <p className="mt-6 text-sm leading-relaxed text-muted max-w-sm">
              {s.heroBody}
            </p>

            <p className="mt-6 text-sm leading-relaxed text-muted/60">
              {s.heroEmail}
            </p>

            <EmailForm locale={locale} className="mt-4 max-w-sm" />
          </div>
        </section>

        {/* ─── What is this ─── */}
        <section className="px-6 py-24 border-t border-border">
          <div className="mx-auto max-w-lg">
            <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-muted/50">
              {s.whatLabel}
            </p>

            <div className="mt-8 grid gap-6 text-sm leading-relaxed text-muted">
              <p>{s.whatP1}</p>
              <p className="text-foreground">{s.whatP2}</p>
              <p>{s.whatP3}</p>
            </div>

            <Link
              href="/about"
              className="mt-8 inline-block font-mono text-xs text-muted/40 transition-colors hover:text-foreground"
            >
              {s.curious} &rarr;
            </Link>
          </div>
        </section>

        {/* ─── Bottom CTA ─── */}
        <section className="px-6 py-24 border-t border-border">
          <div className="mx-auto max-w-lg text-center">
            <LogoMark size={40} />
            <p className="mt-6 text-sm text-muted whitespace-pre-line">
              {s.bottomBody}
            </p>
            <EmailForm locale={locale} className="mt-6 max-w-xs mx-auto" />
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="px-6 py-8 border-t border-border">
          <div className="mx-auto max-w-lg flex items-center justify-end">
            <span className="font-mono text-[11px] text-muted/20">
              2026<span className="cursor-blink">_</span>
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
