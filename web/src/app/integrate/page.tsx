'use client'

import { useState } from 'react'

const CONTRACT_ADDRESS = '0x5B424C6CCba77b32b9625a6fd5A30D409d20d997'
const RPC_URL = 'https://mainnet.megaeth.com/rpc'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="absolute top-3 right-3 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)] transition-colors z-10"
    >
      {copied ? '✓ copied' : 'copy'}
    </button>
  )
}

function TabbedCode({ tabs }: { tabs: { label: string; code: string }[] }) {
  const [active, setActive] = useState(0)
  return (
    <div className="relative">
      <div className="flex border-b border-[var(--border)] bg-[var(--foreground)]">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
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
    code: `# getName(address) — function selector: 0x5cf3d346
DATA=$(cast calldata "getName(address)" \\
  0x9D152D78b05f31EA6979061d432110c8664cA1a7)

curl -s ${RPC_URL} -X POST \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc":"2.0","method":"eth_call","id":1,
    "params":[{
      "to":"${CONTRACT_ADDRESS}",
      "data":"'$DATA'"
    },"latest"]
  }' | jq -r '.result'

# Or with cast directly:
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
    code: `# Step 1: Compute token ID
MEGA_NODE=$(cast keccak $(cast abi-encode \\
  "f(bytes32,bytes32)" \\
  0x${'0'.repeat(64)} \\
  $(cast keccak $(cast --from-utf8 "mega"))))

TOKEN_ID=$(cast keccak $(cast concat-hex \\
  $MEGA_NODE \\
  $(cast keccak $(cast --from-utf8 "bread"))))

# Step 2: Resolve
cast call ${CONTRACT_ADDRESS} \\
  "addr(uint256)(address)" \\
  $TOKEN_ID \\
  --rpc-url ${RPC_URL}`,
  },
]

export default function IntegratePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <p className="font-label text-[var(--muted)] text-xs uppercase tracking-widest mb-2">for developers</p>
          <h1 className="font-display text-4xl sm:text-5xl text-[var(--foreground)] mb-3">
            Integrate Mega Names
          </h1>
          <p className="text-[var(--muted-dark)] max-w-2xl leading-relaxed">
            Display .mega names in your app. Resolve names to addresses and addresses to names with a few lines of code.
          </p>
        </div>

        <div className="space-y-12">
          <Section id="overview" title="How It Works">
            <div className="space-y-3 text-[var(--muted-dark)] leading-relaxed">
              <p>
                MegaNames is a single contract — no registry/resolver split, no subgraphs.
                Two read calls cover most use cases:
              </p>
              <div className="bg-[var(--surface)] border border-[var(--border)] p-4">
                <ul className="space-y-2 text-sm font-mono">
                  <li><span className="text-[var(--foreground)]">getName(address)</span> <span className="text-[var(--muted)]">→ resolve address to name</span></li>
                  <li><span className="text-[var(--foreground)]">addr(tokenId)</span> <span className="text-[var(--muted)]">→ resolve name to address</span></li>
                </ul>
              </div>
            </div>
          </Section>

          <Section id="contract" title="Contract">
            <div className="bg-[var(--surface)] border border-[var(--border)] p-4 space-y-2 font-mono text-sm">
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
          </Section>

          <Section id="reverse" title="Display a .mega Name">
            <p className="text-[var(--muted-dark)] mb-4 leading-relaxed">
              Show a user's .mega name instead of their raw address. This is the most common integration.
            </p>
            <TabbedCode tabs={REVERSE_RESOLVE_TABS} />
          </Section>

          <Section id="resolve" title="Resolve a Name to Address">
            <p className="text-[var(--muted-dark)] mb-4 leading-relaxed">
              Look up the address a .mega name points to — for example, letting users type "bread.mega" instead of pasting an address.
            </p>
            <TabbedCode tabs={RESOLVE_TABS} />
          </Section>

          <Section id="links" title="Resources">
            <div className="space-y-3">
              {[
                { label: 'Source Code', url: 'https://github.com/0xBreadguy/mega-names/blob/main/src/MegaNames.sol', desc: 'Full contract source' },
                { label: 'AGENTS.md', url: 'https://github.com/0xBreadguy/mega-names/blob/main/AGENTS.md', desc: 'Complete ABI reference for AI agents & LLMs' },
                { label: 'Frontend Hooks', url: 'https://github.com/0xBreadguy/mega-names/blob/main/web/src/lib/hooks.ts', desc: 'React hooks for name resolution' },
                { label: 'AI Developer Skills', url: 'https://github.com/0xBreadguy/megaeth-ai-developer-skills', desc: 'MegaETH development playbook for AI coding agents' },
                { label: 'ERC-7828 Interop', url: 'https://interopaddress.com', desc: 'Cross-chain address format — bread.mega@megaeth' },
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
  )
}
