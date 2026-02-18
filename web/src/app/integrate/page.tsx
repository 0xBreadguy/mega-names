'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown } from 'lucide-react'

const CONTRACT_ADDRESS = '0x5B424C6CCba77b32b9625a6fd5A30D409d20d997'
const RPC_URL = 'https://mainnet.megaeth.com/rpc'
const API_BASE = 'https://api.dotmega.domains'
const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
const REPUTATION_REGISTRY = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="absolute top-3 right-3 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)] transition-colors z-10"
    >
      {copied ? 'copied' : 'copy'}
    </button>
  )
}

function TabbedCode({ tabs }: { tabs: { label: string; code: string }[] }) {
  const [active, setActive] = useState(0)
  return (
    <div className="relative shadow-[0_2px_8px_rgba(25,25,26,0.06),0_1px_3px_rgba(25,25,26,0.04)]">
      <div className="flex border-b border-[var(--border)] bg-[var(--foreground)]">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors ${
              active === i
                ? 'text-[var(--background)] border-b-2 border-[var(--background)]'
                : 'text-[var(--muted)] hover:text-[var(--background)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <CopyButton text={tabs[active].code} />
        <pre className="bg-[var(--foreground)] text-[var(--background)] p-4 pt-10 overflow-x-auto text-sm font-mono leading-relaxed border border-t-0 border-[var(--border)]">
          <code>{tabs[active].code}</code>
        </pre>
      </div>
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative shadow-[0_2px_8px_rgba(25,25,26,0.06),0_1px_3px_rgba(25,25,26,0.04)]">
      <CopyButton text={code} />
      <pre className="bg-[var(--foreground)] text-[var(--background)] p-4 pt-10 overflow-x-auto text-sm font-mono leading-relaxed border border-[var(--border)]">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Section({ id, title, children, defaultOpen = false }: { id: string; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section id={id} className="scroll-mt-20 border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_2px_8px_rgba(25,25,26,0.06),0_1px_3px_rgba(25,25,26,0.04)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-[var(--surface)] transition-colors"
      >
        <h2 className="font-display text-xl sm:text-2xl text-left">{title}</h2>
        <ChevronDown className={`w-5 h-5 text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-[var(--border)]">
          {children}
        </div>
      )}
    </section>
  )
}

const REVERSE_RESOLVE_TABS = [
  {
    label: 'TypeScript',
    code: `import { createPublicClient, http } from 'viem'

const client = createPublicClient({
  transport: http('${RPC_URL}'),
})

const name = await client.readContract({
  address: '${CONTRACT_ADDRESS}',
  abi: [{
    type: 'function', name: 'getName',
    inputs: [{ name: 'addr_', type: 'address' }],
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  }],
  functionName: 'getName',
  args: ['0x9D152D78b05f31EA6979061d432110c8664cA1a7'],
})

const display = name ? \`\${name}.mega\` : '0x9D15...1a7'`,
  },
  {
    label: 'Python',
    code: `from web3 import Web3

w3 = Web3(Web3.HTTPProvider("${RPC_URL}"))

abi = [{"type":"function","name":"getName",
        "inputs":[{"name":"addr_","type":"address"}],
        "outputs":[{"type":"string"}],
        "stateMutability":"view"}]

contract = w3.eth.contract(
    address="${CONTRACT_ADDRESS}",
    abi=abi,
)

name = contract.functions.getName(
    "0x9D152D78b05f31EA6979061d432110c8664cA1a7"
).call()

display = f"{name}.mega" if name else "0x9D15...1a7"`,
  },
  {
    label: 'curl',
    code: `# Using the dotmega API (no web3 needed):
curl "https://api.dotmega.domains/resolve?address=0x9D152D78b05f31EA6979061d432110c8664cA1a7"

# Or directly with cast:
cast call ${CONTRACT_ADDRESS} \\
  "getName(address)(string)" \\
  0x9D152D78b05f31EA6979061d432110c8664cA1a7 \\
  --rpc-url ${RPC_URL}`,
  },
]

const RESOLVE_TABS = [
  {
    label: 'TypeScript',
    code: `import { keccak256, toBytes, encodePacked } from 'viem'

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

const address = await client.readContract({
  address: '${CONTRACT_ADDRESS}',
  abi: [{
    type: 'function', name: 'addr',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  }],
  functionName: 'addr',
  args: [getTokenId('bread')],
})
// Returns 0x0 if name doesn't exist or is expired`,
  },
  {
    label: 'Python',
    code: `from web3 import Web3

w3 = Web3(Web3.HTTPProvider("${RPC_URL}"))

# Compute token ID (namehash)
MEGA_NODE = Web3.solidity_keccak(
    ["bytes32", "bytes32"],
    [b"\\x00" * 32, Web3.solidity_keccak(["string"], ["mega"])]
)

def get_token_id(label: str) -> int:
    label_hash = Web3.solidity_keccak(["string"], [label.lower()])
    return int.from_bytes(
        Web3.solidity_keccak(["bytes32", "bytes32"], [MEGA_NODE, label_hash]),
        "big",
    )

abi = [{"type":"function","name":"addr",
        "inputs":[{"name":"tokenId","type":"uint256"}],
        "outputs":[{"type":"address"}],
        "stateMutability":"view"}]

contract = w3.eth.contract(
    address="${CONTRACT_ADDRESS}",
    abi=abi,
)

address = contract.functions.addr(get_token_id("bread")).call()`,
  },
  {
    label: 'curl',
    code: `# Using the dotmega API (no web3 needed):
curl "https://api.dotmega.domains/resolve?name=bread.mega"

# Or directly with cast:
MEGA_NODE=$(cast keccak $(cast abi-encode \\
  "f(bytes32,bytes32)" \\
  0x${'0'.repeat(64)} \\
  $(cast keccak $(cast --from-utf8 "mega"))))

TOKEN_ID=$(cast keccak $(cast concat-hex \\
  $MEGA_NODE \\
  $(cast keccak $(cast --from-utf8 "bread"))))

cast call ${CONTRACT_ADDRESS} \\
  "addr(uint256)(address)" \\
  $TOKEN_ID \\
  --rpc-url ${RPC_URL}`,
  },
]

const API_TABS = [
  {
    label: 'Forward',
    code: `# Resolve name to address
curl "https://api.dotmega.domains/resolve?name=bread.mega"

# Response:
{
  "name": "bread.mega",
  "address": "0x61083772b5b10b6214c91db6ad625ecb24a60834",
  "chain": "megaeth:4326"
}`,
  },
  {
    label: 'Reverse',
    code: `# Resolve address to name
curl "https://api.dotmega.domains/resolve?address=0x61083772b5B10b6214C91db6AD625eCb24A60834"

# Response:
{
  "address": "0x61083772b5b10b6214c91db6ad625ecb24a60834",
  "name": "bread.mega",
  "chain": "megaeth:4326"
}`,
  },
  {
    label: 'Lookup',
    code: `# Full profile lookup
curl "https://api.dotmega.domains/lookup?name=bread.mega"

# Response:
{
  "name": "bread.mega",
  "address": "0x61083772b5b10b6214c91db6ad625ecb24a60834",
  "owner": "0x61083772b5b10b6214c91db6ad625ecb24a60834",
  "expiry": "2036-02-10T19:49:46.000Z",
  "isExpired": false,
  "tokenId": "0xb1665f79...",
  "textRecords": {
    "avatar": "https://x.com/bread_/photo"
  },
  "chain": "megaeth:4326"
}`,
  },
]

export default function IntegratePage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--muted-dark)] hover:text-[var(--foreground)] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-label text-sm">back</span>
        </Link>

        <div className="mb-10">
          <p className="font-label text-[var(--muted)] text-xs uppercase tracking-widest mb-2">for developers</p>
          <h1 className="font-display text-4xl sm:text-5xl text-[var(--foreground)] mb-3">
            INTEGRATE .MEGA DOMAINS
          </h1>
          <p className="text-[var(--muted-dark)] max-w-2xl leading-relaxed">
            Display .mega domains in your app. Resolve names to addresses and addresses to names via API or onchain.
          </p>
        </div>

        <div className="space-y-4">
          {/* REST API */}
          <Section id="api" title="REST API" defaultOpen>
            <div className="space-y-3 text-[var(--muted-dark)] leading-relaxed">
              <p>
                The simplest way to integrate. No web3 libraries needed — just HTTP GET requests.
                Rate limited to 60 req/min for resolve, 20 req/min for lookup. Responses are edge-cached.
              </p>
              <div className="bg-[var(--surface)] border border-[var(--border-light)] p-4 shadow-[inset_0_1px_3px_rgba(25,25,26,0.04)]">
                <ul className="space-y-2 text-sm font-mono">
                  <li><span className="text-[var(--foreground)]">GET /resolve?name=bread.mega</span> <span className="text-[var(--muted)]">→ address</span></li>
                  <li><span className="text-[var(--foreground)]">GET /resolve?address=0x...</span> <span className="text-[var(--muted)]">→ name</span></li>
                  <li><span className="text-[var(--foreground)]">GET /lookup?name=bread.mega</span> <span className="text-[var(--muted)]">→ full profile</span></li>
                </ul>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Base URL: <a href={API_BASE} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--foreground)]">{API_BASE}</a>
              </p>
            </div>
            <div className="mt-4">
              <TabbedCode tabs={API_TABS} />
            </div>
          </Section>

          <Section id="contract" title="ONCHAIN CONTRACT">
            <div className="space-y-4 text-[var(--muted-dark)] leading-relaxed">
              <p>
                For direct contract reads — no intermediary, fully trustless.
                .MEGA is a single contract — no registry/resolver split, no subgraphs.
              </p>
              <div className="bg-[var(--surface)] border border-[var(--border-light)] p-4 space-y-3 font-mono text-sm shadow-[inset_0_1px_3px_rgba(25,25,26,0.04)]">
                <div className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-[var(--muted)] shrink-0">Address:</span>
                  <span className="text-[var(--foreground)] break-all">{CONTRACT_ADDRESS}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-[var(--muted)] shrink-0">Chain:</span>
                  <span className="text-[var(--foreground)]">MegaETH Mainnet (4326)</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-[var(--muted)] shrink-0">RPC:</span>
                  <span className="text-[var(--foreground)]">{RPC_URL}</span>
                </div>
              </div>
            </div>
          </Section>

          <Section id="resolve" title="RESOLVE A NAME TO ADDRESS">
            <p className="text-[var(--muted-dark)] mb-4 leading-relaxed">
              Look up the address a .mega name points to — for example, letting users type &quot;bread.mega&quot; instead of pasting an address.
            </p>
            <TabbedCode tabs={RESOLVE_TABS} />
          </Section>

          <Section id="reverse" title="DISPLAY A .MEGA NAME">
            <p className="text-[var(--muted-dark)] mb-4 leading-relaxed">
              Show a user's .mega name instead of their raw address — the most common integration for wallets and dapps.
            </p>
            <TabbedCode tabs={REVERSE_RESOLVE_TABS} />
          </Section>

          {/* ERC-8004 Agent Identity */}
          <Section id="agent" title="AGENT IDENTITY (ERC-8004)">
            <div className="space-y-4 text-[var(--muted-dark)] leading-relaxed">
              <p>
                dotmega is registered as <span className="text-[var(--foreground)] font-mono">Agent #154</span> on
                the <a href="https://eips.ethereum.org/EIPS/eip-8004" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--foreground)]">ERC-8004</a> Identity
                Registry on MegaETH. This enables trustless agent discovery — any agent can find and use dotmega for name resolution without pre-existing trust.
              </p>

              <div className="bg-[var(--surface)] border border-[var(--border-light)] p-4 space-y-3 font-mono text-sm shadow-[inset_0_1px_3px_rgba(25,25,26,0.04)]">
                <div className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-[var(--muted)] shrink-0">Agent ID:</span>
                  <span className="text-[var(--foreground)]">154</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-[var(--muted)] shrink-0">Identity Registry:</span>
                  <span className="text-[var(--foreground)] break-all">{IDENTITY_REGISTRY}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-[var(--muted)] shrink-0">Reputation Registry:</span>
                  <span className="text-[var(--foreground)] break-all">{REPUTATION_REGISTRY}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-2">
                  <span className="text-[var(--muted)] shrink-0">Chain:</span>
                  <span className="text-[var(--foreground)]">MegaETH Mainnet (4326)</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-label text-[var(--muted)] uppercase tracking-wider mb-2">read agent registration</p>
                <CodeBlock code={`# Fetch dotmega's agent registration
cast call ${IDENTITY_REGISTRY} \\
  "tokenURI(uint256)(string)" 154 \\
  --rpc-url ${RPC_URL}

# Get agent wallet
cast call ${IDENTITY_REGISTRY} \\
  "getAgentWallet(uint256)(address)" 154 \\
  --rpc-url ${RPC_URL}`} />
              </div>

              <div>
                <p className="text-sm font-label text-[var(--muted)] uppercase tracking-wider mb-2">leave feedback</p>
                <p className="text-sm mb-3">
                  Used dotmega in your agent workflow? Leave onchain feedback to help other agents evaluate trust. Self-feedback is blocked by the contract.
                </p>
                <CodeBlock code={`# Give feedback on dotmega (agent 154)
# value: 1-100 scale, decimals: 0
# tag1: category (e.g. "resolution")
# tag2: subcategory (e.g. "speed")
cast send ${REPUTATION_REGISTRY} \\
  "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)" \\
  154 \\
  85 \\
  0 \\
  "resolution" \\
  "accuracy" \\
  "https://api.dotmega.domains/resolve" \\
  "" \\
  0x0000000000000000000000000000000000000000000000000000000000000000 \\
  --rpc-url ${RPC_URL} \\
  --private-key <YOUR_KEY>`} />
              </div>

              <div>
                <p className="text-sm font-label text-[var(--muted)] uppercase tracking-wider mb-2">read reputation</p>
                <CodeBlock code={`# Read feedback for dotmega (agent 154)
# Get all clients who have left feedback
cast call ${REPUTATION_REGISTRY} \\
  "getClients(uint256)(address[])" 154 \\
  --rpc-url ${RPC_URL}

# Read specific feedback
cast call ${REPUTATION_REGISTRY} \\
  "readFeedback(uint256,address,uint64)" \\
  154 <CLIENT_ADDRESS> 1 \\
  --rpc-url ${RPC_URL}`} />
              </div>
            </div>
          </Section>

          <Section id="links" title="RESOURCES">
            <div className="space-y-3">
              {[
                { label: 'Resolution API', url: 'https://api.dotmega.domains', desc: 'REST API for name resolution — no web3 needed' },
                { label: 'Source Code', url: 'https://github.com/0xBreadguy/mega-names/blob/main/src/MegaNames.sol', desc: 'Full contract source' },
                { label: 'AGENTS.md', url: 'https://github.com/0xBreadguy/mega-names/blob/main/AGENTS.md', desc: 'Complete ABI reference for AI agents' },
                { label: 'Frontend Hooks', url: 'https://github.com/0xBreadguy/mega-names/blob/main/web/src/lib/hooks.ts', desc: 'React hooks for name resolution' },
                { label: 'ERC-8004 Spec', url: 'https://eips.ethereum.org/EIPS/eip-8004', desc: 'Trustless agent discovery and reputation standard' },
                { label: 'ERC-8004 Contracts', url: 'https://github.com/erc-8004/erc-8004-contracts', desc: 'Identity and Reputation Registry source' },
                { label: 'AI Developer Skills', url: 'https://github.com/0xBreadguy/megaeth-ai-developer-skills', desc: 'MegaETH development playbook for AI coding agents' },
                { label: 'ERC-7828 / ERC-7930 Interop', url: 'https://interopaddress.com', desc: 'Cross-chain address format — bread.mega@megaeth' },
              ].map(link => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-[var(--surface)] border border-[var(--border-light)] p-4 hover:border-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-all group shadow-[inset_0_1px_3px_rgba(25,25,26,0.04)]"
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

        {/* CTA */}
        <div className="mt-8 p-8 border border-[var(--border)] bg-[var(--bg-card)] text-center shadow-[0_2px_8px_rgba(25,25,26,0.06),0_1px_3px_rgba(25,25,26,0.04)]">
          <h2 className="font-display text-2xl mb-3">READY TO BUILD?</h2>
          <p className="text-[var(--muted-dark)] text-sm mb-6">
            Start resolving .mega domains in your app today.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/" className="btn-primary px-6 py-2 font-label">
              SEARCH NAMES
            </Link>
            <Link href="/about" className="btn-secondary px-6 py-2 font-label">
              LEARN MORE
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
