'use client'

import Link from 'next/link'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { shortenAddress } from '@/lib/utils'

export function Header() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <header className="border-b-2 border-black sticky top-0 z-50 bg-[#E8E8E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <span className="text-2xl font-black italic tracking-tight">
              MEGANAMES
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              href="/" 
              className="font-label text-sm hover:underline underline-offset-4"
            >
              SEARCH
            </Link>
            <Link 
              href="/my-names" 
              className="font-label text-sm hover:underline underline-offset-4"
            >
              MY NAMES
            </Link>
            <a 
              href="https://rabbithole.megaeth.com" 
              target="_blank"
              rel="noopener noreferrer"
              className="font-label text-sm text-[#666] hover:text-black hover:underline underline-offset-4"
            >
              MEGAETH ↗
            </a>
          </nav>

          {/* Connect Button */}
          <div>
            {isConnected ? (
              <button
                onClick={() => disconnect()}
                className="px-5 py-2 border-2 border-black font-bold text-sm uppercase tracking-wide hover:bg-black hover:text-[#E8E8E8] transition-colors"
              >
                {shortenAddress(address!)}
              </button>
            ) : (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="btn-primary px-5 py-2 text-sm"
              >
                CONNECT
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
