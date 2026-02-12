'use client'

import Link from 'next/link'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { useResolvedName } from '@/lib/hooks'
import { Loader2 } from 'lucide-react'

export function Header() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const { displayName, isLoading, hasMegaName } = useResolvedName(address)
  
  const MEGAETH_TESTNET_ID = 6343
  const isWrongChain = isConnected && chainId !== MEGAETH_TESTNET_ID

  return (
    <header className="border-b border-[var(--border)] sticky top-0 z-50 bg-[var(--background)]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black italic tracking-tight text-[var(--foreground)]">
              MEGANAMES
            </span>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-6">
            <Link href="/" className="font-label text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              search
            </Link>
            <Link href="/my-names" className="font-label text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              my names
            </Link>
            <Link href="/integrate" className="font-label text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              integrate
            </Link>
            <a href="https://rabbithole.megaeth.com/bridge" target="_blank" rel="noopener noreferrer"
              className="font-label text-[var(--muted)] hover:text-[var(--foreground)] transition-colors hidden sm:inline">
              bridge ↗
            </a>
          </nav>

          <div>
            {isConnected && isWrongChain ? (
              <button
                onClick={() => switchChain({ chainId: MEGAETH_TESTNET_ID })}
                className="px-3 py-1.5 border border-orange-400 text-xs font-mono uppercase tracking-wider text-orange-600 hover:bg-orange-50 transition-all"
              >
                switch network
              </button>
            ) : isConnected ? (
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
