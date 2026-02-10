'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { useReadContract } from 'wagmi'
import { encodeFunctionData, isAddress, type Hash } from 'viem'
import { CONTRACTS, MEGA_NAMES_ABI } from '@/lib/contracts'
import { shortenAddress, formatUSDM, getPrice } from '@/lib/utils'
import { Loader2, ArrowLeft, ExternalLink, Send, X, Check } from 'lucide-react'
import Link from 'next/link'

const MEGAETH_TESTNET_CHAIN_ID = 6343

interface OwnedName {
  tokenId: bigint
  label: string
  expiresAt: bigint
}

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

  const isValidRecipient = isAddress(recipient) && recipient.toLowerCase() !== address.toLowerCase()

  const handleTransfer = async () => {
    if (!walletClient || !publicClient || !isValidRecipient) return
    
    setError(null)
    setIsPending(true)

    try {
      const data = encodeFunctionData({
        abi: MEGA_NAMES_ABI,
        functionName: 'transferFrom',
        args: [address, recipient as `0x${string}`, name.tokenId],
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-black max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b-2 border-black flex items-center justify-between">
          <h2 className="font-display text-2xl">TRANSFER NAME</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-500 flex items-center justify-center">
                <Check className="w-8 h-8 text-white" />
              </div>
              <p className="font-label text-sm mb-2">TRANSFER COMPLETE!</p>
              <p className="text-[#666]">
                {name.label}.mega has been transferred
              </p>
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
                <p className="font-label text-xs text-[#666] mb-2">TRANSFERRING</p>
                <p className="font-display text-3xl">{name.label}.mega</p>
              </div>

              <div className="mb-6">
                <label className="font-label text-xs text-[#666] mb-2 block">
                  RECIPIENT ADDRESS
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-3 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  disabled={isPending}
                />
                {recipient && !isAddress(recipient) && (
                  <p className="text-red-600 text-xs mt-1">Invalid address</p>
                )}
                {recipient && recipient.toLowerCase() === address.toLowerCase() && (
                  <p className="text-red-600 text-xs mt-1">Cannot transfer to yourself</p>
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

        {/* Footer */}
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
      </div>
    </div>
  )
}

export default function MyNamesPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  
  const [ownedNames, setOwnedNames] = useState<OwnedName[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [transferringName, setTransferringName] = useState<OwnedName | null>(null)

  // Get primary name using getName
  const { data: primaryName, refetch: refetchPrimaryName } = useReadContract({
    address: CONTRACTS.testnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'getName',
    args: [address!],
    query: { enabled: !!address },
  })

  // Fetch owned names from events + verify ownership
  const fetchOwnedNames = async () => {
    if (!address || !publicClient) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    
    try {
      // Get all NameRegistered events where user was the owner
      const registrationLogs = await publicClient.getLogs({
        address: CONTRACTS.testnet.megaNames,
        event: {
          type: 'event',
          name: 'NameRegistered',
          inputs: [
            { name: 'tokenId', type: 'uint256', indexed: true },
            { name: 'label', type: 'string', indexed: false },
            { name: 'owner', type: 'address', indexed: true },
            { name: 'expiresAt', type: 'uint256', indexed: false },
          ],
        },
        args: {
          owner: address,
        },
        fromBlock: BigInt(0),
        toBlock: 'latest',
      })

      // Also get Transfer events TO this address (in case of secondary market)
      const transferLogs = await publicClient.getLogs({
        address: CONTRACTS.testnet.megaNames,
        event: {
          type: 'event',
          name: 'Transfer',
          inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'id', type: 'uint256', indexed: true },
          ],
        },
        args: {
          to: address,
        },
        fromBlock: BigInt(0),
        toBlock: 'latest',
      })

      // Collect unique token IDs
      const tokenIds = new Set<string>()
      
      for (const log of registrationLogs) {
        if (log.args.tokenId) {
          tokenIds.add(log.args.tokenId.toString())
        }
      }
      
      for (const log of transferLogs) {
        if (log.args.id) {
          tokenIds.add(log.args.id.toString())
        }
      }

      // Verify current ownership and get details for each token
      const names: OwnedName[] = []
      
      for (const tokenIdStr of tokenIds) {
        const tokenId = BigInt(tokenIdStr)
        
        try {
          // Check if user still owns it
          const owner = await publicClient.readContract({
            address: CONTRACTS.testnet.megaNames,
            abi: MEGA_NAMES_ABI,
            functionName: 'ownerOf',
            args: [tokenId],
          })
          
          if (owner.toLowerCase() !== address.toLowerCase()) continue
          
          // Get record details
          const record = await publicClient.readContract({
            address: CONTRACTS.testnet.megaNames,
            abi: MEGA_NAMES_ABI,
            functionName: 'records',
            args: [tokenId],
          })
          
          const [label, , expiresAt] = record as [string, bigint, bigint, bigint, bigint]
          
          // Only include if not expired
          if (BigInt(expiresAt) > BigInt(Math.floor(Date.now() / 1000))) {
            names.push({
              tokenId,
              label,
              expiresAt: BigInt(expiresAt),
            })
          }
        } catch {
          // Token might not exist or be burned, skip
          continue
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

  const handleTransferSuccess = () => {
    // Refresh the list after transfer
    fetchOwnedNames()
    refetchPrimaryName()
  }

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

  if (!isConnected) {
    return (
      <div className="min-h-[calc(100vh-64px)]">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-4xl mb-4">MY NAMES</h1>
          <p className="text-[#666] mb-8">Connect your wallet to view your names</p>
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
            <Link href="/" className="inline-flex items-center gap-2 text-[#666] hover:text-black mb-4">
              <ArrowLeft className="w-4 h-4" />
              <span className="font-label text-sm">BACK</span>
            </Link>
            <h1 className="font-display text-4xl">MY NAMES</h1>
          </div>
          <div className="text-right">
            <p className="font-label text-xs text-[#666]">CONNECTED AS</p>
            <p className="font-mono">{shortenAddress(address!)}</p>
          </div>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="border-2 border-black p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="font-label text-sm">LOADING YOUR NAMES...</p>
          </div>
        ) : ownedNames.length === 0 ? (
          <div className="border-2 border-black p-8 text-center">
            <p className="font-label text-sm mb-4">NO NAMES FOUND</p>
            <p className="text-[#666] mb-6">You don&apos;t own any .mega names yet</p>
            <Link href="/" className="btn-primary inline-block px-8 py-4">
              SEARCH FOR A NAME
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {ownedNames.map((name) => {
              const days = daysUntilExpiry(name.expiresAt)
              const isPrimary = primaryName === name.label
              const isExpiringSoon = days <= 30
              
              return (
                <div 
                  key={name.tokenId.toString()} 
                  className={`border-2 border-black ${isPrimary ? 'bg-[#F8F8F8]' : ''}`}
                >
                  <div className="p-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="font-display text-3xl">{name.label}.mega</h2>
                        {isPrimary && (
                          <span className="px-2 py-1 text-xs font-label bg-black text-white">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#666] mt-1">
                        Expires {formatExpiry(name.expiresAt)}
                        {isExpiringSoon && (
                          <span className="text-orange-600 ml-2">
                            ({days} days left)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTransferringName(name)}
                        className="p-2 hover:bg-gray-100 transition-colors border-2 border-black"
                        title="Transfer"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                      <a
                        href={`https://megaeth-testnet-v2.blockscout.com/token/${CONTRACTS.testnet.megaNames}/instance/${name.tokenId.toString()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-100 transition-colors border-2 border-black"
                        title="View on Explorer"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                  
                  {/* Renewal price hint */}
                  <div className="px-6 py-3 border-t-2 border-black bg-[#FAFAFA] flex items-center justify-between">
                    <span className="text-xs text-[#666] font-label">RENEWAL</span>
                    <span className="text-sm">{formatUSDM(getPrice(name.label.length))}/year</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary */}
        {!isLoading && ownedNames.length > 0 && (
          <div className="mt-8 p-6 border-2 border-black bg-[#F8F8F8]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-label text-xs text-[#666]">TOTAL NAMES</p>
                <p className="font-display text-2xl">{ownedNames.length}</p>
              </div>
              <Link href="/" className="btn-secondary px-6 py-3">
                REGISTER MORE
              </Link>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-6 bg-[#F0F0F0] border-2 border-[#DDD]">
          <p className="font-label text-xs text-[#666] mb-2">TESTNET NOTICE</p>
          <p className="text-sm text-[#666]">
            MegaNames is currently on testnet. Names registered here are for testing only.
            Need test USDM? Use the faucet in the MegaETH ecosystem bot.
          </p>
        </div>
      </div>

      {/* Transfer Modal */}
      {transferringName && (
        <TransferModal
          name={transferringName}
          address={address!}
          onClose={() => setTransferringName(null)}
          onSuccess={handleTransferSuccess}
        />
      )}
    </div>
  )
}
