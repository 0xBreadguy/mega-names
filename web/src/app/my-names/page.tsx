'use client'

import { useAccount } from 'wagmi'
import { useReadContract } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI } from '@/lib/contracts'
import { shortenAddress } from '@/lib/utils'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function MyNamesPage() {
  const { address, isConnected } = useAccount()

  // Get primary name using getName
  const { data: primaryName, isLoading } = useReadContract({
    address: CONTRACTS.testnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'getName',
    args: [address!],
    query: { enabled: !!address },
  })

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

        {/* Primary name */}
        {isLoading ? (
          <div className="border-2 border-black p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          </div>
        ) : primaryName ? (
          <div className="border-2 border-black">
            <div className="p-8 border-b-2 border-black">
              <p className="font-label text-xs text-[#666] mb-2">PRIMARY NAME</p>
              <p className="font-display text-5xl">{primaryName}.mega</p>
            </div>
            <div className="p-8">
              <p className="text-[#666]">
                This name resolves to your address: {shortenAddress(address!)}
              </p>
            </div>
          </div>
        ) : (
          <div className="border-2 border-black p-8 text-center">
            <p className="font-label text-sm mb-4">NO NAMES FOUND</p>
            <p className="text-[#666] mb-6">You don&apos;t own any .mega names yet</p>
            <Link href="/" className="btn-primary inline-block px-8 py-4">
              SEARCH FOR A NAME
            </Link>
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
