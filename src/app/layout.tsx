import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const GA_ID = "G-6MWNGFTX8V";

export const metadata: Metadata = {
  title: "박 터트리기 — 터트리면 상금!",
  description:
    "5초 딸깍으로 돈 버는 게임. 박을 터트리시면, 상금을 드립니다!",
  openGraph: {
    title: "박 터트리기",
    description: "5초 딸깍으로 돈 버는 게임",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col text-[#1C1917] overflow-x-hidden bg-white">
        {children}

        {/* Kakao SDK */}
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
          strategy="afterInteractive"
        />
        <Script id="kakao-init" strategy="afterInteractive">
          {`
            (function waitKakao() {
              if (window.Kakao && !window.Kakao.isInitialized()) {
                window.Kakao.init('f134820577b1a68e7147604c5e3de62c');
              } else if (!window.Kakao) {
                setTimeout(waitKakao, 200);
              }
            })();
          `}
        </Script>

        {/* GA4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
