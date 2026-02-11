'use client'

import Link from 'next/link'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useResolvedName } from '@/lib/hooks'
import { Loader2 } from 'lucide-react'

export function Header() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { displayName, isLoading, hasMegaName } = useResolvedName(address)

  return (
    <header className="border-b border-[var(--border)] sticky top-0 z-50 bg-[var(--background)]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black italic tracking-tight text-[var(--foreground)]">
              MEGANAMES
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="font-label text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              search
            </Link>
            <Link href="/my-names" className="font-label text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              my names
            </Link>
            <a href="https://rabbithole.megaeth.com" target="_blank" rel="noopener noreferrer"
              className="font-label text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              megaeth ↗
            </a>
          </nav>

          <div>
            {isConnected ? (
              <button
                onClick={() => disconnect()}
                className={`px-3 py-1.5 border text-xs font-mono uppercase tracking-wider transition-all ${
                  hasMegaName 
                    ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]' 
                    : 'border-[var(--border)] text-[var(--foreground)] hover:border-[var(--foreground)]'
                }`}
                title={address}
              >
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : displayName}
              </button>
            ) : (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="btn-primary px-4 py-1.5"
              >
                connect
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
