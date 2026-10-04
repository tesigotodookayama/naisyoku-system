import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { FontSizeProvider } from "@/components/FontSizeProvider";
import { DataProvider } from "@/lib/DataContext";
import { FeedbackProvider } from "@/components/Feedback";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "てしごと堂 | 内職管理システム",
  description:
    "案件・内職者割当・出荷入荷・納品・請求・支払・月報を一元管理する在宅ワーク運営向けシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={notoSansJp.variable}>
        <FontSizeProvider>
          <FeedbackProvider>
            <DataProvider>{children}</DataProvider>
          </FeedbackProvider>
        </FontSizeProvider>
      </body>
    </html>
  );
}
