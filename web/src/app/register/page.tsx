'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Loader2, AlertTriangle } from 'lucide-react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI, ERC20_ABI } from '@/lib/contracts'
import { getTokenId, formatUSDM, getPrice, isValidName } from '@/lib/utils'
import { megaethTestnet } from '@/lib/wagmi'

type Step = 'check' | 'approve' | 'register' | 'success'

const REQUIRED_CHAIN_ID = 6343 // MegaETH Testnet

function RegisterContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const name = searchParams.get('name')?.toLowerCase() || ''
  
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const isWrongChain = chainId !== REQUIRED_CHAIN_ID
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

  const isAvailable = records && records[0] === ''

  // Check USDM balance
  const { data: balance } = useReadContract({
    address: CONTRACTS.testnet.usdm,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  })

  // Check USDM allowance (refetch on mount to get fresh data)
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.testnet.usdm,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, CONTRACTS.testnet.megaNames],
    query: { 
      enabled: !!address,
      refetchOnMount: 'always',
    },
  })

  const hasEnoughBalance = balance && balance >= price
  const hasEnoughAllowance = allowance && allowance >= price

  // Approve USDM
  const { 
    writeContract: approve, 
    data: approveHash,
    isPending: isApproving,
    error: approveError,
  } = useWriteContract()

  const { isLoading: isWaitingApprove, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  // Register name
  const { 
    writeContract: register, 
    data: registerHash,
    isPending: isRegistering,
    error: registerError,
  } = useWriteContract()

  const { isLoading: isWaitingRegister, isSuccess: registerSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
  })

  // Update step based on state
  useEffect(() => {
    if (registerSuccess) {
      setStep('success')
    } else if (hasEnoughAllowance || approveSuccess) {
      setStep('register')
    } else {
      setStep('approve')
    }
  }, [hasEnoughAllowance, approveSuccess, registerSuccess])

  // Refetch allowance after approval
  useEffect(() => {
    if (approveSuccess) {
      refetchAllowance()
    }
  }, [approveSuccess, refetchAllowance])

  // Handle errors
  useEffect(() => {
    if (approveError) {
      setError(approveError.message)
    } else if (registerError) {
      setError(registerError.message)
    }
  }, [approveError, registerError])

  // Approve max uint256 for unlimited future registrations
  const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
  
  const handleApprove = () => {
    setError(null)
    approve({
      address: CONTRACTS.testnet.usdm,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.testnet.megaNames, MAX_UINT256],
    })
  }

  const handleRegister = () => {
    setError(null)
    register({
      address: CONTRACTS.testnet.megaNames,
      abi: MEGA_NAMES_ABI,
      functionName: 'registerDirect',
      args: [name, address!],
    })
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

        {/* Steps */}
        {hasEnoughBalance && step !== 'success' && (
          <div className="space-y-4">
            {/* Step 1: Approve */}
            <div className={`border-2 p-6 ${step === 'approve' ? 'border-black' : 'border-[#ccc]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 border-2 flex items-center justify-center font-bold ${
                    hasEnoughAllowance || approveSuccess ? 'bg-black text-white border-black' : 'border-black'
                  }`}>
                    {hasEnoughAllowance || approveSuccess ? <Check className="w-4 h-4" /> : '1'}
                  </div>
                  <div>
                    <p className="font-semibold">APPROVE USDM</p>
                    <p className="text-sm text-[#666]">
                      {hasEnoughAllowance ? 'Already approved ✓' : 'One-time approval for all future registrations'}
                    </p>
                  </div>
                </div>
                {step === 'approve' && !hasEnoughAllowance && (
                  <button
                    onClick={handleApprove}
                    disabled={isApproving || isWaitingApprove}
                    className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
                  >
                    {isApproving || isWaitingApprove ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'APPROVE'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Step 2: Register */}
            <div className={`border-2 p-6 ${step === 'register' ? 'border-black' : 'border-[#ccc]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 border-2 flex items-center justify-center font-bold ${
                    registerSuccess ? 'bg-black text-white border-black' : 'border-black'
                  }`}>
                    {registerSuccess ? <Check className="w-4 h-4" /> : '2'}
                  </div>
                  <div>
                    <p className="font-semibold">REGISTER NAME</p>
                    <p className="text-sm text-[#666]">Mint {name}.mega to your wallet</p>
                  </div>
                </div>
                {step === 'register' && (
                  <button
                    onClick={handleRegister}
                    disabled={isRegistering || isWaitingRegister}
                    className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
                  >
                    {isRegistering || isWaitingRegister ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'REGISTER'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
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
        )}

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
