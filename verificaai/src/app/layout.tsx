import type { Metadata } from "next";
import "./globals.css";
import { appConfig } from "@/lib/config";
import { themeScript } from "@/components/layout/theme-toggle";

export const metadata: Metadata = {
  title: { default: appConfig.name, template: `%s · ${appConfig.name}` },
  description: `${appConfig.name}: ${appConfig.tagline}.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
