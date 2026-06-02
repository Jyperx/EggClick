'use client';
import { SessionProvider } from "next-auth/react";

if (typeof window !== 'undefined') {
  // Silenciar logs en el navegador para mantener la consola limpia
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  // Mantenemos console.error por si hay fallos críticos de React
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
