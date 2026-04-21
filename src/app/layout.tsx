import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ViewTransition } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "Ahorro — Personal Finance Coach",
  description: "Gestión de gastos compartidos, multi-moneda.",
  applicationName: "Ahorro",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Ahorro" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    type: "website",
    siteName: "Ahorro",
    title: "Ahorro — Personal Finance Coach",
    description: "Gestión de gastos compartidos, multi-moneda.",
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ahorro — Personal Finance Coach",
    description: "Gestión de gastos compartidos, multi-moneda.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e17" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning className={cn(geistSans.variable, geistMono.variable)}>
      <body className="min-h-svh bg-background text-foreground font-sans antialiased">
        <Providers>
          <ViewTransition>{children}</ViewTransition>
        </Providers>
      </body>
    </html>
  );
}
