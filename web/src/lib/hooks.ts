import { useReadContract } from 'wagmi'
import { CONTRACTS, MEGA_NAMES_ABI } from './contracts'
import { getTokenId } from './utils'

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
 * Parse a .mega name input (handles "name.mega" or just "name")
 */
function parseMegaName(input: string): string | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null
  
  // Remove .mega suffix if present
  const label = trimmed.endsWith('.mega') 
    ? trimmed.slice(0, -5) 
    : trimmed
  
  // Validate label
  if (!label || label.includes('.') || !/^[a-z0-9]+$/.test(label)) {
    return null
  }
  
  return label
}

/**
 * Hook to resolve a .mega name to an address
 * Accepts "elden.mega" or "elden"
 * First tries addr() (explicit resolution), then falls back to ownerOf()
 */
export function useResolveMegaName(nameInput: string) {
  const label = parseMegaName(nameInput)
  const tokenId = label ? getTokenId(label) : BigInt(0)
  
  // Try explicit address resolution first
  const { data: resolvedAddress, isLoading: isLoadingAddr } = useReadContract({
    address: CONTRACTS.testnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'addr',
    args: [tokenId],
    query: { 
      enabled: !!label,
      staleTime: 30_000,
    },
  })
  
  // Fall back to owner if no explicit resolution
  const { data: ownerAddress, isLoading: isLoadingOwner } = useReadContract({
    address: CONTRACTS.testnet.megaNames,
    abi: MEGA_NAMES_ABI,
    functionName: 'ownerOf',
    args: [tokenId],
    query: { 
      enabled: !!label,
      staleTime: 30_000,
    },
  })

  const zeroAddress = '0x0000000000000000000000000000000000000000'
  
  // Prefer explicit resolution, fall back to owner
  const hasExplicitAddr = resolvedAddress && resolvedAddress !== zeroAddress
  const hasOwner = ownerAddress && ownerAddress !== zeroAddress
  
  const finalAddress = hasExplicitAddr ? resolvedAddress : (hasOwner ? ownerAddress : null)
  const isLoading = isLoadingAddr || isLoadingOwner

  return {
    address: finalAddress,
    label,
    isLoading,
    isValid: !!label,
    // Indicate if we're using owner vs explicit resolution
    isOwnerFallback: !hasExplicitAddr && hasOwner,
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
