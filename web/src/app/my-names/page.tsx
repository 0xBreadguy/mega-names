'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { useReadContract } from 'wagmi'
import { encodeFunctionData, isAddress, type Hash, erc20Abi } from 'viem'
import { CONTRACTS, MEGA_NAMES_ABI } from '@/lib/contracts'
import { shortenAddress, formatUSDM, getPrice, calculateFee, getDiscountLabel } from '@/lib/utils'
import { useMegaName, useResolveMegaName } from '@/lib/hooks'
import { Loader2, ArrowLeft, ExternalLink, Send, X, Check, Star, Plus, ChevronDown, ChevronUp, AtSign, RefreshCw, FileText, Trash2, Globe } from 'lucide-react'
import Link from 'next/link'

const MEGAETH_TESTNET_CHAIN_ID = 6343

interface OwnedName {
  tokenId: bigint
  label: string
  expiresAt: bigint
  parent: bigint
  isSubdomain: boolean
  subdomains?: OwnedName[]
}

// Modal wrapper component
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background-light)] border border-[var(--border)] max-w-md w-full">
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
  const displayName = name.isSubdomain ? `${name.label}.${name.parent}` : `${name.label}.mega`

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
        to: CONTRACTS.testnet.megaNames,
        data,
        chain: {
          id: MEGAETH_TESTNET_CHAIN_ID,
          name: 'MegaETH Testnet',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://carrot.megaeth.com/rpc'] } },
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
                href={`https://megaeth-testnet-v2.blockscout.com/tx/${txHash}`}
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
              <p className="font-display text-3xl">{displayName}</p>
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
                className="w-full p-3 border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                disabled={isPending}
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
                ⚠️ This action is irreversible. Make sure the recipient address is correct.
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
  const fullName = `${label}.${parentName.label}.mega`

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
        to: CONTRACTS.testnet.megaNames,
        data,
        chain: {
          id: MEGAETH_TESTNET_CHAIN_ID,
          name: 'MegaETH Testnet',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://carrot.megaeth.com/rpc'] } },
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
                href={`https://megaeth-testnet-v2.blockscout.com/tx/${txHash}`}
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
              <p className="font-display text-2xl">{parentName.label}.mega</p>
            </div>

            <div className="mb-6">
              <label className="font-label text-xs text-[var(--muted)] mb-2 block">
                SUBDOMAIN LABEL
              </label>
              <div className="flex items-center border border-[var(--border)]">
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="subdomain"
                  className="flex-1 p-3 font-mono text-sm focus:outline-none"
                  disabled={isPending}
                />
                <span className="px-3 py-3 bg-[var(--surface)] border-l border-[var(--border)] text-sm text-[var(--muted)]">
                  .{parentName.label}.mega
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
                ✨ Subdomains are free to create! You can transfer or sell them like any name.
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
  const displayName = name.isSubdomain ? `${name.label}.parent.mega` : `${name.label}.mega`

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
        to: CONTRACTS.testnet.megaNames,
        data,
        chain: {
          id: MEGAETH_TESTNET_CHAIN_ID,
          name: 'MegaETH Testnet',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://carrot.megaeth.com/rpc'] } },
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
        <h2 className="font-display text-2xl">SET ADDRESS</h2>
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
                href={`https://megaeth-testnet-v2.blockscout.com/tx/${txHash}`}
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
              <p className="font-display text-2xl">{displayName}</p>
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
                className="w-full p-3 border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                disabled={isPending}
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
                💡 This sets where {displayName} resolves to. You can point it to any address — a wallet, multisig, or contract.
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
            'SET ADDRESS'
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
    address: CONTRACTS.testnet.usdm,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address!, CONTRACTS.testnet.megaNames],
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
        args: [CONTRACTS.testnet.megaNames, MAX_UINT256],
      })

      const hash = await walletClient.sendTransaction({
        to: CONTRACTS.testnet.usdm,
        data,
        chain: {
          id: MEGAETH_TESTNET_CHAIN_ID,
          name: 'MegaETH Testnet',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://carrot.megaeth.com/rpc'] } },
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
        to: CONTRACTS.testnet.megaNames,
        data,
        chain: {
          id: MEGAETH_TESTNET_CHAIN_ID,
          name: 'MegaETH Testnet',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://carrot.megaeth.com/rpc'] } },
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
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
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
                href={`https://megaeth-testnet-v2.blockscout.com/tx/${txHash}`}
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
              <p className="font-display text-3xl">{displayName}</p>
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

            <div className="mb-6 p-4 border border-[var(--border)]">
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

// Warren NFT contract address (testnet)
const WARREN_NFT_CONTRACT = '0xd1591a060BB8933869b16A248C77d1375389842B' as const
const WARREN_APP_URL = 'https://thewarren.app'

// Warren Contenthash Modal
interface WarrenModalProps {
  name: OwnedName
  onClose: () => void
  onSuccess: () => void
}

function WarrenModal({ name, onClose, onSuccess }: WarrenModalProps) {
  const [warrenTokenId, setWarrenTokenId] = useState('')
  const [isMaster, setIsMaster] = useState(true)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<Hash | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(false)
  
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const displayName = name.isSubdomain ? `${name.label}.parent.mega` : `${name.label}.mega`
  const isValidTokenId = warrenTokenId !== '' && !isNaN(Number(warrenTokenId)) && Number(warrenTokenId) >= 0

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
        to: CONTRACTS.testnet.megaNames,
        data,
        chain: {
          id: MEGAETH_TESTNET_CHAIN_ID,
          name: 'MegaETH Testnet',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://carrot.megaeth.com/rpc'] } },
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
      console.error('setWarrenContenthash error:', err)
      setError(err.shortMessage || err.message || 'Failed to set Warren site')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="font-display text-2xl">WARREN ON-CHAIN SITE</h2>
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
            <p className="font-label text-sm mb-2">WARREN SITE LINKED!</p>
            <p className="text-[var(--muted)]">{displayName} now points to Warren #{warrenTokenId}</p>
            {txHash && (
              <a
                href={`https://megaeth-testnet-v2.blockscout.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-4 inline-block"
              >
                View on Explorer →
              </a>
            )}
          </div>
        ) : !showLinkForm ? (
          <>
            {/* Warren Intro */}
            <div className="mb-6">
              <p className="font-label text-xs text-[var(--muted)] mb-2">NAME</p>
              <p className="font-display text-2xl mb-4">{displayName}</p>
              
              <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 mb-4">
                <p className="text-sm text-purple-900 font-medium mb-2">
                  🌐 What is Warren?
                </p>
                <p className="text-sm text-purple-800 mb-3">
                  Warren is MegaETH&apos;s on-chain storage protocol. Store websites, images, and content permanently on-chain — immune to link rot and server shutdowns.
                </p>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• <strong>Direct Injector</strong> — Upload HTML, images, video</li>
                  <li>• <strong>AI Architect</strong> — Generate sites with AI prompts</li>
                  <li>• <strong>Identity Node</strong> — On-chain identity cards</li>
                  <li>• <strong>Containers</strong> — Bundle assets as NFTs</li>
                </ul>
              </div>
            </div>

            {/* Primary CTA - Create on Warren */}
            <a
              href={WARREN_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full py-4 text-lg font-label flex items-center justify-center gap-2 mb-4"
            >
              CREATE ON WARREN
              <ExternalLink className="w-5 h-5" />
            </a>

            <p className="text-center text-sm text-[var(--muted)] mb-4">
              Create your on-chain content, then come back with your token ID
            </p>

            <div className="border-t-2 border-[var(--border-light)] pt-4">
              <button
                onClick={() => setShowLinkForm(true)}
                className="w-full text-center text-sm text-blue-600 hover:underline"
              >
                I already have a Warren NFT →
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Link Existing Warren NFT */}
            <div className="mb-6">
              <button 
                onClick={() => setShowLinkForm(false)}
                className="text-sm text-[var(--muted)] hover:text-black flex items-center gap-1 mb-4"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <p className="font-label text-xs text-[var(--muted)] mb-2">LINKING TO</p>
              <p className="font-display text-2xl">{displayName}</p>
            </div>

            <div className="mb-4">
              <label className="font-label text-xs text-[var(--muted)] mb-2 block">
                WARREN NFT TOKEN ID
              </label>
              <input
                type="number"
                value={warrenTokenId}
                onChange={(e) => setWarrenTokenId(e.target.value)}
                placeholder="e.g., 42"
                className="w-full p-3 border border-[var(--border)] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
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
                  <input
                    type="radio"
                    checked={isMaster}
                    onChange={() => setIsMaster(true)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Master NFT (site)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isMaster}
                    onChange={() => setIsMaster(false)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Container NFT (bundle)</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-400">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="text-xs text-[var(--muted)] mb-4">
              <p>Warren NFT Contract:</p>
              <a 
                href={`https://megaeth-testnet-v2.blockscout.com/address/${WARREN_NFT_CONTRACT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-blue-600 hover:underline break-all"
              >
                {WARREN_NFT_CONTRACT}
              </a>
            </div>
          </>
        )}
      </div>

      {!isSuccess && showLinkForm && (
        <button
          onClick={handleSetWarren}
          disabled={!isValidTokenId || isPending}
          className="btn-primary w-full py-4 text-lg font-label disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              LINKING...
            </>
          ) : (
            'LINK WARREN SITE'
          )}
        </button>
      )}
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

  const displayName = name.isSubdomain ? `${name.label}.parent.mega` : `${name.label}.mega`

  // Fetch existing text records
  useEffect(() => {
    async function fetchRecords() {
      if (!publicClient) return
      
      const fetchedRecords: Record<string, string> = {}
      
      for (const { key } of COMMON_TEXT_KEYS) {
        try {
          const value = await publicClient.readContract({
            address: CONTRACTS.testnet.megaNames,
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
        to: CONTRACTS.testnet.megaNames,
        data,
        chain: {
          id: MEGAETH_TESTNET_CHAIN_ID,
          name: 'MegaETH Testnet',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://carrot.megaeth.com/rpc'] } },
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
        to: CONTRACTS.testnet.megaNames,
        data,
        chain: {
          id: MEGAETH_TESTNET_CHAIN_ID,
          name: 'MegaETH Testnet',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://carrot.megaeth.com/rpc'] } },
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
        <h2 className="font-display text-2xl">TEXT RECORDS</h2>
        <button onClick={onClose} className="p-1 hover:bg-[var(--surface-hover)]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 max-h-[60vh] overflow-y-auto">
        <div className="mb-4">
          <p className="font-label text-xs text-[var(--muted)] mb-1">NAME</p>
          <p className="font-display text-xl">{displayName}</p>
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
            <div key={key} className="border border-[var(--border)]">
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
                    className="w-full p-2 border border-[var(--border)] font-mono text-sm focus:outline-none mb-3"
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
                      className="px-4 py-2 border border-[var(--border)] font-label text-sm"
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
            💡 Text records are ENS-compatible. Apps and dApps can read these to show your profile info.
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
  isSettingPrimary: boolean
}

function NameCard({ name, isPrimary, onTransfer, onSetPrimary, onCreateSubdomain, onSetAddr, onRenew, onTextRecords, onWarren, isSettingPrimary }: NameCardProps) {
  const [showSubdomains, setShowSubdomains] = useState(false)
  
  const formatExpiry = (expiresAt: bigint) => {
    const date = new Date(Number(expiresAt) * 1000)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const daysUntilExpiry = (expiresAt: bigint) => {
    const now = Math.floor(Date.now() / 1000)
    const diff = Number(expiresAt) - now
    return Math.ceil(diff / 86400)
  }

  const days = daysUntilExpiry(name.expiresAt)
  const isExpiringSoon = days <= 30
  const hasSubdomains = name.subdomains && name.subdomains.length > 0

  return (
    <div className={`border border-[var(--border)] ${isPrimary ? 'bg-[var(--surface)]' : ''}`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-display text-3xl">{name.label}.mega</h2>
              {isPrimary && (
                <span className="px-2 py-1 text-xs font-label bg-[var(--foreground)] text-[var(--background)]">
                  PRIMARY
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--muted)] mt-1">
              Expires {formatExpiry(name.expiresAt)}
              {isExpiringSoon && (
                <span className="text-orange-600 ml-2">
                  ({days} days left)
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {!isPrimary && (
              <button
                onClick={onSetPrimary}
                disabled={isSettingPrimary}
                className="p-2 hover:bg-yellow-100 transition-colors border border-[var(--border)] disabled:opacity-50"
                title="Set as Primary"
              >
                {isSettingPrimary ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Star className="w-5 h-5" />
                )}
              </button>
            )}
            <button
              onClick={onSetAddr}
              className="p-2 hover:bg-purple-100 transition-colors border border-[var(--border)]"
              title="Set Address Resolution"
            >
              <AtSign className="w-5 h-5" />
            </button>
            <button
              onClick={onTextRecords}
              className="p-2 hover:bg-orange-100 transition-colors border border-[var(--border)]"
              title="Text Records"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button
              onClick={onWarren}
              className="p-2 hover:bg-purple-100 transition-colors border border-[var(--border)]"
              title="Link Warren Site"
            >
              <Globe className="w-5 h-5" />
            </button>
            <button
              onClick={onCreateSubdomain}
              className="p-2 hover:bg-blue-100 transition-colors border border-[var(--border)]"
              title="Create Subdomain"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={onTransfer}
              className="p-2 hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)]"
              title="Transfer"
            >
              <Send className="w-5 h-5" />
            </button>
            <a
              href={`https://megaeth-testnet-v2.blockscout.com/token/${CONTRACTS.testnet.megaNames}/instance/${name.tokenId.toString()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)]"
              title="View on Explorer"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
      
      {/* Subdomains toggle */}
      {hasSubdomains && (
        <button
          onClick={() => setShowSubdomains(!showSubdomains)}
          className="w-full px-6 py-3 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between hover:bg-[var(--surface-hover)]"
        >
          <span className="text-xs text-[var(--muted)] font-label">
            {name.subdomains!.length} SUBDOMAIN{name.subdomains!.length > 1 ? 'S' : ''}
          </span>
          {showSubdomains ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}
      
      {/* Subdomains list */}
      {showSubdomains && hasSubdomains && (
        <div className="border-t border-[var(--border)]">
          {name.subdomains!.map((sub) => (
            <div key={sub.tokenId.toString()} className="px-6 py-3 flex items-center justify-between border-b border-[var(--border-light)] last:border-b-0 bg-[var(--background-light)]">
              <span className="font-mono text-sm">{sub.label}.{name.label}.mega</span>
              <div className="flex items-center gap-2">
                <a
                  href={`https://megaeth-testnet-v2.blockscout.com/token/${CONTRACTS.testnet.megaNames}/instance/${sub.tokenId.toString()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-[var(--surface-hover)]"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Renewal section - only for parent names */}
      {!hasSubdomains && (
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
  const [settingPrimaryFor, setSettingPrimaryFor] = useState<bigint | null>(null)

  // Get primary name using getName
  const { data: primaryName, refetch: refetchPrimaryName } = useReadContract({
    address: CONTRACTS.testnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'getName',
    args: [address!],
    query: { enabled: !!address },
  })

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
        to: CONTRACTS.testnet.megaNames,
        data,
        chain: {
          id: MEGAETH_TESTNET_CHAIN_ID,
          name: 'MegaETH Testnet',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://carrot.megaeth.com/rpc'] } },
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
        address: CONTRACTS.testnet.megaNames,
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
              address: CONTRACTS.testnet.megaNames,
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

      // Attach subdomains to their parents
      for (const name of names) {
        const subs = subdomainsByParent.get(name.tokenId.toString())
        if (subs) {
          name.subdomains = subs
        }
      }

      // Sort by expiration date (soonest first)
      names.sort((a, b) => Number(a.expiresAt - b.expiresAt))

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
          <div className="border border-[var(--border)] p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="font-label text-sm">LOADING YOUR NAMES...</p>
          </div>
        ) : ownedNames.length === 0 ? (
          <div className="border border-[var(--border)] p-8 text-center">
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
                  {ownedNames.reduce((acc, n) => acc + (n.subdomains?.length || 0), 0) > 0 && (
                    <span className="text-lg text-[var(--muted)] ml-2">
                      (+{ownedNames.reduce((acc, n) => acc + (n.subdomains?.length || 0), 0)} subdomains)
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

        {/* Info */}
        <div className="mt-8 p-6 bg-[var(--surface)] border border-[var(--border)]">
          <p className="font-label text-xs text-[var(--muted)] mb-2">TESTNET NOTICE</p>
          <p className="text-sm text-[var(--muted)]">
            MegaNames is currently on testnet. Names registered here are for testing only.
            Need test USDM? Use the faucet in the MegaETH ecosystem bot.
          </p>
        </div>
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
    </div>
  )
}
