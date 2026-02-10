'use client'

import Link from 'next/link'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { shortenAddress } from '@/lib/utils'

export function Header() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              MegaNames
            </span>
            <span className="text-gray-500">.mega</span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              Search
            </Link>
            <Link href="/my-names" className="text-gray-400 hover:text-white transition-colors">
              My Names
            </Link>
          </nav>

          {/* Connect Button */}
          <div>
            {isConnected ? (
              <button
                onClick={() => disconnect()}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors font-medium"
              >
                {shortenAddress(address!)}
              </button>
            ) : (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-colors font-medium"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
