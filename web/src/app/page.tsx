'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, ArrowRight, Loader2, Check } from 'lucide-react'
import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI, SUBDOMAIN_ROUTER_ABI, SUBDOMAIN_LOGIC_ABI, ERC20_ABI } from '@/lib/contracts'
import { getTokenId, formatUSDM, getPrice, isValidName } from '@/lib/utils'
import { formatUnits, parseUnits } from 'viem'
import { useContractStats, useRecentRegistrations } from '@/lib/hooks'
import { usePublicClient } from 'wagmi'
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

/* ── Subdomain Purchase Flow ── */
function SubdomainPurchase({ parentName, parentTokenId }: { parentName: string; parentTokenId: bigint }) {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const [subLabel, setSubLabel] = useState('')
  const [step, setStep] = useState<'input' | 'checking' | 'quoting' | 'approve' | 'approving' | 'register' | 'registering' | 'done'>('input')
  const [quote, setQuote] = useState<{ allowed: boolean; price: bigint; total: bigint } | null>(null)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [subAvailable, setSubAvailable] = useState<boolean | null>(null)
  const [gateInfo, setGateInfo] = useState<{ token: string; name: string; minBalance: string } | null>(null)
  const [mode, setMode] = useState<number>(0)

  const { writeContractAsync } = useWriteContract()
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash })

  // Fetch token gate info + mode on mount
  useEffect(() => {
    async function fetchGateInfo() {
      if (!publicClient) return
      try {
        const [gateData, configData] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.mainnet.subdomainLogic,
            abi: SUBDOMAIN_LOGIC_ABI,
            functionName: 'tokenGates',
            args: [parentTokenId],
          }),
          publicClient.readContract({
            address: CONTRACTS.mainnet.subdomainRouter,
            abi: SUBDOMAIN_ROUTER_ABI,
            functionName: 'getConfig',
            args: [parentTokenId],
          }),
        ])
        const [, , cfgMode] = configData as [string, boolean, number]
        setMode(cfgMode)
        const [token, minBal] = gateData as [string, bigint]
        if (token !== '0x0000000000000000000000000000000000000000') {
          let tokenName = token.slice(0, 6) + '...' + token.slice(-4)
          try {
            const n = await publicClient.readContract({
              address: token as `0x${string}`,
              abi: [{ type: 'function', name: 'name', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' }],
              functionName: 'name',
            })
            tokenName = n as string
          } catch {}
          setGateInfo({ token, name: tokenName, minBalance: minBal > BigInt(0) ? formatUnits(minBal, 0) : '1' })
        }
      } catch {}
    }
    fetchGateInfo()
  }, [publicClient, parentTokenId])

  // When tx confirms, advance step
  useEffect(() => {
    if (txConfirmed && step === 'approving') {
      setStep('register')
      setTxHash(undefined)
    } else if (txConfirmed && step === 'registering') {
      setStep('done')
      setTxHash(undefined)
    }
  }, [txConfirmed, step])

  const isValidLabel = (l: string) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(l) && l.length >= 1

  // Check availability when label changes
  useEffect(() => {
    setSubAvailable(null)
    setQuote(null)
    setError('')
    if (!publicClient || !isValidLabel(subLabel)) return
    const timeout = setTimeout(async () => {
      try {
        // Compute subdomain tokenId: keccak256(abi.encodePacked(bytes32(parentId), keccak256(label)))
        const { keccak256: k, encodePacked: ep, toHex } = await import('viem')
        const labelHash = k(ep(['string'], [subLabel]))
        const subTokenId = k(ep(['bytes32', 'bytes32'], [toHex(parentTokenId, { size: 32 }), labelHash]))
        const record = await publicClient.readContract({
          address: CONTRACTS.mainnet.megaNames,
          abi: MEGA_NAMES_ABI,
          functionName: 'records',
          args: [BigInt(subTokenId)],
        })
        const [label] = record as [string, bigint, bigint, bigint, bigint]
        setSubAvailable(label === '')
      } catch {
        setSubAvailable(true) // assume available if lookup fails
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [subLabel, publicClient, parentTokenId])

  const handleQuote = useCallback(async () => {
    if (!publicClient || !address || !isValidLabel(subLabel)) return
    setError('')
    setStep('quoting')
    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.mainnet.subdomainRouter,
        abi: SUBDOMAIN_ROUTER_ABI,
        functionName: 'quote',
        args: [parentTokenId, subLabel, address],
      })
      const [allowed, price, , total] = result as [boolean, bigint, bigint, bigint]
      if (!allowed) {
        setError(gateInfo
          ? `Not allowed — requires holding ${gateInfo.name}`
          : 'Not allowed — you may not meet token gate requirements')
        setStep('input')
        return
      }
      setQuote({ allowed, price, total })
      // Check USDM balance
      const balance = await publicClient.readContract({
        address: CONTRACTS.mainnet.usdm,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      }) as bigint
      if (balance < total) {
        setError(`Insufficient USDM — need $${formatUnits(total, 18)}, have $${parseFloat(formatUnits(balance, 18)).toFixed(2)}`)
        setStep('input')
        return
      }
      // Check allowance
      const allowance = await publicClient.readContract({
        address: CONTRACTS.mainnet.usdm,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, CONTRACTS.mainnet.subdomainRouter],
      }) as bigint
      setStep(allowance >= total ? 'register' : 'approve')
    } catch (err: any) {
      setError(err.shortMessage || err.message || 'Quote failed')
      setStep('input')
    }
  }, [publicClient, address, subLabel, parentTokenId, gateInfo])

  const handleApprove = async () => {
    if (!quote) return
    setStep('approving')
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.mainnet.usdm,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.mainnet.subdomainRouter, quote.total],
      })
      setTxHash(hash)
    } catch (err: any) {
      setError(err.shortMessage || err.message || 'Approval failed')
      setStep('approve')
    }
  }

  const handleRegister = async () => {
    setStep('registering')
    setError('')
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.mainnet.subdomainRouter,
        abi: SUBDOMAIN_ROUTER_ABI,
        functionName: 'register',
        args: [parentTokenId, subLabel, '0x0000000000000000000000000000000000000000'],
      })
      setTxHash(hash)
    } catch (err: any) {
      setError(err.shortMessage || err.message || 'Registration failed')
      setStep('register')
    }
  }

  if (step === 'done') {
    return (
      <div className="mt-3 p-4 border border-green-300 bg-green-50">
        <div className="flex items-center gap-2 text-green-700">
          <Check className="w-4 h-4" />
          <span className="text-sm font-label">{subLabel}.{parentName}.mega registered!</span>
        </div>
        <Link href="/my-names" className="text-xs text-green-700 underline mt-1 inline-block">
          view in my names →
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-3 p-4 border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-label text-[var(--muted)] uppercase tracking-wider">purchase subdomain</p>
        {mode === 1 && gateInfo && (
          <p className="text-xs text-[var(--muted)]">
            requires: <a href={`https://mega.etherscan.io/address/${gateInfo.token}`} target="_blank" rel="noopener noreferrer" className="text-[var(--foreground)] hover:underline">{gateInfo.name}</a>
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <div className="flex flex-1 min-w-0">
          <input
            type="text"
            value={subLabel}
            onChange={(e) => { setSubLabel(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setStep('input') }}
            placeholder="yourname"
            className="flex-1 min-w-0 px-3 py-2 text-sm border border-[var(--border)] border-r-0 bg-[var(--background)]"
            disabled={step !== 'input' && step !== 'approve' && step !== 'register'}
          />
          <span className="px-2 py-2 text-sm text-[var(--muted)] border border-l-0 border-[var(--border)] bg-[var(--background)] whitespace-nowrap">
            .{parentName}.mega
          </span>
        </div>
        {step === 'input' && (
          <button
            onClick={handleQuote}
            disabled={!isConnected || !isValidLabel(subLabel) || subAvailable === false}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-40"
          >
            {!isConnected ? 'connect wallet' : subAvailable === false ? 'taken' : 'quote'}
          </button>
        )}
        {step === 'quoting' && (
          <button disabled className="btn-primary px-4 py-2 text-sm opacity-70">
            <Loader2 className="w-4 h-4 animate-spin" />
          </button>
        )}
        {step === 'approve' && (
          <button onClick={handleApprove} className="btn-primary px-4 py-2 text-sm">
            approve ${quote ? formatUnits(quote.total, 18) : ''}
          </button>
        )}
        {step === 'approving' && (
          <button disabled className="btn-primary px-4 py-2 text-sm opacity-70 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> approving
          </button>
        )}
        {step === 'register' && (
          <button onClick={handleRegister} className="btn-primary px-4 py-2 text-sm">
            register ${quote ? formatUnits(quote.total, 18) : ''}
          </button>
        )}
        {step === 'registering' && (
          <button disabled className="btn-primary px-4 py-2 text-sm opacity-70 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> registering
          </button>
        )}
      </div>
      {subLabel && isValidLabel(subLabel) && subAvailable !== null && (
        <p className={`text-xs mt-1.5 font-label ${subAvailable ? 'text-[#2d6b3f]' : 'text-[var(--muted)]'}`}>
          {subAvailable ? `● ${subLabel}.${parentName}.mega is available` : `○ ${subLabel}.${parentName}.mega is registered`}
        </p>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {quote && step !== 'input' && (
        <p className="text-xs text-[var(--muted)] mt-2">
          price: ${formatUnits(quote.price, 18)} USDM{quote.total > quote.price ? ` + ${formatUnits(quote.total - quote.price, 18)} fee` : ''}
        </p>
      )}
    </div>
  )
}

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

  // Subdomain sales info for taken names
  const { data: subConfig } = useReadContract({
    address: CONTRACTS.mainnet.subdomainRouter,
    abi: SUBDOMAIN_ROUTER_ABI,
    functionName: 'getConfig',
    args: [tokenId],
    query: { enabled: !!isTaken },
  })

  const { data: subPrice } = useReadContract({
    address: CONTRACTS.mainnet.subdomainLogic,
    abi: SUBDOMAIN_LOGIC_ABI,
    functionName: 'prices',
    args: [tokenId],
    query: { enabled: !!isTaken },
  })

  const subEnabled = subConfig ? (subConfig as [string, boolean, number])[1] : false
  const subPriceFormatted = subPrice && (subPrice as bigint) > BigInt(0)
    ? formatUnits(subPrice as bigint, 18)
    : null

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
                        {isTaken && subEnabled && (
                          <p className="mt-2 text-xs font-label tracking-wider uppercase text-green-700">
                            subdomain sales active{subPriceFormatted ? ` — $${subPriceFormatted}/sub` : ''}
                          </p>
                        )}
                      </div>
                      {isTaken && subEnabled && subPriceFormatted && (
                        <div className="text-right">
                          <p className="font-label text-[var(--muted)] text-[0.6rem]">price/sub</p>
                          <p className="font-display text-2xl text-[var(--foreground)]">${subPriceFormatted}</p>
                        </div>
                      )}
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
                    {isTaken && subEnabled && (
                      <SubdomainPurchase parentName={searchedName} parentTokenId={tokenId} />
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
            <div className="panel p-4 sm:p-6 overflow-hidden">
              <p className="font-label text-[var(--muted)] mb-2">total registered</p>
              <p className="font-display text-xl sm:text-3xl lg:text-5xl text-[var(--foreground)] truncate">
                {statsLoading ? '—' : namesRegistered.toLocaleString()}
              </p>
            </div>
            <div className="panel p-4 sm:p-6 overflow-hidden">
              <p className="font-label text-[var(--muted)] mb-2">total purchased</p>
              <p className="font-display text-xl sm:text-3xl lg:text-5xl text-[var(--foreground)] truncate">
                {statsLoading ? '—' : formatUSDM(totalVolume)}
              </p>
            </div>
            <div className="panel p-4 sm:p-6 overflow-hidden">
              <p className="font-label text-[var(--muted)] mb-2">chain</p>
              <p className="font-display text-xl sm:text-3xl lg:text-5xl text-[var(--foreground)] truncate">MEGAETH</p>
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
