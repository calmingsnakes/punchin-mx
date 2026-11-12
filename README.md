# Punchin (by Wulden)

Reloj checador digital con **selfie + geotag**, web-first mobile (Apple HIG). Demo estático para GitHub Pages — sin backend, datos en `localStorage` del dispositivo.

## Demo
https://calmingsnakes.github.io/punchin-mx/

- **Fluido colaborador**: seleccionar perfil → CHECAR (Entrada/Salida) → selfie → GPS → confirmar. Registro marcando si está dentro/fuera de geocerca.
- **Admin / liderazgo**: tab "Admin", PIN demo `2468` — KPIs, registros filtrables, reporte semanal LFT (XT dobles/triples), config de geocerca, export CSV.
- Datos de ejemplo: 4 colaboradores × última semana laboral.

## Notas del demo
- El GPS usa la API de geolocalización del dispositivo → **la VPN corporativa no lo altera** (no usa IP).
- Si el navegador bloquea GPS/cámara (desktop), entra "modo demo" y el registro queda marcado como `GPS demo`.
- Los registros son **append-only** (inmutables en la UI): un error se corrige con nota adicional, no borrando — trazabilidad ante STPS.
- Cumplimiento: aviso de privacidad versionado (`privacy.html`), consentimiento explícito, cálculo de jornadas LFT (8h/48h, XT 66-68).

## Estructura
```
index.html    app UI + sheets (Checar / Mi día / Admin)
styles.css    sistema visual Apple HIG (light/dark)
app.js        store localStorage, geocerca haversine, LFT, seed, admin
privacy.html  aviso de privacidad LFPDPPP template
FEATURE-PLAN.md  plan producto/fases/cumplimiento/precios
```

## Roadmap (ver FEATURE-PLAN.md)
- **Phase 1** ✅ demo estático (esto)
- **Phase 2** producción: Cloudflare Workers + D1 + R2, auth, hash-chain, sellado NOM-151, offline queue, PWA
- **Phase 3** diferenciadores: liveness facial, anti fake-GPS, multi-cliente, billing
