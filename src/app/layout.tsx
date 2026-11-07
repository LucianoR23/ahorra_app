import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import { ViewTransition } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { brand } from "@/config/brand";
import { brandColor } from "@/config/brand-tokens";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: brand.title,
  description: brand.description,
  applicationName: brand.name,
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: brand.name },
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: brand.title,
    description: brand.description,
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: brand.title,
    description: brand.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brandColor("bg", "light") },
    { media: "(prefers-color-scheme: dark)", color: brandColor("bg", "dark") },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning className={cn(manrope.variable, geistMono.variable)}>
      <body className="min-h-svh bg-background text-foreground font-sans antialiased">
        <Providers>
          <ViewTransition>{children}</ViewTransition>
        </Providers>
      </body>
    </html>
  );
}
