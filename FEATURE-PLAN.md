# Punchin MX (placeholder) — Feature Plan
Reloj checador digital con selfie + geotag, web-based mobile-first, para empresas con trabajadores remotos en México. Cumplimiento LFT (registro electrónico de asistencia).

## Overview
App web instalable (PWA) donde el colaborador hace punch-in/punch-out desde su celular con **foto selfie + coordenadas GPS**. Los registros son **append-only** (inmutables), ordenados, y solo **leadership** (PIN/rol) puede consultarlos y exportarlos. El empleado está bajo la VPN de la empresa (USA) — **el geotag usa la API de geolocalización del dispositivo (GPS/Wi-Fi), no la IP**, así que la VPN es irrelevante para la ubicación.

## Arquitectura (3 fases)
```
Phase 1 (DEMO, este repo):          Phase 2 (PRODUCCIÓN):                Phase 3 (DIFERENCIADORES):
HTML/CSS/JS puro                    Cloudflare Workers + D1 + R2         Liveness facial anti-spoof
localStorage (dato en el equipo)    Auth por empleado (token)            Heurística mock-GPS (accuracy,
Geolocalización + getUserMedia      Fotos a R2 (privadas)                velocidad, jailbreak/root)
Geocerca haversine client-side      Hash-chain append-only (tamper       Aviso de privacidad versionado
Export CSV leadership               evidence) + sellado NOM-151 (PAC)    Multi-tenant por cliente
Demo PIN-gate admin                 Offline queue (sin señal)            Digest WhatsApp/email semanal
                                    Roles RBAC (empleado/leader/admin)   Facturación por usuario activo
```
**Por qué web-first:** el requisito es "app móvil" → PWA iOS/Android sin tiendas, sin审核, actualización instantánea; iOS 16.4+ ya permite instalar PWAs con notificaciones. Si el cliente exige store nativo, Phase 2 envuelve la misma UI en Capacitor (~2 días extra).

## Cumplimiento LFT (mapeo)
| Requisito | Implementación |
|---|---|
| Registro electrónico de asistencia, entrada/salida verificable (Art. 132 fracc. XXXIV, reforma DOF 21-dic-2022; fase escalonada ya vencida — verificar redacción exacta con abogado laboral) | Punch IN/OUT con timestamp de servidor (Phase 2; demo usa reloj de dispositivo marcado con tz America/Mexico_City) |
| Identificación del trabajador | Empleado único por dispositivo + **selfie** en cada punch |
| Jornada máxima 8h diurna / 48h semana (Art. 59-61) | Cálculo diario/semanal en panel leader, badge de exceso |
| Horas extra: máx 2h/día, 3 días/semana, dobles; exceso triple (Art. 66-68) | Dashboard calcula `xt_doble` (primeras 120 min) y `xt_triple` (>120 min) por día |
| Integridad/conservación del dato (NOM-151-SCFI-2021, mensaje de datos) | Phase 2: hash-chain + sellado via PAC; demo: append-only sin UI de edición |
| Datos personales y sensibles (imagen, ubicación) — LFPDPPP Arts. 6, 16, 36-37 | Aviso de privacidad con consentimiento explícito capturado antes del primer punch (se guarda versión+ts); derechos ARCO; retención propuesta 5 años; no se usa rostro para identificación biométrica en demo (solo evidencia fotográfica) |
| Conservación laboral mínima | Registros conservados ≥5 años (plazos de prescripción + CFDI nómina) |

**Nota VPN:** el tráfico de la app sale a `punchinmx.com` (Phase 2), no a la empresa. Si la VPN del cliente es full-tunnel y bloquea dominios externos, hace falta **allowlist del dominio** en el perfil de la VPN (Split tunneling). Anotar al cliente desde la venta.

## UX / Design principles (Apple HIG)
- Mobile-first (390px design width), responsive a tablet/desktop.
- Tipografía del sistema (-apple-system/SF Pro), large titles, jerarquía clara.
- Colores semánticos de iOS (#007AFF azul, #34C759 verde, #FF9500 ámbar, #FF3B30 rojo) + dark mode automático.
- Tarjetas agrupadas con radio 14px, separadores de 1px, blur translúcido en tab bar inferior (UIBar).
- Hojas modales desde abajo con grabber; botón circular de punch de 190px como héroe; estados táctiles por opacidad/escala.
- Safe-area insets para iPhone (notch), `viewport-fit=cover`.
- Menos es más: una acción primaria por pantalla; feedback inmediato (check animado).

## Pantallas del demo
1. **Checar (default)**: segmentado IN/OUT, botón punch, chips de estado GPS/cámara, geocerca mostrada (distancia a oficina). Hoja de selfie → hoja de confirmación (foto, hora CDMX, dentro/fuera de geocerca, precisión) → éxito.
2. **Mi día / historial**: punches propios del día con mini-foto, horas laboradas, XT dobles/triples, tira de últimos 7 días.
3. **Admin (PIN demo 2468)**: KPIs del día (asistencias, % fuera de geocerca, XT), tabla filtrable por fecha/empleado con thumbnails y badges `Oficina / Fuera / GPS-demo`, reporte semanal LFT, config de oficina (lat/lng/radio), export CSV, reset demo.
4. **Consentimiento**: aviso de privacidad al primer punch (aceptación versionada).

## Reglas de producto
- Append-only: un error no se borra, se **corrige** con registro adicional firmado por leader (trazabilidad).
- Punch fuera de geocerca: se permite pero se **marca** (badge rojo + distancia) — el control es informativo, no punitivo (evita conflictividad laboral).
- GPS simulado/no disponible: se permite en demo pero marca `GPS-demo`; Phase 2 rechaza accuracy >150m y saltos imposibles.
- Fotos comprimidas a 240px para demo (no subir a ningún lado); Phase 2 → R2 privado con encriptación.

## Fases y tareas
### Phase 1 (demo GitHub Pages) — ESTE ENTREGABLE
- [x] Plan · [x] store con seed · [x] UI Checar · [x] selfie+geo · [x] consentimiento · [x] historial · [x] admin PIN+CSV · [x] aviso · [x] deploy Pages
### Phase 2 (producción, ~60-90h)
- Workers API + D1 (empleados, punches, consentimientos) + R2 (selfies) · Auth device-token · hash-chain · offline queue (IndexedDB→sync) · PWA manifest+SW · reloj de servidor · multi-oficina · roles · exportación a formato de nómina (scu/IDSEF) · dominio punchinmx.com + SSL · consentimiento versionado por escrito legal.
### Phase 3 (~40h)
- Liveness (parpadeo/sonrisa con MediaPipe o API) · detección mock-GPS (accuracy, presión, saltos) · digest semanal WhatsApp/email · white-label multi-cliente · billing Stripe por usuario activo.

## Precios de referencia del mercado (para el fee)
El Checador $100 MXN/mes/sucursal · TuChecador ~$21 MXN/usuario · Rankmi ~$45 MXN/usuario · Connecteam ~$50-55 MXN/usuario · Buddy Punch ~$120 MXN/usuario.

## Preguntas abiertas para el cliente
1. ¿Número exacto de fracción LFT y criterio STPS vigente → validarlo con su abogado laboral antes de facturar "cumplimiento".
2. ¿La política es *bloquear* punches fuera de oficina o solo *marcarlos*? (demo: marca).
3. ¿Se usa como evidencia ante STPS/juicio? → si sí, Phase 2 con sellado NOM-151/PAC es obligatorio, no opcional.
4. Retención de selfies: ¿30, 90 o 365 días? (LFPDPPP exige minimizar; demo: todo en dispositivo).
5. ¿Turnos nocturnos/mixtos? La demo calcula jornada diurna.
