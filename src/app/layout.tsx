import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TranslateX Pro - Service de Traduction Professionnel',
  description: 'Application de traduction IA pour documents et textes en plusieurs langues',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.ico', sizes: '32x32' }
    ]
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="bg-slate-50">{children}</body>
    </html>
  )
}
