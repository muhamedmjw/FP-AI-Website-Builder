import type { Metadata } from "next";
import "./globals.css"; // Global styles for the application


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
      <body>{children}</body>
    </html>
  );
}
