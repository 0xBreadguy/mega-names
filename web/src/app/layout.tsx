import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/lib/providers"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

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
      <body className="min-h-screen flex items-center justify-center p-0 sm:p-6">
        <Providers>
          <div className="app-frame w-full max-w-[1200px] min-h-screen sm:min-h-0 sm:max-h-[95vh] overflow-y-auto border border-[var(--border)] shadow-[0_0_60px_rgba(0,0,0,0.4)] flex flex-col">
            <Header />
            <div className="bg-[var(--foreground)] text-[var(--bg-card)] text-center py-2 px-4">
              <p className="text-[10px] font-label tracking-wider" style={{ fontFamily: 'var(--font-main)' }}>
                PRE-REGISTRATION PHASE — Public registration opening soon
              </p>
            </div>
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
