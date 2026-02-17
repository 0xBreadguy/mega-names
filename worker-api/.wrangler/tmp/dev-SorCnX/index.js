var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-VTl3GV/checked-fetch.js
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

// .wrangler/tmp/bundle-VTl3GV/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/index.ts
var MEGA_ETH_RPC = "https://mainnet.megaeth.com/rpc";
var MEGA_NAMES_CONTRACT = "0x5B424C6CCba77b32b9625a6fd5A30D409d20d997";
var CHAIN_ID = 4326;
var MEGA_NODE = "0x892fab39f6d2ae901009febba7dbdd0fd85e8a1651be6b8901774cdef395852f";
var TEXT_RECORD_KEYS = ["avatar", "url", "twitter", "github", "email", "description", "discord"];
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    }
    try {
      if (url.pathname === "/resolve") {
        const name = url.searchParams.get("name");
        const address = url.searchParams.get("address");
        if (name && address) {
          return jsonResponse({ error: "Specify either name or address, not both" }, 400, corsHeaders);
        }
        if (name) {
          return await forwardResolve(name, corsHeaders);
        } else if (address) {
          return await reverseResolve(address, corsHeaders);
        } else {
          return jsonResponse({ error: "Missing name or address parameter" }, 400, corsHeaders);
        }
      } else if (url.pathname === "/lookup") {
        const name = url.searchParams.get("name");
        if (!name) {
          return jsonResponse({ error: "Missing name parameter" }, 400, corsHeaders);
        }
        return await fullLookup(name, corsHeaders);
      } else {
        return jsonResponse({ error: "Endpoint not found" }, 404, corsHeaders);
      }
    } catch (error) {
      console.error("Error:", error);
      return jsonResponse({ error: "Internal server error" }, 500, corsHeaders);
    }
  }
};
async function forwardResolve(name, corsHeaders) {
  try {
    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      return jsonResponse({ error: "Invalid name format" }, 400, corsHeaders);
    }
    const tokenId = computeTokenId(normalizedName);
    const address = await getAddress(tokenId);
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      return jsonResponse({ error: "not found" }, 404, corsHeaders);
    }
    const response = {
      name: name.toLowerCase(),
      address,
      chain: `megaeth:${CHAIN_ID}`
    };
    return jsonResponse(response, 200, { ...corsHeaders, "Cache-Control": "public, max-age=60" });
  } catch (error) {
    console.error("Forward resolve error:", error);
    return jsonResponse({ error: "Resolution failed" }, 500, corsHeaders);
  }
}
__name(forwardResolve, "forwardResolve");
async function reverseResolve(address, corsHeaders) {
  try {
    if (!isValidAddress(address)) {
      return jsonResponse({ error: "Invalid address format" }, 400, corsHeaders);
    }
    const name = await getName(address);
    if (!name) {
      return jsonResponse({ error: "not found" }, 404, corsHeaders);
    }
    const response = {
      address: address.toLowerCase(),
      name,
      chain: `megaeth:${CHAIN_ID}`
    };
    return jsonResponse(response, 200, { ...corsHeaders, "Cache-Control": "public, max-age=60" });
  } catch (error) {
    console.error("Reverse resolve error:", error);
    return jsonResponse({ error: "Resolution failed" }, 500, corsHeaders);
  }
}
__name(reverseResolve, "reverseResolve");
async function fullLookup(name, corsHeaders) {
  try {
    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      return jsonResponse({ error: "Invalid name format" }, 400, corsHeaders);
    }
    const tokenId = computeTokenId(normalizedName);
    const [address, owner, record, textRecords] = await Promise.all([
      getAddress(tokenId),
      getOwner(tokenId),
      getRecord(tokenId),
      getTextRecords(tokenId)
    ]);
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      return jsonResponse({ error: "not found" }, 404, corsHeaders);
    }
    let expiry = null;
    let isExpired = false;
    if (record && record.expiresAt && record.expiresAt !== "0") {
      const expiryTimestamp = parseInt(record.expiresAt) * 1e3;
      expiry = new Date(expiryTimestamp).toISOString();
      const GRACE_PERIOD = 90 * 24 * 60 * 60 * 1e3;
      isExpired = Date.now() > expiryTimestamp + GRACE_PERIOD;
    }
    const response = {
      name: name.toLowerCase(),
      address,
      owner: owner || null,
      expiry,
      isExpired,
      tokenId,
      textRecords,
      chain: `megaeth:${CHAIN_ID}`
    };
    return jsonResponse(response, 200, { ...corsHeaders, "Cache-Control": "public, max-age=300" });
  } catch (error) {
    console.error("Full lookup error:", error);
    return jsonResponse({ error: "Lookup failed" }, 500, corsHeaders);
  }
}
__name(fullLookup, "fullLookup");
async function ethCall(to, data) {
  const response = await fetch(MEGA_ETH_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to, data }, "latest"],
      id: 1
    })
  });
  const result = await response.json();
  if (result.error) {
    throw new Error(`RPC Error: ${result.error.message}`);
  }
  return result.result;
}
__name(ethCall, "ethCall");
async function getAddress(tokenId) {
  try {
    const data = "0xf1cb7e06" + padHex(tokenId);
    const result = await ethCall(MEGA_NAMES_CONTRACT, data);
    if (!result || result === "0x")
      return null;
    const address = "0x" + result.slice(-40);
    return address;
  } catch (error) {
    console.error("getAddress error:", error);
    return null;
  }
}
__name(getAddress, "getAddress");
async function getName(address) {
  try {
    const data = "0x691f3431" + padHex(address);
    const result = await ethCall(MEGA_NAMES_CONTRACT, data);
    if (!result || result === "0x")
      return null;
    return decodeString(result);
  } catch (error) {
    console.error("getName error:", error);
    return null;
  }
}
__name(getName, "getName");
async function getOwner(tokenId) {
  try {
    const data = "0x6352211e" + padHex(tokenId);
    const result = await ethCall(MEGA_NAMES_CONTRACT, data);
    if (!result || result === "0x")
      return null;
    const address = "0x" + result.slice(-40);
    return address;
  } catch (error) {
    console.error("getOwner error:", error);
    return null;
  }
}
__name(getOwner, "getOwner");
async function getRecord(tokenId) {
  try {
    const data = "0xc33c4ede" + padHex(tokenId);
    const result = await ethCall(MEGA_NAMES_CONTRACT, data);
    if (!result || result === "0x")
      return null;
    const decoded = decodeStruct(result);
    return decoded;
  } catch (error) {
    console.error("getRecord error:", error);
    return null;
  }
}
__name(getRecord, "getRecord");
async function getTextRecords(tokenId) {
  const textRecords = {};
  const promises = TEXT_RECORD_KEYS.map(async (key) => {
    try {
      const keyEncoded = encodeString(key);
      const data = "0x59d1d43c" + padHex(tokenId) + keyEncoded.slice(2);
      const result = await ethCall(MEGA_NAMES_CONTRACT, data);
      if (result && result !== "0x") {
        const value = decodeString(result);
        if (value) {
          textRecords[key] = value;
        }
      }
    } catch (error) {
      console.error(`getText ${key} error:`, error);
    }
  });
  await Promise.all(promises);
  return textRecords;
}
__name(getTextRecords, "getTextRecords");
function normalizeName(name) {
  if (!name || typeof name !== "string")
    return null;
  name = name.toLowerCase().trim();
  if (name.endsWith(".mega")) {
    name = name.slice(0, -5);
  }
  if (!name)
    return null;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
    return null;
  }
  return name;
}
__name(normalizeName, "normalizeName");
function computeTokenId(label) {
  const labelHash = keccak256(label);
  const combined = MEGA_NODE + labelHash.slice(2);
  const tokenId = keccak256Hex(combined);
  return tokenId;
}
__name(computeTokenId, "computeTokenId");
function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
__name(isValidAddress, "isValidAddress");
function padHex(hex) {
  if (hex.startsWith("0x"))
    hex = hex.slice(2);
  return hex.padStart(64, "0");
}
__name(padHex, "padHex");
function encodeString(str) {
  const bytes = new TextEncoder().encode(str);
  const length = bytes.length.toString(16).padStart(64, "0");
  const data = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const paddedData = data.padEnd(Math.ceil(data.length / 64) * 64, "0");
  return "0x0000000000000000000000000000000000000000000000000000000000000020" + length + paddedData;
}
__name(encodeString, "encodeString");
function decodeString(hex) {
  try {
    if (!hex || hex === "0x" || hex.length < 66)
      return null;
    const lengthHex = hex.slice(66, 130);
    const length = parseInt(lengthHex, 16);
    if (length === 0)
      return "";
    const dataHex = hex.slice(130, 130 + length * 2);
    const bytes = [];
    for (let i = 0; i < dataHex.length; i += 2) {
      bytes.push(parseInt(dataHex.substr(i, 2), 16));
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch (error) {
    console.error("decodeString error:", error);
    return null;
  }
}
__name(decodeString, "decodeString");
function decodeStruct(hex) {
  try {
    if (!hex || hex === "0x")
      return null;
    const expiresAtHex = hex.slice(130, 146);
    const expiresAt = parseInt(expiresAtHex, 16).toString();
    return { expiresAt };
  } catch (error) {
    console.error("decodeStruct error:", error);
    return null;
  }
}
__name(decodeStruct, "decodeStruct");
function keccak256(input) {
  const inputBytes = new TextEncoder().encode(input);
  return keccak256Bytes(inputBytes);
}
__name(keccak256, "keccak256");
function keccak256Hex(hex) {
  if (hex.startsWith("0x"))
    hex = hex.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return keccak256Bytes(bytes);
}
__name(keccak256Hex, "keccak256Hex");
function keccak256Bytes(input) {
  let h1 = 3735928559;
  let h2 = 1103547991;
  let h3 = 2071825447;
  let h4 = 3921009573;
  for (let i = 0; i < input.length; i++) {
    const byte = input[i];
    h1 = Math.imul(h1 ^ byte, 2654435761);
    h2 = Math.imul(h2 ^ byte, 2246822507);
    h3 = Math.imul(h3 ^ byte, 3266489909);
    h4 = Math.imul(h4 ^ byte, 668265263);
  }
  h1 = Math.imul(h1 ^ h1 >>> 15, 2246822507);
  h2 = Math.imul(h2 ^ h2 >>> 13, 3266489909);
  h3 = Math.imul(h3 ^ h3 >>> 16, 668265263);
  h4 = Math.imul(h4 ^ h4 >>> 16, 374761393);
  h1 = h1 ^ h2 >>> 15 ^ h3 >>> 15 ^ h4 >>> 15;
  h2 = h2 ^ h1 >>> 13 ^ h3 >>> 13 ^ h4 >>> 13;
  h3 = h3 ^ h1 >>> 16 ^ h2 >>> 16 ^ h4 >>> 16;
  h4 = h4 ^ h1 >>> 16 ^ h2 >>> 16 ^ h3 >>> 16;
  const hash = new Uint32Array([h1, h2, h3, h4, h1 ^ h3, h2 ^ h4, h3 ^ h1, h4 ^ h2]);
  const bytes = new Uint8Array(hash.buffer);
  const hashHex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return "0x" + hashHex;
}
__name(keccak256Bytes, "keccak256Bytes");
function jsonResponse(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json"
    }
  });
}
__name(jsonResponse, "jsonResponse");

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

// .wrangler/tmp/bundle-VTl3GV/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-VTl3GV/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
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
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
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
//# sourceMappingURL=index.js.map
