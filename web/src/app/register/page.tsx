'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Loader2, AlertTriangle } from 'lucide-react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId, useSignTypedData } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI, ERC20_ABI } from '@/lib/contracts'
import { getTokenId, formatUSDM, getPrice, isValidName } from '@/lib/utils'

const REQUIRED_CHAIN_ID = 6343 // MegaETH Testnet

function RegisterContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name')?.toLowerCase() || ''
  
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const isWrongChain = chainId !== REQUIRED_CHAIN_ID
  
  const [error, setError] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)

  const tokenId = name ? getTokenId(name) : BigInt(0)
  const price = name ? getPrice(name.length) : BigInt(0)

  // Check if name is available
  const { data: records, isLoading: checkingAvailability } = useReadContract({
    address: CONTRACTS.testnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'records',
    args: [tokenId],
    query: { enabled: !!name },
  })

  const isAvailable = records && records[0] === ''

  // Check USDM balance
  const { data: balance } = useReadContract({
    address: CONTRACTS.testnet.usdm,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  })

  // Get nonce for permit
  const { data: nonce } = useReadContract({
    address: CONTRACTS.testnet.usdm,
    abi: ERC20_ABI,
    functionName: 'nonces',
    args: [address!],
    query: { enabled: !!address },
  })

  const hasEnoughBalance = balance && balance >= price

  // Sign permit
  const { signTypedDataAsync } = useSignTypedData()

  // Register with permit
  const { 
    writeContract: registerWithPermit, 
    data: registerHash,
    isPending: isWriting,
    error: registerError,
  } = useWriteContract()

  const { isLoading: isWaitingRegister, isSuccess: registerSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
  })

  useEffect(() => {
    if (registerError) {
      setError(registerError.message)
      setIsRegistering(false)
    }
  }, [registerError])

  const handleRegister = async () => {
    if (!address || !name || nonce === undefined) return
    
    setError(null)
    setIsRegistering(true)

    try {
      // Create permit deadline (1 hour from now)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)

      // Sign EIP-2612 permit
      const signature = await signTypedDataAsync({
        types: {
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        },
        primaryType: 'Permit',
        domain: {
          name: 'Mock USDM',
          version: '1',
          chainId: REQUIRED_CHAIN_ID,
          verifyingContract: CONTRACTS.testnet.usdm,
        },
        message: {
          owner: address,
          spender: CONTRACTS.testnet.megaNames,
          value: price,
          nonce: nonce,
          deadline: deadline,
        },
      })

      // Parse signature
      const r = signature.slice(0, 66) as `0x${string}`
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`
      const v = parseInt(signature.slice(130, 132), 16)

      // Call registerWithPermit
      registerWithPermit({
        address: CONTRACTS.testnet.megaNames,
        abi: MEGA_NAMES_ABI,
        functionName: 'registerWithPermit',
        args: [name, address, deadline, v, r, s],
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign permit')
      setIsRegistering(false)
    }
  }

  if (!name || !isValidName(name)) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-2xl mb-4">INVALID NAME</p>
          <Link href="/" className="btn-secondary px-6 py-3 inline-block">
            ← BACK TO SEARCH
          </Link>
        </div>
      </div>
    )
  }

  if (checkingAvailability) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!isAvailable) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-2xl mb-4">{name}.mega IS NOT AVAILABLE</p>
          <Link href="/" className="btn-secondary px-6 py-3 inline-block">
            ← SEARCH ANOTHER NAME
          </Link>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-2xl mb-4">CONNECT WALLET TO REGISTER</p>
          <p className="text-[#666] mb-8">You need to connect your wallet to register {name}.mega</p>
          <Link href="/" className="btn-secondary px-6 py-3 inline-block">
            ← BACK
          </Link>
        </div>
      </div>
    )
  }

  if (isWrongChain) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 mx-auto mb-6" />
          <p className="font-display text-2xl mb-4">WRONG NETWORK</p>
          <p className="text-[#666] mb-8">
            Please switch to MegaETH Testnet to register {name}.mega
          </p>
          <button
            onClick={() => switchChain({ chainId: REQUIRED_CHAIN_ID })}
            disabled={isSwitching}
            className="btn-primary px-8 py-3"
          >
            {isSwitching ? (
              <Loader2 className="w-5 h-5 animate-spin inline" />
            ) : (
              'SWITCH TO MEGAETH TESTNET'
            )}
          </button>
        </div>
      </div>
    )
  }

  // Success state
  if (registerSuccess) {
    return (
      <div className="min-h-[calc(100vh-64px)]">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="border-2 border-black p-8 text-center">
            <div className="w-16 h-16 bg-black text-white flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8" />
            </div>
            <p className="font-display text-3xl mb-4">REGISTERED!</p>
            <p className="text-[#666] mb-8">{name}.mega is now yours</p>
            <div className="flex gap-4 justify-center">
              <Link href="/my-names" className="btn-primary px-6 py-3">
                MY NAMES
              </Link>
              <Link href="/" className="btn-secondary px-6 py-3">
                SEARCH MORE
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-[#666] hover:text-black mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-label text-sm">BACK TO SEARCH</span>
        </Link>

        {/* Name display */}
        <div className="border-2 border-black p-8 mb-8">
          <p className="font-label text-sm text-[#666] mb-2">REGISTERING</p>
          <p className="font-display text-5xl lg:text-6xl">{name}.mega</p>
        </div>

        {/* Price */}
        <div className="border-2 border-black p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-label text-sm text-[#666]">PRICE / YEAR</p>
              <p className="font-display text-3xl">{formatUSDM(price)}</p>
            </div>
            <div className="text-right">
              <p className="font-label text-sm text-[#666]">YOUR BALANCE</p>
              <p className={`font-display text-2xl ${hasEnoughBalance ? '' : 'text-red-600'}`}>
                {balance ? formatUSDM(balance) : '...'}
              </p>
            </div>
          </div>
        </div>

        {!hasEnoughBalance && (
          <div className="border-2 border-dashed border-red-600 p-6 mb-8 text-center">
            <p className="text-red-600 font-semibold">INSUFFICIENT USDM BALANCE</p>
            <p className="text-[#666] text-sm mt-2">You need {formatUSDM(price)} to register this name</p>
          </div>
        )}

        {/* Single Register Button */}
        {hasEnoughBalance && (
          <button
            onClick={handleRegister}
            disabled={isRegistering || isWriting || isWaitingRegister}
            className="btn-primary w-full py-4 text-lg disabled:opacity-50"
          >
            {isRegistering || isWriting || isWaitingRegister ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {isWaitingRegister ? 'CONFIRMING...' : 'SIGNING...'}
              </span>
            ) : (
              `REGISTER ${name.toUpperCase()}.MEGA FOR ${formatUSDM(price)}`
            )}
          </button>
        )}

        <p className="text-center text-[#666] text-sm mt-4">
          One signature + one transaction. No separate approval needed.
        </p>

        {/* Error display */}
        {error && (
          <div className="border-2 border-red-600 p-4 mt-4">
            <p className="text-red-600 text-sm font-mono break-all">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}
