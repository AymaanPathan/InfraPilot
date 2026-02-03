import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TamboClientProvider } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Kubernetes AI Dashboard",
  description: "AI-powered Kubernetes observability with Tambo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TamboClientProvider>{children}</TamboClientProvider>
      </body>
    </html>
  );
}
