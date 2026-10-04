"use client";

import React, { use } from "react";
import PrintShell from "@/components/PrintShell";
import { LoadingBlock } from "@/components/ui";
import { useData } from "@/lib/DataContext";
import { formatDocNo, invoiceDetail, num, yen } from "@/lib/business";

function formatAsOfDate(issueDate: string): string {
  const [y, m, d] = issueDate.split("-");
  if (!y || !m || !d) return issueDate;
  return `${y}年${Number(m)}月${Number(d)}日`;
}

/** Rows that fit on one A4 detail sheet, including the header and total. */
const DETAIL_ROWS_PER_PAGE = 14;

const FEE_NOTE = "振込にかかる手数料は差し引かずお願いいたします";

export default function PrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, loading } = useData();

  if (loading) return <LoadingBlock />;

  const detail = invoiceDetail(data, id);
  if (!detail || !detail.client) {
    return (
      <PrintShell title="請求書" backHref="/finance">
        <p>請求書が見つかりません。</p>
      </PrintShell>
    );
  }

  const { invoice, client, lines, mixedClientError } = detail;
  const store = data.store;
  const invoiceNo = invoice.number || formatDocNo(invoice.id);
  const detailPages: (typeof lines)[] =
    lines.length === 0
      ? [[]]
      : Array.from({ length: Math.ceil(lines.length / DETAIL_ROWS_PER_PAGE) }, (_, index) =>
          lines.slice(index * DETAIL_ROWS_PER_PAGE, (index + 1) * DETAIL_ROWS_PER_PAGE)
        );
  const asOf = formatAsOfDate(invoice.issueDate);
  const bankLine = `${store.bankName} ${store.bankBranch} ${store.bankAccountType} ${store.bankAccountNumber}${
    store.bankAccountHolder ? `　${store.bankAccountHolder}` : ""
  }`;

  return (
    <PrintShell title="請求書" backHref="/finance?tab=invoices" wide bleed>
      {mixedClientError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 font-bold print:hidden">
          警告: 顧客の混同が検出されました。データを確認してください。
        </div>
      )}

      {/* ========== Page 1: 御請求書（合計） ========== */}
      <section className="invoice-page text-[13px] text-slate-900 leading-relaxed">
        <div className="relative mb-6">
          <h1 className="text-center text-3xl font-bold tracking-[0.4em] pt-2">
            御 請 求 書
          </h1>
          <p className="absolute right-0 top-2 text-sm">No. {invoiceNo}</p>
        </div>

        <div className="flex justify-between gap-8 mb-6">
          <div className="flex-1">
            {client.postalCode && (
              <p>〒{client.postalCode.replace(/^(\d{3})(\d{4})$/, "$1-$2")}</p>
            )}
            {client.address && <p>{client.address}</p>}
            <p className="mt-2 text-lg font-bold border-b border-slate-800 inline-block pr-8 pb-0.5">
              {client.name}　御中
            </p>
            <p className="mt-6 text-sm">
              {asOf}現在下記の通りご請求申し上げます。
            </p>
          </div>
          <div className="text-right text-sm min-w-[240px]">
            <p className="font-bold text-base">{store.name}</p>
            {store.address && (
              <>
                {/* postal may be embedded in address; show as-is */}
                <p className="mt-1">{store.address}</p>
              </>
            )}
            <p className="mt-1">
              TEL {store.tel || "—"}
              {store.fax ? `　FAX ${store.fax}` : ""}
            </p>
            {store.invoiceNumber && (
              <p className="mt-1">登録番号 {store.invoiceNumber}</p>
            )}
          </div>
        </div>

        <table className="w-full border-collapse mb-10">
          <thead>
            <tr className="bg-[#2f6fed] text-white">
              <th className="border border-slate-400 px-3 py-2 font-bold">
                今回買上額
              </th>
              <th className="border border-slate-400 px-3 py-2 font-bold">
                消費税（10%）
              </th>
              <th className="border border-slate-400 px-3 py-2 font-bold">
                明細枚数
              </th>
              <th className="border border-slate-400 px-3 py-2 font-bold text-base">
                今回請求額
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-400 px-3 py-3 text-right text-lg">
                {num(invoice.subtotal)}
              </td>
              <td className="border border-slate-400 px-3 py-3 text-right text-lg">
                {num(invoice.tax)}
              </td>
              <td className="border border-slate-400 px-3 py-3 text-right text-lg">
                {detailPages.length}
              </td>
              <td className="border border-slate-400 px-3 py-3 text-right text-xl font-bold">
                {num(invoice.total)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-12">
          <div className="flex justify-between items-start gap-6">
            <p className="min-w-0 flex-1 text-[1.75rem] leading-snug font-medium">{bankLine}</p>
            <div className="shrink-0 border border-slate-700">
              <div className="border-b border-slate-700 text-center text-xs py-1 px-8 bg-slate-50">
                検印
              </div>
              <div className="flex">
                <div className="w-14 h-14 border-r border-slate-700" />
                <div className="w-14 h-14 border-r border-slate-700" />
                <div className="w-14 h-14" />
              </div>
            </div>
          </div>
          <p className="mt-4 text-[1.75rem] leading-snug font-medium">{FEE_NOTE}</p>
        </div>
      </section>

      {/* ========== Following pages: 御請求明細（納品明細） ========== */}
      {detailPages.map((pageLines, pageIndex) => (
      <section key={pageIndex} className="invoice-page text-[12px] text-slate-900">
        <div className="relative mb-4">
          <h1 className="text-center text-2xl font-bold tracking-[0.35em] pt-1">
            御 請 求 明 細
          </h1>
          <p className="absolute right-0 top-1 text-sm">No. {invoiceNo}</p>
          <p className="absolute right-0 top-7 text-xs">
            {pageIndex + 1}/{detailPages.length}ページ
          </p>
        </div>

        <div className="flex justify-between gap-8 mb-4">
          <div>
            {client.postalCode && (
              <p>〒{client.postalCode.replace(/-/g, "")}</p>
            )}
            {client.address && <p>{client.address}</p>}
            <p className="mt-1 font-bold">{client.name}　御中</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">{store.name}</p>
            {store.address && <p>{store.address}</p>}
            <p>TEL {store.tel || "—"}</p>
            {store.invoiceNumber && <p>登録番号 {store.invoiceNumber}</p>}
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#2f6fed] text-white">
              <th className="border border-slate-400 px-2 py-1.5 whitespace-nowrap">
                納品日
              </th>
              <th className="border border-slate-400 px-2 py-1.5 whitespace-nowrap">
                納品書番号
              </th>
              <th className="border border-slate-400 px-2 py-1.5 whitespace-nowrap">
                案件番号
              </th>
              <th className="border border-slate-400 px-2 py-1.5 text-left">
                品名
              </th>
              <th className="border border-slate-400 px-2 py-1.5 whitespace-nowrap">
                数量
              </th>
              <th className="border border-slate-400 px-2 py-1.5 whitespace-nowrap">
                単価
              </th>
              <th className="border border-slate-400 px-2 py-1.5 whitespace-nowrap">
                金額
              </th>
              <th className="border border-slate-400 px-2 py-1.5 whitespace-nowrap">
                備考
              </th>
            </tr>
          </thead>
          <tbody>
            {pageLines.map((l) => {
              const delivery = data.deliveries.find((d) => d.id === l.deliveryId);
              return (
                <tr key={l.deliveryId}>
                  <td className="border border-slate-400 px-2 py-1 text-center whitespace-nowrap">
                    {l.deliveryDate}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-center whitespace-nowrap">
                    {formatDocNo(l.deliveryId)}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-center whitespace-nowrap">
                    {formatDocNo(l.projectId)}
                  </td>
                  <td className="border border-slate-400 px-2 py-1">
                    {l.projectName}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-right whitespace-nowrap">
                    {num(l.qty)}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-right whitespace-nowrap">
                    {num(l.unitPrice)}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-right whitespace-nowrap">
                    {num(l.amount)}
                  </td>
                  <td className="border border-slate-400 px-2 py-1">
                    {delivery?.notes || ""}
                  </td>
                </tr>
              );
            })}
            {/* filler rows for print look */}
            {Array.from({ length: Math.max(0, 8 - pageLines.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                {Array.from({ length: 8 }).map((__, j) => (
                  <td key={j} className="border border-slate-400 px-2 py-3">
                    &nbsp;
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={4}
                className="border border-slate-400 px-2 py-2 text-right font-bold"
              >
                合計
              </td>
              <td className="border border-slate-400 px-2 py-2 text-right font-bold">
                {num(lines.reduce((s, l) => s + l.qty, 0))}
              </td>
              <td className="border border-slate-400 px-2 py-2" />
              <td className="border border-slate-400 px-2 py-2 text-right font-bold">
                {num(invoice.subtotal)}
              </td>
              <td className="border border-slate-400 px-2 py-2" />
            </tr>
          </tfoot>
        </table>

        {pageIndex === detailPages.length - 1 && (
          <p className="print:hidden mt-6 text-sm text-slate-500">
            画面表示: 今回請求額 {yen(invoice.total)}（税込）
          </p>
        )}
      </section>
      ))}
    </PrintShell>
  );
}
