import type { APIRoute } from "astro";
import { atom } from "../../lib/feeds";
export const GET: APIRoute = async () => new Response(await atom(), { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } });
