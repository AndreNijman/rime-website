import type { APIRoute } from "astro";
import { jsonFeed } from "../../lib/feeds";
export const GET: APIRoute = async () => new Response(await jsonFeed(), { headers: { "Content-Type": "application/feed+json; charset=utf-8" } });
