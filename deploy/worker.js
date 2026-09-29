// rimeos.com: www goes to the apex; everything else is the static site, with
// its own _headers and _redirects applied by the asset server. The workers.dev
// preview host serves the same site but asks not to be indexed, so search
// engines only ever list rimeos.com.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.rimeos.com") {
      url.hostname = "rimeos.com";
      return Response.redirect(url.toString(), 301);
    }
    const res = await env.ASSETS.fetch(request);
    if (!url.hostname.endsWith(".workers.dev")) return res;
    const out = new Response(res.body, res);
    out.headers.set("X-Robots-Tag", "noindex");
    return out;
  },
};
