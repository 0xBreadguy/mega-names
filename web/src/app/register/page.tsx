'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  useAccount, 
  useReadContract, 
  useWriteContract,
  useSwitchChain,
  usePublicClient,
  useWalletClient
} from 'wagmi'
import { erc20Abi, encodeFunctionData, type Hash } from 'viem'
import { CONTRACTS, MEGA_NAMES_ABI } from '@/lib/contracts'
import { getTokenId, formatUSDM, getPrice, isValidName, calculateFee, getDiscountLabel } from '@/lib/utils'
import { Loader2, Check, ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const MEGAETH_TESTNET_CHAIN_ID = 6343
const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

type Step = 'check' | 'connect' | 'wrong-chain' | 'approve' | 'register' | 'pending' | 'success'

function RegisterContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const name = searchParams.get('name')?.toLowerCase()
  
  const { address, isConnected, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  const [step, setStep] = useState<Step>('check')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<Hash | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [numYears, setNumYears] = useState(1)

  const isWrongChain = isConnected && chainId !== MEGAETH_TESTNET_CHAIN_ID
  const tokenId = name ? getTokenId(name) : BigInt(0)
  const pricePerYear = name ? getPrice(name.length) : BigInt(0)
  const price = name ? calculateFee(name.length, numYears) : BigInt(0)
  const discountLabel = getDiscountLabel(numYears)

  // Check if name is available
  const { data: records, isLoading: checkingAvailability } = useReadContract({
    address: CONTRACTS.testnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'records',
    args: [tokenId],
    query: { enabled: !!name },
  })

  // Check USDM balance
  const { data: balance } = useReadContract({
    address: CONTRACTS.testnet.usdm,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  })

  // Check existing USDM allowance (always fetch fresh)
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.testnet.usdm,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address!, CONTRACTS.testnet.megaNames],
    query: { 
      enabled: !!address,
      staleTime: 0,  // Always refetch - allowances can change externally
      refetchOnMount: true,
    },
  })

  const isAvailable = records && records[0] === ''
  const hasBalance = balance && balance >= price
  const hasAllowance = allowance && allowance >= price

  // Send transaction using MegaETH realtime API
  const sendRealtimeTransaction = async (
    to: `0x${string}`,
    data: `0x${string}`
  ): Promise<{ hash: Hash; success: boolean }> => {
    if (!walletClient || !publicClient) {
      throw new Error('Wallet not connected')
    }

    console.log('Sending transaction to:', to)

    // Send transaction - wallet signs it
    const hash = await walletClient.sendTransaction({
      to,
      data,
      chain: {
        id: MEGAETH_TESTNET_CHAIN_ID,
        name: 'MegaETH Testnet',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: ['https://carrot.megaeth.com/rpc'] } },
      },
    })

    console.log('Transaction hash:', hash)

    // Wait for receipt - MegaETH is fast so this should be near-instant
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash,
      timeout: 30_000, // 30 second timeout
    })

    console.log('Receipt:', receipt)

    return { hash, success: receipt.status === 'success' }
  }

  // Redirect if invalid name
  useEffect(() => {
    if (!name || !isValidName(name)) {
      router.push('/')
    }
  }, [name, router])

  // Update step based on state
  useEffect(() => {
    // Don't change step while pending or after success
    if (isPending || step === 'success') return
    
    if (checkingAvailability) {
      setStep('check')
    } else if (!isConnected) {
      setStep('connect')
    } else if (isWrongChain) {
      setStep('wrong-chain')
    } else if (isAvailable === false) {
      setStep('check') // Will show "not available" message
    } else if (!hasAllowance) {
      setStep('approve')
    } else {
      setStep('register')
    }
  }, [checkingAvailability, isConnected, isWrongChain, isAvailable, hasAllowance, isPending, step])

  const handleSwitchChain = () => {
    switchChain({ chainId: MEGAETH_TESTNET_CHAIN_ID })
  }

  const handleApprove = async () => {
    setError(null)
    setIsPending(true)
    setStep('pending')

    try {
      // Approve unlimited so user only needs to approve once
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACTS.testnet.megaNames, MAX_UINT256],
      })

      const { hash, success } = await sendRealtimeTransaction(
        CONTRACTS.testnet.usdm,
        data
      )

      setTxHash(hash)

      if (success) {
        await refetchAllowance()
        setStep('register')
      } else {
        setError('Approval transaction failed')
        setStep('approve')
      }
    } catch (err: any) {
      console.error('Approval error:', err)
      setError(err.shortMessage || err.message || 'Approval failed')
      setStep('approve')
    } finally {
      setIsPending(false)
    }
  }

  const handleRegister = async () => {
    if (!address || !name) return
    setError(null)
    setIsPending(true)
    setStep('pending')

    try {
      const data = encodeFunctionData({
        abi: MEGA_NAMES_ABI,
        functionName: 'register',
        args: [name, address, BigInt(numYears)],
      })

      const { hash, success } = await sendRealtimeTransaction(
        CONTRACTS.testnet.megaNames,
        data
      )

      setTxHash(hash)

      if (success) {
        setStep('success')
      } else {
        setError('Registration transaction failed')
        setStep('register')
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.shortMessage || err.message || 'Registration failed')
      setStep('register')
    } finally {
      setIsPending(false)
    }
  }

  if (!name) return null

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-black mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-label text-sm">BACK TO SEARCH</span>
        </Link>

        {/* Name card */}
        <div className="border border-[var(--border)] mb-8">
          <div className="p-8 border-b border-[var(--border)]">
            <p className="font-label text-sm text-[var(--muted)] mb-2">REGISTERING</p>
            <h1 className="font-display text-5xl lg:text-6xl truncate max-w-full">{name}.mega</h1>
          </div>
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-label text-xs text-[var(--muted)]">PRICE / YEAR</p>
                <p className="font-display text-3xl">{formatUSDM(pricePerYear)}</p>
              </div>
              <div className="text-right">
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
            </div>
            <div className="border-t border-[var(--border)] pt-4 flex items-center justify-between">
              <div>
                <p className="font-label text-sm text-[var(--muted)]">TOTAL</p>
                {discountLabel && (
                  <p className="text-xs text-[#2d6b3f] font-bold">{discountLabel}</p>
                )}
              </div>
              <div className="text-right">
                {discountLabel && (
                  <p className="text-sm text-[var(--muted)] line-through">{formatUSDM(pricePerYear * BigInt(numYears))}</p>
                )}
                <p className="font-display text-4xl">{formatUSDM(price)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        {isAvailable && isConnected && step !== 'success' && step !== 'pending' && (
          <div className="mb-6 flex items-center gap-4">
            <div className={`flex items-center gap-2 ${hasAllowance ? 'text-[#2d6b3f]' : 'text-black'}`}>
              <div className={`w-8 h-8 flex items-center justify-center border-2 ${hasAllowance ? 'border-green-600 bg-green-600 text-white' : 'border-black'}`}>
                {hasAllowance ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className="font-label text-sm">APPROVE</span>
            </div>
            <div className="flex-1 h-0.5 bg-[var(--border)]" />
            <div className={`flex items-center gap-2 ${step === 'register' ? 'text-black' : 'text-[var(--muted)]'}`}>
              <div className={`w-8 h-8 flex items-center justify-center border-2 ${step === 'register' ? 'border-black' : 'border-[var(--border-light)]'}`}>
                2
              </div>
              <span className="font-label text-sm">REGISTER</span>
            </div>
          </div>
        )}

        {/* Status messages */}
        {step === 'check' && checkingAvailability && (
          <div className="border border-[var(--border)] p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="font-label text-sm">CHECKING AVAILABILITY...</p>
          </div>
        )}

        {step === 'check' && !checkingAvailability && isAvailable === false && (
          <div className="border border-[var(--border)] p-8 text-center">
            <p className="font-label text-sm text-red-600 mb-4">NAME NOT AVAILABLE</p>
            <p className="text-[var(--muted)]">This name has already been registered</p>
            <Link href="/" className="btn-secondary inline-block mt-4 px-6 py-3">
              SEARCH ANOTHER NAME
            </Link>
          </div>
        )}

        {step === 'connect' && (
          <div className="border border-[var(--border)] p-8 text-center">
            <p className="font-label text-sm mb-4">CONNECT YOUR WALLET TO CONTINUE</p>
            <p className="text-[var(--muted)]">Use the connect button in the header</p>
          </div>
        )}

        {step === 'wrong-chain' && (
          <div className="border border-[var(--border)]">
            <div className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
              <p className="font-label text-sm mb-2">WRONG NETWORK</p>
              <p className="text-[var(--muted)] mb-6">
                Please switch to MegaETH Testnet to continue
              </p>
            </div>
            <button
              onClick={handleSwitchChain}
              disabled={isSwitching}
              className="btn-primary w-full py-5 text-lg font-label disabled:opacity-50"
            >
              {isSwitching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                  SWITCHING...
                </>
              ) : (
                'SWITCH TO MEGAETH'
              )}
            </button>
          </div>
        )}

        {step === 'approve' && (
          <div className="border border-[var(--border)]">
            <div className="p-8">
              {!hasBalance && (
                <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400">
                  <p className="font-label text-sm text-yellow-800">INSUFFICIENT USDM BALANCE</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    You need {formatUSDM(price)} USDM to register this name.
                    {balance !== undefined && ` You have ${formatUSDM(balance)}.`}
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-400">
                  <p className="font-label text-sm text-red-800">ERROR</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              )}

              <p className="text-[var(--muted)] mb-2">
                <strong>Step 1:</strong> Approve USDM spending
              </p>
              <p className="text-sm text-[var(--muted)]">
                This is a one-time approval that allows MegaNames to use your USDM for registrations.
                You won&apos;t need to approve again for future names.
              </p>
            </div>
            <button
              onClick={handleApprove}
              disabled={!hasBalance}
              className="btn-primary w-full py-5 text-lg font-label disabled:opacity-50 disabled:cursor-not-allowed"
            >
              APPROVE USDM
            </button>
          </div>
        )}

        {step === 'register' && (
          <div className="border border-[var(--border)]">
            <div className="p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-400">
                  <p className="font-label text-sm text-red-800">ERROR</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              )}

              <p className="text-[var(--muted)] mb-2">
                <strong>Step 2:</strong> Register your name
              </p>
              <p className="text-sm text-[var(--muted)]">
                USDM approved! Click below to complete registration.
              </p>
            </div>
            <button
              onClick={handleRegister}
              className="btn-primary w-full py-5 text-lg font-label"
            >
              <span className="truncate block">REGISTER {name.toUpperCase()}.MEGA</span>
            </button>
          </div>
        )}

        {step === 'pending' && (
          <div className="border border-[var(--border)] p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p className="font-label text-sm mb-2">PROCESSING...</p>
            <p className="text-[var(--muted)]">Confirming transaction on MegaETH</p>
          </div>
        )}

        {step === 'success' && (
          <div className="border border-[var(--border)] p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500 flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <p className="font-label text-sm mb-2">SUCCESS!</p>
            <p className="text-[var(--muted)] mb-6">
              You are now the owner of <strong>{name}.mega</strong>
            </p>
            {txHash && (
              <a 
                href={`https://megaeth-testnet-v2.blockscout.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mb-4 inline-block"
              >
                View on Explorer →
              </a>
            )}
            <div className="mt-4">
              <Link href="/my-names" className="btn-primary inline-block px-8 py-4">
                VIEW MY NAMES
              </Link>
            </div>
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
