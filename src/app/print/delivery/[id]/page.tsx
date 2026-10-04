"use client";

import React, { use } from "react";
import PrintShell from "@/components/PrintShell";
import { LoadingBlock } from "@/components/ui";
import { useData } from "@/lib/DataContext";
import { clientName, projectName, yen } from "@/lib/business";

export default function PrintDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, loading } = useData();

  if (loading) return <LoadingBlock />;

  const delivery = data.deliveries.find((d) => d.id === id);
  if (!delivery) {
    return (
      <PrintShell title="納品書" backHref="/deliveries">
        <p>納品データが見つかりません。</p>
      </PrintShell>
    );
  }

  const client = data.clients.find((c) => c.id === delivery.clientId);
  const amount = delivery.qty * delivery.unitPrice;

  return (
    <PrintShell title="納品書" backHref="/deliveries">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-widest">納 品 書</h1>
      </div>
      <div className="flex justify-between mb-8">
        <div>
          <p className="text-xl font-bold">{clientName(data, delivery.clientId)} 御中</p>
          {client?.address && <p className="text-sm mt-2">{client.address}</p>}
          <p className="mt-4 text-sm">納品日: {delivery.deliveryDate}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-bold text-lg">{data.store.name}</p>
          <p>{data.store.address}</p>
          <p>TEL: {data.store.tel}</p>
          {data.store.invoiceNumber && (
            <p>登録番号: {data.store.invoiceNumber}</p>
          )}
        </div>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="border p-2 text-left">品名・作業内容</th>
            <th className="border p-2 text-right">数量</th>
            <th className="border p-2 text-right">単価</th>
            <th className="border p-2 text-right">金額</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border p-2">{projectName(data, delivery.projectId)}</td>
            <td className="border p-2 text-right">{delivery.qty.toLocaleString()}</td>
            <td className="border p-2 text-right">{yen(delivery.unitPrice)}</td>
            <td className="border p-2 text-right font-bold">{yen(amount)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="border p-2 text-right font-bold">
              合計
            </td>
            <td className="border p-2 text-right font-bold text-lg">{yen(amount)}</td>
          </tr>
        </tfoot>
      </table>
    </PrintShell>
  );
}
