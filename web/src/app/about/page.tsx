'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Star, MapPin, UserCircle, FolderTree, Send, RefreshCw, Globe, Link2, Wallet, Building2, Gamepad2, Shield, Layers } from 'lucide-react'

/* ── Collapsible Section ── */

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-[var(--border)] bg-[var(--bg-card)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-[var(--surface)] transition-colors"
      >
        <h2 className="font-display text-xl sm:text-2xl text-left">{title}</h2>
        <ChevronDown className={`w-5 h-5 text-[var(--muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-[var(--border)]">
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Feature Row ── */

function Feature({ icon: Icon, label, description }: { icon: any; label: string; description: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="p-1.5 bg-[var(--bg-card)] border border-[var(--border)] flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-[var(--muted-dark)]" />
      </div>
      <div>
        <p className="font-label text-sm text-[var(--foreground)]">{label}</p>
        <p className="text-sm text-[var(--muted-dark)] mt-0.5">{description}</p>
      </div>
    </div>
  )
}

/* ── Pricing Row ── */

function PriceRow({ length, price }: { length: string; price: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border-light)] last:border-b-0">
      <span className="font-label text-sm text-[var(--muted-dark)]">{length}</span>
      <span className="font-display text-lg">{price}</span>
    </div>
  )
}

/* ── Use Case Card ── */

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

function UseCase({ icon: Icon, title, description, example, color }: {
  icon: any; title: string; description: string; color: string;
  example: { scenario: string; names: string[]; detail: string }
}) {
  return (
    <div className="border border-[var(--border)] bg-[#eee9de] shadow-[0_2px_8px_rgba(25,25,26,0.06),0_1px_3px_rgba(25,25,26,0.04)]">
      <div className="p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-1.5 border ${colorMap[color]}`}>
            <Icon className={`w-4 h-4 ${iconColorMap[color]}`} />
          </div>
          <div>
            <h3 className="font-display text-lg">{title}</h3>
            <p className="text-[var(--muted-dark)] text-sm mt-1">{description}</p>
          </div>
        </div>
        <div className={`mt-4 p-3 border shadow-[inset_0_1px_4px_rgba(25,25,26,0.04)] ${colorMap[color]}`}>
          <p className="text-xs font-label text-[var(--muted-dark)] mb-2">{example.scenario}</p>
          <div className="space-y-1">
            {example.names.map((name, j) => (
              <p key={j} className="font-mono text-xs">{name}</p>
            ))}
          </div>
          <p className="text-xs text-[var(--muted-dark)] mt-2 border-t border-[var(--border)] pt-2">{example.detail}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--muted-dark)] hover:text-[var(--foreground)] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-label text-sm">back</span>
        </Link>

        <div className="mb-10">
          <h1 className="font-display text-4xl sm:text-5xl mb-3">ABOUT MEGA NAMES</h1>
          <p className="text-[var(--muted-dark)] max-w-2xl text-sm leading-relaxed">
            Human-readable on-chain identity for MegaETH. Register a .mega name, attach it to your wallet, 
            and use it everywhere — across apps, chains, and protocols.
          </p>
        </div>

        <div className="space-y-3">

          {/* HOW IT WORKS */}
          <Section title="HOW IT WORKS" defaultOpen={true}>
            <div className="pt-4 space-y-4">
              <div>
                <p className="font-label text-xs text-[var(--muted)] mb-1">REGISTRATION</p>
                <p className="text-sm text-[var(--muted-dark)] leading-relaxed">
                  Search for an available name, approve USDM spending (one-time), and register. 
                  Names are ERC-721 NFTs — you own them, can transfer them, and manage them from your wallet. 
                  No commit-reveal scheme needed; MegaETH&apos;s speed makes frontrunning impractical.
                </p>
              </div>
              <div>
                <p className="font-label text-xs text-[var(--muted)] mb-1">PRICING</p>
                <p className="text-sm text-[var(--muted-dark)] mb-3">Annual registration in USDM, based on name length:</p>
                <div className="bg-[var(--surface)] border border-[var(--border-light)] p-4">
                  <PriceRow length="1 character" price="$1,000" />
                  <PriceRow length="2 characters" price="$500" />
                  <PriceRow length="3 characters" price="$100" />
                  <PriceRow length="4 characters" price="$10" />
                  <PriceRow length="5+ characters" price="$1" />
                </div>
                <p className="text-xs text-[var(--muted)] mt-2">Multi-year discounts: 2yr 5% · 3yr 10% · 5yr 15% · 10yr 25%</p>
              </div>
              <div>
                <p className="font-label text-xs text-[var(--muted)] mb-1">RENEWALS & EXPIRY</p>
                <p className="text-sm text-[var(--muted-dark)] leading-relaxed">
                  Names expire after their registration period. After expiry there&apos;s a 90-day grace period 
                  where only the previous owner can renew. After grace, names enter a 21-day Dutch auction 
                  (premium decays from $10,000 → $0) before becoming available at base price.
                  Anyone can renew a name on behalf of its owner.
                </p>
              </div>
              <div>
                <p className="font-label text-xs text-[var(--muted)] mb-1">VALID NAMES</p>
                <p className="text-sm text-[var(--muted-dark)] leading-relaxed">
                  Names must be lowercase letters (a-z), numbers (0-9), and hyphens (-). 
                  No leading or trailing hyphens. No spaces, emoji, or special characters.
                </p>
              </div>
            </div>
          </Section>

          {/* MANAGEMENT */}
          <Section title="MANAGING YOUR NAME">
            <div className="pt-4 space-y-1">
              <Feature
                icon={Star}
                label="Set as Primary"
                description="Makes this your default identity. Apps and explorers will display this name next to your wallet address. You can only have one primary name per wallet."
              />
              <Feature
                icon={MapPin}
                label="Forward to"
                description="Sets where this name points. When someone sends to bread.mega, funds go to the forwarding address. This is separate from your primary name — forwarding is name→address, primary is address→name."
              />
              <Feature
                icon={UserCircle}
                label="Profile"
                description="Attach metadata to your name: avatar, Twitter, website, GitHub, Telegram, Discord, email, and a bio. Any app can read these records to build a profile card."
              />
              <Feature
                icon={FolderTree}
                label="Subdomains"
                description="Create unlimited free subdomains under your name (e.g., dev.bread.mega). Subdomains are NFTs owned by the creator, but the parent name owner can revoke them at any time. Subdomains don't expire — they last as long as the parent name is active."
              />
              <Feature
                icon={Send}
                label="Transfer"
                description="Transfer ownership of a name to another wallet. This is irreversible for parent names. For subdomains, the parent owner retains the ability to revoke regardless of transfers."
              />
              <Feature
                icon={RefreshCw}
                label="Renew"
                description="Extend your name's registration. Anyone can renew a name — useful for DAOs or friends keeping names alive."
              />
              <Feature
                icon={Globe}
                label="Warren Site"
                description="Link your name to an on-chain website via Warren Protocol. Your HTML, CSS, and JS are stored directly in smart contract storage — fully permanent, no servers or IPFS needed."
              />
            </div>
          </Section>

          {/* IMPORTANT DETAILS */}
          <Section title="IMPORTANT DETAILS">
            <div className="pt-4 grid gap-3">
              <div className="bg-[var(--surface)] border border-[var(--border-light)] p-5">
                <p className="font-label text-xs text-[var(--foreground)] mb-2">SUBDOMAIN REVOCATION</p>
                <p className="text-sm text-[var(--muted-dark)] leading-relaxed">
                  Subdomains can be revoked by the parent name owner at any time. If you receive a subdomain, 
                  be aware that the parent owner retains this power even after transfer. This is by design — 
                  it allows teams and projects to manage their namespace.
                </p>
              </div>
              <div className="bg-[var(--surface)] border border-[var(--border-light)] p-5">
                <p className="font-label text-xs text-[var(--foreground)] mb-2">TRANSFERS ARE IRREVERSIBLE</p>
                <p className="text-sm text-[var(--muted-dark)] leading-relaxed">
                  Transferring a parent name is permanent. Double-check the recipient address. 
                  Names sent to the wrong address cannot be recovered.
                </p>
              </div>
              <div className="bg-[var(--surface)] border border-[var(--border-light)] p-5">
                <p className="font-label text-xs text-[var(--foreground)] mb-2">PRIMARY vs FORWARDING</p>
                <p className="text-sm text-[var(--muted-dark)] leading-relaxed">
                  <strong>Primary</strong> = which name displays for your wallet (address → name).<br />
                  <strong>Forward to</strong> = where funds go when someone uses your name (name → address).<br />
                  These are independent settings. You can forward bread.mega to a multisig while 
                  displaying bread.mega as your personal wallet&apos;s primary name.
                </p>
              </div>
              <div className="bg-[var(--surface)] border border-[var(--border-light)] p-5">
                <p className="font-label text-xs text-[var(--foreground)] mb-2">NO PAUSE / NO CUSTODY</p>
                <p className="text-sm text-[var(--muted-dark)] leading-relaxed">
                  The contract has no pause mechanism and never holds your USDM. 
                  Registration fees transfer directly to the fee recipient on every transaction. 
                  Your names are fully self-custodied NFTs.
                </p>
              </div>
            </div>
          </Section>

          {/* CROSS-CHAIN */}
          <Section title="CROSS-CHAIN SUPPORT">
            <div className="pt-4">
              <p className="text-sm text-[var(--muted-dark)] leading-relaxed mb-3">
                .mega names support <a href="https://interopaddress.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--foreground)]">ERC-7930 interop addressing</a>, 
                enabling cross-chain resolution. Reference any MegaETH address from other chains:
              </p>
              <div className="bg-[var(--surface)] border border-[var(--border-light)] px-4 py-3 font-mono text-sm">
                bread.mega<span className="text-[var(--muted)]">@</span>megaeth
              </div>
              <p className="text-xs text-[var(--muted)] mt-2">
                The @megaeth suffix tells cross-chain tooling to resolve the name on MegaETH. 
                Works from Ethereum, Arbitrum, Base, and any chain supporting the standard.
              </p>
            </div>
          </Section>

          {/* USE CASES */}
          <Section title="WHAT CAN YOU BUILD?">
            <div className="pt-4 space-y-4">
              <p className="text-sm text-[var(--muted-dark)] mb-2">
                .mega names are composable identity primitives. Here are some ways teams are using them:
              </p>

              <div className="grid gap-4">
                <UseCase
                  icon={Wallet}
                  title="EMBEDDED WALLET IDENTITY"
                  description="Apps mint subdomains for users at signup — instant human-readable identity tied to embedded wallets."
                  example={{
                    scenario: 'A game creates embedded wallets for players:',
                    names: ['bread.stomp.mega → player wallet', 'alice.stomp.mega → player wallet'],
                    detail: 'Players get identity across the ecosystem without ever seeing a 0x address. The app controls the namespace.'
                  }}
                  color="purple"
                />
                <UseCase
                  icon={Building2}
                  title="TEAM & ORG NAMESPACES"
                  description="Register a parent name, create unlimited free subdomains for team members, multisigs, and contracts."
                  example={{
                    scenario: 'An org registers their namespace:',
                    names: ['treasury.megaeth.mega → multisig', 'eng.megaeth.mega → engineering lead', 'grants.megaeth.mega → grants committee'],
                    detail: 'Subdomains are free and parent-controlled. Revoke access instantly when team members change.'
                  }}
                  color="blue"
                />
                <UseCase
                  icon={Gamepad2}
                  title="GAMING IDENTITIES"
                  description="Leaderboards show names instead of addresses. Players carry reputation across games on MegaETH."
                  example={{
                    scenario: 'A gaming platform with multiple titles:',
                    names: ['bread.stomp.mega → Stomp profile', 'bread.arena.mega → Arena profile'],
                    detail: 'Each game mints subdomains under its namespace. Cross-game identity built in.'
                  }}
                  color="orange"
                />
                <UseCase
                  icon={Layers}
                  title="PROTOCOL NAMESPACES"
                  description="DeFi protocols name their contracts for better UX. Users interact with readable names instead of addresses."
                  example={{
                    scenario: 'A DEX names its infrastructure:',
                    names: ['router.kumbaya.mega → swap router', 'eth-usdm.kumbaya.mega → pool'],
                    detail: 'Debugging and governance become more transparent when contracts have human names.'
                  }}
                  color="green"
                />
                <UseCase
                  icon={Globe}
                  title="ON-CHAIN WEBSITES"
                  description="Link .mega names to permanent on-chain websites via Warren Protocol. No servers, no IPFS, no DNS."
                  example={{
                    scenario: 'Host your site entirely on MegaETH:',
                    names: ['portfolio.mega → on-chain portfolio', 'docs.myproject.mega → on-chain documentation'],
                    detail: 'Your website lives as long as the blockchain does. True permanence.'
                  }}
                  color="purple"
                />
                <UseCase
                  icon={Shield}
                  title="SOCIAL PROFILES & PAYMENTS"
                  description="Attach socials, avatar, and metadata. Share one name that resolves to your full on-chain identity."
                  example={{
                    scenario: 'Set profile records on your name:',
                    names: ['avatar · twitter · github · website · bio'],
                    detail: 'Any app reads your records to build a profile card. One name, universal identity.'
                  }}
                  color="yellow"
                />
              </div>
            </div>
          </Section>

          {/* CONTRACT INFO */}
          <Section title="CONTRACT">
            <div className="pt-4">
              <div className="bg-[var(--surface)] border border-[var(--border-light)] p-4 font-mono text-xs space-y-2">
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--muted)]">MegaNames</span>
                  <a href="https://mega.etherscan.io/address/0x5B424C6CCba77b32b9625a6fd5A30D409d20d997" target="_blank" rel="noopener noreferrer" className="text-[var(--foreground)] hover:underline truncate">
                    0x5B424C6CCba77b32b9625a6fd5A30D409d20d997
                  </a>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--muted)]">USDM</span>
                  <a href="https://mega.etherscan.io/address/0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7" target="_blank" rel="noopener noreferrer" className="text-[var(--foreground)] hover:underline truncate">
                    0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7
                  </a>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--muted)]">Chain</span>
                  <span className="text-[var(--foreground)]">MegaETH (4326)</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--muted)]">Standard</span>
                  <span className="text-[var(--foreground)]">ERC-721</span>
                </div>
              </div>
            </div>
          </Section>

        </div>

        {/* CTA */}
        <div className="mt-10 p-8 border border-[var(--border)] bg-[var(--bg-card)] text-center">
          <h2 className="font-display text-2xl mb-3">GET STARTED</h2>
          <p className="text-[var(--muted-dark)] text-sm mb-6">
            Register your .mega name or integrate name resolution into your app.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/" className="btn-primary px-6 py-2 font-label">
              SEARCH NAMES
            </Link>
            <Link href="/integrate" className="px-6 py-2 bg-[var(--bg-card)] border border-[var(--border)] font-label hover:border-[var(--foreground)] transition-colors">
              INTEGRATE
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
