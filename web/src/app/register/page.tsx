'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  useAccount, 
  useReadContract, 
  useWriteContract,
  useWaitForTransactionReceipt
} from 'wagmi'
import { erc20Abi } from 'viem'
import { CONTRACTS, MEGA_NAMES_ABI } from '@/lib/contracts'
import { getTokenId, formatUSDM, getPrice, isValidName } from '@/lib/utils'
import { Loader2, Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Step = 'check' | 'connect' | 'approve' | 'register' | 'pending' | 'success'

function RegisterContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const name = searchParams.get('name')?.toLowerCase()
  
  const { address, isConnected } = useAccount()
  const [step, setStep] = useState<Step>('check')
  const [error, setError] = useState<string | null>(null)

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

  // Check USDM balance
  const { data: balance } = useReadContract({
    address: CONTRACTS.testnet.usdm,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  })

  // Check existing USDM allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.testnet.usdm,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address!, CONTRACTS.testnet.megaNames],
    query: { enabled: !!address },
  })

  const isAvailable = records && records[0] === ''
  const hasBalance = balance && balance >= price
  const hasAllowance = allowance && allowance >= price

  // Approve USDM
  const { 
    writeContract: approve, 
    data: approveHash,
    isPending: isApproving,
    reset: resetApprove
  } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  // Register name
  const { 
    writeContract: register, 
    data: registerHash,
    isPending: isRegistering,
  } = useWriteContract()

  const { isLoading: isRegisterConfirming, isSuccess: isRegisterSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
  })

  // Redirect if invalid name
  useEffect(() => {
    if (!name || !isValidName(name)) {
      router.push('/')
    }
  }, [name, router])

  // Update step based on state
  useEffect(() => {
    if (checkingAvailability) {
      setStep('check')
    } else if (!isConnected) {
      setStep('connect')
    } else if (isAvailable === false) {
      setStep('check') // Will show "not available" message
    } else if (!hasAllowance) {
      setStep('approve')
    } else {
      setStep('register')
    }
  }, [checkingAvailability, isConnected, isAvailable, hasAllowance])

  // After approval succeeds, refetch allowance and move to register
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance()
      resetApprove()
    }
  }, [isApproveSuccess, refetchAllowance, resetApprove])

  // After registration succeeds
  useEffect(() => {
    if (isRegisterSuccess) {
      setStep('success')
    }
  }, [isRegisterSuccess])

  // Handle pending states
  useEffect(() => {
    if (isApproving || isApproveConfirming) {
      setStep('pending')
    }
    if (isRegistering || isRegisterConfirming) {
      setStep('pending')
    }
  }, [isApproving, isApproveConfirming, isRegistering, isRegisterConfirming])

  const handleApprove = () => {
    setError(null)
    approve({
      address: CONTRACTS.testnet.usdm,
      abi: erc20Abi,
      functionName: 'approve',
      args: [CONTRACTS.testnet.megaNames, price],
    }, {
      onError: (err) => {
        setError(err.message)
        setStep('approve')
      }
    })
  }

  const handleRegister = () => {
    if (!address || !name) return
    setError(null)
    register({
      address: CONTRACTS.testnet.megaNames,
      abi: MEGA_NAMES_ABI,
      functionName: 'registerDirect',
      args: [name, address],
    }, {
      onError: (err) => {
        setError(err.message)
        setStep('register')
      }
    })
  }

  if (!name) return null

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-[#666] hover:text-black mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-label text-sm">BACK TO SEARCH</span>
        </Link>

        {/* Name card */}
        <div className="border-2 border-black mb-8">
          <div className="p-8 border-b-2 border-black">
            <p className="font-label text-sm text-[#666] mb-2">REGISTERING</p>
            <h1 className="font-display text-5xl lg:text-6xl">{name}.mega</h1>
          </div>
          <div className="p-8 flex items-center justify-between">
            <div>
              <p className="font-label text-xs text-[#666]">PRICE / YEAR</p>
              <p className="font-display text-4xl">{formatUSDM(price)}</p>
            </div>
            <div className="text-right">
              <p className="font-label text-xs text-[#666]">DURATION</p>
              <p className="font-display text-4xl">1 YEAR</p>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        {isAvailable && isConnected && step !== 'success' && step !== 'pending' && (
          <div className="mb-6 flex items-center gap-4">
            <div className={`flex items-center gap-2 ${hasAllowance ? 'text-green-600' : 'text-black'}`}>
              <div className={`w-8 h-8 flex items-center justify-center border-2 ${hasAllowance ? 'border-green-600 bg-green-600 text-white' : 'border-black'}`}>
                {hasAllowance ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className="font-label text-sm">APPROVE</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300" />
            <div className={`flex items-center gap-2 ${step === 'register' ? 'text-black' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 flex items-center justify-center border-2 ${step === 'register' ? 'border-black' : 'border-gray-300'}`}>
                2
              </div>
              <span className="font-label text-sm">REGISTER</span>
            </div>
          </div>
        )}

        {/* Status messages */}
        {step === 'check' && checkingAvailability && (
          <div className="border-2 border-black p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="font-label text-sm">CHECKING AVAILABILITY...</p>
          </div>
        )}

        {step === 'check' && !checkingAvailability && isAvailable === false && (
          <div className="border-2 border-black p-8 text-center">
            <p className="font-label text-sm text-red-600 mb-4">NAME NOT AVAILABLE</p>
            <p className="text-[#666]">This name has already been registered</p>
            <Link href="/" className="btn-secondary inline-block mt-4 px-6 py-3">
              SEARCH ANOTHER NAME
            </Link>
          </div>
        )}

        {step === 'connect' && (
          <div className="border-2 border-black p-8 text-center">
            <p className="font-label text-sm mb-4">CONNECT YOUR WALLET TO CONTINUE</p>
            <p className="text-[#666]">Use the connect button in the header</p>
          </div>
        )}

        {step === 'approve' && (
          <div className="border-2 border-black">
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

              <p className="text-[#666] mb-2">
                <strong>Step 1:</strong> Approve USDM spending
              </p>
              <p className="text-sm text-[#999]">
                This allows the MegaNames contract to spend {formatUSDM(price)} USDM for this registration.
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
          <div className="border-2 border-black">
            <div className="p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-400">
                  <p className="font-label text-sm text-red-800">ERROR</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              )}

              <p className="text-[#666] mb-2">
                <strong>Step 2:</strong> Register your name
              </p>
              <p className="text-sm text-[#999]">
                USDM approved! Click below to complete registration.
              </p>
            </div>
            <button
              onClick={handleRegister}
              className="btn-primary w-full py-5 text-lg font-label"
            >
              REGISTER {name.toUpperCase()}.MEGA
            </button>
          </div>
        )}

        {step === 'pending' && (
          <div className="border-2 border-black p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p className="font-label text-sm mb-2">
              {isApproving || isApproveConfirming ? 'APPROVING USDM...' : 'REGISTERING...'}
            </p>
            <p className="text-[#666]">Waiting for transaction confirmation</p>
          </div>
        )}

        {step === 'success' && (
          <div className="border-2 border-black p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500 flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <p className="font-label text-sm mb-2">SUCCESS!</p>
            <p className="text-[#666] mb-6">
              You are now the owner of <strong>{name}.mega</strong>
            </p>
            {registerHash && (
              <a 
                href={`https://megaeth-testnet.explorer.caldera.xyz/tx/${registerHash}`}
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
