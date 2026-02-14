export const CONTRACTS = {
  testnet: {
    megaNames: '0x8F0310eEDcfB71E5095ee5ce4f3676D9cEA65101' as const,
    usdm: '0xa8a7Ea151E366532ce8b0442255aE60E0ff2F833' as const,
  },
  mainnet: {
    megaNames: '0x5B424C6CCba77b32b9625a6fd5A30D409d20d997' as const,
    usdm: '0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7' as const,
    subdomainRouter: '0xdB5e5Ab907e62714D7d9Ffde209A4E770a0507Fe' as const,
    subdomainLogic: '0xf09fB5cB77b570A30D68b1Aa1d944256171C5172' as const,
  },
} as const

export const MEGA_NAMES_ABI = [
  // Read functions
  { type: 'function', name: 'name', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'pure' },
  { type: 'function', name: 'symbol', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'pure' },
  { type: 'function', name: 'registrationFee', inputs: [{ name: 'labelLength', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'ownerOf', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'getName', inputs: [{ name: 'addr_', type: 'address' }], outputs: [{ type: 'string' }], stateMutability: 'view' },
  { type: 'function', name: 'addr', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'records', inputs: [{ name: '', type: 'uint256' }], outputs: [
    { name: 'label', type: 'string' },
    { name: 'parent', type: 'uint256' },
    { name: 'expiresAt', type: 'uint64' },
    { name: 'epoch', type: 'uint64' },
    { name: 'parentEpoch', type: 'uint64' },
  ], stateMutability: 'view' },
  { type: 'function', name: 'commitments', inputs: [{ name: '', type: 'bytes32' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'primaryName', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'text', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'key', type: 'string' }], outputs: [{ type: 'string' }], stateMutability: 'view' },
  { type: 'function', name: 'contenthash', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'bytes' }], stateMutability: 'view' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalRegistrations', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalRenewals', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalSubdomains', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalVolume', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'tokensOfOwner', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256[]' }], stateMutability: 'view' },
  { type: 'function', name: 'tokensOfOwnerCount', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  
  // Write functions
  { type: 'function', name: 'register', inputs: [{ name: 'label', type: 'string' }, { name: 'owner', type: 'address' }, { name: 'numYears', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'registerWithPermit', inputs: [{ name: 'label', type: 'string' }, { name: 'owner', type: 'address' }, { name: 'numYears', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'v', type: 'uint8' }, { name: 'r', type: 'bytes32' }, { name: 's', type: 'bytes32' }], outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'renew', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'numYears', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'setAddr', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'addr_', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'setText', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'key', type: 'string' }, { name: 'value', type: 'string' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'setContenthash', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'hash', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'setWarrenContenthash', inputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'warrenTokenId', type: 'uint32' }, { name: 'isMaster', type: 'bool' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'warren', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: 'warrenTokenId', type: 'uint32' }, { name: 'isMaster', type: 'bool' }, { name: 'isWarren', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'setPrimaryName', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'registerSubdomain', inputs: [{ name: 'parentId', type: 'uint256' }, { name: 'label', type: 'string' }], outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'revokeSubdomain', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  
  // ERC721 Approval
  { type: 'function', name: 'isApprovedForAll', inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'setApprovalForAll', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [], stateMutability: 'nonpayable' },
  
  // ERC721 Transfer
  { type: 'function', name: 'transferFrom', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'safeTransferFrom', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  
  // Events
  { type: 'event', name: 'NameRegistered', inputs: [{ name: 'tokenId', type: 'uint256', indexed: true }, { name: 'label', type: 'string' }, { name: 'owner', type: 'address', indexed: true }, { name: 'expiresAt', type: 'uint256' }] },
  { type: 'event', name: 'SubdomainRegistered', inputs: [{ name: 'tokenId', type: 'uint256', indexed: true }, { name: 'parentId', type: 'uint256', indexed: true }, { name: 'label', type: 'string' }] },
  { type: 'event', name: 'Transfer', inputs: [{ name: 'from', type: 'address', indexed: true }, { name: 'to', type: 'address', indexed: true }, { name: 'id', type: 'uint256', indexed: true }] },
] as const

export const ERC20_ABI = [
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'decimals', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'symbol', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
  // Mock USDM mint for testnet
  { type: 'function', name: 'mint', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  // ERC-2612 permit
  { type: 'function', name: 'nonces', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'DOMAIN_SEPARATOR', inputs: [], outputs: [{ type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'name', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
] as const

export const SUBDOMAIN_ROUTER_ABI = [
  // Read
  { type: 'function', name: 'getConfig', inputs: [{ name: 'parentId', type: 'uint256' }], outputs: [{ name: 'payoutAddress', type: 'address' }, { name: 'enabled', type: 'bool' }, { name: 'mode', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getCounters', inputs: [{ name: 'parentId', type: 'uint256' }], outputs: [{ name: 'sold', type: 'uint64' }, { name: 'active', type: 'uint64' }, { name: 'volumeUsdm6', type: 'uint128' }], stateMutability: 'view' },
  { type: 'function', name: 'quote', inputs: [{ name: 'parentId', type: 'uint256' }, { name: 'label', type: 'string' }, { name: 'buyer', type: 'address' }], outputs: [{ name: 'allowed', type: 'bool' }, { name: 'price', type: 'uint256' }, { name: 'protocolFee', type: 'uint256' }, { name: 'total', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'protocolFeeBps', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  // Write
  { type: 'function', name: 'configure', inputs: [{ name: 'parentId', type: 'uint256' }, { name: 'payoutAddress', type: 'address' }, { name: 'enabled', type: 'bool' }, { name: 'mode', type: 'uint8' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'disable', inputs: [{ name: 'parentId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'register', inputs: [{ name: 'parentId', type: 'uint256' }, { name: 'label', type: 'string' }, { name: 'referrer', type: 'address' }], outputs: [{ name: 'subTokenId', type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'registerFor', inputs: [{ name: 'parentId', type: 'uint256' }, { name: 'label', type: 'string' }, { name: 'to', type: 'address' }, { name: 'referrer', type: 'address' }], outputs: [{ name: 'subTokenId', type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'registerBatch', inputs: [{ name: 'parentId', type: 'uint256' }, { name: 'labels', type: 'string[]' }, { name: 'referrer', type: 'address' }], outputs: [{ name: 'subTokenIds', type: 'uint256[]' }], stateMutability: 'nonpayable' },
  // Events
  { type: 'event', name: 'SubdomainSold', inputs: [{ name: 'parentId', type: 'uint256', indexed: true }, { name: 'subTokenId', type: 'uint256', indexed: true }, { name: 'label', type: 'string' }, { name: 'buyer', type: 'address' }, { name: 'price', type: 'uint256' }] },
] as const

export const SUBDOMAIN_LOGIC_ABI = [
  // Read
  { type: 'function', name: 'prices', inputs: [{ name: 'parentId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'tokenGates', inputs: [{ name: 'parentId', type: 'uint256' }], outputs: [{ name: 'token', type: 'address' }, { name: 'minBalance', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'validate', inputs: [{ name: 'parentId', type: 'uint256' }, { name: 'label', type: 'string' }, { name: 'buyer', type: 'address' }], outputs: [{ name: 'allowed', type: 'bool' }, { name: 'price', type: 'uint256' }], stateMutability: 'view' },
  // Write
  { type: 'function', name: 'setPrice', inputs: [{ name: 'parentId', type: 'uint256' }, { name: 'price', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'setTokenGate', inputs: [{ name: 'parentId', type: 'uint256' }, { name: 'token', type: 'address' }, { name: 'minBalance', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'removeTokenGate', inputs: [{ name: 'parentId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
] as const
