'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { useReadContract } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI } from '@/lib/contracts'
import { shortenAddress, formatUSDM, getPrice } from '@/lib/utils'
import { Loader2, ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface OwnedName {
  tokenId: bigint
  label: string
  expiresAt: bigint
}

export default function MyNamesPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  
  const [ownedNames, setOwnedNames] = useState<OwnedName[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Get primary name using getName
  const { data: primaryName } = useReadContract({
    address: CONTRACTS.testnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'getName',
    args: [address!],
    query: { enabled: !!address },
  })

  // Fetch owned names from events + verify ownership
  useEffect(() => {
    async function fetchOwnedNames() {
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

    fetchOwnedNames()
  }, [address, publicClient])

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
                    <div className="flex items-center gap-3">
                      <a
                        href={`https://megaeth-testnet-v2.blockscout.com/token/${CONTRACTS.testnet.megaNames}/instance/${name.tokenId.toString()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-100 transition-colors"
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
    </div>
  )
}
