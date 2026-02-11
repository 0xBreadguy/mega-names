'use client'

import { useState } from 'react'

const CONTRACT_ADDRESS = '0x51b87f02a09ee809a305a2b48970ba5600032e80'
const USDM_ADDRESS = '0xa8a7Ea151E366532ce8b0442255aE60E0ff2F833'
const CHAIN_ID = 6342
const RPC_URL = 'https://carrot.megaeth.com/rpc'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="absolute top-3 right-3 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
    >
      {copied ? '✓ copied' : 'copy'}
    </button>
  )
}

function CodeBlock({ code, language = 'typescript' }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <CopyButton text={code} />
      <pre className="bg-[var(--foreground)] text-[var(--background)] p-4 pt-10 overflow-x-auto text-sm font-mono leading-relaxed border border-[var(--border)]">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-lg font-black italic tracking-tight text-[var(--foreground)] mb-4 border-b border-[var(--border)] pb-2">
        {title}
      </h2>
      {children}
    </section>
  )
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'resolve-name', label: 'Resolve a Name' },
  { id: 'reverse-resolve', label: 'Reverse Resolve' },
  { id: 'register-name', label: 'Register a Name' },
  { id: 'token-id', label: 'Token ID Computation' },
  { id: 'text-records', label: 'Text Records' },
  { id: 'subdomains', label: 'Subdomains' },
  { id: 'erc721', label: 'ERC-721' },
  { id: 'fee-schedule', label: 'Fee Schedule' },
  { id: 'links', label: 'Links & Resources' },
]

export default function IntegratePage() {
  const [activeSection, setActiveSection] = useState('overview')

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <p className="font-label text-[var(--muted)] text-xs uppercase tracking-widest mb-2">developer docs</p>
          <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight text-[var(--foreground)] mb-3">
            Integrate Mega Names
          </h1>
          <p className="text-[var(--muted-dark)] max-w-2xl leading-relaxed">
            Add .mega name resolution to your dApp, wallet, or protocol. MegaNames is a single-contract naming system — 
            no registry/resolver split, no subgraphs needed.
          </p>
        </div>

        <div className="flex gap-12">
          {/* Sidebar nav */}
          <nav className="hidden lg:block w-48 shrink-0 sticky top-20 self-start">
            <ul className="space-y-1">
              {NAV_ITEMS.map(item => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setActiveSection(item.id)}
                    className={`block font-label text-xs uppercase tracking-wider py-1.5 transition-colors ${
                      activeSection === item.id ? 'text-[var(--foreground)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-12">
            <Section id="overview" title="Overview">
              <div className="space-y-3 text-[var(--muted-dark)] leading-relaxed">
                <p>
                  MegaNames is an ENS-style naming system for MegaETH's <code className="font-mono text-[var(--foreground)] bg-[var(--surface)] px-1.5 py-0.5 text-sm">.mega</code> TLD.
                  A single Solidity contract handles everything — registration, resolution, text records, subdomains, and ERC-721 ownership.
                </p>
                <p>
                  Payments are in USDM stablecoin (stable USD pricing). No commit-reveal needed — registration is a simple approve + register flow.
                  Names are ERC-721 tokens, fully transferable and composable.
                </p>
                <div className="bg-[var(--surface)] border border-[var(--border)] p-4 mt-4">
                  <p className="font-label text-xs uppercase tracking-wider text-[var(--muted)] mb-2">key features</p>
                  <ul className="space-y-1 text-sm">
                    <li>• Single contract — no registry/resolver split</li>
                    <li>• Direct registration — no commit-reveal</li>
                    <li>• USDM payments — stable USD pricing</li>
                    <li>• ERC-721 — fully transferable NFTs</li>
                    <li>• ENS-compatible resolver interface</li>
                    <li>• Free subdomains (parent-controlled)</li>
                    <li>• ERC-7828 cross-chain interop ready</li>
                  </ul>
                </div>
              </div>
            </Section>

            <Section id="contracts" title="Contract Addresses">
              <div className="space-y-4">
                <div className="bg-[var(--surface)] border border-[var(--border)] p-4">
                  <p className="font-label text-xs uppercase tracking-wider text-[var(--muted)] mb-3">testnet — chain id 6342</p>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex flex-col sm:flex-row sm:gap-2">
                      <span className="text-[var(--muted)] shrink-0">MegaNames:</span>
                      <span className="text-[var(--foreground)] break-all">{CONTRACT_ADDRESS}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-2">
                      <span className="text-[var(--muted)] shrink-0">MockUSDM:</span>
                      <span className="text-[var(--foreground)] break-all">{USDM_ADDRESS}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-2">
                      <span className="text-[var(--muted)] shrink-0">RPC:</span>
                      <span className="text-[var(--foreground)]">{RPC_URL}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[var(--muted)]">
                  Mainnet addresses will be published when the service launches on MegaETH mainnet.
                </p>
              </div>
            </Section>

            <Section id="resolve-name" title="Resolve a Name → Address">
              <p className="text-[var(--muted-dark)] mb-4 leading-relaxed">
                Look up the address a .mega name points to. Uses the <code className="font-mono text-[var(--foreground)] bg-[var(--surface)] px-1.5 py-0.5 text-sm">addr(tokenId)</code> function.
                If no address is explicitly set, falls back to the token owner.
              </p>
              <CodeBlock language="typescript" code={`import { createPublicClient, http, keccak256, toBytes, encodePacked } from 'viem'

const client = createPublicClient({
  transport: http('${RPC_URL}'),
})

const MEGA_NAMES = '${CONTRACT_ADDRESS}'
const MEGA_NODE = keccak256(encodePacked(
  ['bytes32', 'bytes32'],
  ['0x' + '00'.repeat(32), keccak256(toBytes('mega'))]
))

function getTokenId(label: string): bigint {
  return BigInt(keccak256(encodePacked(
    ['bytes32', 'bytes32'],
    [MEGA_NODE, keccak256(toBytes(label.toLowerCase()))]
  )))
}

// Resolve "bread.mega" → address
const tokenId = getTokenId('bread')
const address = await client.readContract({
  address: MEGA_NAMES,
  abi: [{ type: 'function', name: 'addr', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }], stateMutability: 'view' }],
  functionName: 'addr',
  args: [tokenId],
})

console.log('bread.mega →', address)`} />

              <p className="text-sm text-[var(--muted)] mt-3">
                Returns <code className="font-mono bg-[var(--surface)] px-1 py-0.5">address(0)</code> if the name doesn't exist or is expired.
              </p>
            </Section>

            <Section id="reverse-resolve" title="Reverse Resolve — Address → Name">
              <p className="text-[var(--muted-dark)] mb-4 leading-relaxed">
                Look up the primary .mega name for an address. This is what you'd display in a UI instead of a raw address.
              </p>
              <CodeBlock language="typescript" code={`// Get the primary name for an address
const name = await client.readContract({
  address: '${CONTRACT_ADDRESS}',
  abi: [{ type: 'function', name: 'getName', inputs: [{ name: 'addr_', type: 'address' }], outputs: [{ type: 'string' }], stateMutability: 'view' }],
  functionName: 'getName',
  args: ['0x9D152D78b05f31EA6979061d432110c8664cA1a7'],
})

console.log(name) // "bread" (append .mega for display)
// Returns "" if no primary name is set`} />
            </Section>

            <Section id="register-name" title="Register a Name">
              <p className="text-[var(--muted-dark)] mb-4 leading-relaxed">
                Two-step flow: approve USDM spend, then call <code className="font-mono text-[var(--foreground)] bg-[var(--surface)] px-1.5 py-0.5 text-sm">register</code>.
                On testnet, you can mint free MockUSDM first.
              </p>
              <CodeBlock language="typescript" code={`import { createWalletClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount('0x...')
const wallet = createWalletClient({
  account,
  transport: http('${RPC_URL}'),
})

const MEGA_NAMES = '${CONTRACT_ADDRESS}'
const USDM = '${USDM_ADDRESS}'

// Step 0 (testnet only): Mint free USDM
await wallet.writeContract({
  address: USDM,
  abi: [{ type: 'function', name: 'mint', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }],
  functionName: 'mint',
  args: [account.address, parseUnits('1000', 18)],
})

// Step 1: Approve USDM spend
await wallet.writeContract({
  address: USDM,
  abi: [{ type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' }],
  functionName: 'approve',
  args: [MEGA_NAMES, parseUnits('1000', 18)], // or MaxUint256 for unlimited
})

// Step 2: Register "myname.mega" for 1 year
await wallet.writeContract({
  address: MEGA_NAMES,
  abi: [{ type: 'function', name: 'register', inputs: [{ name: 'label', type: 'string' }, { name: 'owner', type: 'address' }, { name: 'numYears', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable' }],
  functionName: 'register',
  args: ['myname', account.address, 1n],
})`} />
            </Section>

            <Section id="token-id" title="Token ID Computation">
              <p className="text-[var(--muted-dark)] mb-4 leading-relaxed">
                Names map to ERC-721 token IDs via namehash (same algorithm as ENS). This is deterministic — you can compute the token ID off-chain.
              </p>
              <CodeBlock language="typescript" code={`import { keccak256, toBytes, encodePacked } from 'viem'

// The .mega TLD node
const MEGA_NODE = keccak256(encodePacked(
  ['bytes32', 'bytes32'],
  ['0x' + '00'.repeat(32), keccak256(toBytes('mega'))]
))
// = 0x892fab39f6d2ae901009febba7dbdd0fd85e8a1651be6b8901774cdef395852f

// name.mega token ID
function getTokenId(label: string): bigint {
  return BigInt(keccak256(encodePacked(
    ['bytes32', 'bytes32'],
    [MEGA_NODE, keccak256(toBytes(label.toLowerCase()))]
  )))
}

// Subdomain token IDs use the parent token as the node:
function getSubdomainTokenId(parentTokenId: bigint, sublabel: string): bigint {
  const parentNode = '0x' + parentTokenId.toString(16).padStart(64, '0')
  return BigInt(keccak256(encodePacked(
    ['bytes32', 'bytes32'],
    [parentNode as \`0x\${string}\`, keccak256(toBytes(sublabel.toLowerCase()))]
  )))
}`} />

              <div className="bg-[var(--surface)] border border-[var(--border)] p-4 mt-4">
                <p className="font-label text-xs uppercase tracking-wider text-[var(--muted)] mb-2">cast (foundry)</p>
                <CodeBlock code={`# Compute MEGA_NODE
cast keccak $(cast abi-encode "f(bytes32,bytes32)" 0x${'0'.repeat(64)} $(cast keccak $(cast --from-utf8 "mega")))

# Compute tokenId for "bread.mega"
MEGA_NODE=0x892fab39f6d2ae901009febba7dbdd0fd85e8a1651be6b8901774cdef395852f
cast keccak $(cast concat-hex $MEGA_NODE $(cast keccak $(cast --from-utf8 "bread")))`} />
              </div>
            </Section>

            <Section id="text-records" title="Text Records">
              <p className="text-[var(--muted-dark)] mb-4 leading-relaxed">
                Each name can store arbitrary key-value text records (ENS-compatible). Common keys:
                <code className="font-mono text-[var(--foreground)] bg-[var(--surface)] px-1.5 py-0.5 text-sm ml-1">avatar</code>,
                <code className="font-mono text-[var(--foreground)] bg-[var(--surface)] px-1.5 py-0.5 text-sm ml-1">url</code>,
                <code className="font-mono text-[var(--foreground)] bg-[var(--surface)] px-1.5 py-0.5 text-sm ml-1">com.twitter</code>,
                <code className="font-mono text-[var(--foreground)] bg-[var(--surface)] px-1.5 py-0.5 text-sm ml-1">com.github</code>,
                <code className="font-mono text-[var(--foreground)] bg-[var(--surface)] px-1.5 py-0.5 text-sm ml-1">description</code>
              </p>
              <CodeBlock language="typescript" code={`// Read a text record
const twitter = await client.readContract({
  address: '${CONTRACT_ADDRESS}',
  abi: [{ type: 'function', name: 'text', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'key', type: 'string' }], outputs: [{ type: 'string' }], stateMutability: 'view' }],
  functionName: 'text',
  args: [tokenId, 'com.twitter'],
})

// Set a text record (must be name owner)
await wallet.writeContract({
  address: '${CONTRACT_ADDRESS}',
  abi: [{ type: 'function', name: 'setText', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'key', type: 'string' }, { name: 'value', type: 'string' }], outputs: [], stateMutability: 'nonpayable' }],
  functionName: 'setText',
  args: [tokenId, 'com.twitter', 'bread_'],
})`} />
            </Section>

            <Section id="subdomains" title="Subdomains">
              <p className="text-[var(--muted-dark)] mb-4 leading-relaxed">
                Name owners can create unlimited free subdomains. Subdomains are ERC-721 tokens owned by the creator.
                They expire when the parent expires.
              </p>
              <CodeBlock language="typescript" code={`// Create "dev.bread.mega" (must own bread.mega)
const parentTokenId = getTokenId('bread')

await wallet.writeContract({
  address: '${CONTRACT_ADDRESS}',
  abi: [{ type: 'function', name: 'registerSubdomain', inputs: [{ name: 'parentId', type: 'uint256' }, { name: 'label', type: 'string' }], outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable' }],
  functionName: 'registerSubdomain',
  args: [parentTokenId, 'dev'],
})`} />
            </Section>

            <Section id="erc721" title="ERC-721 Compatibility">
              <p className="text-[var(--muted-dark)] mb-4 leading-relaxed">
                Names are standard ERC-721 tokens. You can use <code className="font-mono text-[var(--foreground)] bg-[var(--surface)] px-1.5 py-0.5 text-sm">ownerOf</code>,
                <code className="font-mono text-[var(--foreground)] bg-[var(--surface)] px-1.5 py-0.5 text-sm ml-1">transferFrom</code>,
                <code className="font-mono text-[var(--foreground)] bg-[var(--surface)] px-1.5 py-0.5 text-sm ml-1">balanceOf</code>,
                and all standard methods. The contract also provides enumeration:
              </p>
              <CodeBlock language="typescript" code={`// Get all names owned by an address
const tokenIds = await client.readContract({
  address: '${CONTRACT_ADDRESS}',
  abi: [{ type: 'function', name: 'tokensOfOwner', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256[]' }], stateMutability: 'view' }],
  functionName: 'tokensOfOwner',
  args: ['0x9D152D78b05f31EA6979061d432110c8664cA1a7'],
})

// Get name details for a token
const record = await client.readContract({
  address: '${CONTRACT_ADDRESS}',
  abi: [{ type: 'function', name: 'records', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'label', type: 'string' }, { name: 'parent', type: 'uint256' }, { name: 'expiresAt', type: 'uint64' }, { name: 'epoch', type: 'uint64' }, { name: 'parentEpoch', type: 'uint64' }], stateMutability: 'view' }],
  functionName: 'records',
  args: [tokenIds[0]],
})
console.log(record.label + '.mega', 'expires', new Date(Number(record.expiresAt) * 1000))`} />
            </Section>

            <Section id="fee-schedule" title="Fee Schedule">
              <div className="space-y-4">
                <p className="text-[var(--muted-dark)] leading-relaxed">
                  Annual registration fees are based on name length. Multi-year registrations receive discounts.
                </p>
                <div className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left font-label text-xs uppercase tracking-wider text-[var(--muted)] p-3">Length</th>
                        <th className="text-left font-label text-xs uppercase tracking-wider text-[var(--muted)] p-3">Annual Fee</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      <tr className="border-b border-[var(--border)]"><td className="p-3">1 character</td><td className="p-3">$1,000</td></tr>
                      <tr className="border-b border-[var(--border)]"><td className="p-3">2 characters</td><td className="p-3">$500</td></tr>
                      <tr className="border-b border-[var(--border)]"><td className="p-3">3 characters</td><td className="p-3">$100</td></tr>
                      <tr className="border-b border-[var(--border)]"><td className="p-3">4 characters</td><td className="p-3">$10</td></tr>
                      <tr><td className="p-3">5+ characters</td><td className="p-3">$1</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left font-label text-xs uppercase tracking-wider text-[var(--muted)] p-3">Duration</th>
                        <th className="text-left font-label text-xs uppercase tracking-wider text-[var(--muted)] p-3">Discount</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      <tr className="border-b border-[var(--border)]"><td className="p-3">2 years</td><td className="p-3">5%</td></tr>
                      <tr className="border-b border-[var(--border)]"><td className="p-3">3 years</td><td className="p-3">10%</td></tr>
                      <tr className="border-b border-[var(--border)]"><td className="p-3">5 years</td><td className="p-3">15%</td></tr>
                      <tr><td className="p-3">10 years</td><td className="p-3">25%</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>

            <Section id="links" title="Links & Resources">
              <div className="space-y-3">
                {[
                  { label: 'Smart Contract (MegaNames.sol)', url: 'https://github.com/0xBreadguy/mega-names/blob/main/src/MegaNames.sol', desc: 'Full Solidity source — single contract with registration, resolver, subdomains, and ERC-721' },
                  { label: 'Contract ABI', url: 'https://github.com/0xBreadguy/mega-names/blob/main/web/src/lib/contracts.ts', desc: 'TypeScript ABI definition + contract addresses' },
                  { label: 'Frontend Hooks', url: 'https://github.com/0xBreadguy/mega-names/blob/main/web/src/lib/hooks.ts', desc: 'React hooks for name resolution, registration, and management' },
                  { label: 'AGENTS.md', url: 'https://github.com/0xBreadguy/mega-names/blob/main/AGENTS.md', desc: 'Complete AI/LLM integration reference with all function signatures and patterns' },
                  { label: 'Test Suite', url: 'https://github.com/0xBreadguy/mega-names/blob/main/test/MegaNames.t.sol', desc: 'Foundry tests — good examples of contract interaction patterns' },
                  { label: 'Warren Library', url: 'https://github.com/0xBreadguy/mega-names/blob/main/src/WarrenLib.sol', desc: 'Contenthash encoding for linking .mega names to Warren on-chain websites' },
                  { label: 'ERC-7828 Interop', url: 'https://interopaddress.com', desc: 'Cross-chain address format — bread.mega@megaeth resolves across chains' },
                ].map(link => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-[var(--surface)] border border-[var(--border)] p-4 hover:border-[var(--foreground)] transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm text-[var(--foreground)] group-hover:underline">{link.label}</p>
                        <p className="text-xs text-[var(--muted)] mt-1">{link.desc}</p>
                      </div>
                      <span className="text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors shrink-0">↗</span>
                    </div>
                  </a>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  )
}
