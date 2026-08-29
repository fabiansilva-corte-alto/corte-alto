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

const CACHE_VERSION = 'v19';
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
  './manifest.json',
  './logo.png'
];

/* ============================================================
   INSTALACIÓN — se ejecuta cuando el navegador detecta una
   versión nueva de este archivo sw.js (porque cambió byte a
   byte respecto al que tenía guardado)
   ============================================================ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ARCHIVOS_CACHE).catch(() => {
        /* si algún archivo de la lista no existe todavía, no
           bloqueamos la instalación por eso */
      });
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
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

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
