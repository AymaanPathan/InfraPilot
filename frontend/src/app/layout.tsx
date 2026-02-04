import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TamboClientProvider } from "./providers";
import { DevConsole } from "@/components/DevConsole";
import { ConditionalDevConsole } from "./renderConsole";

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
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TamboClientProvider>{children}</TamboClientProvider>

        <ConditionalDevConsole />
      </body>
    </html>
  );
}
