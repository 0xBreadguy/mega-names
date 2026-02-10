'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  useAccount, 
  useReadContract, 
  useSendCalls,
  useCallsStatus,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWalletClient
} from 'wagmi'
import { encodeFunctionData, erc20Abi } from 'viem'
import { CONTRACTS, MEGA_NAMES_ABI, ERC20_ABI } from '@/lib/contracts'
import { getTokenId, formatUSDM, getPrice, isValidName } from '@/lib/utils'
import { Loader2, Check, ArrowLeft, Zap } from 'lucide-react'
import Link from 'next/link'

type Step = 'check' | 'connect' | 'ready' | 'pending' | 'success'

function RegisterContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const name = searchParams.get('name')?.toLowerCase()
  
  const { address, isConnected, connector } = useAccount()
  const [step, setStep] = useState<Step>('check')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [useFallback, setUseFallback] = useState(true) // Default to permit flow
  
  // Wallets known to support EIP-5792 sendCalls
  const EIP5792_WALLETS = ['MetaMask', 'Coinbase Wallet']
  
  // Detect wallet and set flow
  useEffect(() => {
    if (connector?.name) {
      const walletName = connector.name
      const supportsAtomicBatch = EIP5792_WALLETS.some(w => 
        walletName.toLowerCase().includes(w.toLowerCase())
      )
      setUseFallback(!supportsAtomicBatch)
      console.log(`Wallet: ${walletName}, EIP-5792 support: ${supportsAtomicBatch}`)
    }
  }, [connector?.name])

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
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  })

  // Check existing USDM allowance
  const { data: allowance } = useReadContract({
    address: CONTRACTS.testnet.usdm,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, CONTRACTS.testnet.megaNames],
    query: { enabled: !!address },
  })

  const isAvailable = records && records[0] === ''
  const hasBalance = balance && balance >= price
  const hasAllowance = allowance && allowance >= price

  // EIP-5792: Batch calls (approve + register in ONE click)
  const { 
    sendCalls, 
    data: callsId,
    isPending: isSendingCalls,
    error: sendCallsError
  } = useSendCalls()

  // Track batched calls status
  const { data: callsStatus } = useCallsStatus({
    id: callsId?.id!,
    query: { enabled: !!callsId?.id, refetchInterval: 1000 },
  })

  // Fallback: regular writeContract for wallets without EIP-5792
  const { 
    writeContract: registerDirect, 
    data: registerHash,
    isPending: isRegisteringDirect 
  } = useWriteContract()

  // Permit-based registration (fallback for wallets without sendCalls)
  const { 
    writeContract: registerWithPermit, 
    data: permitHash,
    isPending: isRegisteringWithPermit 
  } = useWriteContract()

  const { data: walletClient } = useWalletClient()

  const { isLoading: isConfirming, isSuccess: isDirectSuccess } = useWaitForTransactionReceipt({
    hash: registerHash || permitHash,
  })

  // Combined pending state
  const isPending = isSendingCalls || isRegisteringDirect || isRegisteringWithPermit || isConfirming

  useEffect(() => {
    if (!name || !isValidName(name)) {
      router.push('/')
    }
  }, [name, router])

  useEffect(() => {
    if (checkingAvailability) {
      setStep('check')
    } else if (!isConnected) {
      setStep('connect')
    } else if (isAvailable !== undefined) {
      setStep('ready')
    }
  }, [checkingAvailability, isConnected, isAvailable])

  // Track batched calls completion
  useEffect(() => {
    if (callsStatus?.status === 'success') {
      setStep('success')
      if (callsStatus.receipts?.[0]?.transactionHash) {
        setTxHash(callsStatus.receipts[0].transactionHash)
      }
    }
  }, [callsStatus])

  // Track direct registration completion
  useEffect(() => {
    if (isDirectSuccess) {
      setStep('success')
      setTxHash(registerHash || null)
    }
  }, [isDirectSuccess, registerHash])

  useEffect(() => {
    if (isPending) setStep('pending')
  }, [isPending])

  useEffect(() => {
    if (sendCallsError) {
      setError(sendCallsError.message)
      setStep('ready')
    }
  }, [sendCallsError])

  const handleRegister = async () => {
    if (!address || !name) return
    setError(null)

    // If already approved, just register directly
    if (hasAllowance) {
      try {
        registerDirect({
          address: CONTRACTS.testnet.megaNames,
          abi: MEGA_NAMES_ABI,
          functionName: 'registerDirect',
          args: [name, address],
        })
      } catch (err: any) {
        setError(err.message)
      }
      return
    }

    // Try EIP-5792 batched calls first
    const approveCalldata = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [CONTRACTS.testnet.megaNames, price],
    })

    const registerCalldata = encodeFunctionData({
      abi: MEGA_NAMES_ABI,
      functionName: 'registerDirect',
      args: [name, address],
    })

    try {
      await sendCalls({
        calls: [
          {
            to: CONTRACTS.testnet.usdm,
            data: approveCalldata,
          },
          {
            to: CONTRACTS.testnet.megaNames,
            data: registerCalldata,
          },
        ],
      })
    } catch (err: any) {
      // Fallback: wallet doesn't support sendCalls, use permit flow
      console.warn('sendCalls not supported, falling back to permit flow:', err.message)
      setUseFallback(true)
    }
  }

  // Fallback: permit-based registration
  const handlePermitRegister = async () => {
    if (!address || !name) return
    setError(null)

    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)
      
      // Get nonce from USDM contract
      const nonceResponse = await fetch(`https://carrot.megaeth.com/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: CONTRACTS.testnet.usdm,
            data: `0x7ecebe00000000000000000000000000${address.slice(2).toLowerCase()}`
          }, 'latest'],
          id: 1
        })
      })
      const nonceData = await nonceResponse.json()
      console.log('Nonce response:', nonceData)
      
      if (nonceData.error) {
        throw new Error(`Failed to get nonce: ${nonceData.error.message}`)
      }
      
      const nonce = BigInt(nonceData.result || '0')

      const domain = {
        name: 'Mock USDM',
        version: '1',
        chainId: 6343,
        verifyingContract: CONTRACTS.testnet.usdm as `0x${string}`,
      } as const

      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      } as const

      const message = {
        owner: address as `0x${string}`,
        spender: CONTRACTS.testnet.megaNames as `0x${string}`,
        value: price,
        nonce,
        deadline,
      }

      console.log('Signing permit with:', { domain, message, nonce: nonce.toString(), deadline: deadline.toString() })

      if (!walletClient) {
        throw new Error('Wallet not connected')
      }

      const signature = await walletClient.signTypedData({
        account: address,
        domain,
        types,
        primaryType: 'Permit',
        message,
      })

      const r = signature.slice(0, 66) as `0x${string}`
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`
      const v = parseInt(signature.slice(130, 132), 16)

      registerWithPermit({
        address: CONTRACTS.testnet.megaNames,
        abi: MEGA_NAMES_ABI,
        functionName: 'registerWithPermit',
        args: [name, address, deadline, v, r, s],
      })
    } catch (err: any) {
      console.error('Permit registration error:', err)
      setError(err.shortMessage || err.message || 'Failed to register')
    }
  }

  if (!name) return null

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-[#666] hover:text-black mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-label text-sm">BACK TO SEARCH</span>
        </Link>

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

        {/* Single-click badge */}
        {!useFallback ? (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-400 flex items-center gap-3">
            <Zap className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-label text-sm text-green-800">SINGLE-CLICK REGISTRATION</p>
              <p className="text-sm text-green-700">One confirmation - no separate approval needed</p>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-400 flex items-center gap-3">
            <Zap className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-label text-sm text-blue-800">PERMIT-BASED REGISTRATION</p>
              <p className="text-sm text-blue-700">Sign once, then confirm transaction</p>
            </div>
          </div>
        )}

        {step === 'check' && (
          <div className="border-2 border-black p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="font-label text-sm">CHECKING AVAILABILITY...</p>
          </div>
        )}

        {step === 'connect' && (
          <div className="border-2 border-black p-8 text-center">
            <p className="font-label text-sm mb-4">CONNECT YOUR WALLET TO CONTINUE</p>
            <p className="text-[#666]">Use the connect button in the header</p>
          </div>
        )}

        {step === 'ready' && !isAvailable && (
          <div className="border-2 border-black p-8 text-center">
            <p className="font-label text-sm text-red-600 mb-4">NAME NOT AVAILABLE</p>
            <p className="text-[#666]">This name has already been registered</p>
            <Link href="/" className="btn-secondary inline-block mt-4 px-6 py-3">
              SEARCH ANOTHER NAME
            </Link>
          </div>
        )}

        {step === 'ready' && isAvailable && (
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

              <p className="text-[#666] mb-6">
                {hasAllowance 
                  ? 'USDM already approved. Click to register your name.'
                  : useFallback
                    ? 'Sign the permit message, then confirm the transaction.'
                    : 'Click to approve USDM and register in a single transaction.'}
              </p>
            </div>
            <button
              onClick={useFallback ? handlePermitRegister : handleRegister}
              disabled={isPending || !hasBalance}
              className="btn-primary w-full py-5 text-lg font-label disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  CONFIRMING...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  REGISTER NOW
                </>
              )}
            </button>
          </div>
        )}

        {step === 'pending' && (
          <div className="border-2 border-black p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p className="font-label text-sm mb-2">REGISTERING...</p>
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
            {txHash && (
              <a 
                href={`https://megaeth-testnet.explorer.caldera.xyz/tx/${txHash}`}
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
