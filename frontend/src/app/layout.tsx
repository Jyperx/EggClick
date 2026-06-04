import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from '@/components/Providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EggClick - Gana Dinero Sin Invertir Nada | Juega y Gana Gratis",
  description:
    "Descubre cómo ganar dinero sin invertir nada. Haz clic, rompe huevos y gana premios reales gratis. ¡Empieza a ganar ahora con EggClick!",
  icons: {
    icon: "/sprites/moneda.png",
    apple: "/sprites/moneda.png",
  },
  keywords: [
    "ganar dinero sin invertir",
    "ganar dinero gratis",
    "ganar dinero online",
    "juegos para ganar dinero",
    "dinero gratis",
    "EggClick",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script src="https://quge5.com/88/tag.min.js" data-zone="246067" async data-cfasync="false"></script>
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
