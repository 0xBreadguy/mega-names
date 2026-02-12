export const CONTRACTS = {
  testnet: {
    megaNames: '0x8F0310eEDcfB71E5095ee5ce4f3676D9cEA65101' as const,
    usdm: '0xa8a7Ea151E366532ce8b0442255aE60E0ff2F833' as const,
  },
  mainnet: {
    megaNames: '0x3B4f7D6a5453f7161Eb5F7830726c12D3157c9Ad' as const,
    usdm: '0xbB4E6d2F0f1C65a180D8aA57acF22eF8397f6c62' as const,
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
