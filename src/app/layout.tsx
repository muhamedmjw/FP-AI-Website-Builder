import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css"; // Global styles for the application

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AI Website Builder",
  description: "Build full websites from a short prompt using AI.",
};


// The content of the page will be rendered here
export default function RootLayout({
  children, 
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sora.variable} antialiased`}>{children}</body>
    </html>
  );
}
