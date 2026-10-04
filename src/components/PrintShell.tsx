"use client";

import React from "react";
import Link from "next/link";

export default function PrintShell({
  title,
  children,
  backHref,
  wide,
  landscape,
  bleed,
}: {
  title: string;
  children: React.ReactNode;
  backHref?: string;
  wide?: boolean;
  /** A4 landscape for payment statements etc. */
  landscape?: boolean;
  /**
   * A4 with no page margin, so the browser cannot print its title and URL.
   * The sheet itself keeps the margin as padding.
   */
  bleed?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {backHref && (
            <Link href={backHref} className="text-sm font-bold text-primary hover:underline">
              ← 戻る
            </Link>
          )}
          <h1 className="font-bold text-slate-700">{title}</h1>
        </div>
        <button type="button" onClick={() => window.print()} className="btn btn-primary min-h-12">
          印刷 / PDF保存
        </button>
      </div>
      <div
        className={`mx-auto my-8 bg-white shadow-lg print:shadow-none print:my-0 print:max-w-none p-8 ${
          bleed ? "print:p-0" : "print:p-4"
        } ${wide || landscape ? "max-w-5xl" : "max-w-4xl"}`}
      >
        {children}
      </div>
      <style jsx global>{`
        @media print {
          @page {
            size: ${landscape ? "A4 landscape" : "A4"};
            margin: ${bleed ? "0" : "12mm"};
          }
          html,
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            ${bleed ? "margin: 0 !important; padding: 0 !important;" : ""}
          }
          .print\\:hidden,
          aside,
          nav,
          button,
          [role="status"],
          [role="dialog"] {
            display: none !important;
          }
          .invoice-page {
            break-after: page;
            page-break-after: always;
            ${
              bleed
                ? `box-sizing: border-box;
            width: 210mm;
            min-height: 297mm;
            padding: 14mm 16mm;`
                : ""
            }
          }
          .invoice-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .invoice-page tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
