import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/lib/providers"
import { Header } from "@/components/header"

const inter = Inter({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: "MEGANAMES",
  description: ".mega names on MegaETH",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <Providers>
          <Header />
          <div className="bg-[var(--foreground)] text-[var(--background)] text-center py-2 px-4 shadow-[0_2px_6px_rgba(25,25,26,0.15)]">
            <p className="text-xs font-label tracking-wider">
              🚧 PRE-REGISTRATION PHASE — Public registration opening soon. Founder & team names are being reserved.
            </p>
          </div>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
