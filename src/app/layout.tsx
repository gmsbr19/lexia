import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/Toaster";
import { UnifiedShell } from "@/components/shell/UnifiedShell";
import "../styles/theme.css";
import "@/components/crm/crm-theme.css";
import { unselectable } from "../styles/theme.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LexIA",
  description: "Gestão de documentos para escritórios de advocacia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className={unselectable}>
        <ThemeProvider>
          <UnifiedShell>{children}</UnifiedShell>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
