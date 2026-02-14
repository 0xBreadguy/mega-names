/**
 * Cloudflare Worker: Warren API proxy for MegaNames
 * Proxies requests to Warren Partner API, injecting the API key server-side.
 *
 * Routes:
 *   POST /deploy-namecard     → POST /api/meganames/deploy-namecard
 *   GET  /check?name=...      → GET  /api/meganames/check?name=...
 *   GET  /check?address=...   → GET  /api/meganames/check?address=...
 *   GET  /resolve?name=...    → GET  /api/meganames/resolve?name=...
 */

interface Env {
	WARREN_API_KEY: string;
	WARREN_API_BASE: string;
	ALLOWED_ORIGIN: string;
}

const ALLOWED_PATHS: Record<string, string> = {
	'/deploy-namecard': '/api/meganames/deploy-namecard',
	'/estimate-fee': '/api/partner/estimate-fee',
	'/check': '/api/meganames/check',
	'/resolve': '/api/meganames/resolve',
};

function corsHeaders(origin: string, env: Env): Record<string, string> {
	const allowed = env.ALLOWED_ORIGIN === '*' || origin === env.ALLOWED_ORIGIN
		|| origin === 'https://meganame-staging.pages.dev'
		|| origin?.startsWith('http://localhost');
	return {
		'Access-Control-Allow-Origin': allowed ? origin : env.ALLOWED_ORIGIN,
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400',
	};
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = request.headers.get('Origin') || '';
		const cors = corsHeaders(origin, env);

		// Preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: cors });
		}

		const url = new URL(request.url);
		const pathname = url.pathname;

		// Match route
		const warrenPath = ALLOWED_PATHS[pathname];
		if (!warrenPath) {
			return Response.json({ error: 'Not found' }, { status: 404, headers: cors });
		}

		// Build upstream URL
		const upstream = new URL(warrenPath, env.WARREN_API_BASE);
		// Forward query params for GET requests
		url.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

		// Proxy request
		const headers: Record<string, string> = {
			'X-Warren-Partner-Key': env.WARREN_API_KEY,
			'Content-Type': 'application/json',
		};

		const init: RequestInit = {
			method: request.method,
			headers,
		};

		if (request.method === 'POST') {
			init.body = await request.text();
		}

		try {
			const resp = await fetch(upstream.toString(), init);
			const body = await resp.text();
			return new Response(body, {
				status: resp.status,
				headers: {
					'Content-Type': 'application/json',
					...cors,
				},
			});
		} catch (err: any) {
			return Response.json(
				{ error: 'Upstream error', message: err.message },
				{ status: 502, headers: cors },
			);
		}
	},
};
