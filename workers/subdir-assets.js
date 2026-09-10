const PREFIX = "/thelegendoftrump";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const hasPrefix = pathname === PREFIX || pathname.startsWith(`${PREFIX}/`);

    if (hasPrefix) {
      const remainder = pathname.slice(PREFIX.length);
      url.pathname = remainder === "" ? "/" : remainder;
      return env.ASSETS.fetch(new Request(url, request));
    }

    if (url.hostname.endsWith(".workers.dev")) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found. This app is served at /thelegendoftrump/.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
