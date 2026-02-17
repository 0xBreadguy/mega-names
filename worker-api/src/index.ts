import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

const RPC = 'https://mainnet.megaeth.com/rpc';
const CONTRACT = '0x5B424C6CCba77b32b9625a6fd5A30D409d20d997';
const CHAIN = 'megaeth:4326';
const MEGA_NODE = '0x892fab39f6d2ae901009febba7dbdd0fd85e8a1651be6b8901774cdef395852f';
const TEXT_KEYS = ['avatar', 'url', 'twitter', 'github', 'email', 'description', 'discord'];
const MAX_NAME_LENGTH = 255;

// Rate limits per IP per minute
const RATE_LIMIT_RESOLVE = 60;
const RATE_LIMIT_LOOKUP = 20;
const RATE_LIMIT_WINDOW = 60_000; // 1 minute in ms

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// --- Rate Limiting (in-memory, per-isolate) ---

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateBucket>();

function checkRateLimit(ip: string, endpoint: string, limit: number): { allowed: boolean; remaining: number; resetAt: number } {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  let bucket = rateLimits.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    rateLimits.set(key, bucket);
  }

  bucket.count++;

  // Periodic cleanup — evict expired entries every 100 checks
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimits) {
      if (now > v.resetAt) rateLimits.delete(k);
    }
  }

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

function rateLimitHeaders(remaining: number, resetAt: number, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
  };
}

// --- Edge Cache ---

async function cachedResponse(request: Request, handler: () => Promise<Response>): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });

  // Try cache first
  const cached = await cache.match(cacheKey);
  if (cached) {
    const resp = new Response(cached.body, cached);
    resp.headers.set('X-Cache', 'HIT');
    return resp;
  }

  // Cache miss — fetch from origin
  const response = await handler();

  // Only cache successful responses
  if (response.status === 200) {
    const cloned = response.clone();
    // Cloudflare Cache API respects Cache-Control headers
    // Ensure we have cache headers before storing
    if (cloned.headers.get('Cache-Control')) {
      const cacheable = new Response(cloned.body, cloned);
      cacheable.headers.set('X-Cache', 'MISS');
      await cache.put(cacheKey, cacheable);
    }
  }

  response.headers.set('X-Cache', 'MISS');
  return response;
}

// --- Hashing ---

function keccak256Str(s: string): string {
  return '0x' + bytesToHex(keccak_256(new TextEncoder().encode(s)));
}

function keccak256Hex(hex: string): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return '0x' + bytesToHex(keccak_256(hexToBytes(clean)));
}

function computeTokenId(name: string): string {
  const parts = name.split('.');

  if (parts.length === 1) {
    const labelHash = keccak256Str(parts[0]);
    return keccak256Hex(MEGA_NODE + labelHash.slice(2));
  }

  const rootLabel = parts[parts.length - 1];
  let parentId = keccak256Hex(MEGA_NODE + keccak256Str(rootLabel).slice(2));

  for (let i = parts.length - 2; i >= 0; i--) {
    const subHash = keccak256Str(parts[i]);
    parentId = keccak256Hex(parentId + subHash.slice(2));
  }

  return parentId;
}

// --- ABI helpers ---

function pad32(hex: string): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return clean.padStart(64, '0');
}

function encodeUint256(hex: string): string {
  return pad32(hex);
}

function encodeStringArg(s: string): string {
  const bytes = new TextEncoder().encode(s);
  const len = bytes.length.toString(16).padStart(64, '0');
  const data = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return len + data.padEnd(Math.ceil(data.length / 64) * 64 || 64, '0');
}

function decodeAddress(hex: string): string {
  if (!hex || hex === '0x' || hex.length < 42) return '';
  return '0x' + hex.slice(-40).toLowerCase();
}

function decodeString(hex: string): string {
  if (!hex || hex === '0x' || hex.length < 130) return '';
  const len = parseInt(hex.slice(66, 130), 16);
  if (len === 0) return '';
  const data = hex.slice(130, 130 + len * 2);
  const bytes: number[] = [];
  for (let i = 0; i < data.length; i += 2) {
    bytes.push(parseInt(data.substr(i, 2), 16));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

// --- RPC ---

async function ethCall(data: string): Promise<string> {
  const resp = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'eth_call',
      params: [{ to: CONTRACT, data }, 'latest'], id: 1,
    }),
  });
  const json: any = await resp.json();
  if (json.error) throw new Error(json.error.message);
  return json.result || '0x';
}

// --- Contract reads ---

async function getAddr(tokenId: string): Promise<string> {
  try {
    const result = await ethCall('0xffa18649' + encodeUint256(tokenId));
    const addr = decodeAddress(result);
    return addr === '0x0000000000000000000000000000000000000000' ? '' : addr;
  } catch {
    return '';
  }
}

async function getName(address: string): Promise<string> {
  const result = await ethCall('0x5fd4b08a' + pad32(address));
  return decodeString(result);
}

async function getOwner(tokenId: string): Promise<string> {
  try {
    const result = await ethCall('0x6352211e' + encodeUint256(tokenId));
    return decodeAddress(result);
  } catch {
    return '';
  }
}

async function getRecord(tokenId: string): Promise<{ label: string; expiresAt: number }> {
  try {
    const result = await ethCall('0x34461067' + encodeUint256(tokenId));
    if (!result || result === '0x' || result.length < 130) return { label: '', expiresAt: 0 };

    const expiresAt = parseInt(result.slice(2 + 128, 2 + 192), 16);

    const labelOffset = parseInt(result.slice(2, 66), 16);
    const labelStart = 2 + labelOffset * 2;
    let label = '';
    if (labelStart + 64 <= result.length) {
      const labelLen = parseInt(result.slice(labelStart, labelStart + 64), 16);
      if (labelLen > 0 && labelLen < 256 && labelStart + 64 + labelLen * 2 <= result.length) {
        const labelData = result.slice(labelStart + 64, labelStart + 64 + labelLen * 2);
        const bytes: number[] = [];
        for (let i = 0; i < labelData.length; i += 2) {
          bytes.push(parseInt(labelData.substr(i, 2), 16));
        }
        label = new TextDecoder().decode(new Uint8Array(bytes));
      }
    }

    return { label, expiresAt };
  } catch {
    return { label: '', expiresAt: 0 };
  }
}

async function getText(tokenId: string, key: string): Promise<string> {
  try {
    const data = '0x308e3386'
      + encodeUint256(tokenId)
      + '0000000000000000000000000000000000000000000000000000000000000040'
      + encodeStringArg(key);
    const result = await ethCall(data);
    return decodeString(result);
  } catch {
    return '';
  }
}

// --- Normalize ---

function normalizeName(name: string): string | null {
  if (!name || name.length > MAX_NAME_LENGTH) return null;
  name = name.toLowerCase().trim();
  if (name.endsWith('.mega')) name = name.slice(0, -5);
  if (!name) return null;

  const parts = name.split('.');
  if (parts.length > 10) return null; // max subdomain depth
  for (const part of parts) {
    if (part.length === 0 || part.length > 63) return null;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(part)) return null;
  }
  return name;
}

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

// --- Response ---

function jsonResp(data: any, status: number, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extra },
  });
}

// --- Routes ---

async function handleResolve(url: URL): Promise<Response> {
  const name = url.searchParams.get('name');
  const address = url.searchParams.get('address');

  if (name && address) return jsonResp({ error: 'Specify name or address, not both' }, 400);
  if (!name && !address) return jsonResp({ error: 'Missing name or address parameter' }, 400);

  const cache = { 'Cache-Control': 'public, max-age=60, s-maxage=60' };

  if (name) {
    const norm = normalizeName(name);
    if (!norm) return jsonResp({ error: 'Invalid name' }, 400);
    const tokenId = computeTokenId(norm);
    let addr = await getAddr(tokenId);
    if (!addr) addr = await getOwner(tokenId);
    if (!addr) return jsonResp({ error: 'not found' }, 404);
    return jsonResp({ name: norm + '.mega', address: addr, chain: CHAIN }, 200, cache);
  }

  if (!isValidAddress(address!)) return jsonResp({ error: 'Invalid address' }, 400);
  const resolved = await getName(address!);
  if (!resolved) return jsonResp({ error: 'not found' }, 404);
  return jsonResp({ address: address!.toLowerCase(), name: resolved, chain: CHAIN }, 200, cache);
}

async function handleLookup(url: URL): Promise<Response> {
  const name = url.searchParams.get('name');
  if (!name) return jsonResp({ error: 'Missing name parameter' }, 400);

  const norm = normalizeName(name);
  if (!norm) return jsonResp({ error: 'Invalid name' }, 400);

  const tokenId = computeTokenId(norm);

  let [addr, owner, record, ...texts] = await Promise.all([
    getAddr(tokenId),
    getOwner(tokenId),
    getRecord(tokenId),
    ...TEXT_KEYS.map(k => getText(tokenId, k)),
  ]);

  if (!addr && !owner) return jsonResp({ error: 'not found' }, 404);
  if (!addr) addr = owner;

  const textRecords: Record<string, string> = {};
  TEXT_KEYS.forEach((k, i) => { if (texts[i]) textRecords[k] = texts[i]; });

  const GRACE = 90 * 24 * 3600;
  const now = Math.floor(Date.now() / 1000);

  return jsonResp({
    name: norm + '.mega',
    address: addr || null,
    owner: owner || null,
    expiry: record.expiresAt ? new Date(record.expiresAt * 1000).toISOString() : null,
    isExpired: record.expiresAt ? now > record.expiresAt + GRACE : false,
    tokenId,
    textRecords,
    chain: CHAIN,
  }, 200, { 'Cache-Control': 'public, max-age=300, s-maxage=300' });
}

// --- Entry ---

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'GET') return jsonResp({ error: 'Method not allowed' }, 405);

    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Rate limiting
    const endpoint = url.pathname;
    const limit = endpoint === '/lookup' ? RATE_LIMIT_LOOKUP : RATE_LIMIT_RESOLVE;
    const rl = checkRateLimit(ip, endpoint, limit);

    if (!rl.allowed) {
      return jsonResp(
        { error: 'Rate limit exceeded', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        429,
        {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          ...rateLimitHeaders(rl.remaining, rl.resetAt, limit),
        },
      );
    }

    const rlHeaders = rateLimitHeaders(rl.remaining, rl.resetAt, limit);

    try {
      if (endpoint === '/resolve') {
        return await cachedResponse(request, async () => {
          const resp = await handleResolve(url);
          // Append rate limit headers
          for (const [k, v] of Object.entries(rlHeaders)) resp.headers.set(k, v);
          return resp;
        });
      }

      if (endpoint === '/lookup') {
        return await cachedResponse(request, async () => {
          const resp = await handleLookup(url);
          for (const [k, v] of Object.entries(rlHeaders)) resp.headers.set(k, v);
          return resp;
        });
      }

      if (endpoint === '/') {
        return jsonResp({
          service: 'dotmega',
          description: '.mega name resolution API on MegaETH',
          endpoints: ['/resolve?name=', '/resolve?address=', '/lookup?name='],
          chain: CHAIN,
          rateLimit: { resolve: `${RATE_LIMIT_RESOLVE}/min`, lookup: `${RATE_LIMIT_LOOKUP}/min` },
        }, 200, rlHeaders);
      }

      return jsonResp({ error: 'Not found' }, 404);
    } catch (e: any) {
      console.error(e);
      return jsonResp({ error: 'Internal error' }, 500);
    }
  },
};
