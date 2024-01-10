// ** Global css styles
import { inter, rye } from "@/app/assets/fonts/fonts";

// ** Component Imports
import AppLayout from "./AppLayout";

// ** Next Imports
import type { Metadata } from "next";
import type { Viewport } from "next";
import { NavigationEvents } from "./NavigationEvents";

// ** React Imports
import { Suspense } from "react";

export const metadata: Metadata = {
  title: `Con Luz`,
  description: `Aplicación que permite gestionar los datos obtenidos de paneles solares`,
  icons: {
    shortcut: "/images/favicon.png",
    apple: {
      url: "/images/apple-touch-icon.png",
      sizes: "180x180",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${rye.variable} font-sans`}>
      <body>
        <Suspense fallback={null}>
          <NavigationEvents />
          <AppLayout>{children}</AppLayout>
        </Suspense>
      </body>
    </html>
  );
}
