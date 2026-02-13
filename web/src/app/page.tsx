'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, ArrowRight } from 'lucide-react'
import { useReadContract } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI } from '@/lib/contracts'
import { getTokenId, formatUSDM, getPrice, isValidName } from '@/lib/utils'
import { useContractStats, useRecentRegistrations } from '@/lib/hooks'
import Link from 'next/link'
import Image from 'next/image'

/* ── Helpers ── */

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useInView(0.1)
  return (
    <section
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
      }}
    >
      {children}
    </section>
  )
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

/* ── Interop Typewriter ── */

function InteropTypewriter() {
  const chains = ['megaeth', 'ethereum', 'base', 'arbitrum', 'lighter']
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

/* ── Staggered Pricing Card ── */

function PricingCard({ length, price, index }: { length: string; price: string; index: number }) {
  const { ref, visible } = useInView(0.1)
  return (
    <div
      ref={ref}
      className="panel py-6 text-center hover:border-[var(--foreground)]/20 transition-all hover:-translate-y-0.5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.4s ease-out ${index * 0.08}s, transform 0.4s ease-out ${index * 0.08}s`,
      }}
    >
      <p className="font-label text-[var(--muted)] text-[0.5rem] sm:text-[0.6rem] mb-2">{length} char</p>
      <p className="font-display text-2xl sm:text-3xl text-[var(--foreground)]">{price}</p>
    </div>
  )
}

/* ── Recently Registered Ticker ── */

function RecentTicker({ names }: { names: string[] }) {
  if (names.length === 0) return null
  const doubled = [...names, ...names]
  return (
    <div className="overflow-hidden bg-[var(--foreground)] py-3">
      <div className="ticker-track">
        {doubled.map((name, i) => (
          <span key={i} className="inline-flex items-center mx-6 whitespace-nowrap">
            <span className="font-mono text-xs text-[var(--background-light)]">{name}</span>
            <span className="font-mono text-xs text-[var(--muted)]">.mega</span>
            <span className="ml-3 w-1 h-1 rounded-full bg-[var(--muted-dark)]" />
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Live Name Preview ── */

function NamePreview({ name }: { name: string }) {
  if (!name) return null
  return (
    <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-[var(--surface)] border border-[var(--border-light)] rounded-sm animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
      <div className="w-8 h-8 rounded-full bg-[var(--border)] flex items-center justify-center flex-shrink-0">
        <span className="font-display text-sm text-[var(--muted-dark)]">{name[0]?.toUpperCase()}</span>
      </div>
      <div className="min-w-0">
        <p className="font-mono text-sm text-[var(--foreground)] truncate">{name.toLowerCase()}.mega</p>
        <p className="font-label text-[var(--muted)] text-[0.5rem]">preview</p>
      </div>
    </div>
  )
}

/* ── Subdomain Hierarchy Animation ── */

function SubdomainTree() {
  const [step, setStep] = useState(0)
  const { ref, visible } = useInView(0.3)

  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 5)
    }, 1200)
    return () => clearInterval(interval)
  }, [visible])

  const nodes = [
    { label: 'bread.mega', depth: 0, show: 0 },
    { label: 'dev.bread.mega', depth: 1, show: 1 },
    { label: 'staging.dev.bread.mega', depth: 2, show: 2 },
    { label: 'blog.bread.mega', depth: 1, show: 3 },
    { label: 'api.bread.mega', depth: 1, show: 4 },
  ]

  return (
    <div ref={ref} className="bg-[var(--background)] border border-[var(--border-light)] rounded-sm px-4 py-3 font-mono text-xs space-y-1.5 my-3">
      {nodes.map((node, i) => {
        const isVisible = visible && step >= node.show
        const isActive = visible && step === node.show
        return (
          <div
            key={i}
            className="flex items-center gap-2 transition-all duration-500"
            style={{
              paddingLeft: `${node.depth * 20}px`,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(-8px)',
              transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
            }}
          >
            {node.depth > 0 && (
              <span className="text-[var(--border)]">{node.depth === 1 ? '├─' : '│ └─'}</span>
            )}
            <span className={`${node.depth === 0 ? 'text-[var(--foreground)] font-semibold' : 'text-[var(--muted-dark)]'}`}>
              {node.label}
            </span>
            {isActive && (
              <span className="inline-block w-1.5 h-3 bg-[var(--foreground)] animate-blink ml-0.5" />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Main Page ── */

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchedName, setSearchedName] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [megaPulse, setMegaPulse] = useState(false)

  const recentNames = useRecentRegistrations()
  const { namesRegistered, totalVolume, isLoading: statsLoading } = useContractStats()

  const tokenId = searchedName ? getTokenId(searchedName) : BigInt(0)

  const { data: records, isLoading } = useReadContract({
    address: CONTRACTS.mainnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'records',
    args: [tokenId],
    query: { enabled: !!searchedName },
  })

  const isAvailable = searchedName && records && records[0] === ''
  const isTaken = searchedName && records && records[0] !== ''
  const price = searchedName ? getPrice(searchedName.length) : BigInt(0)

  const { data: nameOwner } = useReadContract({
    address: CONTRACTS.mainnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'ownerOf',
    args: [tokenId],
    query: { enabled: !!isTaken },
  })

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

      {/* Faint MegaETH M logo watermark */}
      <div
        className="fixed top-1/2 left-1/2 pointer-events-none z-0"
        style={{
          opacity: megaPulse ? 0.15 : 0.04,
          transform: `translate(-50%, -50%) scale(${megaPulse ? 1.08 : 1})`,
          transition: megaPulse ? 'opacity 0.2s ease-out' : 'opacity 0.8s ease-in',
        }}
      >
        <Image src="/megaeth-icon.png" alt="" width={700} height={700} />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="text-center mb-16">
            <p className="font-label text-[var(--muted)] mb-6 tracking-[0.25em] animate-fade-in-up">
              on-chain identity
            </p>
            <h1 className="font-display text-6xl sm:text-8xl lg:text-[10rem] leading-[0.8] mb-1 text-[var(--foreground)] animate-fade-in-up delay-100">
              MEGA NAME
            </h1>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-7xl leading-[0.85] text-[var(--muted-dark)] mb-8 animate-fade-in-up delay-200">
              MARKET
            </h2>
            <p className="text-[var(--muted-dark)] max-w-md mx-auto text-sm leading-relaxed animate-fade-in-up delay-300">
              Human-readable addresses on the real-time blockchain.
              Purchase .mega domains with USDM.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto">
            <form onSubmit={handleSearch}>
              <div className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '')
                    setSearchQuery(val)
                    if (val.toLowerCase() === 'mega' && !megaPulse) {
                      setMegaPulse(true)
                      setTimeout(() => setMegaPulse(false), 1200)
                    }
                  }}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="yourname"
                  className="flex-1 min-w-0 px-3 sm:px-5 py-4 text-base sm:text-lg font-semibold"
                />
                <span className="px-2 sm:px-4 py-4 border border-l-0 border-[var(--border)] bg-[var(--surface)] text-sm sm:text-lg font-semibold text-[var(--muted)]">
                  .mega
                </span>
                <button type="submit" className="btn-primary px-4 sm:px-6 flex-shrink-0">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Live preview while typing */}
            {searchQuery && !searchedName && isValidName(searchQuery) && (
              <NamePreview name={searchQuery} />
            )}

            {/* Search Result */}
            {searchedName && (
              <div className="mt-4 relative">
                {isLoading ? (
                  <div className="panel p-5">
                    <div className="animate-pulse">
                      <div className="h-6 bg-[var(--border)] w-1/2 mb-2 rounded" />
                      <div className="h-4 bg-[var(--border)] w-1/3 rounded" />
                    </div>
                  </div>
                ) : (
                  <div className={`panel p-5 ${isAvailable ? '!border-[#2d6b3f]/40' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-3xl text-[var(--foreground)] mb-1 truncate">
                          {searchedName}.mega
                        </p>
                        <p className={`font-label ${isAvailable ? 'text-[#2d6b3f]' : 'text-[var(--muted)]'}`}>
                          {isAvailable ? '● available' : '○ registered'}
                        </p>
                        {isTaken && nameOwner && (
                          <Link
                            href={`/profile?a=${nameOwner}`}
                            className="inline-flex items-center gap-1.5 mt-2 text-sm text-[var(--muted-dark)] hover:text-[var(--foreground)] transition-colors"
                          >
                            owner: {nameOwner.slice(0, 6)}...{nameOwner.slice(-4)} <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
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
                {/* Easter egg: bread mascot */}
                {searchedName === 'bread' && (
                  <div className="absolute -right-2 sm:-right-16 bottom-0 pointer-events-none animate-fade-in-up" style={{ animationDuration: '0.5s' }}>
                    <Image
                      src="/mascot.png"
                      alt=""
                      width={100}
                      height={152}
                      className="w-[70px] sm:w-[100px] drop-shadow-md"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recently registered ticker */}
      <RecentTicker names={recentNames} />

      {/* Stats */}
      <AnimatedSection className="border-t border-[var(--border)] relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="grid grid-cols-3 gap-3">
            <div className="panel p-4 sm:p-6">
              <p className="font-label text-[var(--muted)] mb-2">total registered</p>
              <p className="font-display text-3xl sm:text-5xl text-[var(--foreground)]">
                {statsLoading ? '—' : namesRegistered.toLocaleString()}
              </p>
            </div>
            <div className="panel p-4 sm:p-6">
              <p className="font-label text-[var(--muted)] mb-2">total purchased</p>
              <p className="font-display text-3xl sm:text-5xl text-[var(--foreground)]">
                {statsLoading ? '—' : formatUSDM(totalVolume)}
              </p>
            </div>
            <div className="panel p-4 sm:p-6">
              <p className="font-label text-[var(--muted)] mb-2">chain</p>
              <p className="font-display text-3xl sm:text-5xl text-[var(--foreground)]">MEGAETH</p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Features */}
      <AnimatedSection className="border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="font-label text-[var(--muted)] mb-8 tracking-[0.2em]">features</p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="panel p-5 hover:border-[var(--foreground)]/20 transition-all hover:-translate-y-0.5">
              <h3 className="font-display text-xl text-[var(--foreground)] mb-2">HUMAN-READABLE</h3>
              <p className="text-[var(--muted-dark)] text-sm leading-relaxed">Replace 0x addresses with memorable names like bread.mega</p>
            </div>
            <div className="panel p-5 hover:border-[var(--foreground)]/20 transition-all hover:-translate-y-0.5">
              <h3 className="font-display text-xl text-[var(--foreground)] mb-2">CROSSCHAIN COMPLIANT</h3>
              <div className="bg-[var(--background)] border border-[var(--border-light)] px-4 py-3 mb-3 rounded-sm">
                <InteropTypewriter />
              </div>
              <p className="text-[var(--muted-dark)] text-sm leading-relaxed">
                Future-proof addressing built on the <a href="https://interopaddress.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--foreground)] transition-colors">interop address standard ↗</a>
              </p>
            </div>
            <div className="panel p-5 hover:border-[var(--foreground)]/20 transition-all hover:-translate-y-0.5">
              <h3 className="font-display text-xl text-[var(--foreground)] mb-2">SUBDOMAINS</h3>
              <SubdomainTree />
              <p className="text-[var(--muted-dark)] text-sm leading-relaxed mt-3">Create unlimited free subdomains. Give your team, projects, or apps their own identity.</p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Pricing */}
      <AnimatedSection className="border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="font-label text-[var(--muted)] mb-8 tracking-[0.2em]">pricing / year</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[
              { length: '1', price: '$1,000' },
              { length: '2', price: '$500' },
              { length: '3', price: '$100' },
              { length: '4', price: '$10' },
              { length: '5+', price: '$1' },
            ].map((tier, i) => (
              <PricingCard key={tier.length} length={tier.length} price={tier.price} index={i} />
            ))}
          </div>
          <div className="font-label text-[var(--muted)] mt-6 text-center text-[0.5rem] sm:text-[0.6rem] tracking-[0.1em] sm:tracking-[0.15em]">
            <span className="hidden sm:inline">multi-year discounts · 2y 5% · 3y 10% · 5y 15% · 10y 25%</span>
            <span className="sm:hidden">
              multi-year discounts<br />
              2y 5% · 3y 10% · 5y 15% · 10y 25%
            </span>
          </div>
        </div>
      </AnimatedSection>

    </div>
  )
}
