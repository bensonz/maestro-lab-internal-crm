import { Inter, JetBrains_Mono } from 'next/font/google'

// Inter for body text - clean and readable
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

// JetBrains Mono for monospace - numbers, data, code
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})
