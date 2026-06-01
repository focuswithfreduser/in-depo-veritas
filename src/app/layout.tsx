import "@/styles/globals.css";
import { Bebas_Neue, Montserrat } from "next/font/google";

import { Inter } from "next/font/google";

import { Providers } from "@/components/providers";
// import GoogleCaptchaWrapper from "./captcha";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata = {
  title: "In Depo Veritas",
  description: "In Depo Veritas",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`font-sans ${inter.variable} ${montserrat.variable} ${bebasNeue.variable}`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
