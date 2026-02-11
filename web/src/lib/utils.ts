import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { keccak256, toBytes, encodePacked } from 'viem'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Calculate namehash for .mega TLD
export const MEGA_NODE = keccak256(
  encodePacked(['bytes32', 'bytes32'], [
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    keccak256(toBytes('mega'))
  ])
)

// Calculate token ID from label
export function getTokenId(label: string): bigint {
  const labelHash = keccak256(toBytes(label.toLowerCase()))
  const tokenId = keccak256(encodePacked(['bytes32', 'bytes32'], [MEGA_NODE, labelHash]))
  return BigInt(tokenId)
}

// Generate random secret for commit-reveal
export function generateSecret(): `0x${string}` {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}`
}

// Format USDM amount (18 decimals)
export function formatUSDM(amount: bigint): string {
  const value = Number(amount) / 1e18
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

// Parse USDM amount to bigint
export function parseUSDM(amount: number): bigint {
  return BigInt(Math.floor(amount * 1e18))
}

// Get registration price based on length
export function getPrice(length: number): bigint {
  if (length === 1) return parseUSDM(1000)
  if (length === 2) return parseUSDM(500)
  if (length === 3) return parseUSDM(100)
  if (length === 4) return parseUSDM(10)
  return parseUSDM(1)
}

// Multi-year discount (matches contract constants)
export function getDiscount(numYears: number): number {
  if (numYears >= 10) return 2500  // 25%
  if (numYears >= 5) return 1500   // 15%
  if (numYears >= 3) return 1000   // 10%
  if (numYears >= 2) return 500    // 5%
  return 0
}

export function getDiscountLabel(numYears: number): string | null {
  const d = getDiscount(numYears)
  if (d === 0) return null
  return `${d / 100}% off`
}

// Calculate total fee with multi-year discount (mirrors contract calculateFee)
export function calculateFee(labelLength: number, numYears: number): bigint {
  const yearlyFee = getPrice(labelLength)
  const baseFee = yearlyFee * BigInt(numYears)
  const discount = BigInt(getDiscount(numYears))
  return baseFee - (baseFee * discount / BigInt(10000))
}

// Validate name
export function isValidName(name: string): boolean {
  if (!name || name.length === 0 || name.length > 255) return false
  if (name.includes('.')) return false
  // Basic ASCII + UTF-8 check (full validation in contract)
  return /^[a-zA-Z0-9\u0080-\uFFFF]+$/.test(name)
}

// Shorten address
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Format expiry date
export function formatExpiry(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
