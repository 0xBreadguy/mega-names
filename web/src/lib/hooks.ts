'use client'

import { useEffect, useState } from 'react'
import { usePublicClient, useReadContract } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI } from './contracts'

// Hook to get a name for an address (reverse lookup)
export function useMegaName(address: `0x${string}` | undefined) {
  const { data: name, isLoading } = useReadContract({
    address: CONTRACTS.mainnet.megaNames,
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
        // Compute tokenId using namehash: keccak256(MEGA_NODE, keccak256(label))
        const { getTokenId } = await import('./utils')
        const tokenId = getTokenId(label)
        
        // First check if the name exists
        const record = await publicClient.readContract({
          address: CONTRACTS.mainnet.megaNames,
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
          address: CONTRACTS.mainnet.megaNames,
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
            address: CONTRACTS.mainnet.megaNames,
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

// Hook to get recent name registrations from events
export function useRecentRegistrations(count = 20) {
  const publicClient = usePublicClient()
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    if (!publicClient) return
    const fetch = async () => {
      try {
        const logs = await publicClient.getLogs({
          address: CONTRACTS.mainnet.megaNames,
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
        const labels = logs
          .map((log) => (log.args as any)?.label as string)
          .filter(Boolean)
          .slice(-count)
          .reverse()
        setNames(labels)
      } catch {
        // Fallback if getLogs fails
        setNames([])
      }
    }
    fetch()
  }, [publicClient, count])

  return names
}

// Hook to get contract stats (names registered, renewals, subdomains, volume)
export function useContractStats() {
  const { data: totalRegistrations, isLoading: loadingRegistrations } = useReadContract({
    address: CONTRACTS.mainnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'totalRegistrations',
  })

  const { data: totalRenewals, isLoading: loadingRenewals } = useReadContract({
    address: CONTRACTS.mainnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'totalRenewals',
  })

  const { data: totalSubdomains, isLoading: loadingSubdomains } = useReadContract({
    address: CONTRACTS.mainnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'totalSubdomains',
  })

  const { data: totalVolume, isLoading: loadingVolume } = useReadContract({
    address: CONTRACTS.mainnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'totalVolume',
  })

  return {
    namesRegistered: totalRegistrations ? Number(totalRegistrations) : 0,
    renewals: totalRenewals ? Number(totalRenewals) : 0,
    subdomains: totalSubdomains ? Number(totalSubdomains) : 0,
    totalVolume: totalVolume ?? BigInt(0),
    isLoading: loadingRegistrations || loadingRenewals || loadingSubdomains || loadingVolume,
  }
}
