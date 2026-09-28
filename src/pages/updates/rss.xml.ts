import type { APIRoute } from "astro";
import { rss } from "../../lib/feeds";
export const GET: APIRoute = async () => new Response(await rss(), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
