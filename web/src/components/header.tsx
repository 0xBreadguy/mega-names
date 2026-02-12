'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useResolvedName } from '@/lib/hooks'
import { CONTRACTS, ERC20_ABI, MEGA_NAMES_ABI } from '@/lib/contracts'
import { formatUnits } from 'viem'
import { Loader2, Copy, Check, ChevronDown, LogOut, Shield, Wallet } from 'lucide-react'

export function Header() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const { displayName, isLoading, hasMegaName } = useResolvedName(address)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const MEGAETH_CHAIN_ID = 4326
  const isWrongChain = isConnected && chainId !== MEGAETH_CHAIN_ID

  // USDM balance
  const { data: usdmBalance } = useReadContract({
    address: CONTRACTS.mainnet.usdm,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // USDM allowance for MegaNames contract
  const { data: usdmAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.mainnet.usdm,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.mainnet.megaNames] : undefined,
    query: { enabled: !!address },
  })

  // Revoke approval
  const { writeContract: revokeApproval, data: revokeTxHash, isPending: isRevoking } = useWriteContract()
  const { isSuccess: revokeConfirmed } = useWaitForTransactionReceipt({ hash: revokeTxHash })

  useEffect(() => {
    if (revokeConfirmed) refetchAllowance()
  }, [revokeConfirmed, refetchAllowance])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const copyAddress = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const formattedBalance = usdmBalance !== undefined
    ? parseFloat(formatUnits(usdmBalance as bigint, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

  const formattedAllowance = usdmAllowance !== undefined
    ? (usdmAllowance as bigint) > BigInt('0xffffffffffffffffffffffffffffff')
      ? '∞'
      : parseFloat(formatUnits(usdmAllowance as bigint, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

  const hasAllowance = usdmAllowance !== undefined && (usdmAllowance as bigint) > BigInt(0)

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

          <div className="relative" ref={dropdownRef}>
            {isConnected && isWrongChain ? (
              <button
                onClick={() => switchChain({ chainId: MEGAETH_CHAIN_ID })}
                className="px-3 py-1.5 border border-orange-400 text-xs font-mono uppercase tracking-wider text-orange-600 hover:bg-orange-50 transition-all"
              >
                switch network
              </button>
            ) : isConnected ? (
              <>
                <button
                  onClick={() => setOpen(!open)}
                  className={`px-3 py-1.5 border text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    hasMegaName
                      ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
                      : 'border-[var(--border)] text-[var(--foreground)] hover:border-[var(--foreground)]'
                  }`}
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : displayName}
                  <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-72 border border-[var(--border)] bg-[var(--background)] shadow-lg z-50">
                    {/* Address */}
                    <div className="p-3 border-b border-[var(--border)]">
                      <div className="font-label text-[10px] text-[var(--muted)] mb-1">ADDRESS</div>
                      <button
                        onClick={copyAddress}
                        className="flex items-center gap-2 w-full group"
                      >
                        <span className="font-mono text-xs text-[var(--foreground)] truncate">
                          {address}
                        </span>
                        {copied ? (
                          <Check className="w-3 h-3 text-green-600 shrink-0" />
                        ) : (
                          <Copy className="w-3 h-3 text-[var(--muted)] group-hover:text-[var(--foreground)] shrink-0" />
                        )}
                      </button>
                    </div>

                    {/* Balance */}
                    <div className="p-3 border-b border-[var(--border)]">
                      <div className="font-label text-[10px] text-[var(--muted)] mb-1 flex items-center gap-1">
                        <Wallet className="w-3 h-3" /> BALANCE
                      </div>
                      <div className="font-mono text-sm text-[var(--foreground)]">
                        {formattedBalance} <span className="text-[var(--muted)]">USDM</span>
                      </div>
                    </div>

                    {/* Approvals */}
                    <div className="p-3 border-b border-[var(--border)]">
                      <div className="font-label text-[10px] text-[var(--muted)] mb-1.5 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> APPROVALS
                      </div>
                      {hasAllowance ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono text-xs text-[var(--foreground)]">
                              MegaNames
                            </div>
                            <div className="font-mono text-[10px] text-[var(--muted)]">
                              {formattedAllowance} USDM
                            </div>
                          </div>
                          <button
                            onClick={() => revokeApproval({
                              address: CONTRACTS.mainnet.usdm,
                              abi: ERC20_ABI,
                              functionName: 'approve',
                              args: [CONTRACTS.mainnet.megaNames, BigInt(0)],
                            })}
                            disabled={isRevoking}
                            className="px-2 py-1 text-[10px] font-label border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {isRevoking ? 'revoking...' : 'revoke'}
                          </button>
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-[var(--muted)]">
                          No active approvals
                        </div>
                      )}
                    </div>

                    {/* Disconnect */}
                    <button
                      onClick={() => { disconnect(); setOpen(false) }}
                      className="w-full p-3 flex items-center gap-2 text-xs font-label text-[var(--muted)] hover:text-red-600 hover:bg-red-50/50 transition-colors"
                    >
                      <LogOut className="w-3 h-3" />
                      disconnect
                    </button>
                  </div>
                )}
              </>
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
