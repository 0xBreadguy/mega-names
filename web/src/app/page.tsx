'use client'

import { useState, useEffect } from 'react'
import { Search, ArrowRight } from 'lucide-react'
import { useReadContract } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI } from '@/lib/contracts'
import { getTokenId, formatUSDM, getPrice, isValidName } from '@/lib/utils'
import { useContractStats } from '@/lib/hooks'
import Link from 'next/link'
import Image from 'next/image'

function InteropTypewriter() {
  const chains = ['megaeth', 'ethereum']
  const [chainIndex, setChainIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase] = useState<'typing' | 'pause' | 'deleting'>('typing')

  useEffect(() => {
    const target = chains[chainIndex]

    if (phase === 'typing') {
      if (displayed.length < target.length) {
        const t = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 80)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setPhase('pause'), 1800)
        return () => clearTimeout(t)
      }
    }

    if (phase === 'pause') {
      const t = setTimeout(() => setPhase('deleting'), 0)
      return () => clearTimeout(t)
    }

    if (phase === 'deleting') {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40)
        return () => clearTimeout(t)
      } else {
        setChainIndex((chainIndex + 1) % chains.length)
        setPhase('typing')
      }
    }
  }, [displayed, phase, chainIndex])

  return (
    <span className="font-mono text-sm">
      <span className="text-[var(--foreground)]">bread.mega</span>
      <span className="text-[var(--muted)]">@</span>
      <span className="text-[var(--foreground)]">{displayed}</span>
      <span className="animate-blink text-[var(--muted)]">▌</span>
    </span>
  )
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchedName, setSearchedName] = useState('')
  
  const { namesRegistered, totalVolume, isLoading: statsLoading } = useContractStats()

  const tokenId = searchedName ? getTokenId(searchedName) : BigInt(0)

  const { data: records, isLoading } = useReadContract({
    address: CONTRACTS.testnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'records',
    args: [tokenId],
    query: { enabled: !!searchedName },
  })

  const isAvailable = searchedName && records && records[0] === ''
  const price = searchedName ? getPrice(searchedName.length) : BigInt(0)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValidName(searchQuery)) {
      setSearchedName(searchQuery.toLowerCase())
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* Paper texture overlay */}
      <div className="paper-texture" />

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center">
        {/* Blueprint grid */}
        <div className="blueprint-grid" />
        
        {/* Crosshair lines */}
        <div className="crosshair-h" />
        <div className="crosshair-v" />
        
        {/* Diagonal lines */}
        <div className="diag-line" style={{ transform: 'rotate(30deg)' }} />
        <div className="diag-line" style={{ transform: 'rotate(-30deg)' }} />
        <div className="diag-line" style={{ transform: 'rotate(60deg)' }} />
        <div className="diag-line" style={{ transform: 'rotate(-60deg)' }} />

        {/* Orbital rings */}
        <div className="orbital-rings">
          <div className="orbital-ring orbital-ring-1" />
          <div className="orbital-ring orbital-ring-2" />
          <div className="orbital-ring orbital-ring-3" />
          <div className="orbital-ring orbital-ring-4" />
          <div className="orbital-ring orbital-ring-5" />
          
          {/* Dots on orbits */}
          <div className="orbital-dot" style={{ top: '10%', left: '50%' }} />
          <div className="orbital-dot-hollow" style={{ top: '22%', left: '78%' }} />
          <div className="orbital-dot" style={{ top: '50%', left: '93%' }} />
          <div className="orbital-dot-hollow" style={{ top: '78%', left: '72%' }} />
          <div className="orbital-dot" style={{ top: '88%', left: '44%' }} />
          <div className="orbital-dot-hollow" style={{ top: '68%', left: '15%' }} />
          <div className="orbital-dot" style={{ top: '30%', left: '12%' }} />
          
          {/* Planet-style labels */}
          <div className="orbital-label" style={{ top: '8%', left: '52%' }}>mars</div>
          <div className="orbital-label" style={{ top: '20%', left: '82%' }}>neptune</div>
          <div className="orbital-label" style={{ top: '80%', left: '76%' }}>saturn</div>
          <div className="orbital-label" style={{ top: '90%', left: '48%' }}>earth</div>
          <div className="orbital-label" style={{ top: '70%', left: '12%' }}>uranus</div>
          <div className="orbital-label" style={{ top: '28%', left: '8%' }}>mercury</div>
          <div className="orbital-label" style={{ top: '50%', left: '97%' }}>jupiter</div>
        </div>

        {/* Faint MegaETH M logo watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
          <Image src="/megaeth-icon.png" alt="" width={500} height={500} />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="text-center mb-16">
            <p className="font-label text-[var(--muted)] mb-6 tracking-[0.25em]">
              on-chain identity
            </p>
            <h1 className="font-display text-8xl lg:text-[10rem] leading-[0.8] mb-4 text-[var(--foreground)]">
              MEGA
            </h1>
            <h2 className="font-display text-5xl lg:text-7xl leading-[0.85] text-[var(--muted-dark)] mb-8">
              NAMES
            </h2>
            <p className="text-[var(--muted-dark)] max-w-md mx-auto text-sm leading-relaxed">
              Human-readable addresses on the real-time blockchain.
              Register your .mega name today.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto">
            <form onSubmit={handleSearch}>
              <div className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  placeholder="yourname"
                  className="flex-1 px-5 py-4 text-lg font-semibold"
                />
                <span className="px-4 py-4 border border-l-0 border-[var(--border)] bg-[var(--surface)] text-lg font-semibold text-[var(--muted)]">
                  .mega
                </span>
                <button type="submit" className="btn-primary px-6">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Search Result */}
            {searchedName && (
              <div className="mt-4">
                {isLoading ? (
                  <div className="panel p-5">
                    <div className="animate-pulse">
                      <div className="h-6 bg-[var(--border)] w-1/2 mb-2 rounded" />
                      <div className="h-4 bg-[var(--border)] w-1/3 rounded" />
                    </div>
                  </div>
                ) : (
                  <div className={`panel p-5 ${isAvailable ? '!border-[#2d6b3f]/40' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-display text-3xl text-[var(--foreground)] mb-1">
                          {searchedName}.mega
                        </p>
                        <p className={`font-label ${isAvailable ? 'text-[#2d6b3f]' : 'text-[var(--muted)]'}`}>
                          {isAvailable ? '● available' : '○ registered'}
                        </p>
                      </div>
                      {isAvailable && (
                        <div className="text-right">
                          <p className="font-label text-[var(--muted)] text-[0.6rem]">price/yr</p>
                          <p className="font-display text-2xl text-[var(--foreground)]">{formatUSDM(price)}</p>
                        </div>
                      )}
                    </div>
                    {isAvailable && (
                      <Link
                        href={`/register?name=${searchedName}`}
                        className="btn-primary w-full mt-4 py-3 flex items-center justify-center gap-2"
                      >
                        register now <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Corner timestamp like reference image */}
        <div className="absolute bottom-6 right-8 font-label text-[var(--muted)] text-[0.5rem] tracking-[0.15em]">
          2026.
        </div>

        {/* Corner wordmark */}
        <div className="absolute top-6 left-8 opacity-60 pointer-events-none">
          <Image src="/megaeth-wordmark.svg" alt="MegaETH" width={120} height={20} />
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-[var(--border)] relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
            <div className="py-10 pr-8">
              <p className="font-label text-[var(--muted)] mb-2">registered</p>
              <p className="font-display text-5xl text-[var(--foreground)]">
                {statsLoading ? '—' : namesRegistered.toLocaleString()}
              </p>
            </div>
            <div className="py-10 px-8">
              <p className="font-label text-[var(--muted)] mb-2">volume</p>
              <p className="font-display text-5xl text-[var(--foreground)]">
                {statsLoading ? '—' : formatUSDM(totalVolume)}
              </p>
            </div>
            <div className="py-10 pl-8">
              <p className="font-label text-[var(--muted)] mb-2">chain</p>
              <p className="font-display text-5xl text-[var(--foreground)]">MEGAETH</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="font-label text-[var(--muted)] mb-8 tracking-[0.2em]">pricing / year</p>
          <div className="grid grid-cols-5 gap-2">
            {[
              { length: '1', price: '$1,000' },
              { length: '2', price: '$500' },
              { length: '3', price: '$100' },
              { length: '4', price: '$10' },
              { length: '5+', price: '$1' },
            ].map((tier) => (
              <div key={tier.length} className="panel py-6 text-center hover:border-[var(--foreground)]/20 transition-colors">
                <p className="font-label text-[var(--muted)] text-[0.6rem] mb-2">{tier.length} char</p>
                <p className="font-display text-3xl text-[var(--foreground)]">{tier.price}</p>
              </div>
            ))}
          </div>
          <p className="font-label text-[var(--muted)] mt-6 text-center text-[0.6rem] tracking-[0.15em]">
            multi-year discounts · 2y 5% · 3y 10% · 5y 15% · 10y 25%
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="font-label text-[var(--muted)] mb-8 tracking-[0.2em]">features</p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="panel p-5 hover:border-[var(--foreground)]/20 transition-colors">
              <h3 className="font-display text-xl text-[var(--foreground)] mb-2">HUMAN-READABLE</h3>
              <p className="text-[var(--muted-dark)] text-sm leading-relaxed">Replace 0x addresses with memorable names like bread.mega</p>
            </div>
            <div className="panel p-5 hover:border-[var(--foreground)]/20 transition-colors">
              <h3 className="font-display text-xl text-[var(--foreground)] mb-2">CROSSCHAIN COMPLIANT</h3>
              <div className="bg-[var(--background)] border border-[var(--border-light)] px-4 py-3 mb-3 rounded-sm">
                <InteropTypewriter />
              </div>
              <p className="text-[var(--muted-dark)] text-sm leading-relaxed">
                Future-proof addressing built on the <a href="https://interopaddress.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--foreground)] transition-colors">interop address standard ↗</a>
              </p>
            </div>
            <div className="panel p-5 hover:border-[var(--foreground)]/20 transition-colors">
              <h3 className="font-display text-xl text-[var(--foreground)] mb-2">ON-CHAIN WEBSITES</h3>
              <p className="text-[var(--muted-dark)] text-sm leading-relaxed">Host your website directly on MegaETH with Warren integration.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="font-label text-[var(--muted)] text-[0.6rem]">
              meganames © 2026
            </p>
            <div className="flex items-center gap-6">
              <a href="https://rabbithole.megaeth.com" target="_blank" rel="noopener noreferrer"
                className="font-label text-[var(--muted)] text-[0.6rem] hover:text-[var(--foreground)] transition-colors">
                megaeth
              </a>
              <a href="https://github.com/0xBreadguy/mega-names" target="_blank" rel="noopener noreferrer"
                className="font-label text-[var(--muted)] text-[0.6rem] hover:text-[var(--foreground)] transition-colors">
                github
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
