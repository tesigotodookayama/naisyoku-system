import { Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { LoadingBlock } from "@/components/ui";

export default function SearchParamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <LoadingBlock />
        </DashboardLayout>
      }
    >
      {children}
    </Suspense>
  );
}
