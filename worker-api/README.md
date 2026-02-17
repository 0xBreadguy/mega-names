# .mega Domain Resolution API

Cloudflare Worker that provides resolution API for the dotmega (.mega) naming service on MegaETH.

## Endpoints

### GET /resolve?name=bread.mega
Forward resolve: name → address
```json
{
  "name": "bread.mega", 
  "address": "0x...", 
  "chain": "megaeth:4326"
}
```

### GET /resolve?address=0x...
Reverse resolve: address → name
```json
{
  "address": "0x...", 
  "name": "bread.mega", 
  "chain": "megaeth:4326"
}
```

### GET /lookup?name=bread.mega
Full profile lookup — returns everything about a name
```json
{
  "name": "bread.mega",
  "address": "0x...",
  "owner": "0x...",
  "expiry": "2029-02-13T00:00:00Z",
  "isExpired": false,
  "tokenId": "...",
  "textRecords": {
    "avatar": "...",
    "url": "...",
    "twitter": "..."
  },
  "chain": "megaeth:4326"
}
```

## Contract Details

- **MegaNames contract:** `0x5B424C6CCba77b32b9625a6fd5A30D409d20d997`
- **RPC:** `https://mainnet.megaeth.com/rpc` 
- **Chain ID:** 4326

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy to Cloudflare
npm run deploy

# View logs
npm run tail
```

## Features

- ✅ Pure Cloudflare Worker (zero external dependencies)
- ✅ Manual ABI encoding/decoding for lightweight RPC calls
- ✅ CORS enabled for all origins
- ✅ Response caching (60s for resolve, 5min for lookup)
- ✅ Proper error handling with HTTP status codes
- ✅ Subdomain support (nested tokenId computation)
- ✅ Text record fetching (avatar, url, twitter, github, etc.)

## Important Notes

⚠️ **Keccak256 Implementation**: The current implementation uses a placeholder hash function for development/testing. For production deployment, replace the `keccak256` functions with a proper implementation using `@noble/hashes` or similar library.

The placeholder will be consistent but **will not match the actual contract tokenIds**. This means the API will return "not found" for all real names until the proper keccak256 is implemented.

## Production Deployment

To make this production-ready:

1. Replace the placeholder keccak256 implementation with a proper one
2. Test against known .mega names to verify correct tokenId computation  
3. Deploy using `wrangler deploy`
4. Set up monitoring for RPC errors and response times

## API Usage Examples

```bash
# Forward resolve
curl "https://dotmega-api.your-worker.workers.dev/resolve?name=bread.mega"

# Reverse resolve  
curl "https://dotmega-api.your-worker.workers.dev/resolve?address=0x1234..."

# Full lookup
curl "https://dotmega-api.your-worker.workers.dev/lookup?name=bread.mega"
```

## Error Responses

- `400` - Invalid input (malformed name/address)
- `404` - Name/address not found
- `500` - Internal server error (RPC failure, etc.)

All errors return JSON: `{"error": "description"}`