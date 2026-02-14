'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { useReadContract } from 'wagmi'
import { encodeFunctionData, isAddress, parseUnits, formatUnits, type Hash, erc20Abi } from 'viem'
import { CONTRACTS, MEGA_NAMES_ABI, SUBDOMAIN_ROUTER_ABI, SUBDOMAIN_LOGIC_ABI, ERC20_ABI } from '@/lib/contracts'
import { shortenAddress, formatUSDM, getPrice, calculateFee, getDiscountLabel } from '@/lib/utils'
import { useMegaName, useResolveMegaName } from '@/lib/hooks'
import { Loader2, ArrowLeft, ExternalLink, Send, X, Check, Star, FolderTree, ChevronDown, ChevronUp, MapPin, RefreshCw, UserCircle, Trash2, Globe, Tag } from 'lucide-react'
import Link from 'next/link'
import { Tooltip } from '@/components/tooltip'

const MEGAETH_CHAIN_ID = 4326

interface OwnedName {
  tokenId: bigint
  label: string
  expiresAt: bigint
  parent: bigint
  isSubdomain: boolean
  parentLabel?: string
  subdomains?: OwnedName[]
}

// Build full display name for any OwnedName
function getFullName(n: OwnedName): string {
  if (n.isSubdomain && n.parentLabel) return `${n.label}.${n.parentLabel}.mega`
  return `${n.label}.mega`
}

// Modal wrapper component
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-light)] border border-[var(--border)] max-w-md w-full shadow-[0_8px_30px_rgba(25,25,26,0.12),0_2px_8px_rgba(25,25,26,0.06)]">
        {children}
      </div>
    </div>
  )
}

// Transfer Modal
interface TransferModalProps {
  name: OwnedName
  onClose: () => void
  onSuccess: () => void
  address: `0x${string}`
}

function TransferModal({ name, onClose, onSuccess, address }: TransferModalProps) {
  const [recipient, setRecipient] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<Hash | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  // Check if input is an address or a name
  const isAddressInput = recipient.startsWith('0x')
  
  // Resolve recipient's mega name (when input is an address)
  const { name: recipientMegaName } = useMegaName(
    isAddressInput && isAddress(recipient) ? recipient as `0x${string}` : undefined
  )
  
  // Resolve name to address (when input is a name like "elden.mega")
  const { address: resolvedFromName, label: resolvedLabel, isLoading: isResolvingName, isOwnerFallback } = useResolveMegaName(
    !isAddressInput ? recipient : ''
  )

  // Determine the final recipient address
  const finalRecipientAddress = isAddressInput 
    ? (isAddress(recipient) ? recipient as `0x${string}` : null)
    : resolvedFromName
    
  const isValidRecipient = finalRecipientAddress && finalRecipientAddress.toLowerCase() !== address.toLowerCase()
  const displayName = name.isSubdomain ? `${name.label}.${name.parentLabel || '?'}.mega` : `${name.label}.mega`

  const handleTransfer = async () => {
    if (!walletClient || !publicClient || !isValidRecipient || !finalRecipientAddress) return
    
    setError(null)
    setIsPending(true)

    try {
      const data = encodeFunctionData({
        abi: MEGA_NAMES_ABI,
        functionName: 'transferFrom',
        args: [address, finalRecipientAddress, name.tokenId],
      })

      const hash = await walletClient.sendTransaction({
        to: CONTRACTS.mainnet.megaNames,
        data,
        chain: {
          id: MEGAETH_CHAIN_ID,
          name: 'MegaETH',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://mainnet.megaeth.com/rpc'] } },
        },
      })

      setTxHash(hash)

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 30_000,
      })

      if (receipt.status === 'success') {
        setIsSuccess(true)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 2000)
      } else {
        setError('Transfer failed')
      }
    } catch (err: any) {
      console.error('Transfer error:', err)
      setError(err.shortMessage || err.message || 'Transfer failed')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="font-display text-2xl">TRANSFER NAME</h2>
        <button onClick={onClose} className="p-1 hover:bg-[var(--surface-hover)]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6">
        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500 flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <p className="font-label text-sm mb-2">TRANSFER COMPLETE!</p>
            <p className="text-[var(--muted)]">{displayName} has been transferred</p>
            {txHash && (
              <a
                href={`https://mega.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-4 inline-block"
              >
                View on Explorer →
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="font-label text-xs text-[var(--muted)] mb-2">TRANSFERRING</p>
              <p className="font-display text-3xl truncate">{displayName}</p>
            </div>

            <div className="mb-6">
              <label className="font-label text-xs text-[var(--muted)] mb-2 block">
                RECIPIENT (ADDRESS OR .MEGA NAME)
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x... or name.mega"
                className="w-full p-3 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                disabled={isPending}
                autoFocus
              />
              {/* Address input validation */}
              {isAddressInput && recipient && !isAddress(recipient) && (
                <p className="text-red-600 text-xs mt-1">Invalid address</p>
              )}
              {isAddressInput && finalRecipientAddress?.toLowerCase() === address.toLowerCase() && (
                <p className="text-red-600 text-xs mt-1">Cannot transfer to yourself</p>
              )}
              {isAddressInput && recipientMegaName && isValidRecipient && (
                <p className="text-[#2d6b3f] text-xs mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {recipientMegaName}
                </p>
              )}
              {/* Name input resolution */}
              {!isAddressInput && recipient && (
                <>
                  {isResolvingName ? (
                    <p className="text-[var(--muted)] text-xs mt-1 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Resolving {resolvedLabel}.mega...
                    </p>
                  ) : resolvedFromName ? (
                    <p className="text-[#2d6b3f] text-xs mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> {resolvedLabel}.mega → {resolvedFromName.slice(0, 6)}...{resolvedFromName.slice(-4)}
                      {isOwnerFallback && <span className="text-[var(--muted)]">(owner)</span>}
                    </p>
                  ) : resolvedLabel ? (
                    <p className="text-red-600 text-xs mt-1">{resolvedLabel}.mega not found</p>
                  ) : (
                    <p className="text-red-600 text-xs mt-1">Invalid name format</p>
                  )}
                  {resolvedFromName?.toLowerCase() === address.toLowerCase() && (
                    <p className="text-red-600 text-xs mt-1">Cannot transfer to yourself</p>
                  )}
                </>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-400">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="p-4 bg-yellow-50 border-2 border-yellow-400 mb-6">
              <p className="text-sm text-yellow-800">
                {name.isSubdomain 
                  ? 'The parent name owner can revoke this subdomain after transfer.'
                  : 'This action is irreversible. Make sure the recipient address is correct.'}
              </p>
            </div>
          </>
        )}
      </div>

      {!isSuccess && (
        <button
          onClick={handleTransfer}
          disabled={!isValidRecipient || isPending}
          className="btn-primary w-full py-4 text-lg font-label disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              TRANSFERRING...
            </>
          ) : (
            'CONFIRM TRANSFER'
          )}
        </button>
      )}
    </Modal>
  )
}

// Create Subdomain Modal
interface SubdomainModalProps {
  parentName: OwnedName
  onClose: () => void
  onSuccess: () => void
}

function SubdomainModal({ parentName, onClose, onSuccess }: SubdomainModalProps) {
  const [label, setLabel] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<Hash | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const isValidLabel = label.length > 0 && /^[a-z0-9-]+$/.test(label)
  const parentFullName = getFullName(parentName)
  const fullName = `${label}.${parentFullName}`

  const handleCreate = async () => {
    if (!walletClient || !publicClient || !isValidLabel) return
    
    setError(null)
    setIsPending(true)

    try {
      const data = encodeFunctionData({
        abi: MEGA_NAMES_ABI,
        functionName: 'registerSubdomain',
        args: [parentName.tokenId, label],
      })

      const hash = await walletClient.sendTransaction({
        to: CONTRACTS.mainnet.megaNames,
        data,
        chain: {
          id: MEGAETH_CHAIN_ID,
          name: 'MegaETH',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://mainnet.megaeth.com/rpc'] } },
        },
      })

      setTxHash(hash)

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 30_000,
      })

      if (receipt.status === 'success') {
        setIsSuccess(true)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 2000)
      } else {
        setError('Failed to create subdomain')
      }
    } catch (err: any) {
      console.error('Subdomain error:', err)
      setError(err.shortMessage || err.message || 'Failed to create subdomain')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="font-display text-2xl">CREATE SUBDOMAIN</h2>
        <button onClick={onClose} className="p-1 hover:bg-[var(--surface-hover)]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6">
        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500 flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <p className="font-label text-sm mb-2">SUBDOMAIN CREATED!</p>
            <p className="text-[var(--muted)]">{fullName}</p>
            {txHash && (
              <a
                href={`https://mega.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-4 inline-block"
              >
                View on Explorer →
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="font-label text-xs text-[var(--muted)] mb-2">PARENT NAME</p>
              <p className="font-display text-2xl">{parentFullName}</p>
            </div>

            <div className="mb-6">
              <label className="font-label text-xs text-[var(--muted)] mb-2 block">
                SUBDOMAIN LABEL
              </label>
              <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border)]">
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="subdomain"
                  className="flex-1 p-3 font-mono text-sm focus:outline-none"
                  disabled={isPending}
                  autoFocus
                />
                <span className="px-3 py-3 bg-[var(--surface)] border-l border-[var(--border)] text-sm text-[var(--muted)]">
                  .{parentFullName}
                </span>
              </div>
              {label && !isValidLabel && (
                <p className="text-red-600 text-xs mt-1">Only lowercase letters, numbers, and hyphens</p>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-400">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="p-4 bg-green-50 border-2 border-green-400 mb-6">
              <p className="text-sm text-green-800">
                Subdomains are free to create! You can transfer or sell them like any name.
              </p>
            </div>
          </>
        )}
      </div>

      {!isSuccess && (
        <button
          onClick={handleCreate}
          disabled={!isValidLabel || isPending}
          className="btn-primary w-full py-4 text-lg font-label disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              CREATING...
            </>
          ) : (
            'CREATE SUBDOMAIN'
          )}
        </button>
      )}
    </Modal>
  )
}

// Set Address Modal
interface SetAddrModalProps {
  name: OwnedName
  onClose: () => void
  onSuccess: () => void
  currentAddress?: string
}

function SetAddrModal({ name, onClose, onSuccess, currentAddress }: SetAddrModalProps) {
  const [targetAddress, setTargetAddress] = useState(currentAddress || '')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<Hash | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { address: userAddress } = useAccount()

  const isValidAddress = isAddress(targetAddress)
  const displayName = name.isSubdomain ? `${name.label}.${name.parentLabel || '?'}.mega` : `${name.label}.mega`

  const handleSetAddr = async () => {
    if (!walletClient || !publicClient || !isValidAddress) return
    
    setError(null)
    setIsPending(true)

    try {
      const data = encodeFunctionData({
        abi: MEGA_NAMES_ABI,
        functionName: 'setAddr',
        args: [name.tokenId, targetAddress as `0x${string}`],
      })

      const hash = await walletClient.sendTransaction({
        to: CONTRACTS.mainnet.megaNames,
        data,
        chain: {
          id: MEGAETH_CHAIN_ID,
          name: 'MegaETH',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://mainnet.megaeth.com/rpc'] } },
        },
      })

      setTxHash(hash)

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 30_000,
      })

      if (receipt.status === 'success') {
        setIsSuccess(true)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 2000)
      } else {
        setError('Transaction failed')
      }
    } catch (err: any) {
      console.error('SetAddr error:', err)
      setError(err.shortMessage || err.message || 'Failed to set address')
    } finally {
      setIsPending(false)
    }
  }

  const handleUseMyAddress = () => {
    if (userAddress) {
      setTargetAddress(userAddress)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="font-display text-2xl">FORWARD TO</h2>
        <button onClick={onClose} className="p-1 hover:bg-[var(--surface-hover)]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6">
        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500 flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <p className="font-label text-sm mb-2">ADDRESS SET!</p>
            <p className="text-[var(--muted)]">{displayName} now resolves to</p>
            <p className="font-mono text-sm mt-1">{targetAddress.slice(0, 10)}...{targetAddress.slice(-8)}</p>
            {txHash && (
              <a
                href={`https://mega.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-4 inline-block"
              >
                View on Explorer →
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="font-label text-xs text-[var(--muted)] mb-2">NAME</p>
              <p className="font-display text-2xl truncate">{displayName}</p>
            </div>

            <div className="mb-4">
              <label className="font-label text-xs text-[var(--muted)] mb-2 block">
                RESOLVES TO
              </label>
              <input
                type="text"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-3 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                disabled={isPending}
                autoFocus
              />
              {targetAddress && !isValidAddress && (
                <p className="text-red-600 text-xs mt-1">Invalid address</p>
              )}
            </div>

            <button
              onClick={handleUseMyAddress}
              className="text-sm text-blue-600 hover:underline mb-6 block"
            >
              Use my address ({userAddress?.slice(0, 6)}...{userAddress?.slice(-4)})
            </button>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-400">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="p-4 bg-blue-50 border-2 border-blue-400 mb-6">
              <p className="text-sm text-blue-800">
                This sets where {displayName} resolves to. You can point it to any address — a wallet, multisig, or contract.
              </p>
            </div>
          </>
        )}
      </div>

      {!isSuccess && (
        <button
          onClick={handleSetAddr}
          disabled={!isValidAddress || isPending}
          className="btn-primary w-full py-4 text-lg font-label disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              SETTING...
            </>
          ) : (
            'FORWARD TO'
          )}
        </button>
      )}
    </Modal>
  )
}

// Renew Modal
interface RenewModalProps {
  name: OwnedName
  onClose: () => void
  onSuccess: () => void
}

function RenewModal({ name, onClose, onSuccess }: RenewModalProps) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<Hash | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [step, setStep] = useState<'approve' | 'renew'>('approve')
  const [numYears, setNumYears] = useState(1)
  
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const pricePerYear = getPrice(name.label.length)
  const price = calculateFee(name.label.length, numYears)
  const discountLabel = getDiscountLabel(numYears)
  const displayName = `${name.label}.mega`

  // Check existing USDM allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.mainnet.usdm,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address!, CONTRACTS.mainnet.megaNames],
    query: { enabled: !!address, staleTime: 0 },
  })

  const hasAllowance = allowance && allowance >= price

  // Set initial step based on allowance
  useEffect(() => {
    if (hasAllowance) {
      setStep('renew')
    }
  }, [hasAllowance])

  const handleApprove = async () => {
    if (!walletClient || !publicClient) return
    
    setError(null)
    setIsPending(true)

    try {
      const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACTS.mainnet.megaNames, MAX_UINT256],
      })

      const hash = await walletClient.sendTransaction({
        to: CONTRACTS.mainnet.usdm,
        data,
        chain: {
          id: MEGAETH_CHAIN_ID,
          name: 'MegaETH',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://mainnet.megaeth.com/rpc'] } },
        },
      })

      await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 })
      await refetchAllowance()
      setStep('renew')
    } catch (err: any) {
      console.error('Approve error:', err)
      setError(err.shortMessage || err.message || 'Approval failed')
    } finally {
      setIsPending(false)
    }
  }

  const handleRenew = async () => {
    if (!walletClient || !publicClient) return
    
    setError(null)
    setIsPending(true)

    try {
      const data = encodeFunctionData({
        abi: MEGA_NAMES_ABI,
        functionName: 'renew',
        args: [name.tokenId, BigInt(numYears)],
      })

      const hash = await walletClient.sendTransaction({
        to: CONTRACTS.mainnet.megaNames,
        data,
        chain: {
          id: MEGAETH_CHAIN_ID,
          name: 'MegaETH',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://mainnet.megaeth.com/rpc'] } },
        },
      })

      setTxHash(hash)

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 30_000,
      })

      if (receipt.status === 'success') {
        setIsSuccess(true)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 2000)
      } else {
        setError('Renewal failed')
      }
    } catch (err: any) {
      console.error('Renew error:', err)
      setError(err.shortMessage || err.message || 'Renewal failed')
    } finally {
      setIsPending(false)
    }
  }

  const formatExpiry = (expiresAt: bigint) => {
    const date = new Date(Number(expiresAt) * 1000)
    const dateStr = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
    const yearsLeft = (Number(expiresAt) * 1000 - Date.now()) / (365.25 * 24 * 60 * 60 * 1000)
    const yr = yearsLeft > 0 ? `(${yearsLeft.toFixed(1)} yr)` : '(expired)'
    return `${dateStr} ${yr}`
  }

  const newExpiry = BigInt(Number(name.expiresAt) + 365 * 24 * 60 * 60 * numYears)

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="font-display text-2xl">RENEW NAME</h2>
        <button onClick={onClose} className="p-1 hover:bg-[var(--surface-hover)]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6">
        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500 flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <p className="font-label text-sm mb-2">RENEWED!</p>
            <p className="text-[var(--muted)]">{displayName} extended by {numYears} year{numYears > 1 ? 's' : ''}</p>
            <p className="text-sm text-[var(--muted)] mt-2">New expiry: {formatExpiry(newExpiry)}</p>
            {txHash && (
              <a
                href={`https://mega.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-4 inline-block"
              >
                View on Explorer →
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="font-label text-xs text-[var(--muted)] mb-2">RENEWING</p>
              <p className="font-display text-3xl truncate">{displayName}</p>
            </div>

            {/* Year selector */}
            <div className="mb-6">
              <p className="font-label text-xs text-[var(--muted)] mb-2">DURATION</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 5, 10].map((y) => (
                  <button
                    key={y}
                    onClick={() => setNumYears(y)}
                    className={`px-4 py-2 border-2 font-label text-sm transition-colors ${
                      numYears === y 
                        ? 'border-black bg-[var(--foreground)] text-[var(--background)]' 
                        : 'border-[var(--border)] hover:border-[var(--foreground)]'
                    }`}
                  >
                    {y}Y
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 p-4 bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="flex justify-between mb-2">
                <span className="text-[var(--muted)]">Current expiry</span>
                <span>{formatExpiry(name.expiresAt)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-[var(--muted)]">Extension</span>
                <span>+{numYears} year{numYears > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-[var(--border)] pt-2 mt-2">
                <span>New expiry</span>
                <span>{formatExpiry(newExpiry)}</span>
              </div>
            </div>

            <div className="mb-6 p-4 bg-[var(--surface)] border border-[var(--border)]">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-label text-sm">RENEWAL COST</span>
                  <p className="text-xs text-[var(--muted)]">{formatUSDM(pricePerYear)}/year × {numYears}</p>
                  {discountLabel && (
                    <p className="text-xs text-[#2d6b3f] font-bold">{discountLabel}</p>
                  )}
                </div>
                <div className="text-right">
                  {discountLabel && (
                    <span className="text-sm text-[var(--muted)] line-through block">{formatUSDM(pricePerYear * BigInt(numYears))}</span>
                  )}
                  <span className="font-display text-xl">{formatUSDM(price)}</span>
                </div>
              </div>
            </div>

            {/* Step indicator */}
            <div className="mb-6 flex items-center gap-4">
              <div className={`flex items-center gap-2 ${hasAllowance ? 'text-[#2d6b3f]' : 'text-black'}`}>
                <div className={`w-8 h-8 flex items-center justify-center border-2 ${hasAllowance ? 'border-green-600 bg-green-600 text-white' : 'border-black'}`}>
                  {hasAllowance ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <span className="font-label text-sm">APPROVE</span>
              </div>
              <div className="flex-1 h-0.5 bg-[var(--border)]" />
              <div className={`flex items-center gap-2 ${step === 'renew' ? 'text-black' : 'text-[var(--muted)]'}`}>
                <div className={`w-8 h-8 flex items-center justify-center border-2 ${step === 'renew' ? 'border-black' : 'border-[var(--border-light)]'}`}>
                  2
                </div>
                <span className="font-label text-sm">RENEW</span>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-400">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </>
        )}
      </div>

      {!isSuccess && (
        <button
          onClick={step === 'approve' ? handleApprove : handleRenew}
          disabled={isPending}
          className="btn-primary w-full py-4 text-lg font-label disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              {step === 'approve' ? 'APPROVING...' : 'RENEWING...'}
            </>
          ) : step === 'approve' ? (
            'APPROVE USDM'
          ) : (
            `RENEW FOR ${formatUSDM(price)}`
          )}
        </button>
      )}
    </Modal>
  )
}

// Warren NFT contract address
const WARREN_NFT_CONTRACT = '0xd1591a060BB8933869b16A248C77d1375389842B' as const
const WARREN_APP_URL = 'https://thewarren.app'
const WARREN_PROXY_URL = 'https://meganames-warren-proxy.0xbreadguy.workers.dev'

// Warren Contenthash Modal
interface WarrenModalProps {
  name: OwnedName
  onClose: () => void
  onSuccess: () => void
}

type WarrenView = 'menu' | 'namecard' | 'link'

function WarrenModal({ name, onClose, onSuccess }: WarrenModalProps) {
  const [view, setView] = useState<WarrenView>('menu')
  const [warrenTokenId, setWarrenTokenId] = useState('')
  const [isMaster, setIsMaster] = useState(true)
  const [contenthash, setContenthash] = useState('')
  const [contenthashParsed, setContenthashParsed] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<Hash | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [viewUrl, setViewUrl] = useState<string | null>(null)

  // Existing Warren state
  const [existingWarrenId, setExistingWarrenId] = useState<number | null>(null)
  const [checkingExisting, setCheckingExisting] = useState(true)

  // Namecard form state
  const [ncDisplayName, setNcDisplayName] = useState('')
  const [ncBio, setNcBio] = useState('')
  const [ncAvatar, setNcAvatar] = useState('')
  const [ncX, setNcX] = useState('')
  const [ncGithub, setNcGithub] = useState('')
  const [ncWebsite, setNcWebsite] = useState('')
  const [namecardStep, setNamecardStep] = useState<'form' | 'estimating' | 'paying' | 'deploying' | 'linking'>('form')
  const [feeEstimate, setFeeEstimate] = useState<{ totalWei: string; relayerAddress: string; gasCostEth: string } | null>(null)

  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const displayName = name.isSubdomain ? `${name.label}.${name.parentLabel || '?'}.mega` : `${name.label}.mega`
  const isValidTokenId = warrenTokenId !== '' && !isNaN(Number(warrenTokenId)) && Number(warrenTokenId) >= 0

  // Parse Warren contenthash: 0x00e9 + type byte (01=Master, 02=Container) + 4 byte tokenId
  const parseContenthash = (hash: string) => {
    setContenthash(hash)
    const h = hash.trim().toLowerCase()
    if (h.length >= 16 && h.startsWith('0x00e9')) {
      const typeByte = parseInt(h.slice(6, 8), 16)
      const tokenId = parseInt(h.slice(8, 16), 16)
      if ((typeByte === 1 || typeByte === 2) && tokenId > 0) {
        setIsMaster(typeByte === 1)
        setWarrenTokenId(String(tokenId))
        setContenthashParsed(true)
        return
      }
    }
    setContenthashParsed(false)
  }

  // Check for existing Warren contenthash on mount
  useEffect(() => {
    if (!publicClient) return
    const check = async () => {
      try {
        const result = await publicClient.readContract({
          address: CONTRACTS.mainnet.megaNames,
          abi: MEGA_NAMES_ABI,
          functionName: 'warren',
          args: [name.tokenId],
        }) as [number, boolean, boolean]
        const [wId, wIsMaster, wIsWarren] = result
        if (wIsWarren && wId > 0) {
          setExistingWarrenId(wId)
          setIsMaster(wIsMaster)
        }
      } catch { /* no warren set */ }
      setCheckingExisting(false)
    }
    check()
  }, [publicClient, name.tokenId])

  // Fetch text records to pre-fill namecard
  useEffect(() => {
    if (view !== 'namecard' || !publicClient) return
    const fetchRecords = async () => {
      const keys = ['avatar', 'url', 'description', 'com.twitter', 'com.github']
      for (const key of keys) {
        try {
          const val = await publicClient.readContract({
            address: CONTRACTS.mainnet.megaNames,
            abi: MEGA_NAMES_ABI,
            functionName: 'text',
            args: [name.tokenId, key],
          }) as string
          if (!val) continue
          if (key === 'avatar' && !ncAvatar) setNcAvatar(val)
          if (key === 'url' && !ncWebsite) setNcWebsite(val)
          if (key === 'description' && !ncBio) setNcBio(val)
          if (key === 'com.twitter' && !ncX) setNcX(val)
          if (key === 'com.github' && !ncGithub) setNcGithub(val)
        } catch { /* no record set */ }
      }
    }
    fetchRecords()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // Build namecard payload (reused across steps)
  const buildNamecardBody = (extra: Record<string, string> = {}) => ({
    name: displayName,
    displayName: ncDisplayName || name.label,
    bio: ncBio || '',
    avatar: ncAvatar || '',
    links: {
      ...(ncX ? { x: ncX } : {}),
      ...(ncGithub ? { github: ncGithub } : {}),
      ...(ncWebsite ? { website: ncWebsite } : {}),
    },
    ...extra,
  })

  // Estimate HTML size (rough) for fee estimation
  const estimateHtmlSize = () => {
    const body = buildNamecardBody()
    // Rough estimate: JSON size * 3 for HTML template expansion + base template ~2KB
    return Math.max(2048, JSON.stringify(body).length * 3 + 2048)
  }

  const handleDeployNamecard = async () => {
    if (!walletClient || !publicClient) return
    const address = walletClient.account.address
    setError(null)
    setIsPending(true)

    try {
      // Step 1: Estimate fee
      setNamecardStep('estimating')
      const estResp = await fetch(`${WARREN_PROXY_URL}/estimate-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size: estimateHtmlSize() }),
      })
      if (!estResp.ok) {
        const errData = await estResp.json().catch(() => ({}))
        throw new Error(errData.error || `Fee estimation failed (${estResp.status})`)
      }
      const fee = await estResp.json()
      setFeeEstimate(fee)

      // Step 2: User pays relayer
      setNamecardStep('paying')
      const payHash = await walletClient.sendTransaction({
        to: fee.relayerAddress as `0x${string}`,
        value: BigInt(fee.totalWei),
        chain: {
          id: MEGAETH_CHAIN_ID,
          name: 'MegaETH',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://mainnet.megaeth.com/rpc'] } },
        },
      })
      await publicClient.waitForTransactionReceipt({ hash: payHash, timeout: 30_000 })

      // Step 3: Deploy namecard with payment proof
      setNamecardStep('deploying')
      const resp = await fetch(`${WARREN_PROXY_URL}/deploy-namecard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildNamecardBody({
          senderAddress: address,
          paymentTxHash: payHash,
        })),
      })

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        throw new Error(errData.error || `Warren API error (${resp.status})`)
      }

      const data = await resp.json()
      const wTokenId = data.tokenId
      setWarrenTokenId(String(wTokenId))
      setViewUrl(`https://${displayName}.thewarren.app`)

      // Step 4: Link contenthash on-chain
      setNamecardStep('linking')
      const txData = encodeFunctionData({
        abi: MEGA_NAMES_ABI,
        functionName: 'setWarrenContenthash',
        args: [name.tokenId, wTokenId, true],
      })

      const hash = await walletClient.sendTransaction({
        to: CONTRACTS.mainnet.megaNames,
        data: txData,
        chain: {
          id: MEGAETH_CHAIN_ID,
          name: 'MegaETH',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://mainnet.megaeth.com/rpc'] } },
        },
      })

      setTxHash(hash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 })

      if (receipt.status === 'success') {
        setIsSuccess(true)
        setTimeout(() => { onSuccess(); onClose() }, 3000)
      } else {
        setError('On-chain linking failed')
      }
    } catch (err: any) {
      console.error('Namecard deploy error:', err)
      setError(err.shortMessage || err.message || 'Failed to create namecard')
      setNamecardStep('form')
      setFeeEstimate(null)
    } finally {
      setIsPending(false)
    }
  }

  const handleSetWarren = async () => {
    if (!walletClient || !publicClient || !isValidTokenId) return
    setError(null)
    setIsPending(true)

    try {
      const data = encodeFunctionData({
        abi: MEGA_NAMES_ABI,
        functionName: 'setWarrenContenthash',
        args: [name.tokenId, Number(warrenTokenId), isMaster],
      })

      const hash = await walletClient.sendTransaction({
        to: CONTRACTS.mainnet.megaNames,
        data,
        chain: {
          id: MEGAETH_CHAIN_ID,
          name: 'MegaETH',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://mainnet.megaeth.com/rpc'] } },
        },
      })

      setTxHash(hash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 })

      if (receipt.status === 'success') {
        setIsSuccess(true)
        setTimeout(() => { onSuccess(); onClose() }, 2000)
      } else {
        setError('Transaction failed')
      }
    } catch (err: any) {
      console.error('setWarrenContenthash error:', err)
      setError(err.shortMessage || err.message || 'Failed to set Warren site')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-center relative">
        <h2 className="font-display text-2xl text-center">WARREN ON-CHAIN SITE</h2>
        <button onClick={onClose} className="absolute right-6 p-1 hover:bg-[var(--surface-hover)]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6">
        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500 flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <p className="font-label text-sm mb-2">WARREN SITE LINKED</p>
            <p className="text-[var(--muted)]">{displayName} now points to Warren #{warrenTokenId}</p>
            {viewUrl && (
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-2 inline-block"
              >
                View namecard on Warren →
              </a>
            )}
            {txHash && (
              <a
                href={`https://mega.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--muted)] hover:underline mt-2 block"
              >
                View transaction →
              </a>
            )}
          </div>
        ) : checkingExisting ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[var(--muted)]" />
            <p className="text-sm text-[var(--muted)]">Checking Warren status...</p>
          </div>
        ) : existingWarrenId && view === 'menu' ? (
          <div className="text-center py-6">
            <Globe className="w-10 h-10 mx-auto mb-3 text-[var(--muted-dark)]" />
            <p className="font-label text-sm mb-1">WARREN SITE LINKED</p>
            <p className="text-[var(--muted)] text-sm mb-4">{displayName} → Warren #{existingWarrenId}</p>
            <a
              href={`https://${displayName}.thewarren.app`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 font-label mb-4"
            >
              VIEW NAMECARD
              <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-xs text-[var(--muted)] mb-1">
              {displayName}.thewarren.app
            </p>
            <div className="border-t border-[var(--border)] mt-6 pt-4 space-y-2">
              <button
                onClick={() => { setExistingWarrenId(null); setView('namecard') }}
                className="w-full text-sm text-[var(--muted-dark)] hover:text-[var(--foreground)] py-1"
              >
                Redeploy namecard
              </button>
              <button
                onClick={() => { setExistingWarrenId(null); setView('link') }}
                className="w-full text-sm text-[var(--muted)] hover:text-[var(--foreground)] py-1"
              >
                Link a different Warren NFT
              </button>
            </div>
          </div>
        ) : view === 'menu' ? (
          <>
            <div className="mb-6">
              <p className="font-label text-xs text-[var(--muted)] mb-2">NAME</p>
              <p className="font-display text-2xl mb-4">{displayName}</p>

              <div className="p-4 border border-[var(--border)] bg-[var(--surface-hover)] mb-4">
                <p className="text-sm text-[var(--muted)] mb-2 font-medium">
                  Warren is MegaETH&apos;s on-chain storage protocol. Host websites, namecards, and content permanently on-chain.
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Once linked, your name resolves at <strong>{name.label}.mega.thewarren.app</strong>
                </p>
              </div>
            </div>

            {/* Option 1: Create Namecard */}
            <button
              onClick={() => setView('namecard')}
              className="btn-primary w-full py-4 text-lg font-label flex items-center justify-center gap-2 mb-3"
            >
              CREATE NAMECARD
            </button>
            <p className="text-center text-xs text-[var(--muted)] mb-5">
              Auto-generate an on-chain profile card from your name&apos;s records
            </p>

            {/* Option 2: Create on Warren directly */}
            <a
              href={WARREN_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 text-sm font-label flex items-center justify-center gap-2 border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors mb-3"
            >
              BUILD ON WARREN
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Option 3: Link existing */}
            <button
              onClick={() => setView('link')}
              className="w-full text-center text-sm text-[var(--muted)] hover:text-black py-2"
            >
              I already have a Warren NFT →
            </button>
          </>

        ) : view === 'namecard' ? (
          <>
            <button
              onClick={() => { setView('menu'); setError(null) }}
              className="text-sm text-[var(--muted)] hover:text-black flex items-center gap-1 mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <p className="font-label text-xs text-[var(--muted)] mb-1">NAMECARD FOR</p>
            <p className="font-display text-xl mb-4 truncate">{displayName}</p>

            {namecardStep !== 'form' ? (
              <div className="py-6">
                {/* Stepper */}
                <div className="flex items-center justify-between mb-6 px-2">
                  {(['estimating', 'paying', 'deploying', 'linking'] as const).map((step, i) => {
                    const labels = ['Estimate', 'Pay', 'Deploy', 'Link']
                    const steps = ['estimating', 'paying', 'deploying', 'linking'] as const
                    const currentIdx = steps.indexOf(namecardStep)
                    const isDone = i < currentIdx
                    const isCurrent = i === currentIdx
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-label mb-1 ${
                            isDone ? 'bg-[var(--foreground)] text-[var(--background)]' :
                            isCurrent ? 'border-2 border-[var(--foreground)] text-[var(--foreground)]' :
                            'border border-[var(--border)] text-[var(--muted)]'
                          }`}>
                            {isDone ? <Check className="w-3 h-3" /> : i + 1}
                          </div>
                          <span className={`text-[10px] font-label ${isCurrent ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}>
                            {labels[i]}
                          </span>
                        </div>
                        {i < 3 && <div className={`h-px flex-1 mx-1 mb-4 ${isDone ? 'bg-[var(--foreground)]' : 'bg-[var(--border)]'}`} />}
                      </div>
                    )
                  })}
                </div>

                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-[var(--muted)]" />
                  <p className="font-label text-sm">
                    {namecardStep === 'estimating' && 'Estimating deployment cost...'}
                    {namecardStep === 'paying' && `Pay ${feeEstimate?.gasCostEth || '...'} ETH for on-chain storage`}
                    {namecardStep === 'deploying' && 'Deploying to Warren...'}
                    {namecardStep === 'linking' && `Linking to ${displayName}...`}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {namecardStep === 'estimating' && 'Calculating storage costs'}
                    {namecardStep === 'paying' && 'Confirm the payment in your wallet'}
                    {namecardStep === 'deploying' && 'Storing your namecard on-chain'}
                    {namecardStep === 'linking' && 'Confirm the transaction in your wallet'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="font-label text-xs text-[var(--muted)] mb-1 block">DISPLAY NAME</label>
                    <input
                      type="text"
                      value={ncDisplayName}
                      onChange={(e) => setNcDisplayName(e.target.value)}
                      placeholder={name.label}
                      className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                    />
                  </div>
                  <div>
                    <label className="font-label text-xs text-[var(--muted)] mb-1 block">BIO</label>
                    <input
                      type="text"
                      value={ncBio}
                      onChange={(e) => setNcBio(e.target.value)}
                      placeholder="A short bio..."
                      className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                    />
                  </div>
                  <div>
                    <label className="font-label text-xs text-[var(--muted)] mb-1 block">AVATAR URL</label>
                    <input
                      type="text"
                      value={ncAvatar}
                      onChange={(e) => setNcAvatar(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-label text-xs text-[var(--muted)] mb-1 block">X / TWITTER</label>
                      <input
                        type="text"
                        value={ncX}
                        onChange={(e) => setNcX(e.target.value)}
                        placeholder="@handle"
                        className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                      />
                    </div>
                    <div>
                      <label className="font-label text-xs text-[var(--muted)] mb-1 block">GITHUB</label>
                      <input
                        type="text"
                        value={ncGithub}
                        onChange={(e) => setNcGithub(e.target.value)}
                        placeholder="username"
                        className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-label text-xs text-[var(--muted)] mb-1 block">WEBSITE</label>
                    <input
                      type="text"
                      value={ncWebsite}
                      onChange={(e) => setNcWebsite(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-300">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleDeployNamecard}
                  disabled={isPending}
                  className="btn-primary w-full py-4 text-lg font-label disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  DEPLOY NAMECARD ON-CHAIN
                </button>

                <p className="text-xs text-[var(--muted)] text-center mt-2">
                  Creates a Warren site and links it to {displayName}
                </p>
              </>
            )}
          </>

        ) : (
          <>
            {/* Link Existing Warren NFT */}
            <button
              onClick={() => { setView('menu'); setError(null) }}
              className="text-sm text-[var(--muted)] hover:text-black flex items-center gap-1 mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <p className="font-label text-xs text-[var(--muted)] mb-2">LINKING TO</p>
            <p className="font-display text-2xl truncate mb-4">{displayName}</p>

            {/* Contenthash paste field */}
            <div className="mb-4">
              <label className="font-label text-xs text-[var(--muted)] mb-2 block">
                PASTE CONTENTHASH
              </label>
              <input
                type="text"
                value={contenthash}
                onChange={(e) => parseContenthash(e.target.value)}
                placeholder="0x00e9010000000a"
                className="w-full p-3 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                disabled={isPending}
              />
              <p className="text-xs text-[var(--muted)] mt-1">
                Copy from Warren dashboard &quot;COPY CONTENTHASH&quot; button
              </p>
              {contenthash && contenthashParsed && (
                <p className="text-xs text-green-700 mt-1">
                  Parsed: {isMaster ? 'Master' : 'Container'} NFT #{warrenTokenId}
                </p>
              )}
              {contenthash && !contenthashParsed && contenthash.length > 4 && (
                <p className="text-xs text-red-600 mt-1">Invalid contenthash format</p>
              )}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 border-t border-[var(--border)]" />
              <span className="text-xs text-[var(--muted)] font-label">OR ENTER MANUALLY</span>
              <div className="flex-1 border-t border-[var(--border)]" />
            </div>

            <div className="mb-4">
              <label className="font-label text-xs text-[var(--muted)] mb-2 block">
                WARREN NFT TOKEN ID
              </label>
              <input
                type="number"
                value={warrenTokenId}
                onChange={(e) => { setWarrenTokenId(e.target.value); setContenthashParsed(false); setContenthash('') }}
                placeholder="e.g., 42"
                className="w-full p-3 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                disabled={isPending}
                min="0"
              />
              {warrenTokenId && !isValidTokenId && (
                <p className="text-red-600 text-xs mt-1">Enter a valid token ID</p>
              )}
            </div>

            <div className="mb-6">
              <label className="font-label text-xs text-[var(--muted)] mb-2 block">
                NFT TYPE
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={isMaster} onChange={() => { setIsMaster(true); setContenthashParsed(false); setContenthash('') }} className="w-4 h-4" />
                  <span className="text-sm">Master NFT (site)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={!isMaster} onChange={() => { setIsMaster(false); setContenthashParsed(false); setContenthash('') }} className="w-4 h-4" />
                  <span className="text-sm">Container NFT (bundle)</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-300">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleSetWarren}
              disabled={!isValidTokenId || isPending}
              className="btn-primary w-full py-4 text-lg font-label disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin inline mr-2" />LINKING...</>
              ) : (
                'LINK WARREN SITE'
              )}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

// Common text record keys
const COMMON_TEXT_KEYS = [
  { key: 'avatar', label: 'Avatar', placeholder: 'https://...' },
  { key: 'url', label: 'Website', placeholder: 'https://...' },
  { key: 'description', label: 'Description', placeholder: 'A short bio...' },
  { key: 'com.twitter', label: 'Twitter', placeholder: '@handle' },
  { key: 'com.github', label: 'GitHub', placeholder: 'username' },
  { key: 'email', label: 'Email', placeholder: 'you@example.com' },
]

// Text Records Modal
interface TextRecordsModalProps {
  name: OwnedName
  onClose: () => void
  onSuccess: () => void
}

function TextRecordsModal({ name, onClose, onSuccess }: TextRecordsModalProps) {
  const [records, setRecords] = useState<Record<string, string>>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const displayName = name.isSubdomain ? `${name.label}.${name.parentLabel || '?'}.mega` : `${name.label}.mega`

  // Fetch existing text records
  useEffect(() => {
    async function fetchRecords() {
      if (!publicClient) return
      
      const fetchedRecords: Record<string, string> = {}
      
      for (const { key } of COMMON_TEXT_KEYS) {
        try {
          const value = await publicClient.readContract({
            address: CONTRACTS.mainnet.megaNames,
            abi: MEGA_NAMES_ABI,
            functionName: 'text',
            args: [name.tokenId, key],
          })
          if (value && value !== '') {
            fetchedRecords[key] = value
          }
        } catch {
          // Ignore errors for individual keys
        }
      }
      
      setRecords(fetchedRecords)
    }
    
    fetchRecords()
  }, [name.tokenId, publicClient])

  const handleEdit = (key: string) => {
    setEditingKey(key)
    setEditValue(records[key] || '')
    setError(null)
    setSuccessMessage(null)
  }

  const handleSave = async () => {
    if (!walletClient || !publicClient || !editingKey) return
    
    setError(null)
    setSuccessMessage(null)
    setIsPending(true)

    try {
      const data = encodeFunctionData({
        abi: MEGA_NAMES_ABI,
        functionName: 'setText',
        args: [name.tokenId, editingKey, editValue],
      })

      const hash = await walletClient.sendTransaction({
        to: CONTRACTS.mainnet.megaNames,
        data,
        chain: {
          id: MEGAETH_CHAIN_ID,
          name: 'MegaETH',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://mainnet.megaeth.com/rpc'] } },
        },
      })

      await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 30_000,
      })

      // Update local state
      if (editValue) {
        setRecords(prev => ({ ...prev, [editingKey]: editValue }))
      } else {
        setRecords(prev => {
          const newRecords = { ...prev }
          delete newRecords[editingKey]
          return newRecords
        })
      }
      
      setSuccessMessage(`${editingKey} updated!`)
      setEditingKey(null)
      setEditValue('')
    } catch (err: any) {
      console.error('setText error:', err)
      setError(err.shortMessage || err.message || 'Failed to update record')
    } finally {
      setIsPending(false)
    }
  }

  const handleDelete = async (key: string) => {
    setEditingKey(key)
    setEditValue('')
    // Save empty string to delete
    if (!walletClient || !publicClient) return
    
    setError(null)
    setSuccessMessage(null)
    setIsPending(true)

    try {
      const data = encodeFunctionData({
        abi: MEGA_NAMES_ABI,
        functionName: 'setText',
        args: [name.tokenId, key, ''],
      })

      const hash = await walletClient.sendTransaction({
        to: CONTRACTS.mainnet.megaNames,
        data,
        chain: {
          id: MEGAETH_CHAIN_ID,
          name: 'MegaETH',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://mainnet.megaeth.com/rpc'] } },
        },
      })

      await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 30_000,
      })

      setRecords(prev => {
        const newRecords = { ...prev }
        delete newRecords[key]
        return newRecords
      })
      
      setSuccessMessage(`${key} deleted!`)
      setEditingKey(null)
    } catch (err: any) {
      console.error('setText error:', err)
      setError(err.shortMessage || err.message || 'Failed to delete record')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="font-display text-2xl">PROFILE</h2>
        <button onClick={onClose} className="p-1 hover:bg-[var(--surface-hover)]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 max-h-[60vh] overflow-y-auto">
        <div className="mb-4">
          <p className="font-label text-xs text-[var(--muted)] mb-1">NAME</p>
          <p className="font-display text-xl truncate">{displayName}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-400">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border-2 border-green-400">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <Check className="w-4 h-4" /> {successMessage}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {COMMON_TEXT_KEYS.map(({ key, label, placeholder }) => (
            <div key={key} className="bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between">
                <span className="font-label text-xs">{label.toUpperCase()}</span>
                <span className="text-xs text-[var(--muted)] font-mono">{key}</span>
              </div>
              
              {editingKey === key ? (
                <div className="p-4">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder={placeholder}
                    className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm focus:outline-none mb-3"
                    disabled={isPending}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isPending}
                      className="flex-1 py-2 bg-[var(--foreground)] text-[var(--background)] font-label text-sm disabled:opacity-50"
                    >
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'SAVE'}
                    </button>
                    <button
                      onClick={() => setEditingKey(null)}
                      disabled={isPending}
                      className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] font-label text-sm"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 flex items-center justify-between">
                  {records[key] ? (
                    <>
                      <span className="font-mono text-sm truncate flex-1 mr-4">{records[key]}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(key)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(key)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-[var(--muted)]">Not set</span>
                      <button
                        onClick={() => handleEdit(key)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Add
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-400">
          <p className="text-sm text-blue-800">
            Text records are ENS-compatible. Apps and dApps can read these to show your profile info.
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="btn-secondary w-full py-4 text-lg font-label border-t border-[var(--border)]"
      >
        DONE
      </button>
    </Modal>
  )
}

// Sell Subdomains Modal
interface SellSubdomainsModalProps {
  name: OwnedName
  onClose: () => void
  onSuccess: () => void
  address: `0x${string}`
}

function SellSubdomainsModal({ name, onClose, onSuccess, address }: SellSubdomainsModalProps) {
  const [price, setPrice] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [step, setStep] = useState<'form' | 'approving' | 'pricing' | 'configuring'>('form')
  const [mode, setMode] = useState<0 | 1>(0) // 0 = OPEN, 1 = ALLOWLIST
  const [gateToken, setGateToken] = useState('')
  const [gateMinBalance, setGateMinBalance] = useState('1')

  // Current config state
  const [configLoaded, setConfigLoaded] = useState(false)
  const [currentEnabled, setCurrentEnabled] = useState(false)
  const [currentPrice, setCurrentPrice] = useState<string>('')

  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const displayName = name.isSubdomain ? `${name.label}.${name.parentLabel || '?'}.mega` : `${name.label}.mega`

  const MEGAETH_CHAIN = {
    id: 4326 as const,
    name: 'MegaETH',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://mainnet.megaeth.com/rpc'] as const } },
  }

  // Load current config
  useEffect(() => {
    async function loadConfig() {
      if (!publicClient) return
      try {
        const [config, priceData, isApproved] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.mainnet.subdomainRouter,
            abi: SUBDOMAIN_ROUTER_ABI,
            functionName: 'getConfig',
            args: [name.tokenId],
          }),
          publicClient.readContract({
            address: CONTRACTS.mainnet.subdomainLogic,
            abi: SUBDOMAIN_LOGIC_ABI,
            functionName: 'prices',
            args: [name.tokenId],
          }),
          publicClient.readContract({
            address: CONTRACTS.mainnet.megaNames,
            abi: MEGA_NAMES_ABI,
            functionName: 'isApprovedForAll',
            args: [address, CONTRACTS.mainnet.subdomainRouter],
          }),
        ])
        const [, enabled, configMode] = config as [string, boolean, number]
        setCurrentEnabled(enabled)
        setMode(configMode as 0 | 1)
        const p = priceData as bigint
        if (p > BigInt(0)) {
          setCurrentPrice(formatUnits(p, 18))
          setPrice(formatUnits(p, 18))
        }
        setConfigLoaded(true)
      } catch {
        setConfigLoaded(true)
      }
    }
    loadConfig()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEnable = async () => {
    if (!walletClient || !publicClient || !price) return
    setError(null)
    setIsPending(true)

    try {
      const priceWei = parseUnits(price, 18)

      // Step 1: Check and set approval
      const isApproved = await publicClient.readContract({
        address: CONTRACTS.mainnet.megaNames,
        abi: MEGA_NAMES_ABI,
        functionName: 'isApprovedForAll',
        args: [address, CONTRACTS.mainnet.subdomainRouter],
      })

      if (!isApproved) {
        setStep('approving')
        const approveTx = await walletClient.writeContract({
          address: CONTRACTS.mainnet.megaNames,
          abi: MEGA_NAMES_ABI,
          functionName: 'setApprovalForAll',
          args: [CONTRACTS.mainnet.subdomainRouter, true],
          chain: MEGAETH_CHAIN,
        })
        await publicClient.waitForTransactionReceipt({ hash: approveTx, timeout: 30_000 })
      }

      // Step 2: Set price on logic contract
      setStep('pricing')
      const priceTx = await walletClient.writeContract({
        address: CONTRACTS.mainnet.subdomainLogic,
        abi: SUBDOMAIN_LOGIC_ABI,
        functionName: 'setPrice',
        args: [name.tokenId, priceWei],
        chain: MEGAETH_CHAIN,
      })
      await publicClient.waitForTransactionReceipt({ hash: priceTx, timeout: 30_000 })

      // Step 2.5: Set token gate if in allowlist mode
      if (mode === 1 && gateToken) {
        const gateTx = await walletClient.writeContract({
          address: CONTRACTS.mainnet.subdomainLogic,
          abi: SUBDOMAIN_LOGIC_ABI,
          functionName: 'setTokenGate',
          args: [name.tokenId, gateToken as `0x${string}`, parseUnits(gateMinBalance, 0)],
          chain: MEGAETH_CHAIN,
        })
        await publicClient.waitForTransactionReceipt({ hash: gateTx, timeout: 30_000 })
      }

      // Step 3: Configure router
      setStep('configuring')
      const configTx = await walletClient.writeContract({
        address: CONTRACTS.mainnet.subdomainRouter,
        abi: SUBDOMAIN_ROUTER_ABI,
        functionName: 'configure',
        args: [name.tokenId, address, true, mode],
        chain: MEGAETH_CHAIN,
      })
      await publicClient.waitForTransactionReceipt({ hash: configTx, timeout: 30_000 })

      setCurrentEnabled(true)
      setIsSuccess(true)
      setTimeout(() => { onSuccess(); onClose() }, 2000)
    } catch (err: any) {
      console.error('Sell subdomains error:', err)
      setError(err.shortMessage || err.message || 'Failed to configure')
      setStep('form')
    } finally {
      setIsPending(false)
    }
  }

  const handleDisable = async () => {
    if (!walletClient || !publicClient) return
    setError(null)
    setIsPending(true)
    try {
      const tx = await walletClient.writeContract({
        address: CONTRACTS.mainnet.subdomainRouter,
        abi: SUBDOMAIN_ROUTER_ABI,
        functionName: 'disable',
        args: [name.tokenId],
        chain: MEGAETH_CHAIN,
      })
      await publicClient.waitForTransactionReceipt({ hash: tx, timeout: 30_000 })
      setCurrentEnabled(false)
      setIsSuccess(true)
      setTimeout(() => { onSuccess(); onClose() }, 2000)
    } catch (err: any) {
      setError(err.shortMessage || err.message || 'Failed to disable')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-center relative">
        <h2 className="font-display text-2xl text-center">SELL SUBDOMAINS</h2>
        <button onClick={onClose} className="absolute right-6 p-1 hover:bg-[var(--surface-hover)]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6">
        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500 flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <p className="font-label text-sm mb-2">
              {currentEnabled ? 'SUBDOMAIN SALES ENABLED' : 'SUBDOMAIN SALES DISABLED'}
            </p>
            <p className="text-[var(--muted)]">{displayName}</p>
          </div>
        ) : step !== 'form' ? (
          <div className="text-center py-8">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-[var(--muted)]" />
            <p className="font-label text-sm">
              {step === 'approving' && 'Approving router...'}
              {step === 'pricing' && 'Setting price...'}
              {step === 'configuring' && 'Enabling sales...'}
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">Confirm in your wallet</p>
          </div>
        ) : (
          <>
            <p className="font-label text-xs text-[var(--muted)] mb-1">SELLING FOR</p>
            <p className="font-display text-xl mb-4 truncate">{displayName}</p>

            {currentEnabled && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-sm">
                <p className="font-label text-xs text-green-700 mb-1">SALES ACTIVE</p>
                <p className="text-green-800">
                  {currentPrice ? `$${currentPrice} USDM per subdomain` : 'Configured'}
                </p>
              </div>
            )}

            <div className="space-y-4 mb-4">
              <div>
                <label className="font-label text-xs text-[var(--muted)] mb-1 block">PRICE PER SUBDOMAIN (USDM)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="5.00"
                  min="0.01"
                  step="0.01"
                  className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                  autoFocus
                />
                <p className="text-[10px] text-[var(--muted)] mt-1">Minimum $0.01 — 2.5% protocol fee on each sale</p>
              </div>

              <div>
                <label className="font-label text-xs text-[var(--muted)] mb-1 block">ACCESS MODE</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode(0)}
                    className={`flex-1 p-2 text-xs font-label border ${mode === 0 ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]' : 'border-[var(--border)]'}`}
                  >
                    OPEN
                  </button>
                  <button
                    onClick={() => setMode(1)}
                    className={`flex-1 p-2 text-xs font-label border ${mode === 1 ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]' : 'border-[var(--border)]'}`}
                  >
                    TOKEN GATED
                  </button>
                </div>
              </div>

              {mode === 1 && (
                <div className="space-y-3 p-3 border border-[var(--border)]">
                  <div>
                    <label className="font-label text-xs text-[var(--muted)] mb-1 block">TOKEN CONTRACT</label>
                    <input
                      type="text"
                      value={gateToken}
                      onChange={(e) => setGateToken(e.target.value)}
                      placeholder="0x..."
                      className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                    />
                    <p className="text-[10px] text-[var(--muted)] mt-1">ERC-20 or ERC-721 contract address</p>
                  </div>
                  <div>
                    <label className="font-label text-xs text-[var(--muted)] mb-1 block">MINIMUM BALANCE</label>
                    <input
                      type="number"
                      value={gateMinBalance}
                      onChange={(e) => setGateMinBalance(e.target.value)}
                      placeholder="1"
                      min="1"
                      className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                    />
                    <p className="text-[10px] text-[var(--muted)] mt-1">1 for NFTs, token amount for ERC-20</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 border border-red-300 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                disabled={isPending || !price || parseFloat(price) < 0.01}
                className="btn-primary flex-1 py-2.5 font-label disabled:opacity-50"
              >
                {currentEnabled ? 'UPDATE' : 'ENABLE SALES'}
              </button>
              {currentEnabled && (
                <button
                  onClick={handleDisable}
                  disabled={isPending}
                  className="px-4 py-2.5 border border-red-300 text-red-600 font-label text-sm hover:bg-red-50 disabled:opacity-50"
                >
                  DISABLE
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// Name Card Component
interface NameCardProps {
  name: OwnedName
  isPrimary: boolean
  onTransfer: () => void
  onSetPrimary: () => void
  onCreateSubdomain: () => void
  onSetAddr: () => void
  onRenew: () => void
  onTextRecords: () => void
  onWarren: () => void
  onSellSubdomains: () => void
  onSubdomainAction?: (sub: OwnedName, action: 'transfer' | 'setAddr' | 'textRecords' | 'revoke' | 'createSub' | 'warren' | 'sellSubs') => void
  isSettingPrimary: boolean
}

function NameCard({ name, isPrimary, onTransfer, onSetPrimary, onCreateSubdomain, onSetAddr, onRenew, onTextRecords, onWarren, onSellSubdomains, onSubdomainAction, isSettingPrimary }: NameCardProps) {
  const [showSubdomains, setShowSubdomains] = useState(false)
  const [showSubMenu, setShowSubMenu] = useState(false)
  const subMenuRef = useRef<HTMLDivElement>(null)

  // Read selling config
  const publicClient = usePublicClient()
  const [sellingActive, setSellingActive] = useState(false)
  const [sellingPrice, setSellingPrice] = useState<string | null>(null)
  const [sellingSold, setSellingSold] = useState<number>(0)

  useEffect(() => {
    async function checkSelling() {
      if (!publicClient || name.isSubdomain) return
      try {
        const [config, priceData, counters] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.mainnet.subdomainRouter,
            abi: SUBDOMAIN_ROUTER_ABI,
            functionName: 'getConfig',
            args: [name.tokenId],
          }),
          publicClient.readContract({
            address: CONTRACTS.mainnet.subdomainLogic,
            abi: SUBDOMAIN_LOGIC_ABI,
            functionName: 'prices',
            args: [name.tokenId],
          }),
          publicClient.readContract({
            address: CONTRACTS.mainnet.subdomainRouter,
            abi: SUBDOMAIN_ROUTER_ABI,
            functionName: 'getCounters',
            args: [name.tokenId],
          }),
        ])
        const [, enabled] = config as [string, boolean, number]
        const price = priceData as bigint
        const [sold] = counters as [bigint, bigint, bigint]
        setSellingActive(enabled)
        if (price > BigInt(0)) setSellingPrice(formatUnits(price, 18))
        setSellingSold(Number(sold))
      } catch { /* not configured */ }
    }
    checkSelling()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name.tokenId])

  // Close sub-menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (subMenuRef.current && !subMenuRef.current.contains(e.target as Node)) {
        setShowSubMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  
  const formatExpiry = (expiresAt: bigint) => {
    const date = new Date(Number(expiresAt) * 1000)
    const dateStr = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
    const yearsLeft = (Number(expiresAt) * 1000 - Date.now()) / (365.25 * 24 * 60 * 60 * 1000)
    const yr = yearsLeft > 0 ? `(${yearsLeft.toFixed(1)} yr)` : '(expired)'
    return `${dateStr} ${yr}`
  }

  const daysUntilExpiry = (expiresAt: bigint) => {
    const now = Math.floor(Date.now() / 1000)
    const diff = Number(expiresAt) - now
    return Math.ceil(diff / 86400)
  }

  const days = daysUntilExpiry(name.expiresAt)
  const isExpiringSoon = days <= 30
  // Flatten all nested subdomains (sub-subs, sub-sub-subs, etc.) into one list
  const allSubdomains = useMemo(() => {
    if (!name.subdomains) return []
    const result: OwnedName[] = []
    const collect = (subs: OwnedName[]) => {
      for (const s of subs) {
        result.push(s)
        if (s.subdomains) collect(s.subdomains)
      }
    }
    collect(name.subdomains)
    return result
  }, [name.subdomains])
  const hasSubdomains = allSubdomains.length > 0

  return (
    <div className={`border border-[var(--border)] shadow-[0_2px_8px_rgba(25,25,26,0.06),0_1px_3px_rgba(25,25,26,0.04)] ${isPrimary ? 'bg-[var(--surface)]' : 'bg-[var(--bg-card)]'}`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              <h2 className="font-display text-3xl truncate">
                {name.isSubdomain && name.parentLabel ? `${name.label}.${name.parentLabel}.mega` : `${name.label}.mega`}
              </h2>
              {isPrimary && (
                <span className="px-2 py-1 text-xs font-label bg-[var(--foreground)] text-[var(--background)]">
                  PRIMARY
                </span>
              )}
            </div>
            {name.isSubdomain ? (
              <p className="text-sm text-[var(--muted)] mt-1">subdomain</p>
            ) : (
              <p className="text-sm text-[var(--muted)] mt-1">
                Expires {formatExpiry(name.expiresAt)}
                {isExpiringSoon && (
                  <span className="text-orange-600 ml-2">
                    ({days} days left)
                  </span>
                )}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isPrimary && (
              <Tooltip label="Set as Primary">
                <button
                  onClick={onSetPrimary}
                  disabled={isSettingPrimary}
                  className="p-2 hover:bg-yellow-100 transition-colors border border-[var(--border)] disabled:opacity-50"
                >
                  {isSettingPrimary ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Star className="w-5 h-5" />
                  )}
                </button>
              </Tooltip>
            )}
            <Tooltip label="Forward to">
              <button
                onClick={onSetAddr}
                className="p-2 hover:bg-purple-100 transition-colors border border-[var(--border)]"
              >
                <MapPin className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip label="Profile">
              <button
                onClick={onTextRecords}
                className="p-2 hover:bg-orange-100 transition-colors border border-[var(--border)]"
              >
                <UserCircle className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip label="Warren Site">
              <button
                onClick={onWarren}
                className="p-2 hover:bg-purple-100 transition-colors border border-[var(--border)]"
              >
                <Globe className="w-5 h-5" />
              </button>
            </Tooltip>
            <div className="relative inline-flex" ref={subMenuRef}>
              <Tooltip label="Subdomains">
                <button
                  onClick={() => setShowSubMenu(!showSubMenu)}
                  className="p-2 transition-colors border border-[var(--border)] hover:bg-green-100"
                >
                  <FolderTree className="w-5 h-5" />
                </button>
              </Tooltip>
              {showSubMenu && (
                <div className="absolute right-0 mt-1 w-48 border border-[var(--border)] bg-[var(--background)] shadow-lg z-50">
                  <button
                    onClick={() => { setShowSubMenu(false); onCreateSubdomain() }}
                    className={`w-full px-3 py-2.5 flex items-center gap-2 text-xs font-label text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors ${!name.isSubdomain ? 'border-b border-[var(--border)]' : ''}`}
                  >
                    <span className="text-base">+</span> Mint subdomain
                  </button>
                  {!name.isSubdomain && (
                    <button
                      onClick={() => { setShowSubMenu(false); onSellSubdomains() }}
                      className="w-full px-3 py-2.5 flex items-center gap-2 text-xs font-label text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      {sellingActive ? (
                        <span>Selling — <span className="text-green-700">${sellingPrice}</span></span>
                      ) : (
                        'Sell subdomains'
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
            <Tooltip label="Transfer">
              <button
                onClick={onTransfer}
                className="p-2 hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)]"
              >
                <Send className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip label="Explorer">
              <a
                href={`https://mega.etherscan.io/token/${CONTRACTS.mainnet.megaNames}/instance/${name.tokenId.toString()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)]"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </Tooltip>
          </div>
        </div>
        {sellingActive && (
          <div className="text-right mt-2">
            <span className="text-xs text-green-700 font-label tracking-wider uppercase">subdomain sales active</span>
          </div>
        )}
      </div>
      
      {/* Subdomains toggle */}
      {hasSubdomains && (
        <button
          onClick={() => setShowSubdomains(!showSubdomains)}
          className="w-full px-6 py-3 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between hover:bg-[var(--surface-hover)]"
        >
          <span className="text-xs text-[var(--muted)] font-label">
            {allSubdomains.length} SUBDOMAIN{allSubdomains.length > 1 ? 'S' : ''}
          </span>
          {showSubdomains ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}
      
      {/* Subdomains list */}
      {showSubdomains && hasSubdomains && (
        <div className="border-t border-[var(--border)]">
          {allSubdomains.map((sub) => (
            <div key={sub.tokenId.toString()} className="px-6 py-3 flex items-center justify-between border-b border-[var(--border-light)] last:border-b-0 bg-[var(--background-light)]">
              <span className="font-mono text-sm truncate flex-1 min-w-0 mr-2">{getFullName(sub)}</span>
              <div className="flex items-center gap-1 shrink-0">
                <Tooltip label="Forward to">
                  <button
                    onClick={() => onSubdomainAction?.(sub, 'setAddr')}
                    className="p-1 hover:bg-purple-100 transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip label="Profile">
                  <button
                    onClick={() => onSubdomainAction?.(sub, 'textRecords')}
                    className="p-1 hover:bg-orange-100 transition-colors"
                  >
                    <UserCircle className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip label="Warren">
                  <button
                    onClick={() => onSubdomainAction?.(sub, 'warren')}
                    className="p-1 hover:bg-purple-100 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip label="Mint subdomain">
                  <button
                    onClick={() => onSubdomainAction?.(sub, 'createSub')}
                    className="p-1 hover:bg-blue-100 transition-colors"
                  >
                    <FolderTree className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip label="Transfer">
                  <button
                    onClick={() => onSubdomainAction?.(sub, 'transfer')}
                    className="p-1 hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip label="Revoke">
                  <button
                    onClick={() => onSubdomainAction?.(sub, 'revoke')}
                    className="p-1 hover:bg-red-100 transition-colors"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </Tooltip>
                <Tooltip label="Explorer">
                  <a
                    href={`https://mega.etherscan.io/token/${CONTRACTS.mainnet.megaNames}/instance/${sub.tokenId.toString()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-[var(--surface-hover)]"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Renewal section - only for top-level names without visible subdomains */}
      {!hasSubdomains && !name.isSubdomain && (
        <button
          onClick={onRenew}
          className="w-full px-6 py-3 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors"
        >
          <span className="text-xs text-[var(--muted)] font-label flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            RENEW
          </span>
          <span className="text-sm font-medium">{formatUSDM(getPrice(name.label.length))}/year</span>
        </button>
      )}
    </div>
  )
}

export default function MyNamesPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  const [ownedNames, setOwnedNames] = useState<OwnedName[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [transferringName, setTransferringName] = useState<OwnedName | null>(null)
  const [creatingSubdomainFor, setCreatingSubdomainFor] = useState<OwnedName | null>(null)
  const [settingAddrFor, setSettingAddrFor] = useState<OwnedName | null>(null)
  const [renewingName, setRenewingName] = useState<OwnedName | null>(null)
  const [editingTextRecordsFor, setEditingTextRecordsFor] = useState<OwnedName | null>(null)
  const [settingWarrenFor, setSettingWarrenFor] = useState<OwnedName | null>(null)
  const [sellingSubsFor, setSellingSubsFor] = useState<OwnedName | null>(null)
  const [settingPrimaryFor, setSettingPrimaryFor] = useState<bigint | null>(null)

  // Get primary name using getName
  const { data: primaryName, refetch: refetchPrimaryName } = useReadContract({
    address: CONTRACTS.mainnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'getName',
    args: [address!],
    query: { enabled: !!address },
  })

  const handleRevokeSubdomain = async (sub: OwnedName) => {
    if (!walletClient || !publicClient) return
    if (!confirm(`Revoke ${sub.label} subdomain? This will burn the token.`)) return

    try {
      const data = encodeFunctionData({
        abi: MEGA_NAMES_ABI,
        functionName: 'revokeSubdomain',
        args: [sub.tokenId],
      })

      const hash = await walletClient.sendTransaction({
        to: CONTRACTS.mainnet.megaNames,
        data,
        chain: {
          id: MEGAETH_CHAIN_ID,
          name: 'MegaETH',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://mainnet.megaeth.com/rpc'] } },
        },
      })

      await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 })
      fetchOwnedNames()
    } catch (err: any) {
      console.error('Revoke subdomain error:', err)
      alert(err.shortMessage || err.message || 'Failed to revoke subdomain')
    }
  }

  const handleSetPrimary = async (name: OwnedName) => {
    if (!walletClient || !publicClient) return
    
    setSettingPrimaryFor(name.tokenId)

    try {
      const data = encodeFunctionData({
        abi: MEGA_NAMES_ABI,
        functionName: 'setPrimaryName',
        args: [name.tokenId],
      })

      const hash = await walletClient.sendTransaction({
        to: CONTRACTS.mainnet.megaNames,
        data,
        chain: {
          id: MEGAETH_CHAIN_ID,
          name: 'MegaETH',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://mainnet.megaeth.com/rpc'] } },
        },
      })

      await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 30_000,
      })

      refetchPrimaryName()
    } catch (err: any) {
      console.error('Set primary error:', err)
    } finally {
      setSettingPrimaryFor(null)
    }
  }

  // Fetch owned names using on-chain enumerable set + multicall
  const fetchOwnedNames = async () => {
    if (!address || !publicClient) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    
    try {
      // Single call to get all owned token IDs (no log scanning!)
      const rawTokenIds = await publicClient.readContract({
        address: CONTRACTS.mainnet.megaNames,
        abi: MEGA_NAMES_ABI,
        functionName: 'tokensOfOwner',
        args: [address],
      })
      
      const tokenIds = rawTokenIds as readonly bigint[]
      console.log('tokensOfOwner result:', tokenIds, 'length:', tokenIds?.length)

      if (!tokenIds || tokenIds.length === 0) {
        setOwnedNames([])
        return
      }

      // Batch fetch all records using individual calls (more reliable than multicall)
      const recordResults = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            const result = await publicClient.readContract({
              address: CONTRACTS.mainnet.megaNames,
              abi: MEGA_NAMES_ABI,
              functionName: 'records',
              args: [tokenId],
            })
            return { status: 'success' as const, result }
          } catch (e) {
            console.error('Failed to fetch record for token', tokenId, e)
            return { status: 'failure' as const, result: null }
          }
        })
      )

      // Process results
      const names: OwnedName[] = []
      const subdomainsByParent: Map<string, OwnedName[]> = new Map()
      const now = BigInt(Math.floor(Date.now() / 1000))

      for (let i = 0; i < tokenIds.length; i++) {
        const result = recordResults[i]
        if (result.status !== 'success' || !result.result) continue

        const [label, parent, expiresAt] = result.result as [string, bigint, bigint, bigint, bigint]
        const isSubdomain = parent !== BigInt(0)

        const nameData: OwnedName = {
          tokenId: tokenIds[i],
          label,
          expiresAt: BigInt(expiresAt),
          parent,
          isSubdomain,
        }

        if (isSubdomain) {
          const parentStr = parent.toString()
          if (!subdomainsByParent.has(parentStr)) {
            subdomainsByParent.set(parentStr, [])
          }
          subdomainsByParent.get(parentStr)!.push(nameData)
        } else {
          // Include parent names if not expired
          if (BigInt(expiresAt) > now) {
            names.push(nameData)
          }
        }
      }

      // Build a lookup of all names by tokenId for resolving parents
      const allNamesMap = new Map<string, OwnedName>()
      for (const n of names) allNamesMap.set(n.tokenId.toString(), n)
      for (const subs of subdomainsByParent.values()) {
        for (const s of subs) allNamesMap.set(s.tokenId.toString(), s)
      }

      // Attach subdomains to their parents and set parentLabel
      // First pass: attach direct children of top-level names
      for (const name of names) {
        const subs = subdomainsByParent.get(name.tokenId.toString())
        if (subs) {
          for (const sub of subs) {
            sub.parentLabel = name.label
          }
          name.subdomains = subs
        }
      }

      // Second pass: attach sub-subs to their subdomain parents
      for (const [parentStr, subs] of subdomainsByParent.entries()) {
        const parentName = allNamesMap.get(parentStr)
        if (parentName && parentName.isSubdomain) {
          // Build full parent chain: e.g., "vault.bread" for sub-subs of vault.bread.mega
          const parentChain = parentName.parentLabel
            ? `${parentName.label}.${parentName.parentLabel}`
            : parentName.label
          for (const sub of subs) {
            sub.parentLabel = parentChain
          }
          if (!parentName.subdomains) parentName.subdomains = []
          parentName.subdomains.push(...subs)
        }
      }

      // Collect orphaned subdomains (user owns sub but not parent)
      for (const [parentStr, subs] of subdomainsByParent.entries()) {
        const parentInNames = names.find(n => n.tokenId.toString() === parentStr)
        const parentInSubs = allNamesMap.get(parentStr)
        if (!parentInNames && (!parentInSubs || !parentInSubs.isSubdomain)) {
          // Orphaned: fetch parent label for display
          for (const sub of subs) {
            if (!sub.parentLabel) {
              try {
                const parentRecord = await publicClient.readContract({
                  address: CONTRACTS.mainnet.megaNames,
                  abi: MEGA_NAMES_ABI,
                  functionName: 'records',
                  args: [BigInt(parentStr)],
                })
                const [parentLabel, grandParent] = parentRecord as [string, bigint, bigint, bigint, bigint]
                if (grandParent !== BigInt(0)) {
                  // Parent is itself a subdomain — resolve grandparent label
                  try {
                    const gpRecord = await publicClient.readContract({
                      address: CONTRACTS.mainnet.megaNames,
                      abi: MEGA_NAMES_ABI,
                      functionName: 'records',
                      args: [grandParent],
                    })
                    sub.parentLabel = `${parentLabel}.${(gpRecord as [string, bigint, bigint, bigint, bigint])[0]}`
                  } catch {
                    sub.parentLabel = parentLabel
                  }
                } else {
                  sub.parentLabel = parentLabel
                }
              } catch {}
            }
            names.push(sub)
          }
        }
      }

      // Sort by expiration date (soonest first), subdomains (expiresAt=0) at end
      names.sort((a, b) => {
        // Top-level names first, subdomains after
        if (a.isSubdomain && !b.isSubdomain) return 1
        if (!a.isSubdomain && b.isSubdomain) return -1
        if (a.expiresAt === BigInt(0) && b.expiresAt === BigInt(0)) return a.label.localeCompare(b.label)
        if (a.expiresAt === BigInt(0)) return 1
        if (b.expiresAt === BigInt(0)) return -1
        return Number(a.expiresAt - b.expiresAt)
      })

      setOwnedNames(names)
    } catch (error) {
      console.error('Error fetching owned names:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOwnedNames()
  }, [address, publicClient])

  const handleSuccess = () => {
    fetchOwnedNames()
    refetchPrimaryName()
  }

  // Extract primary label from full name (e.g., "bread.mega" -> "bread")
  const primaryLabel = primaryName?.replace('.mega', '') || null

  if (!isConnected) {
    return (
      <div className="min-h-[calc(100vh-64px)]">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-4xl mb-4">MY NAMES</h1>
          <p className="text-[var(--muted)] mb-8">Connect your wallet to view your names</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-black mb-4">
              <ArrowLeft className="w-4 h-4" />
              <span className="font-label text-sm">BACK</span>
            </Link>
            <h1 className="font-display text-4xl">MY NAMES</h1>
          </div>
          <div className="text-right">
            <p className="font-label text-xs text-[var(--muted)]">CONNECTED AS</p>
            <p className="font-mono">{shortenAddress(address!)}</p>
          </div>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="font-label text-sm">LOADING YOUR NAMES...</p>
          </div>
        ) : ownedNames.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] p-8 text-center">
            <p className="font-label text-sm mb-4">NO NAMES FOUND</p>
            <p className="text-[var(--muted)] mb-6">You don&apos;t own any .mega names yet</p>
            <Link href="/" className="btn-primary inline-block px-8 py-4">
              SEARCH FOR A NAME
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {ownedNames.map((name) => (
              <NameCard
                key={name.tokenId.toString()}
                name={name}
                isPrimary={primaryLabel === name.label}
                onTransfer={() => setTransferringName(name)}
                onSetPrimary={() => handleSetPrimary(name)}
                onCreateSubdomain={() => setCreatingSubdomainFor(name)}
                onSetAddr={() => setSettingAddrFor(name)}
                onRenew={() => setRenewingName(name)}
                onTextRecords={() => setEditingTextRecordsFor(name)}
                onWarren={() => setSettingWarrenFor(name)}
                onSellSubdomains={() => setSellingSubsFor(name)}
                onSubdomainAction={(sub, action) => {
                  if (action === 'transfer') setTransferringName(sub)
                  else if (action === 'setAddr') setSettingAddrFor(sub)
                  else if (action === 'textRecords') setEditingTextRecordsFor(sub)
                  else if (action === 'revoke') handleRevokeSubdomain(sub)
                  else if (action === 'createSub') setCreatingSubdomainFor(sub)
                  else if (action === 'warren') setSettingWarrenFor(sub)
                  else if (action === 'sellSubs') setSellingSubsFor(sub)
                }}
                isSettingPrimary={settingPrimaryFor === name.tokenId}
              />
            ))}
          </div>
        )}

        {/* Summary */}
        {!isLoading && ownedNames.length > 0 && (
          <div className="mt-8 p-6 border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-label text-xs text-[var(--muted)]">TOTAL NAMES</p>
                <p className="font-display text-2xl">
                  {ownedNames.length}
                  {ownedNames.reduce((acc, n) => { const c = (s: OwnedName[]): number => s.reduce((a, x) => a + 1 + (x.subdomains ? c(x.subdomains) : 0), 0); return acc + (n.subdomains ? c(n.subdomains) : 0) }, 0) > 0 && (
                    <span className="text-lg text-[var(--muted)] ml-2">
                      (+{ownedNames.reduce((acc, n) => { const c = (s: OwnedName[]): number => s.reduce((a, x) => a + 1 + (x.subdomains ? c(x.subdomains) : 0), 0); return acc + (n.subdomains ? c(n.subdomains) : 0) }, 0)} subdomains)
                    </span>
                  )}
                </p>
              </div>
              <Link href="/" className="btn-secondary px-6 py-3">
                REGISTER MORE
              </Link>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="mt-8" />
      </div>

      {/* Modals */}
      {transferringName && (
        <TransferModal
          name={transferringName}
          address={address!}
          onClose={() => setTransferringName(null)}
          onSuccess={handleSuccess}
        />
      )}

      {creatingSubdomainFor && (
        <SubdomainModal
          parentName={creatingSubdomainFor}
          onClose={() => setCreatingSubdomainFor(null)}
          onSuccess={handleSuccess}
        />
      )}

      {settingAddrFor && (
        <SetAddrModal
          name={settingAddrFor}
          onClose={() => setSettingAddrFor(null)}
          onSuccess={handleSuccess}
        />
      )}

      {renewingName && (
        <RenewModal
          name={renewingName}
          onClose={() => setRenewingName(null)}
          onSuccess={handleSuccess}
        />
      )}

      {editingTextRecordsFor && (
        <TextRecordsModal
          name={editingTextRecordsFor}
          onClose={() => setEditingTextRecordsFor(null)}
          onSuccess={handleSuccess}
        />
      )}

      {settingWarrenFor && (
        <WarrenModal
          name={settingWarrenFor}
          onClose={() => setSettingWarrenFor(null)}
          onSuccess={handleSuccess}
        />
      )}

      {sellingSubsFor && address && (
        <SellSubdomainsModal
          name={sellingSubsFor}
          onClose={() => setSellingSubsFor(null)}
          onSuccess={handleSuccess}
          address={address}
        />
      )}
    </div>
  )
}
