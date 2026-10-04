"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { WORKFLOW_STEPS } from "@/lib/business";

function stepActive(href: string, pathname: string, tab: string | null) {
  const url = new URL(href, "http://local");
  if (pathname !== url.pathname) return false;
  const stepTab = url.searchParams.get("tab");
  if (!stepTab) {
    if (url.pathname === "/logistics") return tab !== "arrival";
    return true;
  }
  if (url.pathname === "/finance" && stepTab === "billing") {
    return tab === "billing" || tab == null || tab === "";
  }
  return tab === stepTab;
}

function WorkflowGuideInner({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  return (
    <nav
      aria-label="日常の作業の流れ"
      className={`card-flat card ${compact ? "py-4" : ""}`}
    >
      {!compact && (
        <p className="text-sm font-bold text-slate-600 mb-3">
          日常の流れ — この順で進めると漏れが少なくなります
        </p>
      )}
      <ol className="flex gap-2 overflow-x-auto pb-1">
        {WORKFLOW_STEPS.map((step, i) => {
          const active = stepActive(step.href, pathname, tab);
          return (
            <li key={step.href} className="flex items-center gap-2 shrink-0">
              {i > 0 && (
                <span className="text-slate-300 font-bold" aria-hidden>
                  →
                </span>
              )}
              <Link
                href={step.href}
                className={`flex flex-col min-h-14 min-w-[7.5rem] px-3 py-2 rounded-xl border-2 transition-colors ${
                  active
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-amber-200 hover:border-primary text-slate-800"
                }`}
              >
                <span className="text-[11px] font-bold opacity-80">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-bold text-sm leading-tight">{step.label}</span>
                {!compact && (
                  <span className={`text-xs ${active ? "text-white/80" : "text-slate-500"}`}>
                    {step.hint}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function WorkflowGuide({ compact = false }: { compact?: boolean }) {
  return (
    <Suspense
      fallback={
        <nav aria-label="日常の作業の流れ" className="card-flat card py-4">
          <p className="text-sm text-slate-500">日常の流れを読み込み中...</p>
        </nav>
      }
    >
      <WorkflowGuideInner compact={compact} />
    </Suspense>
  );
}
