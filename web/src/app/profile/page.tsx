'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePublicClient } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI } from '@/lib/contracts'
import { getTokenId } from '@/lib/utils'
import { ArrowLeft, ExternalLink, Copy, Check, MapPin, Globe, Twitter, Loader2 } from 'lucide-react'
import Link from 'next/link'

type ProfileName = {
  tokenId: bigint
  label: string
  parent: bigint
  expiresAt: number
  isPrimary: boolean
  forwardAddr: string | null
  parentLabel?: string
}

type TextRecords = {
  avatar: string
  url: string
  twitter: string
  description: string
  discord: string
  telegram: string
  github: string
  email: string
}

const TEXT_KEYS = ['avatar', 'url', 'twitter', 'description', 'discord', 'telegram', 'github', 'email'] as const

function ProfileContent() {
  const searchParams = useSearchParams()
  const rawAddress = searchParams.get('a') || searchParams.get('address') || ''
  const publicClient = usePublicClient()
  
  const [loading, setLoading] = useState(true)
  const [names, setNames] = useState<ProfileName[]>([])
  const [primaryName, setPrimaryName] = useState<string | null>(null)
  const [textRecords, setTextRecords] = useState<TextRecords | null>(null)
  const [copied, setCopied] = useState(false)
  const [resolvedAddress, setResolvedAddress] = useState<`0x${string}` | null>(null)

  // Resolve input to address
  useEffect(() => {
    if (!publicClient || !rawAddress) { setLoading(false); return }
    
    const resolve = async () => {
      if (rawAddress.startsWith('0x') && rawAddress.length === 42) {
        setResolvedAddress(rawAddress as `0x${string}`)
        return
      }
      
      const label = rawAddress.toLowerCase().replace(/\.mega$/, '')
      try {
        const tokenId = getTokenId(label)
        const record = await publicClient.readContract({
          address: CONTRACTS.mainnet.megaNames,
          abi: MEGA_NAMES_ABI,
          functionName: 'records',
          args: [tokenId],
        })
        if (record && record[0] !== '') {
          const owner = await publicClient.readContract({
            address: CONTRACTS.mainnet.megaNames,
            abi: MEGA_NAMES_ABI,
            functionName: 'ownerOf',
            args: [tokenId],
          })
          setResolvedAddress(owner)
        } else {
          setLoading(false)
        }
      } catch {
        setLoading(false)
      }
    }
    resolve()
  }, [rawAddress, publicClient])

  // Load profile data
  useEffect(() => {
    if (!resolvedAddress || !publicClient) return
    
    const load = async () => {
      setLoading(true)
      try {
        const primary = await publicClient.readContract({
          address: CONTRACTS.mainnet.megaNames,
          abi: MEGA_NAMES_ABI,
          functionName: 'getName',
          args: [resolvedAddress],
        })
        if (primary && primary !== '') setPrimaryName(primary)

        const tokenIds = await publicClient.readContract({
          address: CONTRACTS.mainnet.megaNames,
          abi: MEGA_NAMES_ABI,
          functionName: 'tokensOfOwner',
          args: [resolvedAddress],
        })

        const primaryTokenId = await publicClient.readContract({
          address: CONTRACTS.mainnet.megaNames,
          abi: MEGA_NAMES_ABI,
          functionName: 'primaryName',
          args: [resolvedAddress],
        })

        const nameData: ProfileName[] = []
        for (const tokenId of tokenIds) {
          const record = await publicClient.readContract({
            address: CONTRACTS.mainnet.megaNames,
            abi: MEGA_NAMES_ABI,
            functionName: 'records',
            args: [tokenId],
          })

          let parentLabel: string | undefined
          if (record[1] !== BigInt(0)) {
            try {
              const parentRecord = await publicClient.readContract({
                address: CONTRACTS.mainnet.megaNames,
                abi: MEGA_NAMES_ABI,
                functionName: 'records',
                args: [record[1]],
              })
              parentLabel = parentRecord[0]
            } catch {}
          }

          let forwardAddr: string | null = null
          try {
            const addr = await publicClient.readContract({
              address: CONTRACTS.mainnet.megaNames,
              abi: MEGA_NAMES_ABI,
              functionName: 'addr',
              args: [tokenId],
            })
            if (addr && addr !== '0x0000000000000000000000000000000000000000') {
              forwardAddr = addr
            }
          } catch {}

          nameData.push({
            tokenId,
            label: record[0],
            parent: record[1],
            expiresAt: Number(record[2]),
            isPrimary: tokenId === primaryTokenId,
            forwardAddr,
            parentLabel,
          })
        }

        nameData.sort((a, b) => {
          if (a.isPrimary) return -1
          if (b.isPrimary) return 1
          if (a.parent === BigInt(0) && b.parent !== BigInt(0)) return -1
          if (a.parent !== BigInt(0) && b.parent === BigInt(0)) return 1
          return a.label.localeCompare(b.label)
        })

        setNames(nameData)

        // Load text records from primary name
        const profileTokenId = primaryTokenId && primaryTokenId !== BigInt(0) 
          ? primaryTokenId 
          : tokenIds.length > 0 ? tokenIds[0] : null

        if (profileTokenId) {
          const records: Record<string, string> = {}
          for (const key of TEXT_KEYS) {
            try {
              const val = await publicClient.readContract({
                address: CONTRACTS.mainnet.megaNames,
                abi: MEGA_NAMES_ABI,
                functionName: 'text',
                args: [profileTokenId, key],
              })
              if (val && val !== '') records[key] = val
            } catch {}
          }
          if (Object.keys(records).length > 0) {
            setTextRecords(records as unknown as TextRecords)
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [resolvedAddress, publicClient])

  const displayName = primaryName ? `${primaryName}.mega` : resolvedAddress ? `${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)}` : rawAddress
  const fullDisplayName = (n: ProfileName) => {
    if (n.parent === BigInt(0)) return `${n.label}.mega`
    return `${n.label}.${n.parentLabel || '?'}.mega`
  }

  const copyAddress = () => {
    if (resolvedAddress) {
      navigator.clipboard.writeText(resolvedAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const now = Math.floor(Date.now() / 1000)

  if (!rawAddress) {
    return (
      <div className="min-h-[calc(100vh-64px)]">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="font-label text-sm text-[var(--muted)]">NO ADDRESS PROVIDED</p>
          <Link href="/" className="btn-secondary inline-block mt-4 px-6 py-3">BACK TO SEARCH</Link>
        </div>
      </div>
    )
  }

  if (!resolvedAddress && !loading) {
    return (
      <div className="min-h-[calc(100vh-64px)]">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="font-label text-sm text-[var(--muted)]">ADDRESS NOT FOUND</p>
          <Link href="/" className="btn-secondary inline-block mt-4 px-6 py-3">BACK TO SEARCH</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--muted-dark)] hover:text-black mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-label text-sm">BACK</span>
        </Link>

        {loading ? (
          <div className="border border-[var(--border)] p-12 text-center">
            <div className="w-8 h-8 border-2 border-[var(--foreground)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-label text-sm text-[var(--muted)]">LOADING PROFILE...</p>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="border border-[var(--border)] mb-6">
              <div className="p-8">
                <div className="flex items-start gap-5">
                  {textRecords?.avatar ? (
                    <img src={textRecords.avatar} alt="" className="w-16 h-16 object-cover border border-[var(--border)]" />
                  ) : (
                    <div className="w-16 h-16 bg-[var(--border)] flex items-center justify-center flex-shrink-0">
                      <span className="font-display text-2xl text-[var(--muted-dark)]">
                        {(primaryName || rawAddress)[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h1 className="font-display text-3xl sm:text-4xl truncate">{displayName}</h1>
                    {resolvedAddress && (
                      <button onClick={copyAddress} className="flex items-center gap-1.5 mt-1 text-[var(--muted-dark)] hover:text-[var(--foreground)] transition-colors">
                        <span className="font-mono text-sm">{resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}</span>
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {textRecords?.description && (
                  <p className="text-[var(--muted-dark)] text-sm mt-4 leading-relaxed">{textRecords.description}</p>
                )}

                {textRecords && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    {textRecords.twitter && (
                      <a href={`https://x.com/${textRecords.twitter}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] text-sm text-[var(--muted-dark)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30 transition-colors">
                        <Twitter className="w-3.5 h-3.5" />
                        @{textRecords.twitter}
                      </a>
                    )}
                    {textRecords.url && (
                      <a href={textRecords.url.startsWith('http') ? textRecords.url : `https://${textRecords.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] text-sm text-[var(--muted-dark)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30 transition-colors">
                        <Globe className="w-3.5 h-3.5" />
                        {textRecords.url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    {textRecords.discord && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] text-sm text-[var(--muted-dark)]">
                        Discord: {textRecords.discord}
                      </span>
                    )}
                    {textRecords.telegram && (
                      <a href={`https://t.me/${textRecords.telegram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] text-sm text-[var(--muted-dark)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30 transition-colors">
                        Telegram: @{textRecords.telegram}
                      </a>
                    )}
                    {textRecords.github && (
                      <a href={`https://github.com/${textRecords.github}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] text-sm text-[var(--muted-dark)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30 transition-colors">
                        GitHub: {textRecords.github}
                      </a>
                    )}
                    {textRecords.email && (
                      <a href={`mailto:${textRecords.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] text-sm text-[var(--muted-dark)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30 transition-colors">
                        {textRecords.email}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {resolvedAddress && (
                <div className="border-t border-[var(--border)] px-8 py-3 flex justify-end">
                  <a
                    href={`https://mega.etherscan.io/address/${resolvedAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    View on Explorer <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Names */}
            <div className="border border-[var(--border)]">
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <p className="font-label text-sm text-[var(--muted)]">
                  NAMES ({names.length})
                </p>
              </div>
              {names.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[var(--muted)]">No .mega names</p>
                </div>
              ) : (
                <div>
                  {names.map((n) => {
                    const isSubdomain = n.parent !== BigInt(0)
                    const isExpired = !isSubdomain && n.expiresAt < now
                    const expiresDate = !isSubdomain ? new Date(n.expiresAt * 1000) : null
                    const yearsLeft = expiresDate ? ((n.expiresAt - now) / (365.25 * 86400)) : 0

                    return (
                      <div key={n.tokenId.toString()} className="px-6 py-4 border-b border-[var(--border)] last:border-b-0 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm truncate">{fullDisplayName(n)}</span>
                            {n.isPrimary && (
                              <span className="px-2 py-0.5 bg-[var(--foreground)] text-[var(--background)] font-label text-[0.5rem] tracking-wider flex-shrink-0">PRIMARY</span>
                            )}
                            {isSubdomain && (
                              <span className="px-2 py-0.5 border border-[var(--border)] font-label text-[0.5rem] text-[var(--muted)] tracking-wider flex-shrink-0">SUBDOMAIN</span>
                            )}
                            {isExpired && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-600 font-label text-[0.5rem] tracking-wider flex-shrink-0">EXPIRED</span>
                            )}
                          </div>
                          {n.forwardAddr && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3 text-[var(--muted)]" />
                              <span className="font-mono text-xs text-[var(--muted)]">{n.forwardAddr.slice(0, 6)}...{n.forwardAddr.slice(-4)}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {expiresDate && !isExpired && (
                            <p className="font-label text-[0.6rem] text-[var(--muted)]">
                              {expiresDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ({yearsLeft.toFixed(1)} yr)
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  )
}
