/*
 * GBR Soluções — service worker.
 *
 * Estratégia:
 *  - navegação (HTML): rede primeiro, cache como rede de segurança (offline).
 *  - /_next/static/*: cache primeiro (os nomes têm hash do conteúdo, então
 *    nunca ficam velhos) — deixa a abertura instantânea.
 *  - outros arquivos do próprio site (imagens, ícones): cache primeiro e
 *    atualização em segundo plano (assim uma troca de imagem aparece no
 *    próximo acesso, sem prender o usuário numa versão antiga).
 *  - /api/*: nunca passa pelo cache — os dados do app vivem no localStorage.
 *
 * Ao publicar uma versão nova, basta subir a versão do CACHE abaixo: os caches
 * antigos são apagados no activate.
 */
const CACHE = "gbr-shell-v2";
const PRECACHE = ["/", "/manifest.webmanifest", "/icon.svg", "/icon-maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const cachePut = (request, response) => {
  if (!response || !response.ok) return response;
  const copy = response.clone();
  caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
  return response;
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => cachePut(req, res))
        .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
    return;
  }

  const immutable = url.pathname.startsWith("/_next/static/");

  if (immutable) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => cachePut(req, res))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => cachePut(req, res))
        .catch(() => cached);
      return cached || network;
    }),
  );
});
