import { http, createConfig } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'

// MegaETH Testnet
export const megaethTestnet = {
  id: 6343,
  name: 'MegaETH Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://carrot.megaeth.com/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://megaeth-testnet.explorer.caldera.xyz' },
  },
} as const

// MegaETH Mainnet
export const megaethMainnet = {
  id: 4326,
  name: 'MegaETH',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.megaeth.com'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://megaeth.explorer.caldera.xyz' },
  },
} as const

export const config = createConfig({
  chains: [megaethTestnet, megaethMainnet],
  connectors: [
    injected(),
  ],
  transports: {
    [megaethTestnet.id]: http(),
    [megaethMainnet.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
