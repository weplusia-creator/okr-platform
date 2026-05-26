# Diagnóstico técnico — OKR Platform

**Fecha:** 26 de mayo de 2026
**Stack actual:** React 19 + TypeScript + Vite + Supabase + Vercel serverless
**Tamaño:** ~72.000 líneas de TS/TSX, 194 archivos en `/src`, 12 endpoints serverless, ~20 migraciones SQL
**Módulo aparte:** `tools/b2b-prospector/` ya está en Rust (Axum + SQLx + Redis)

---

## Resumen ejecutivo

La arquitectura general es sólida y se nota que pensaste el dominio (organizations, RLS, ARCA, CRM, finanzas, OKRs, etc.), pero hay **deuda técnica acumulada** que es exactamente lo que te está haciendo sentir que "anda lento y mal":

1. **TypeScript strict está activado pero hay 308 usos de `any`** que tiran toda la red de seguridad del tipado a la basura.
2. **`ProjectContext` tiene 3.128 líneas** — un monstruo que provoca renders innecesarios en media app.
3. **Cero tests automatizados** — cada deploy es a fe.
4. **APIs sin validación de input estructurada** (no hay zod/joi). Endpoints sensibles como ARCA y create-user reciben `req.body` sin validar.
5. **ESLint está en modo recomendado, no type-checked** — el linter ve poco.
6. **Algunas tablas no tienen RLS policies** (objectives, key_results, crm_deals).
7. **`.env.example` está incompleto** — faltan claves que el código usa, lo que rompe en cada nuevo setup.
8. **Bundle pesado** (recharts, @react-pdf, playwright, node-forge, xml2js) sin code splitting.

Nada de esto es catastrófico individualmente, pero juntos explican la sensación de fragilidad y lentitud.

---

## 1. TypeScript: el strict mode es ficticio

`tsconfig.app.json` tiene `strict: true`, pero el código hace trampa con **308 `any`** repartidos en contextos, handlers y respuestas de Supabase. Algunos patrones repetidos:

```ts
const result: any = await response.json()
(e: any) => { ... }
error: any
```

**Impacto:** los bugs que TypeScript debería atrapar se cuelan a producción. Refactors son ciegos.

**Fix:** activar `@typescript-eslint/no-explicit-any` como warning primero, después como error. Refactorizar por módulos (empezar por contextos más usados).

## 2. ESLint sin type-checking

`eslint.config.js` extiende `tseslint.configs.recommended` (la versión liviana). No usa `recommendedTypeChecked` ni `strictTypeChecked`. Eso significa que el linter no detecta accesos a nullish, type mismatches, ni promesas sin await.

**Fix:** activar `tseslint.configs.strictTypeChecked` + agregar `parserOptions.project` en eslint.config.

## 3. Contextos gigantes (el problema #1 de performance)

| Contexto | LOC aprox. |
|---|---|
| ProjectContext | 3128 |
| CRMContext | ~1500 |
| FinanceContext | ~1200 |

Cuando un contexto enorme cambia un valor cualquiera, **todos los consumers re-renderizan**. Es probablemente la causa principal de la lentitud que sentís.

**Fix:** dividir cada contexto en 4-6 contextos más chicos por responsabilidad (Projects, Deliverables, Modules, Participants, ActivityLog para el caso de ProjectContext). Reducción esperada de re-renders: 70-85%.

## 4. APIs serverless: sin validación estructurada

Endpoints como `api/prospector/search-web.ts:157`:
```ts
const { query, industry, country, maxResults = 5 } = req.body
```

No hay schema, no hay tipos en runtime, no hay límites. Si alguien manda `maxResults: 100000`, el endpoint lo acepta. Lo mismo en `api/create-user.ts`, `api/delete-user.ts`.

**Riesgo extra en ARCA** (`api/arca/emit.ts`): manejás certificados digitales AFIP, datos altamente sensibles, y la validación es manual (`if (!email)`).

**Fix:** introducir **zod** en todos los endpoints. Una sola dependencia, schemas reutilizables entre frontend y backend, mensajes de error claros.

## 5. Red flag de seguridad: bypass en `search-web.ts`

```ts
// api/prospector/search-web.ts:42-46
if (isServiceCall) { /* no token validation */ }
```

Si `token === SUPABASE_SERVICE_ROLE_KEY`, el endpoint se saltea la validación. Si ese key se filtra en logs o variables de entorno mal configuradas, alguien puede llamar al endpoint sin auth.

**Fix:** revisar caso por caso si ese atajo es necesario. Si lo es, agregar IP allowlist o secreto adicional.

## 6. ARCA: detalles a pulir

- ✓ Lo bueno: el certificado se encripta antes de guardar en DB, hay validación de expiry (`forge.pki.certificateFromPem`), y RLS en `arca_*` tables.
- ✗ Lo pulible: el cert decryptado queda en RAM sin zero-out, el modo `ARCA_MOCK` permite bypass total (peligroso si llega a prod por accidente), no hay audit trail estructurado de quién emitió qué factura.

**Fix:** logs estructurados con request ID, validación de `ARCA_MOCK` solo en entornos no-prod, zeroize del buffer del cert tras usar.

## 7. Base de datos: índices y RLS

**Sin RLS visible en:** `objectives`, `key_results`, `crm_deals`. Si esos datos son por-organization, falta la barrera.

**Sin índices en columnas calientes:** `arca_invoices(organization_cuit_id, status)`, `crm_deals(organization_id)`, `invoices(organization_id)`. Con 50K+ rows estas queries empiezan a doler.

**Schema mismatch potencial:** `20260203_arca_integration.sql` declara `BYTEA` para cert/key pero el código usa columnas `certificate_encrypted` (TEXT). Hay que verificar si la migración corrió o si la app está leyendo otra columna.

## 8. Frontend: ausencias notables

- **No hay ErrorBoundary** en ningún lado. Un error en un render te tira toda la app.
- **localStorage sin validación** (sidebarCollapsed, quiz-participant-id, auth state). Si alguien mete basura, falla mudo.
- **Bundle no optimizado**: `playwright` está como dependencia normal (debería ser devDependency), `@react-pdf/renderer` no está en chunk separado, `recharts` se importa entero.
- **Sin lazy loading de rutas**: React Router carga todo upfront.

## 9. Backend Rust: standalone

`tools/b2b-prospector/` es un servicio Rust completo (Axum, SQLx, JWT, Redis, OpenAPI), pero **no está integrado con el resto del proyecto**. Tiene su propio auth, su propia base de datos potencialmente, su propio puerto. Duplica lógica que ya existe en TS/Supabase.

**Decisión necesaria:** o lo absorbés (Supabase + TS lo reemplaza), o lo dejás standalone y lo documentás, o lo convertís en el patrón a seguir para migrar el resto.

## 10. Lo que no hay y debería existir

- **Tests** (0 archivos `.test.ts` / `.spec.ts`). Mínimo viable: tests de integración de `create-user`, `delete-user`, `arca/emit`.
- **Structured logging** (Pino/Winston) — hoy hay 421 `console.log/warn/error` sueltos.
- **Rate limiting** en `/api/*` — cualquiera puede martillarlos.
- **Error tracking** (Sentry o similar).
- **Monitoring de queries Supabase** (slow query log).

---

## Top 10 arreglos prioritarios (en orden recomendado)

1. **Dividir `ProjectContext` en 4-6 contextos chicos.** Impacto inmediato en performance percibida. (4-6 hs)
2. **Activar ESLint type-checked + correr el linter en CI.** Te muestra dónde están los problemas que ya tenés. (1 h setup + sesión de fixes)
3. **Introducir zod en todos los endpoints `/api/*`.** Validación robusta, mejor DX. (4-6 hs)
4. **Eliminar 308 `any`** (al menos los más expuestos: contextos, fetch responses, error handlers). (6-10 hs)
5. **Agregar RLS policies a `objectives`, `key_results`, `crm_deals`.** Seguridad de datos. (1-2 hs)
6. **Completar `.env.example`** con todas las claves esperadas. (15 min)
7. **Agregar índices a tablas calientes.** Performance de queries. (1 h)
8. **Tests de integración** en `create-user`, `delete-user`, `arca/emit`. (6-8 hs)
9. **Code splitting + lazy routes + mover `playwright` a devDependencies.** Bundle ~40% más liviano. (2-3 hs)
10. **Decidir destino del módulo Rust** (absorberlo, integrarlo, o documentarlo como standalone). (1-2 hs diseño)

**Total estimado:** 27-40 horas de trabajo enfocado.

---

## Sobre la migración a Rust

Aclaración importante: el "backend" de este proyecto no es un servidor monolítico. Son:

- **Supabase** (PostgreSQL + Auth + Storage gestionado) — esto ya es robusto por diseño, no se reemplaza con Rust.
- **12 funciones serverless en `/api/*.ts`** — esto sí podría migrarse a Rust, pero Vercel no corre Rust nativamente. Tendrías que: (a) usar Shuttle/Fly.io para un servicio Rust externo, o (b) WASM en Vercel Edge, o (c) mantener TS y endurecerlo con zod + strict.

**Mi recomendación:** primero endurecer el TS actual (1-3 días). Después, si querés Rust, migrar los endpoints más críticos (ARCA, create-user, prospector) a un servicio Rust separado en Shuttle/Fly. El módulo `tools/b2b-prospector/` ya es el blueprint perfecto.
