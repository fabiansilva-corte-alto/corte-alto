/* ============================================================
   SERVICE WORKER — Corte Alto
   ⚠️ FABIÁN: cada vez que subas una actualización a Vercel,
   sube también este archivo. Si no cambias nada aquí, no pasa
   nada malo — pero si quieres FORZAR que todos los celulares
   se actualicen de inmediato, sube la versión de CACHE_VERSION
   de más abajo (ej. de 'v1' a 'v2'). No es obligatorio: el
   Service Worker igual revisa solo si hay cambios cada vez que
   alguien abre la app.
   ============================================================ */

const CACHE_VERSION = 'v24.2';
const CACHE_NAME = `corte-alto-${CACHE_VERSION}`;

/* Archivos que se guardan para que la app funcione más rápido
   y también sin internet. Si agregas un módulo nuevo (otro
   .html), agrégalo también a esta lista. */
const ARCHIVOS_CACHE = [
  './',
  './index.html',
  './inicio-faena.html',
  './produccion-diaria.html',
  './productividad-jefe.html',
  './control.html',
  './configuracion.html',
  './tablero-ddd.html',
  './dashboard.html',
  './resumen_causas_equipo.html',
  './gps-carga.html',
  './gps-dashboard.html',
  './documentos.html',
  './comparador-volumenes.html',
  './controles-mininco.html',
  './controles-calidad.html',
  './huinche.html',
  './cuadrilla-diaria.html',
  './bodega-inventario.html',
  './bitacora-conductores.html',
  './manifest.json',
  './logo.png'
];

/* Librerías externas (Firebase, PDF) que usan los módulos.
   Sus direcciones incluyen la versión, así que nunca cambian:
   se pueden guardar y usar sin señal sin riesgo de quedar
   desactualizadas. */
const LIBRERIAS_EXTERNAS = [
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];
const SERVIDORES_LIBRERIAS = ['www.gstatic.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com'];
/* Si internet no responde en este tiempo (señal muy débil),
   se muestra la copia guardada en vez de quedar esperando. */
const ESPERA_MAXIMA_MS = 4000;

/* ============================================================
   INSTALACIÓN — se ejecuta cuando el navegador detecta una
   versión nueva de este archivo sw.js (porque cambió byte a
   byte respecto al que tenía guardado)
   ============================================================ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      /* Se guarda cada archivo por separado: si uno no existe,
         los demás igual quedan guardados (antes, si fallaba uno,
         no se guardaba ninguno). También se guardan las librerías
         externas que necesitan los módulos para funcionar sin señal. */
      return Promise.all([...ARCHIVOS_CACHE, ...LIBRERIAS_EXTERNAS].map(url =>
        cache.add(url).catch(() => { /* si falla uno, seguimos con los demás */ })
      ));
    })
  );
  self.skipWaiting(); // no espera: pasa a activarse de inmediato
});

/* ============================================================
   ACTIVACIÓN — borra cachés de versiones antiguas y toma el
   control de todas las pestañas abiertas sin necesidad de que
   el usuario cierre y abra la app
   ============================================================ */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(nombres => {
      return Promise.all(
        nombres
          .filter(nombre => nombre.startsWith('corte-alto-') && nombre !== CACHE_NAME)
          .map(nombre => caches.delete(nombre))
      );
    }).then(() => self.clients.claim())
  );
});

/* ============================================================
   FETCH — estrategia "red primero, caché de respaldo"
   Así, si hay internet, SIEMPRE se pide la versión más nueva
   al servidor (Vercel). Solo si no hay internet, usa la copia
   guardada. Esto es lo que evita que alguien quede "pegado"
   en una versión vieja.
   ============================================================ */
async function redConPlazo(request) {
  const cache = await caches.open(CACHE_NAME);
  const red = fetch(request).then(respuesta => {
    if (respuesta && (respuesta.ok || respuesta.type === 'opaque')) cache.put(request, respuesta.clone());
    return respuesta;
  });
  red.catch(() => {}); // evita avisos de error si internet falla mientras se busca la copia
  const guardada = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
  if (!guardada) return red; // nunca se ha guardado: hay que esperar a internet
  return new Promise(resolve => {
    let listo = false;
    const usar = r => { if (!listo) { listo = true; resolve(r); } };
    const t = setTimeout(() => usar(guardada), ESPERA_MAXIMA_MS);
    red.then(r => { clearTimeout(t); usar(r && (r.ok || r.type === 'opaque') ? r : guardada); })
       .catch(() => { clearTimeout(t); usar(guardada); });
  });
}
async function cacheLibreria(request) {
  const guardada = await caches.match(request);
  if (guardada) return guardada;
  const respuesta = await fetch(request);
  if (respuesta && (respuesta.ok || respuesta.type === 'opaque')) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, respuesta.clone());
  }
  return respuesta;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  /* Páginas y archivos de la app (mismo sitio): internet primero,
     pero si la señal es tan mala que no responde en 4 segundos,
     se usa la copia guardada para que la app abra igual. */
  if (url.origin === self.location.origin) {
    event.respondWith(redConPlazo(event.request));
    return;
  }
  /* Librerías externas con versión fija: se usan desde el celular. */
  if (SERVIDORES_LIBRERIAS.includes(url.hostname)) {
    event.respondWith(cacheLibreria(event.request).catch(() => caches.match(event.request)));
    return;
  }

  /* Todo lo demás: igual que antes. */
  event.respondWith(
    fetch(event.request)
      .then(respuesta => {
        const copia = respuesta.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(event.request))
  );
});

/* ============================================================
   MENSAJE MANUAL — permite que index.html le pida al Service
   Worker que se actualice de inmediato sin esperar
   ============================================================ */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
