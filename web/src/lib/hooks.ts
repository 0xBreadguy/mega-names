import { useReadContract } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI } from './contracts'

/**
 * Hook to resolve an address to its primary .mega name
 * Returns the full name (e.g., "bread.mega") or null if none set
 */
export function useMegaName(address: `0x${string}` | undefined) {
  const { data: name, isLoading } = useReadContract({
    address: CONTRACTS.testnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'getName',
    args: [address!],
    query: { 
      enabled: !!address,
      staleTime: 30_000, // Cache for 30 seconds
    },
  })

  return {
    name: name && name !== '' ? name : null,
    isLoading,
  }
}

/**
 * Hook to resolve an address - returns mega name if available, otherwise shortened address
 */
export function useResolvedName(address: `0x${string}` | undefined) {
  const { name, isLoading } = useMegaName(address)
  
  if (!address) return { displayName: null, isLoading: false, hasMegaName: false }
  
  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  
  return {
    displayName: name || shortenAddress(address),
    isLoading,
    hasMegaName: !!name,
  }
}
