'use client'

import Link from 'next/link'
import { ArrowLeft, User, Globe, Layers, Wallet, Link2, Shield, Gamepad2, Building2 } from 'lucide-react'

const useCases = [
  {
    icon: Wallet,
    title: 'EMBEDDED WALLET IDENTITY',
    description: 'Apps using embedded wallets (Privy, Dynamic, Turnkey) can auto-mint subdomains for users at account creation. When a user signs up for your app, mint them a subdomain tied to their embedded wallet — instant human-readable identity.',
    example: {
      scenario: 'Stomp (a game on MegaETH) creates an embedded wallet for each player. The game owns stomp.mega and mints subdomains automatically:',
      names: ['bread.stomp.mega → player\'s embedded wallet', 'alice.stomp.mega → player\'s embedded wallet', 'speedrun.stomp.mega → player\'s embedded wallet'],
      detail: 'Players get a recognizable identity across the MegaETH ecosystem without ever seeing a 0x address. The app controls the namespace, players own their subdomain NFTs.'
    },
    color: 'purple',
  },
  {
    icon: User,
    title: 'HUMAN-READABLE IDENTITY',
    description: 'Replace 0x addresses with memorable names across every dApp on MegaETH. Set your primary name once and it resolves everywhere — wallets, explorers, DEXs, social apps.',
    example: {
      scenario: 'Instead of sharing 0x61083772b5B10b6214C91db6AD625eCb24A60834, just say:',
      names: ['bread.mega'],
      detail: 'Any app integrating MegaNames resolution shows your name instead of your address. One name, universal identity.'
    },
    color: 'yellow',
  },
  {
    icon: Building2,
    title: 'TEAM & ORG NAMESPACES',
    description: 'Projects and DAOs can register a parent name and create unlimited free subdomains for team members, departments, multisigs, and contracts.',
    example: {
      scenario: 'MegaETH registers megaeth.mega and creates subdomains:',
      names: ['treasury.megaeth.mega → multisig', 'grants.megaeth.mega → grants committee', 'eng.megaeth.mega → engineering lead', 'bridge.megaeth.mega → bridge contract'],
      detail: 'Subdomains are free, unlimited, and parent-controlled. Revoke access instantly when team members change.'
    },
    color: 'blue',
  },
  {
    icon: Globe,
    title: 'ON-CHAIN WEBSITES',
    description: 'Link your .mega name to a fully on-chain website via Warren Protocol. HTML, CSS, and JS stored directly in smart contract storage — no servers, no IPFS, no DNS.',
    example: {
      scenario: 'Host your personal site or project docs entirely on MegaETH:',
      names: ['portfolio.mega → on-chain portfolio site', 'docs.myproject.mega → on-chain documentation'],
      detail: 'Warren contenthash integration means your website lives as long as the blockchain does. True permanence.'
    },
    color: 'green',
  },
  {
    icon: Gamepad2,
    title: 'GAMING IDENTITIES',
    description: 'Games can use .mega subdomains as in-game identities. Leaderboards show names instead of addresses. Players carry their identity across games on MegaETH.',
    example: {
      scenario: 'A gaming platform registers games.mega:',
      names: ['bread.stomp.mega → Stomp profile', 'bread.arena.mega → Arena profile', 'bread.racers.mega → Racers profile'],
      detail: 'Each game mints subdomains under its namespace. Players build reputation tied to their .mega identity across the ecosystem.'
    },
    color: 'orange',
  },
  {
    icon: Link2,
    title: 'CROSS-CHAIN INTEROP',
    description: 'ERC-7828 support means .mega names work across chains. Reference any MegaETH address from Ethereum, Arbitrum, or any chain that supports the standard.',
    example: {
      scenario: 'Send tokens from Ethereum to a MegaETH address:',
      names: ['bread.mega@megaeth'],
      detail: 'The @megaeth suffix tells cross-chain tooling to resolve the name on MegaETH. No more copy-pasting addresses across chain UIs.'
    },
    color: 'purple',
  },
  {
    icon: Layers,
    title: 'PROTOCOL NAMESPACES',
    description: 'DeFi protocols can name their contracts and vaults for better UX. Users interact with readable names instead of contract addresses.',
    example: {
      scenario: 'A DEX registers its namespace:',
      names: ['router.kumbaya.mega → swap router', 'eth-usdm.kumbaya.mega → ETH/USDM pool', 'rewards.kumbaya.mega → rewards distributor'],
      detail: 'Explorers and frontends can resolve contract names. Debugging and governance becomes more transparent.'
    },
    color: 'blue',
  },
  {
    icon: Shield,
    title: 'PAYMENT LINKS & SOCIAL PROFILES',
    description: 'Use text records to attach social profiles, avatars, and metadata to your name. Share one link that resolves to everything about your on-chain identity.',
    example: {
      scenario: 'Set text records on your name:',
      names: ['avatar → profile image', 'com.twitter → @bread_', 'com.github → 0xBreadguy', 'url → https://yoursite.com', 'description → Building on MegaETH'],
      detail: 'Any app can read your text records to build a rich profile card. One name becomes your universal on-chain identity.'
    },
    color: 'green',
  },
]

const colorMap: Record<string, string> = {
  purple: 'bg-purple-50 border-purple-200',
  yellow: 'bg-yellow-50 border-yellow-200',
  blue: 'bg-blue-50 border-blue-200',
  green: 'bg-green-50 border-green-200',
  orange: 'bg-orange-50 border-orange-200',
}

const iconColorMap: Record<string, string> = {
  purple: 'text-purple-600',
  yellow: 'text-yellow-600',
  blue: 'text-blue-600',
  green: 'text-green-600',
  orange: 'text-orange-600',
}

export default function IdeasPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--muted-dark)] hover:text-[var(--foreground)] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-label text-sm">back</span>
        </Link>

        <div className="mb-12">
          <h1 className="font-display text-4xl sm:text-5xl mb-4">WHAT CAN YOU BUILD?</h1>
          <p className="text-[var(--muted-dark)] max-w-2xl">
            .mega names are more than addresses. They&apos;re identity primitives — composable building blocks for apps, games, teams, and protocols on MegaETH.
          </p>
        </div>

        <div className="space-y-8">
          {useCases.map((uc, i) => (
            <div key={i} className="border border-[var(--border)] bg-[#eee9de] shadow-[0_2px_8px_rgba(25,25,26,0.06),0_1px_3px_rgba(25,25,26,0.04)]">
              <div className="p-6 sm:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-2 border ${colorMap[uc.color]}`}>
                    <uc.icon className={`w-5 h-5 ${iconColorMap[uc.color]}`} />
                  </div>
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl">{uc.title}</h2>
                    <p className="text-[var(--muted-dark)] text-sm mt-2">{uc.description}</p>
                  </div>
                </div>

                <div className={`mt-6 p-4 border shadow-[inset_0_1px_4px_rgba(25,25,26,0.04)] ${colorMap[uc.color]}`}>
                  <p className="text-xs font-label text-[var(--muted-dark)] mb-3">{uc.example.scenario}</p>
                  <div className="space-y-1.5">
                    {uc.example.names.map((name, j) => (
                      <p key={j} className="font-mono text-sm">
                        {name}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--muted-dark)] mt-3 border-t border-[var(--border)] pt-3">
                    {uc.example.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-8 bg-[var(--bg-card)] border border-[var(--border)] text-center">
          <h2 className="font-display text-2xl mb-3">READY TO BUILD?</h2>
          <p className="text-[var(--muted-dark)] text-sm mb-6">
            Integrate .mega name resolution into your app in minutes.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/integrate" className="btn-primary px-6 py-2 font-label">
              DEVELOPER DOCS
            </Link>
            <Link href="/register" className="px-6 py-2 bg-[var(--bg-card)] border border-[var(--border)] font-label hover:border-[var(--foreground)] transition-colors">
              REGISTER A NAME
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
