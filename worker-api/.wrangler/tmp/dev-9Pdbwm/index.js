var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-5CxZRW/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// node_modules/@noble/hashes/esm/_u64.js
var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
__name(fromBig, "fromBig");
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
__name(split, "split");
var rotlSH = /* @__PURE__ */ __name((h, l, s) => h << s | l >>> 32 - s, "rotlSH");
var rotlSL = /* @__PURE__ */ __name((h, l, s) => l << s | h >>> 32 - s, "rotlSL");
var rotlBH = /* @__PURE__ */ __name((h, l, s) => l << s - 32 | h >>> 64 - s, "rotlBH");
var rotlBL = /* @__PURE__ */ __name((h, l, s) => h << s - 32 | l >>> 64 - s, "rotlBL");

// node_modules/@noble/hashes/esm/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
__name(isBytes, "isBytes");
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
__name(anumber, "anumber");
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
__name(abytes, "abytes");
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
__name(aexists, "aexists");
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
__name(aoutput, "aoutput");
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
__name(u32, "u32");
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
__name(clean, "clean");
var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
__name(byteSwap, "byteSwap");
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
__name(byteSwap32, "byteSwap32");
var swap32IfBE = isLE ? (u) => u : byteSwap32;
var hasHexBuiltin = /* @__PURE__ */ (() => (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
))();
var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
function bytesToHex(bytes) {
  abytes(bytes);
  if (hasHexBuiltin)
    return bytes.toHex();
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}
__name(bytesToHex, "bytesToHex");
var asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function asciiToBase16(ch) {
  if (ch >= asciis._0 && ch <= asciis._9)
    return ch - asciis._0;
  if (ch >= asciis.A && ch <= asciis.F)
    return ch - (asciis.A - 10);
  if (ch >= asciis.a && ch <= asciis.f)
    return ch - (asciis.a - 10);
  return;
}
__name(asciiToBase16, "asciiToBase16");
function hexToBytes(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  if (hasHexBuiltin)
    return Uint8Array.fromHex(hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2)
    throw new Error("hex string expected, got unpadded hex of length " + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
__name(hexToBytes, "hexToBytes");
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
__name(utf8ToBytes, "utf8ToBytes");
function toBytes(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
__name(toBytes, "toBytes");
var Hash = class {
  static {
    __name(this, "Hash");
  }
};
function createHasher(hashCons) {
  const hashC = /* @__PURE__ */ __name((msg) => hashCons().update(toBytes(msg)).digest(), "hashC");
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
__name(createHasher, "createHasher");

// node_modules/@noble/hashes/esm/sha3.js
var _0n = BigInt(0);
var _1n = BigInt(1);
var _2n = BigInt(2);
var _7n = BigInt(7);
var _256n = BigInt(256);
var _0x71n = BigInt(113);
var SHA3_PI = [];
var SHA3_ROTL = [];
var _SHA3_IOTA = [];
for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
  [x, y] = [y, (2 * x + 3 * y) % 5];
  SHA3_PI.push(2 * (5 * y + x));
  SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
  let t = _0n;
  for (let j = 0; j < 7; j++) {
    R = (R << _1n ^ (R >> _7n) * _0x71n) % _256n;
    if (R & _2n)
      t ^= _1n << (_1n << /* @__PURE__ */ BigInt(j)) - _1n;
  }
  _SHA3_IOTA.push(t);
}
var IOTAS = split(_SHA3_IOTA, true);
var SHA3_IOTA_H = IOTAS[0];
var SHA3_IOTA_L = IOTAS[1];
var rotlH = /* @__PURE__ */ __name((h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s), "rotlH");
var rotlL = /* @__PURE__ */ __name((h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s), "rotlL");
function keccakP(s, rounds = 24) {
  const B = new Uint32Array(5 * 2);
  for (let round = 24 - rounds; round < 24; round++) {
    for (let x = 0; x < 10; x++)
      B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    for (let x = 0; x < 10; x += 2) {
      const idx1 = (x + 8) % 10;
      const idx0 = (x + 2) % 10;
      const B0 = B[idx0];
      const B1 = B[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
      for (let y = 0; y < 50; y += 10) {
        s[x + y] ^= Th;
        s[x + y + 1] ^= Tl;
      }
    }
    let curH = s[2];
    let curL = s[3];
    for (let t = 0; t < 24; t++) {
      const shift = SHA3_ROTL[t];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = Th;
      s[PI + 1] = Tl;
    }
    for (let y = 0; y < 50; y += 10) {
      for (let x = 0; x < 10; x++)
        B[x] = s[y + x];
      for (let x = 0; x < 10; x++)
        s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
    }
    s[0] ^= SHA3_IOTA_H[round];
    s[1] ^= SHA3_IOTA_L[round];
  }
  clean(B);
}
__name(keccakP, "keccakP");
var Keccak = class _Keccak extends Hash {
  static {
    __name(this, "Keccak");
  }
  // NOTE: we accept arguments in bytes instead of bits here.
  constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
    super();
    this.pos = 0;
    this.posOut = 0;
    this.finished = false;
    this.destroyed = false;
    this.enableXOF = false;
    this.blockLen = blockLen;
    this.suffix = suffix;
    this.outputLen = outputLen;
    this.enableXOF = enableXOF;
    this.rounds = rounds;
    anumber(outputLen);
    if (!(0 < blockLen && blockLen < 200))
      throw new Error("only keccak-f1600 function is supported");
    this.state = new Uint8Array(200);
    this.state32 = u32(this.state);
  }
  clone() {
    return this._cloneInto();
  }
  keccak() {
    swap32IfBE(this.state32);
    keccakP(this.state32, this.rounds);
    swap32IfBE(this.state32);
    this.posOut = 0;
    this.pos = 0;
  }
  update(data) {
    aexists(this);
    data = toBytes(data);
    abytes(data);
    const { blockLen, state } = this;
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      for (let i = 0; i < take; i++)
        state[this.pos++] ^= data[pos++];
      if (this.pos === blockLen)
        this.keccak();
    }
    return this;
  }
  finish() {
    if (this.finished)
      return;
    this.finished = true;
    const { state, suffix, pos, blockLen } = this;
    state[pos] ^= suffix;
    if ((suffix & 128) !== 0 && pos === blockLen - 1)
      this.keccak();
    state[blockLen - 1] ^= 128;
    this.keccak();
  }
  writeInto(out) {
    aexists(this, false);
    abytes(out);
    this.finish();
    const bufferOut = this.state;
    const { blockLen } = this;
    for (let pos = 0, len = out.length; pos < len; ) {
      if (this.posOut >= blockLen)
        this.keccak();
      const take = Math.min(blockLen - this.posOut, len - pos);
      out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
      this.posOut += take;
      pos += take;
    }
    return out;
  }
  xofInto(out) {
    if (!this.enableXOF)
      throw new Error("XOF is not possible for this instance");
    return this.writeInto(out);
  }
  xof(bytes) {
    anumber(bytes);
    return this.xofInto(new Uint8Array(bytes));
  }
  digestInto(out) {
    aoutput(out, this);
    if (this.finished)
      throw new Error("digest() was already called");
    this.writeInto(out);
    this.destroy();
    return out;
  }
  digest() {
    return this.digestInto(new Uint8Array(this.outputLen));
  }
  destroy() {
    this.destroyed = true;
    clean(this.state);
  }
  _cloneInto(to) {
    const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
    to || (to = new _Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
    to.state32.set(this.state32);
    to.pos = this.pos;
    to.posOut = this.posOut;
    to.finished = this.finished;
    to.rounds = rounds;
    to.suffix = suffix;
    to.outputLen = outputLen;
    to.enableXOF = enableXOF;
    to.destroyed = this.destroyed;
    return to;
  }
};
var gen = /* @__PURE__ */ __name((suffix, blockLen, outputLen) => createHasher(() => new Keccak(blockLen, suffix, outputLen)), "gen");
var keccak_256 = /* @__PURE__ */ (() => gen(1, 136, 256 / 8))();

// src/index.ts
var RPC = "https://mainnet.megaeth.com/rpc";
var CONTRACT = "0x5B424C6CCba77b32b9625a6fd5A30D409d20d997";
var CHAIN = "megaeth:4326";
var MEGA_NODE = "0x892fab39f6d2ae901009febba7dbdd0fd85e8a1651be6b8901774cdef395852f";
var TEXT_KEYS = ["avatar", "url", "twitter", "github", "email", "description", "discord"];
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
function keccak256Str(s) {
  return "0x" + bytesToHex(keccak_256(new TextEncoder().encode(s)));
}
__name(keccak256Str, "keccak256Str");
function keccak256Hex(hex) {
  const clean2 = hex.startsWith("0x") ? hex.slice(2) : hex;
  return "0x" + bytesToHex(keccak_256(hexToBytes(clean2)));
}
__name(keccak256Hex, "keccak256Hex");
function computeTokenId(name) {
  const parts = name.split(".");
  if (parts.length === 1) {
    const labelHash = keccak256Str(parts[0]);
    return keccak256Hex(MEGA_NODE + labelHash.slice(2));
  }
  const rootLabel = parts[parts.length - 1];
  let parentId = keccak256Hex(MEGA_NODE + keccak256Str(rootLabel).slice(2));
  for (let i = parts.length - 2; i >= 0; i--) {
    const subHash = keccak256Str(parts[i]);
    parentId = keccak256Hex(parentId.padEnd(66, "0").slice(0, 66) + subHash.slice(2));
  }
  return parentId;
}
__name(computeTokenId, "computeTokenId");
function pad32(hex) {
  const clean2 = hex.startsWith("0x") ? hex.slice(2) : hex;
  return clean2.padStart(64, "0");
}
__name(pad32, "pad32");
function encodeUint256(hex) {
  return pad32(hex);
}
__name(encodeUint256, "encodeUint256");
function encodeStringArg(s) {
  const bytes = new TextEncoder().encode(s);
  const len = bytes.length.toString(16).padStart(64, "0");
  const data = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return len + data.padEnd(Math.ceil(data.length / 64) * 64 || 64, "0");
}
__name(encodeStringArg, "encodeStringArg");
function decodeAddress(hex) {
  if (!hex || hex === "0x" || hex.length < 42) return "";
  return "0x" + hex.slice(-40).toLowerCase();
}
__name(decodeAddress, "decodeAddress");
function decodeString(hex) {
  if (!hex || hex === "0x" || hex.length < 130) return "";
  const len = parseInt(hex.slice(66, 130), 16);
  if (len === 0) return "";
  const data = hex.slice(130, 130 + len * 2);
  const bytes = [];
  for (let i = 0; i < data.length; i += 2) {
    bytes.push(parseInt(data.substr(i, 2), 16));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}
__name(decodeString, "decodeString");
function decodeUint64(hex, wordIndex) {
  const start = 2 + wordIndex * 64;
  const word = hex.slice(start, start + 64);
  return parseInt(word, 16);
}
__name(decodeUint64, "decodeUint64");
async function ethCall(data) {
  const resp = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to: CONTRACT, data }, "latest"],
      id: 1
    })
  });
  const json2 = await resp.json();
  if (json2.error) throw new Error(json2.error.message);
  return json2.result || "0x";
}
__name(ethCall, "ethCall");
async function getAddr(tokenId) {
  const result = await ethCall("0xf1cb7e06" + encodeUint256(tokenId));
  const addr = decodeAddress(result);
  return addr === "0x0000000000000000000000000000000000000000" ? "" : addr;
}
__name(getAddr, "getAddr");
async function getName(address) {
  const result = await ethCall("0x5fd4b08a" + pad32(address));
  return decodeString(result);
}
__name(getName, "getName");
async function getOwner(tokenId) {
  try {
    const result = await ethCall("0x6352211e" + encodeUint256(tokenId));
    return decodeAddress(result);
  } catch {
    return "";
  }
}
__name(getOwner, "getOwner");
async function getRecord(tokenId) {
  const result = await ethCall("0xc33c4ede" + encodeUint256(tokenId));
  if (!result || result === "0x") return { label: "", parent: "0", expiresAt: 0 };
  const parent = "0x" + result.slice(66, 130);
  const expiresAt = decodeUint64(result, 2);
  const labelOffset = parseInt(result.slice(2, 66), 16) * 2 + 2;
  let label = "";
  if (labelOffset < result.length) {
    const labelLen = parseInt(result.slice(labelOffset, labelOffset + 64), 16);
    if (labelLen > 0 && labelLen < 256) {
      const labelData = result.slice(labelOffset + 64, labelOffset + 64 + labelLen * 2);
      const bytes = [];
      for (let i = 0; i < labelData.length; i += 2) {
        bytes.push(parseInt(labelData.substr(i, 2), 16));
      }
      label = new TextDecoder().decode(new Uint8Array(bytes));
    }
  }
  return { label, parent, expiresAt };
}
__name(getRecord, "getRecord");
async function getText(tokenId, key) {
  const data = "0x59d1d43c" + encodeUint256(tokenId) + "0000000000000000000000000000000000000000000000000000000000000040" + encodeStringArg(key);
  const result = await ethCall(data);
  return decodeString(result);
}
__name(getText, "getText");
function normalizeName(name) {
  if (!name) return null;
  name = name.toLowerCase().trim();
  if (name.endsWith(".mega")) name = name.slice(0, -5);
  if (!name) return null;
  const parts = name.split(".");
  for (const part of parts) {
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(part)) return null;
  }
  return name;
}
__name(normalizeName, "normalizeName");
function isValidAddress(addr) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}
__name(isValidAddress, "isValidAddress");
function json(data, status, extra) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra }
  });
}
__name(json, "json");
async function handleResolve(url) {
  const name = url.searchParams.get("name");
  const address = url.searchParams.get("address");
  if (name && address) return json({ error: "Specify name or address, not both" }, 400);
  if (!name && !address) return json({ error: "Missing name or address parameter" }, 400);
  const cache = { "Cache-Control": "public, max-age=60" };
  if (name) {
    const norm = normalizeName(name);
    if (!norm) return json({ error: "Invalid name" }, 400);
    const tokenId = computeTokenId(norm);
    const addr = await getAddr(tokenId);
    if (!addr) return json({ error: "not found" }, 404);
    return json({ name: norm + ".mega", address: addr, chain: CHAIN }, 200, cache);
  }
  if (!isValidAddress(address)) return json({ error: "Invalid address" }, 400);
  const resolved = await getName(address);
  if (!resolved) return json({ error: "not found" }, 404);
  return json({ address: address.toLowerCase(), name: resolved, chain: CHAIN }, 200, cache);
}
__name(handleResolve, "handleResolve");
async function handleLookup(url) {
  const name = url.searchParams.get("name");
  if (!name) return json({ error: "Missing name parameter" }, 400);
  const norm = normalizeName(name);
  if (!norm) return json({ error: "Invalid name" }, 400);
  const tokenId = computeTokenId(norm);
  const [addr, owner, record, ...texts] = await Promise.all([
    getAddr(tokenId),
    getOwner(tokenId),
    getRecord(tokenId),
    ...TEXT_KEYS.map((k) => getText(tokenId, k))
  ]);
  if (!addr && !owner) return json({ error: "not found" }, 404);
  const textRecords = {};
  TEXT_KEYS.forEach((k, i) => {
    if (texts[i]) textRecords[k] = texts[i];
  });
  const GRACE = 90 * 24 * 3600;
  const now = Math.floor(Date.now() / 1e3);
  return json({
    name: norm + ".mega",
    address: addr || null,
    owner: owner || null,
    expiry: record.expiresAt ? new Date(record.expiresAt * 1e3).toISOString() : null,
    isExpired: record.expiresAt ? now > record.expiresAt + GRACE : false,
    tokenId,
    textRecords,
    chain: CHAIN
  }, 200, { "Cache-Control": "public, max-age=300" });
}
__name(handleLookup, "handleLookup");
var src_default = {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    const url = new URL(request.url);
    try {
      if (url.pathname === "/resolve") return await handleResolve(url);
      if (url.pathname === "/lookup") return await handleLookup(url);
      if (url.pathname === "/") return json({
        service: "dotmega",
        description: ".mega name resolution API on MegaETH",
        endpoints: ["/resolve?name=", "/resolve?address=", "/lookup?name="],
        chain: CHAIN
      }, 200);
      return json({ error: "Not found" }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: "Internal error" }, 500);
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-5CxZRW/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-5CxZRW/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=index.js.map
