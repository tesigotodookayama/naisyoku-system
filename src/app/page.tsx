"use client";

import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import WorkflowGuide from "@/components/WorkflowGuide";
import { Banner, LoadingBlock, StatusBadge } from "@/components/ui";
import { useData } from "@/lib/DataContext";
import {
  dashboardStats,
  nextOperatorActions,
  recentProjects,
  yen,
} from "@/lib/business";

export default function Home() {
  const { data, loading } = useData();
  if (loading) {
    return (
      <DashboardLayout>
        <LoadingBlock />
      </DashboardLayout>
    );
  }

  const stats = dashboardStats(data);
  const recent = recentProjects(data);
  const actions = nextOperatorActions(data);

  return (
    <DashboardLayout>
      <div className="fade-in space-y-8">
        <header className="section-header">
          <div>
            <h1 className="h1 text-slate-800">ダッシュボード</h1>
            <p className="text-slate-600 mt-1">
              {data.store.name} — 今日やることは下の「次に進める作業」から選べます。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/logistics?tab=arrival" className="btn btn-outline">
              入荷検品
            </Link>
            <Link href="/projects" className="btn btn-primary">
              案件を登録
            </Link>
          </div>
        </header>

        <Banner tone="info">
          見本データ（{stats.activityMonth} 前後の受注）が入っています。Google
          スプレッドシートがなくても、このまま一連の流れを体験できます。店舗名・口座は「店舗情報」から直せます。
        </Banner>

        <WorkflowGuide />

        <section>
          <h2 className="h3 mb-3">次に進める作業</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actions.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className="card-flat card hover:border-primary block"
              >
                <p className="font-black text-lg text-slate-800">{a.label}</p>
                <p className="text-slate-600 mt-1">{a.detail}</p>
                <p className="text-primary font-bold mt-3">開く →</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="dashboard-grid">
          <div className="card-flat card border-l-4 border-l-teal-500">
            <p className="text-sm font-bold text-slate-500">稼働中案件</p>
            <h2 className="h1 mt-2">{stats.activeProjects} 件</h2>
          </div>
          <div className="card-flat card border-l-4 border-l-amber-500">
            <p className="text-sm font-bold text-slate-500">入荷待ち出荷</p>
            <h2 className="h1 mt-2">{stats.pendingArrivals} 件</h2>
          </div>
          <div className="card-flat card border-l-4 border-l-indigo-500">
            <p className="text-sm font-bold text-slate-500">
              {stats.activityMonth} の納品売上
            </p>
            <h2 className="h1 mt-2">{yen(stats.monthlyRevenue)}</h2>
          </div>
          <div className="card-flat card border-l-4 border-l-pink-500">
            <p className="text-sm font-bold text-slate-500">稼働中の内職者</p>
            <h2 className="h1 mt-2">{stats.homeworkerCount} 名</h2>
            {stats.unbilledCount > 0 && (
              <p className="text-sm text-indigo-700 font-bold mt-2">
                未請求 {stats.unbilledCount} 件
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="card-flat card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="h3">直近の案件</h2>
              <Link href="/projects" className="text-primary text-sm font-bold hover:underline">
                すべて見る →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-slate-500">
                まだ案件がありません。{" "}
                <Link href="/projects" className="text-primary font-bold hover:underline">
                  案件登録へ
                </Link>
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-slate-500 text-sm">
                      <th className="pb-3 font-semibold">発注元</th>
                      <th className="pb-3 font-semibold">案件</th>
                      <th className="pb-3 font-semibold">納期</th>
                      <th className="pb-3 font-semibold">状態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recent.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50">
                        <td className="py-4 font-medium">{job.client}</td>
                        <td className="py-4">{job.project}</td>
                        <td className="py-4 text-slate-500">{job.deadline || "—"}</td>
                        <td className="py-4">
                          <StatusBadge
                            label={job.status}
                            tone={
                              job.status === "作業中"
                                ? "blue"
                                : job.status === "未着手"
                                  ? "amber"
                                  : "emerald"
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card-flat card">
            <h2 className="h3 mb-4">よく使う画面</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  href: "/finance?tab=billing",
                  title: "請求書",
                  desc: "顧客・月ごとに未請求分を発行",
                },
                {
                  href: "/logistics/assign",
                  title: "出荷登録",
                  desc: "内職者へ数量を割り当て",
                },
                {
                  href: "/deliveries",
                  title: "納品登録",
                  desc: "顧客へ渡した数量を記録",
                },
                {
                  href: "/finance?tab=payment",
                  title: "支払一覧",
                  desc: "入荷完了分の報酬を確認",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="p-4 min-h-28 border-2 rounded-xl hover:border-primary hover:bg-primary-light block"
                >
                  <p className="font-black">{item.title}</p>
                  <p className="text-sm text-slate-600 mt-1">{item.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
