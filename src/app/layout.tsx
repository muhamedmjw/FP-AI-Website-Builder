import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Bungee } from "next/font/google";
import "./globals.css"; // Global styles for the application
import Providers from "@/client/components/providers";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-latin",
  weight: ["400", "500", "600", "700"],
});

const bungee = Bungee({
  subsets: ["latin"],
  variable: "--font-logo",
  weight: ["400"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

export const metadata: Metadata = {
  title: "AI Website Builder",
  description: "Build full websites from a short prompt using AI.",
};

const THEME_INIT_SCRIPT = `(() => {
  try {
    const savedTheme = window.localStorage.getItem("app-theme");
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const nextTheme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : (prefersLight ? "light" : "dark");

    document.documentElement.setAttribute("data-theme", nextTheme);
  } catch {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();`;

// The content of the page will be rendered here
export default function RootLayout({
  children, 
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${geistMono.variable} ${bungee.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
