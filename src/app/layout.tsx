import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BlackCore E-commerce',
  description: 'A melhor loja de produtos exclusivos.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background font-sans antialiased text-foreground`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
