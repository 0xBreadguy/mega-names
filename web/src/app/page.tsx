'use client'

import { useState } from 'react'
import { Search, ArrowRight } from 'lucide-react'
import { useReadContract } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI } from '@/lib/contracts'
import { getTokenId, formatUSDM, getPrice, isValidName } from '@/lib/utils'
import { useContractStats } from '@/lib/hooks'
import Link from 'next/link'

// Generate barcode bars
function Barcode({ count = 50, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`barcode ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="barcode-bar" />
      ))}
    </div>
  )
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchedName, setSearchedName] = useState('')
  
  // Live contract stats
  const { namesRegistered, totalVolume, isLoading: statsLoading } = useContractStats()

  const tokenId = searchedName ? getTokenId(searchedName) : BigInt(0)

  const { data: records, isLoading } = useReadContract({
    address: CONTRACTS.testnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'records',
    args: [tokenId],
    query: {
      enabled: !!searchedName,
    },
  })

  const isAvailable = searchedName && records && records[0] === ''
  const isRegistered = searchedName && records && records[0] !== ''
  const price = searchedName ? getPrice(searchedName.length) : BigInt(0)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValidName(searchQuery)) {
      setSearchedName(searchQuery.toLowerCase())
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Hero Section */}
      <section className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Title */}
            <div>
              <p className="font-label text-sm text-[#666] mb-4">
                ON-CHAIN IDENTITY
              </p>
              <h1 className="font-display text-6xl lg:text-8xl leading-[0.9] mb-6">
                YOUR NAME<br />
                ON MEGA
              </h1>
              <Barcode count={60} className="mb-8" />
              <p className="text-lg text-[#666] max-w-md">
                Human-readable addresses. On-chain websites. 
                The naming layer for the real-time blockchain.
              </p>
            </div>

            {/* Right: Search */}
            <div>
              <form onSubmit={handleSearch}>
                <div className="mb-4">
                  <label className="font-label text-sm text-[#666] block mb-2">
                    SEARCH NAMES
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                      placeholder="yourname"
                      className="flex-1 px-4 py-4 text-xl font-semibold"
                    />
                    <span className="px-4 py-4 border-2 border-l-0 border-black bg-transparent text-xl font-semibold">
                      .mega
                    </span>
                    <button
                      type="submit"
                      className="btn-primary px-6"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </form>

              {/* Search Result */}
              {searchedName && (
                <div className="mt-6">
                  {isLoading ? (
                    <div className="border-2 border-black p-6">
                      <div className="animate-pulse">
                        <div className="h-8 bg-black/10 w-1/2 mb-2" />
                        <div className="h-4 bg-black/10 w-1/3" />
                      </div>
                    </div>
                  ) : (
                    <div className={`border-2 p-6 ${isAvailable ? 'border-black' : 'border-dashed border-[#666]'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-display text-3xl mb-1">
                            {searchedName}.mega
                          </p>
                          <p className={`font-label text-sm ${isAvailable ? 'text-black' : 'text-[#666]'}`}>
                            {isAvailable ? '● AVAILABLE' : '○ REGISTERED'}
                          </p>
                        </div>
                        {isAvailable && (
                          <div className="text-right">
                            <p className="font-label text-xs text-[#666]">PRICE / YEAR</p>
                            <p className="font-display text-2xl">{formatUSDM(price)}</p>
                          </div>
                        )}
                      </div>
                      {isAvailable && (
                        <Link
                          href={`/register?name=${searchedName}`}
                          className="btn-primary w-full mt-6 py-3 flex items-center justify-center gap-2 text-sm"
                        >
                          REGISTER NOW <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="border-b-2 border-black">
        <div className="grid md:grid-cols-3">
          <div className="p-8 border-r-2 border-black">
            <p className="font-label text-sm text-[#666] mb-2">NAMES REGISTERED</p>
            <p className="font-display text-5xl lg:text-6xl mb-1">
              {statsLoading ? '—' : namesRegistered.toLocaleString()}
            </p>
            <Barcode count={30} className="h-6" />
          </div>
          <div className="p-8 border-r-2 border-black">
            <p className="font-label text-sm text-[#666] mb-2">TOTAL VOLUME</p>
            <p className="font-display text-5xl lg:text-6xl mb-1">
              {statsLoading ? '—' : formatUSDM(totalVolume)}
            </p>
            <Barcode count={30} className="h-6" />
          </div>
          <div className="p-8">
            <p className="font-label text-sm text-[#666] mb-2">CHAIN</p>
            <p className="font-display text-5xl lg:text-6xl mb-1">MEGA</p>
            <Barcode count={30} className="h-6" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="font-label text-sm text-[#666] mb-8">FEATURES</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'HUMAN-READABLE',
                description: 'Replace 0x addresses with memorable names like bread.mega',
              },
              {
                title: 'STABLE PRICING',
                description: 'Pay in USDM stablecoin. No ETH volatility. Predictable costs.',
              },
              {
                title: 'ON-CHAIN WEBSITES',
                description: 'Host your website directly on MegaETH with Warren integration.',
              },
            ].map((feature) => (
              <div key={feature.title} className="border-2 border-black p-6">
                <h3 className="font-display text-2xl mb-3">{feature.title}</h3>
                <p className="text-[#666]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Grid */}
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="font-label text-sm text-[#666] mb-8">PRICING / YEAR</p>
          <div className="grid grid-cols-5 border-2 border-black">
            {[
              { length: '1', price: '$1,000' },
              { length: '2', price: '$500' },
              { length: '3', price: '$100' },
              { length: '4', price: '$10' },
              { length: '5+', price: '$1' },
            ].map((tier, i) => (
              <div
                key={tier.length}
                className={`p-6 text-center ${i < 4 ? 'border-r-2 border-black' : ''}`}
              >
                <p className="font-label text-xs text-[#666] mb-2">{tier.length} CHAR</p>
                <p className="font-display text-3xl lg:text-4xl">{tier.price}</p>
              </div>
            ))}
          </div>
          <Barcode count={100} className="mt-8 h-8" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <p className="font-label text-sm text-[#666]">
              MEGANAMES © 2025
            </p>
            <div className="flex items-center gap-6">
              <a 
                href="https://rabbithole.megaeth.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="font-label text-sm hover:underline"
              >
                MEGAETH
              </a>
              <a 
                href="https://github.com/0xBreadguy/mega-names" 
                target="_blank"
                rel="noopener noreferrer"
                className="font-label text-sm hover:underline"
              >
                GITHUB
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
