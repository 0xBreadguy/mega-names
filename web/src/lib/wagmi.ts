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
    default: { name: 'Blockscout', url: 'https://megaeth-testnet-v2.blockscout.com' },
  },
} as const

// MegaETH Mainnet
export const megaethMainnet = {
  id: 4326,
  name: 'MegaETH',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.megaeth.com/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://megaeth.explorer.caldera.xyz' },
  },
} as const

export const config = createConfig({
  chains: [megaethMainnet, megaethTestnet],
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({ 
      projectId: 'b33e4c58e0eb87e2ccab944c0f18dbf0',
      metadata: {
        name: 'MegaNames',
        description: '.mega names on MegaETH',
        url: 'https://meganame.market',
        icons: ['https://meganame.market/megaeth-icon.png'],
      },
    }),
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
