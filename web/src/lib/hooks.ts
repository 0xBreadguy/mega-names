'use client'

import { useEffect, useState } from 'react'
import { usePublicClient, useReadContract } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI } from './contracts'
import { getPrice } from './utils'

// Hook to get a name for an address (reverse lookup)
export function useMegaName(address: `0x${string}` | undefined) {
  const { data: name, isLoading } = useReadContract({
    address: CONTRACTS.testnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'getName',
    args: [address!],
    query: { enabled: !!address },
  })

  return {
    name: name && name !== '' ? name : null,
    isLoading,
  }
}

// Hook to resolve an address to a display name (for header/UI)
export function useResolvedName(address: `0x${string}` | undefined) {
  const { name, isLoading } = useMegaName(address)
  
  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }
  
  const displayName = name 
    ? name 
    : address 
      ? shortenAddress(address) 
      : ''
  
  return {
    displayName,
    isLoading,
    hasMegaName: !!name,
  }
}

// Hook to resolve a .mega name to an address
export function useResolveMegaName(input: string) {
  const [label, setLabel] = useState<string | null>(null)
  
  useEffect(() => {
    // Parse input - accept "name", "name.mega", etc.
    const cleaned = input.toLowerCase().trim()
    if (!cleaned) {
      setLabel(null)
      return
    }
    
    // Remove .mega suffix if present
    const withoutSuffix = cleaned.replace(/\.mega$/, '')
    
    // Validate: only alphanumeric and hyphens
    if (/^[a-z0-9-]+$/.test(withoutSuffix)) {
      setLabel(withoutSuffix)
    } else {
      setLabel(null)
    }
  }, [input])
  
  // Compute tokenId from label
  const tokenId = label ? BigInt('0x' + Buffer.from(label).reduce((acc, byte) => {
    const hash = [...acc + byte.toString(16).padStart(2, '0')].reduce((h, c) => 
      (((h << 5) - h) + c.charCodeAt(0)) | 0, 0
    )
    return hash.toString(16)
  }, '').slice(-16).padStart(16, '0')) : BigInt(0)
  
  // Actually, let's use the same getTokenId from utils - but we need keccak256
  // For now, let's just query the contract by using addr() with the computed tokenId
  
  const publicClient = usePublicClient()
  const [resolvedAddress, setResolvedAddress] = useState<`0x${string}` | null>(null)
  const [isOwnerFallback, setIsOwnerFallback] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!label || !publicClient) {
      setResolvedAddress(null)
      setIsOwnerFallback(false)
      return
    }

    const resolve = async () => {
      setIsLoading(true)
      try {
        // Compute tokenId using keccak256(label)
        const { keccak256, toBytes } = await import('viem')
        const tokenId = BigInt(keccak256(toBytes(label)))
        
        // First check if the name exists
        const record = await publicClient.readContract({
          address: CONTRACTS.testnet.megaNames,
          abi: MEGA_NAMES_ABI,
          functionName: 'records',
          args: [tokenId],
        })
        
        if (!record || record[0] === '') {
          // Name doesn't exist
          setResolvedAddress(null)
          setIsOwnerFallback(false)
          return
        }
        
        // Try to get the set address
        const addr = await publicClient.readContract({
          address: CONTRACTS.testnet.megaNames,
          abi: MEGA_NAMES_ABI,
          functionName: 'addr',
          args: [tokenId],
        })
        
        if (addr && addr !== '0x0000000000000000000000000000000000000000') {
          setResolvedAddress(addr)
          setIsOwnerFallback(false)
        } else {
          // Fall back to owner
          const owner = await publicClient.readContract({
            address: CONTRACTS.testnet.megaNames,
            abi: MEGA_NAMES_ABI,
            functionName: 'ownerOf',
            args: [tokenId],
          })
          setResolvedAddress(owner)
          setIsOwnerFallback(true)
        }
      } catch {
        setResolvedAddress(null)
        setIsOwnerFallback(false)
      } finally {
        setIsLoading(false)
      }
    }

    resolve()
  }, [label, publicClient])

  return {
    address: resolvedAddress,
    label,
    isLoading,
    isOwnerFallback,
  }
}

// Hook to get contract stats (names registered, total volume)
export function useContractStats() {
  const publicClient = usePublicClient()
  const [stats, setStats] = useState({
    namesRegistered: 0,
    totalVolume: BigInt(0),
    isLoading: true,
  })

  useEffect(() => {
    if (!publicClient) return

    const fetchStats = async () => {
      try {
        // Get all NameRegistered events
        const logs = await publicClient.getLogs({
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
          fromBlock: BigInt(0),
          toBlock: 'latest',
        })

        const namesRegistered = logs.length
        
        // Calculate total volume from label lengths
        let totalVolume = BigInt(0)
        for (const log of logs) {
          const label = log.args.label
          if (label) {
            totalVolume += getPrice(label.length)
          }
        }

        setStats({
          namesRegistered,
          totalVolume,
          isLoading: false,
        })
      } catch (error) {
        console.error('Failed to fetch contract stats:', error)
        setStats(prev => ({ ...prev, isLoading: false }))
      }
    }

    fetchStats()
  }, [publicClient])

  return stats
}
