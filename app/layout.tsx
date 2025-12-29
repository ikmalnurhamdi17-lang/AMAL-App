import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AMAL Application',
  description: 'Aplikasi Manajemen Keuangan Pesantren',
  manifest: '/manifest.json',
  icons: {
    icon: '/Amal.png',
    apple: '/Amal.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#1e40af" />
      </head>
      <body>{children}</body>
    </html>
  )
}