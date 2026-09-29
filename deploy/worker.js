// rimeos.com: http and www go to https://rimeos.com; everything else is the
// static site, with its own _headers and _redirects applied by the asset server. The workers.dev
// preview host serves the same site but asks not to be indexed, so search
// engines only ever list rimeos.com.
//
// The asset server answers every request with the whole file, Range or not.
// Safari will not play a <video> without 206 responses, so byte ranges of the
// stage's clips (all under a megabyte) are cut here.
const MEDIA = /\.(mp4|webm)$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ours = url.hostname === "rimeos.com" || url.hostname === "www.rimeos.com";
    if (ours && (url.protocol === "http:" || url.hostname === "www.rimeos.com")) {
      url.protocol = "https:";
      url.hostname = "rimeos.com";
      return Response.redirect(url.toString(), 301);
    }
    let res = await env.ASSETS.fetch(request);
    if (MEDIA.test(url.pathname) && res.status === 200) res = await ranged(request, res);
    if (url.hostname.endsWith(".workers.dev")) {
      res = new Response(res.body, res);
      res.headers.set("X-Robots-Tag", "noindex");
    }
    return res;
  },
};

async function ranged(request, res) {
  const range = request.headers.get("Range");
  const out = new Response(range ? null : res.body, res);
  out.headers.set("Accept-Ranges", "bytes");
  if (!range || request.method === "HEAD") return out;
  const body = await res.arrayBuffer();
  const size = body.byteLength;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start, end;
  if (m && m[1] !== "") { start = +m[1]; end = m[2] === "" ? size - 1 : Math.min(+m[2], size - 1); }
  else if (m && m[2] !== "") { start = Math.max(0, size - +m[2]); end = size - 1; }
  if (start === undefined || start > end || start >= size) {
    // Multiple ranges or nonsense: the whole file is always a valid answer.
    if (!m) return new Response(body, out);
    const bad = new Response(null, { status: 416, headers: out.headers });
    bad.headers.set("Content-Range", `bytes */${size}`);
    bad.headers.delete("Content-Length");
    return bad;
  }
  const part = new Response(body.slice(start, end + 1), { status: 206, headers: out.headers });
  part.headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  part.headers.set("Content-Length", String(end - start + 1));
  return part;
}
