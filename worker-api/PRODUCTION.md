# Production Deployment Guide

## Step 1: Fix Keccak256 Implementation

The current implementation uses a placeholder hash function. For production, replace it with a proper keccak256 implementation.

### Option 1: Add @noble/hashes dependency

```bash
npm install @noble/hashes
```

Then replace the keccak256 functions in `src/index.ts`:

```typescript
import { keccak_256 } from '@noble/hashes/sha3';

function keccak256(input: string): string {
  const inputBytes = new TextEncoder().encode(input);
  return keccak256Bytes(inputBytes);
}

function keccak256Hex(hex: string): string {
  if (hex.startsWith('0x')) hex = hex.slice(2);
  
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  
  return keccak256Bytes(bytes);
}

function keccak256Bytes(input: Uint8Array): string {
  const hash = keccak_256(input);
  const hashHex = Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
  return '0x' + hashHex;
}
```

### Option 2: Use Web Crypto API (if available)

If Cloudflare Workers support keccak256 in the future, use:

```typescript
async function keccak256Bytes(input: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('KECCAK-256', input);
  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  return '0x' + hashHex;
}
```

## Step 2: Test Against Known Names

Before deployment, test the API against known .mega names to verify correct tokenId computation:

```bash
# Test with a known registered .mega name
curl "http://localhost:8788/resolve?name=knownname.mega"

# Should return actual address, not "not found"
```

## Step 3: Deploy to Cloudflare

```bash
# Deploy to production
npx wrangler deploy

# Set up custom domain (optional)
npx wrangler custom-domain:add yourdomain.com
```

## Step 4: Monitoring

Set up monitoring for:

- RPC endpoint health (`https://mainnet.megaeth.com/rpc`)
- Response times
- Error rates
- Cache hit rates

## Step 5: Rate Limiting (Optional)

Consider adding rate limiting if the API receives heavy traffic:

```typescript
// Add to wrangler.toml
[env.production]
name = "dotmega-api"

# KV namespace for rate limiting
kv_namespaces = [
  { binding = "RATE_LIMIT", id = "your-kv-namespace-id" }
]
```

## Expected Performance

With proper keccak256 implementation:

- Forward resolve: ~100-200ms (single RPC call)
- Reverse resolve: ~100-200ms (single RPC call)  
- Full lookup: ~300-500ms (multiple parallel RPC calls)

Caching will significantly improve subsequent requests for the same names.