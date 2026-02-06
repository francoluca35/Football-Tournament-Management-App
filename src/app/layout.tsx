import type { ReactNode } from 'react';
import '../styles/index.css';
import { Layout } from './components/Layout';

export const metadata = {
  title: 'Torneo Local',
  description: 'Sistema de gestión de torneos de fútbol',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-foreground">
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
