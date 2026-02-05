import { Inter } from 'next/font/google'
import localFont from 'next/font/local'

// Load Teodor font - elegant serif display font
export const teodor = localFont({
  src: [
    {
      path: '../../public/fonts/TeodorLight.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/TeodorRegular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/TeodorMedium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/TeodorBold.otf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/fonts/TeodorItalics.ttf',
      weight: '400',
      style: 'italic',
    },
  ],
  display: 'swap',
  variable: '--font-teodor',
})

// Inter for body text - clean and readable
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})
