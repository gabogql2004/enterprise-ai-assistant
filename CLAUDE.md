# CLAUDE.md — Enterprise AI Assistant (SaaS B2B)

Este archivo proporciona contexto a Claude Code al trabajar en este repositorio.

---

## 🎯 Objetivo del proyecto

Construir **Enterprise AI Assistant**: una plataforma SaaS multi-tenant que permite a empresas subir documentos internos (políticas, manuales, FAQs) y consultarlos mediante un asistente conversacional con IA usando **RAG (Retrieval Augmented Generation)**. Incluye análisis de sentimiento sobre feedback de clientes y un modelo de suscripción con Stripe.

**Propósito estratégico:** es el proyecto más "producto real" de la serie de portafolio — demuestra capacidad de construir un SaaS completo con multi-tenancy, roles, RAG (una de las skills de IA más demandadas) y monetización real. Cierra el ciclo: IA aplicada a datos (P1) + procesos (P2) + producto completo (P3).

---

## 🧱 Stack técnico

```
Frontend:      Next.js + TailwindCSS + shadcn/ui
Backend:       Next.js API Routes (o Node.js/Express si se prefiere separar)
Base de datos: PostgreSQL + Prisma ORM
Vector DB:     pgvector (extensión de Postgres) o Pinecone
IA:            Claude API (Anthropic) — modelo claude-sonnet-4-6 para chat/RAG. Voyage AI (voyage-3-lite) para embeddings — ver notas de decisión
Auth:          NextAuth (Credentials Provider, decidido — ver notas)
Pagos:         Stripe (suscripciones, checkout, webhooks)
Deploy:        Vercel (frontend + backend integrados vía Next.js)
```

**Notas de decisión:**
- Next.js elegido (en vez de mantener React + Express separados como en P1/P2) porque simplifica el deploy de un SaaS real en un solo repo, y es un stack muy demandado en el mercado.
- pgvector preferido sobre Pinecone si el volumen de documentos es bajo/medio, para evitar un servicio externo adicional; Pinecone queda como alternativa si se necesita escalar.
- **NextAuth elegido sobre Clerk** (Fase 1, punto 2): el modelo de datos propio (`User`/`Organization` con roles) ya estaba definido antes de evaluar Clerk, y usar Clerk hubiera implicado duplicar esa info entre su sistema externo y la DB propia, o pagar por su feature de "Organizations". NextAuth es gratis, corre en la propia infra, y da control total sobre qué va en la sesión (`organizationId` + `rol` inyectados vía `callbacks.jwt`/`callbacks.session`).
- **Versiones más nuevas que las originalmente ancladas** (Next 14→16, Prisma 5→7): al hacer el setup inicial, `npm install` trajo versiones mayores más recientes que las documentadas originalmente. Se decidió adoptarlas (en vez de fijar las versiones antiguas) por soporte a largo plazo — ver "Versiones clave de dependencias" y los gotchas de Prisma 7 / Next 16 más abajo.
- **PostgreSQL local vía Postgres.app** (no una instancia en la nube tipo Supabase/Neon): decisión del usuario para desarrollo local. Postgres.app en versiones recientes ya trae `pgvector` precompilado, así que Fase 2 solo necesita `CREATE EXTENSION IF NOT EXISTS vector;`, sin instalar nada adicional.
- **Voyage AI para embeddings** (Fase 2): Claude API (Anthropic) no tiene endpoint de embeddings — el CLAUDE.md original asumía "chat + embeddings" desde Claude, pero eso no existe. Voyage AI es el partner oficial de Anthropic para esto. Se usa `voyage-3-lite` (512 dimensiones — ver `prisma/schema.prisma`, `DocumentChunk.embedding vector(512)`) por su balance costo/calidad para documentos de políticas/manuales/FAQs (no código). Requiere `VOYAGE_API_KEY` propia, separada de `ANTHROPIC_API_KEY`.
- **Chunking sin tokenizer real**: `lib/chunking.ts` aproxima 1 token ≈ 0.75 palabras (375 palabras ≈ 500 tokens) en vez de integrar un tokenizer real, para evitar otra dependencia. Es una aproximación, no un conteo exacto.
- **Historial de conversaciones es privado por usuario**, no compartido a nivel de organización: cada quien ve solo sus propias conversaciones (`Conversation.userId` + `organizationId` de la sesión). Si más adelante se quiere que un admin vea las conversaciones del equipo, es un cambio de alcance a decidir explícitamente, no algo ya soportado.
- **Sistema de roles sin panel de equipo todavía**: se implementó el enforcement de permisos (`viewer` no puede subir documentos ni invitar; solo `admin` puede invitar) y un endpoint mínimo `POST /api/team/invite` sin UI. El panel de administración de equipo (con UI) sigue siendo tarea de Fase 3.

---

## 📁 Estructura del proyecto

```
enterprise-ai-assistant/
├── app/                        # Next.js App Router
│   ├── (auth)/                  # login, register, invitaciones
│   ├── (dashboard)/
│   │   ├── documents/           # Ingesta y biblioteca de documentos
│   │   ├── chat/                # Asistente conversacional (RAG)
│   │   ├── sentiment/           # Análisis de sentimiento
│   │   ├── team/                # Gestión de miembros y roles
│   │   └── billing/             # Plan actual, uso, facturación
│   ├── api/
│   │   ├── documents/           # Upload, procesamiento, chunking
│   │   ├── chat/                # Endpoint RAG
│   │   ├── sentiment/           # Endpoint de análisis
│   │   ├── stripe/              # Checkout y webhooks
│   │   └── auth/
│   └── layout.tsx
│
├── lib/
│   ├── claudeService.ts         # Llamadas a Claude API (chat + embeddings)
│   ├── vectorStore.ts           # Interacción con pgvector/Pinecone
│   ├── chunking.ts              # Lógica de división de documentos en chunks
│   ├── prisma.ts
│   └── stripe.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── components/                  # UI components (shadcn/ui based)
│
├── CLAUDE.md                    # Este archivo
└── README.md
```

---

## ⚙️ Comandos de desarrollo

```bash
npm run dev              # Servidor de desarrollo (Next.js)
npm run build             # Build de producción
npm run lint               # Linting (ESLint)
npm run test               # Correr tests
npx prisma migrate dev    # Aplicar migraciones en desarrollo
npx prisma studio          # Explorador visual de la base de datos
npx prisma generate        # Regenerar cliente de Prisma tras cambios en schema
```

---

## 🔧 Setup de entorno local

1. Clonar el repo e instalar dependencias: `npm install`
2. Levantar PostgreSQL local (con extensión `pgvector` habilitada) o usar una instancia en la nube (ej. Supabase, Neon)
3. Copiar `.env.example` a `.env` y completar:
   ```
   DATABASE_URL=postgresql://...
   ANTHROPIC_API_KEY=sk-ant-...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXTAUTH_SECRET=...       # o CLERK_SECRET_KEY si se usa Clerk
   ```
4. Correr migraciones: `npx prisma migrate dev`
5. (Opcional) Sembrar datos de prueba: `npx prisma db seed`
6. Levantar servidor: `npm run dev`

Para probar Stripe localmente, usar `stripe listen --forward-to localhost:3000/api/stripe/webhook` (Stripe CLI).

---

## 🚫 Reglas explícitas

- Nunca hacer commit directo a `main` — siempre trabajar en una rama por feature (`feature/nombre-corto`) y hacer merge vía PR, aunque el repo sea personal (es buena práctica a mantener).
- Nunca exponer datos de una organización a otra: toda query a la base de datos que involucre `Document`, `Conversation`, `Message` o `SentimentAnalysis` debe filtrar explícitamente por `organizationId` obtenido de la sesión autenticada, nunca de un parámetro enviado por el cliente sin validar.
- No instalar dependencias nuevas sin explicar antes por qué se necesitan y confirmar.
- No hardcodear API keys, IDs de Stripe, ni ningún secreto — siempre vía variables de entorno.
- No modificar el schema de Prisma sin generar la migración correspondiente en el mismo paso.

---

## 📐 Formato estándar de respuestas de API

Todos los endpoints deben responder de forma consistente:

**Éxito:**
```json
{ "data": { ... } }
```

**Error:**
```json
{ "error": "Mensaje legible para el usuario", "code": "DOCUMENT_NOT_FOUND" }
```

Usar códigos de error en mayúsculas y snake_case en inglés (ej. `UNAUTHORIZED`, `PLAN_LIMIT_REACHED`, `INVALID_DOCUMENT_FORMAT`), consistentes entre todos los endpoints.

---

## 🧪 Estrategia de testing

- **Unit tests** (Vitest o Jest): lógica de chunking, cálculo de similitud, formateo de prompts — todo lo que no dependa de servicios externos.
- **Tests de integración:** endpoints críticos (`/api/chat`, `/api/documents`, `/api/stripe/webhook`) usando una base de datos de test separada.
- **Mock de servicios externos:** Claude API y Stripe deben mockearse en tests automatizados; no hacer llamadas reales en CI.
- Prioridad de cobertura: pipeline RAG > multi-tenancy (aislamiento de datos) > webhooks de Stripe > resto.

---

## 🌿 Git workflow

- Rama principal: `main` (siempre desplegable)
- Ramas de feature: `feature/nombre-corto` (ej. `feature/rag-pipeline`)
- Commits en español, formato `tipo: descripción` (`feat`, `fix`, `refactor`, `docs`, `test`)
- Un PR por feature completa de una fase del checklist, no por cada archivo

---

## ⚠️ Gotchas conocidos

- **pgvector** requiere habilitar la extensión manualmente en Postgres antes de migrar: `CREATE EXTENSION IF NOT EXISTS vector;`
- **Stripe webhooks** necesitan el body en formato *raw* (no JSON parseado) para poder verificar la firma. En el App Router de Next.js **no hace falta configuración especial** (a diferencia del Pages Router): basta con leer `await request.text()` en vez de `request.json()` en el route handler — ya implementado en `app/api/stripe/webhook/route.ts`.
- **Stripe SDK v22 valida la API key en el constructor de `new Stripe(...)`** — si `STRIPE_SECRET_KEY` no está seteada, ni siquiera el build de Next.js completa (falla al evaluar el módulo). Por eso `lib/stripe.ts` inicializa el cliente perezosamente con `getStripe()` en vez de exportar una instancia ya creada.
- **`Subscription.current_period_start/end` ya no existe en Stripe SDK v22** — se movió a cada `SubscriptionItem` (`subscription.items.data[0].current_period_start`), porque una suscripción ahora puede tener ítems con distinto ciclo de facturación.
- **Salida estructurada de Claude**: usar `client.messages.parse()` con `output_config.format` (vía `zodOutputFormat()` del SDK) en vez de pedir JSON en el prompt y hacer `JSON.parse()` a mano — falla menos. Ver `analizarSentimiento()` en `lib/claudeService.ts`.
- Los **embeddings** tienen un costo por llamada a la API — evitar regenerarlos si el documento no cambió (cachear o verificar hash del contenido antes de reprocesar).
- **NextAuth + multi-tenancy:** asegurarse de que la sesión incluya siempre `organizationId`, no solo `userId`, para no tener que hacer un JOIN extra en cada request. Ya implementado vía `callbacks.jwt`/`callbacks.session` en `lib/auth.ts`.
- **Prisma 7 cambió su arquitectura de conexión**: `url` ya no va en el `datasource` de `schema.prisma` (vive en `prisma.config.ts`), y `PrismaClient` requiere un *driver adapter* explícito (`@prisma/adapter-pg` + `pg`) en vez de resolver la URL internamente. Ver `lib/prisma.ts`. También requiere `dotenv` como dev dependency para que `prisma.config.ts` lea `.env` (`import "dotenv/config"`).
- **Next.js 16 renombró `middleware.ts` a `proxy.ts`** (mismo comportamiento, export default sigue igual) — `middleware.ts` está deprecado y genera warning en build.
- **`pdf-parse` (vía `pdfjs-dist`) rompe bajo Turbopack** si se deja que lo empaquete: falla con "Setting up fake worker failed" porque no puede resolver su worker interno desde el bundle. Solución: agregarlo a `serverExternalPackages` en `next.config.ts` (ya hecho).
- **`pdf-parse` v2 cambió su API** respecto a versiones anteriores: ya no es `pdf(buffer)` sino `new PDFParse({ data: buffer }).getText()` + `.destroy()` para liberar memoria. Ver `lib/documentExtraction.ts`.
- **Next.js 16 auto-generaba un bloque `<!-- BEGIN:nextjs-agent-rules -->` al final de este archivo en cada `next dev`.** Se desactivó (`agentRules: false` en `next.config.ts`) después de que la reescritura truncara el resto del archivo dos veces en la misma sesión (aparentemente al reiniciar el dev server varias veces seguidas). El bloque que queda al final de este archivo es el último que se generó — ya no se actualiza solo, se puede editar/quitar con confianza.

---

## 📦 Versiones clave de dependencias

```
next: ^16.x           (era ^14.x — ver "Notas de decisión")
prisma: ^7.x           (era ^5.x — arquitectura de conexión distinta, ver gotchas)
@prisma/adapter-pg: ^7.x   (nuevo — requerido por Prisma 7 para el driver adapter)
next-auth: ^5.0.0-beta.x   (nuevo — auth elegida en Fase 1, punto 2)
@anthropic-ai/sdk: última estable (no ^0.30.x, se instaló la más reciente disponible)
pdf-parse: ^2.x        (nuevo — extracción de texto de PDF, Fase 1 punto 3)
mammoth: última estable    (nuevo — extracción de texto de Word, Fase 1 punto 3)
voyageai: última estable   (nuevo — SDK oficial de Voyage AI para embeddings, Fase 2)
zod: ^4.x               (nuevo — validación de salida estructurada de Claude, Fase 3)
stripe: ^22.x           (era ^16.x — versión mayor más nueva, cambió dónde vive current_period_start/end, ver gotchas)
```

*(Actualizar esta lista si se cambia de versión mayor en cualquiera de estas dependencias.)*

---

## 🗄️ Modelo de datos (referencia)

```prisma
model Organization {
  id               String    @id @default(uuid())
  nombre           String
  plan             String    @default("free") // "free" | "pro"
  stripeCustomerId String?
  createdAt        DateTime  @default(now())
  users            User[]
  documents        Document[]
  conversations    Conversation[]
  sentimentAnalyses SentimentAnalysis[]
  subscription     Subscription?
}

model User {
  id             String       @id @default(uuid())
  email          String       @unique
  password       String
  nombre         String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  rol            String       // "admin" | "usuario" | "viewer"
  createdAt      DateTime     @default(now())
}

model Document {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  nombreArchivo  String
  estado         String       // "pendiente" | "procesado"
  uploadedBy     String       // user id
  createdAt      DateTime     @default(now())
  chunks         DocumentChunk[]
}

model DocumentChunk {
  id         String   @id @default(uuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id])
  contenido  String
  embedding  Unsupported("vector")?  // via pgvector
  chunkIndex Int
}

model Conversation {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  userId         String
  titulo         String?
  createdAt      DateTime     @default(now())
  messages       Message[]
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  rol            String       // "user" | "assistant"
  contenido      String
  createdAt      DateTime     @default(now())
}

model SentimentAnalysis {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  textoOriginal  String
  sentimiento    String       // "positivo" | "negativo" | "neutral"
  temas          Json         // array de strings
  createdAt      DateTime     @default(now())
}

model Subscription {
  id                   String       @id @default(uuid())
  organizationId       String       @unique
  organization         Organization @relation(fields: [organizationId], references: [id])
  stripeSubscriptionId String
  estado               String
  plan                 String
  periodoInicio        DateTime
  periodoFin           DateTime
}
```

---

## 🤖 Integración con Claude API (RAG + Sentimiento)

**Ubicación:** `lib/claudeService.ts` (chat, consumido desde `app/api/chat/`), `lib/vectorStore.ts` (embeddings + búsqueda, vía Voyage AI — Claude API no tiene endpoint de embeddings), `lib/chunking.ts` (división en chunks). `app/api/sentiment/` queda pendiente para Fase 3.

### Flujo RAG (chat sobre documentos) — implementado en Fase 2

1. **Ingesta (`POST /api/documents`):**
   - Extraer texto del PDF/Word subido (`lib/documentExtraction.ts`)
   - Dividir en chunks (~500 tokens cada uno) vía `lib/chunking.ts`
   - Generar embedding de cada chunk (Voyage AI, `voyage-3-lite`, `inputType: "document"`)
   - Guardar chunk + embedding en `DocumentChunk` (pgvector, vía `$executeRaw`)

2. **Consulta (`POST /api/chat`, cada pregunta del usuario):**
   - Generar embedding de la pregunta (`inputType: "query"`)
   - Buscar los 5 chunks más similares (similitud coseno, operador `<=>`) en `vectorStore.ts`, filtrado por `organizationId`
   - Construir prompt:
     ```
     Responde la siguiente pregunta basándote ÚNICAMENTE en el contexto
     proporcionado. Si la respuesta no está en el contexto, indica que
     no tienes esa información.

     Contexto:
     [chunks relevantes encontrados]

     Pregunta: [pregunta del usuario]
     ```
   - Enviar a Claude API (`claude-sonnet-4-6`), guardar la pregunta original (sin el contexto inyectado) y la respuesta en `Message`

### Análisis de sentimiento

```
Analiza el sentimiento del siguiente feedback de cliente:

[texto del feedback]

Responde en JSON:
{
  "sentimiento": "positivo|negativo|neutral",
  "temas": ["tema1", "tema2"],
  "resumen": "una línea"
}
```

**Notas importantes:**
- Usar el modelo `claude-sonnet-4-6` vía API estándar de Anthropic (`/v1/messages`).
- API key vía variable de entorno `ANTHROPIC_API_KEY`, nunca hardcodeada.
- El RAG siempre debe instruir a Claude a responder solo con el contexto dado, para evitar alucinaciones sobre políticas/documentos internos de la empresa.
- Pedir siempre salida en JSON estructurado en el análisis de sentimiento.

---

## 🚦 Fases de desarrollo

### Fase 1 — MVP: Auth + documentos + chat básico
- [x] Setup de proyecto (Next.js + PostgreSQL + Prisma)
- [x] Autenticación con organizaciones (NextAuth, Credentials Provider)
- [x] Upload y procesamiento básico de documentos (extracción de texto)
- [x] Chat simple sin RAG todavía (Claude respondiendo directo, sin contexto de documentos)

**Notas de implementación de Fase 1:**
- El texto extraído de cada documento (punto 3) se guarda como un único `DocumentChunk` (`chunkIndex: 0`, sin `embedding`) en vez de agregar un campo nuevo a `Document`. Fase 2 reemplaza ese chunk único por el chunking real (~500 tokens) + embeddings, sin necesidad de otra migración de schema.
- El campo `DocumentChunk.embedding` (tipo `vector` de pgvector) sigue comentado en `schema.prisma` — se habilita recién en Fase 2 junto con `CREATE EXTENSION IF NOT EXISTS vector;`.
- `POST /api/chat` ya persiste `Conversation`/`Message` y valida que el `conversationId` pertenezca a la organización de la sesión (probado explícitamente: un id ajeno devuelve 404, no datos de otra empresa).

### Fase 2 — RAG real + roles
- [x] Setup de vector DB (pgvector)
- [x] Pipeline completo de embeddings + chunking
- [x] Chat con RAG funcional (respuestas basadas en documentos reales)
- [x] Sistema de roles (admin/usuario/viewer)
- [x] Historial de conversaciones

**Notas de implementación de Fase 2:**
- `lib/chunking.ts`: chunks de ~375 palabras (aprox. 500 tokens) con 50 palabras de overlap.
- `lib/vectorStore.ts`: `generarEmbeddings()` (Voyage AI, distingue `inputType: "document"` vs `"query"`) y `buscarChunksSimilares()` (SQL crudo con el operador `<=>` de pgvector, filtrado siempre por `organizationId`).
- El insert de `DocumentChunk` con embedding usa `$executeRaw` porque Prisma no puede escribir campos `Unsupported("vector")` vía el Client normal.
- `POST /api/chat` aumenta solo el último turno (user) con el contexto recuperado antes de mandarlo a Claude; lo que se guarda en `Message` es la pregunta original, sin el contexto inyectado, para que el historial se vea limpio en la UI.
- Roles: `POST /api/documents` y `POST /api/team/invite` verifican `session.user.rol`. Sin UI de equipo todavía (Fase 3).
- Historial: `GET /api/chat/conversations` y `GET /api/chat/conversations/[id]`, filtrados por `userId` + `organizationId` — conversaciones privadas por usuario, no compartidas a nivel organización.
- Probado end-to-end con datos ficticios distintivos para confirmar que RAG no alucina: cita hechos inventados del documento correcto, declina responder sin contexto relevante, y una organización no ve documentos ni conversaciones de otra.

### Fase 3 — Sentimiento + suscripciones + pulido
- [x] Módulo de análisis de sentimiento
- [x] Integración Stripe (checkout + webhooks) — código completo, **sin probar end-to-end** (ver nota)
- [x] Límites por plan (free vs pro)
- [x] Panel de administración de equipo
- [ ] Deploy y documentación completa (README con GIF demostrativo) — README hecho, deploy y GIF pendientes

**Notas de implementación de Fase 3:**
- `lib/claudeService.ts` → `analizarSentimiento()`: usa `client.messages.parse()` con `output_config.format` (Zod) en vez de pedir JSON en el prompt y parsearlo a mano — más confiable. Nueva dependencia: `zod`.
- Stripe: `lib/stripe.ts` inicializa el cliente perezosamente (`getStripe()`), no al cargar el módulo — la SDK v22 valida la API key en el constructor y rompía el build sin `STRIPE_SECRET_KEY` configurada.
- **Cambio de API de Stripe detectado antes de escribir código** (revisando los tipos instalados, no memoria): `current_period_start/end` ya no vive en `Subscription`, sino en cada `SubscriptionItem` (`subscription.items.data[0].current_period_start`).
- **Pendiente**: el usuario todavía no tiene cuenta de Stripe — el checkout, el customer portal y el webhook están implementados pero no probados con una llamada real a Stripe. Falta: crear cuenta de Stripe (modo test), pasar `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, crear el Product+Price de $29/mes (puede hacerse vía API una vez haya `STRIPE_SECRET_KEY`) y setear `STRIPE_PRICE_ID_PRO`, y correr `stripe listen` para probar el webhook local.
- Límites de plan (`lib/planLimits.ts`): free = 5 documentos + 50 mensajes de chat/mes. Son un placeholder razonable para demostrar el flujo de upgrade, no un límite de negocio real. Probado end-to-end (documento #6 rechazado con `PLAN_LIMIT_REACHED`).
- Panel de equipo: `GET /api/team` (listar) + UI en `app/(dashboard)/team`, sobre el `POST /api/team/invite` de Fase 2. Solo `admin` ve el formulario de invitación.
- README.md reescrito con setup completo, stack y arquitectura — sin GIF demostrativo (no hay forma de grabar pantalla en este entorno de desarrollo).

---

## ✅ Convenciones de código

- **Nombres de archivos:** camelCase para archivos TS/TSX, PascalCase para componentes React
- **Comentarios:** explicar el "por qué", especialmente en la lógica de chunking/embeddings y en el flujo RAG
- **Commits:** mensajes en español, formato `tipo: descripción` (ej. `feat: agregar pipeline de embeddings`)
- **Variables de entorno:** nunca commitear `.env`, mantener `.env.example` actualizado (incluye `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `DATABASE_URL`)
- **Errores:** manejar con try/catch explícitos, especialmente en llamadas a Claude API, Stripe y procesamiento de documentos (pueden fallar por formatos inesperados)
- **Multi-tenancy:** toda query a la base de datos debe filtrar por `organizationId` — es crítico para evitar fugas de datos entre empresas
- **Estilo:** priorizar claridad sobre "cleverness" — el pipeline RAG es la parte más compleja del proyecto, debe estar bien comentado

---

## 🎓 Notas pedagógicas para Claude Code

- Explicar brevemente el **por qué** de cada decisión técnica, no solo entregar el código
- Explicar conceptos nuevos para Gabriel cuando aparezcan por primera vez (embeddings, chunking, similitud coseno, RAG) con una analogía simple antes de ir al código
- Dividir tareas grandes (especialmente el pipeline RAG y la integración con Stripe) en pasos pequeños y verificables
- Sugerir buenas prácticas de seguridad multi-tenant (aislar datos por organización) explícitamente
- Evitar jerga innecesaria sin explicación

---

## 🔭 Visión a futuro (fuera del MVP actual)

- Soporte para más tipos de documentos (Notion, Google Drive, Confluence)
- Analítica avanzada de uso por organización
- Integración con Slack (consultar el asistente desde ahí)
- Fine-tuning o prompts especializados por industria
- Exportar reportes de sentimiento en PDF

---

## 🔄 Mantenimiento de este archivo

Claude Code debe actualizar este archivo cuando:
- Se complete una tarea del checklist de fases (marcar con `[x]`)
- Se tome una decisión técnica nueva o se cambie una ya documentada (agregar o modificar en "Notas de decisión")
- Se agregue un nuevo modelo de datos, endpoint o integración relevante
- Se identifique un cambio de alcance del proyecto (features agregadas, eliminadas o pospuestas)

Al final de cada sesión de trabajo significativa, actualizar la línea "Última actualización" con la fecha y un resumen breve de qué se hizo.

---

*Última actualización: 2026-08-20 — Fase 3 casi completa: análisis de sentimiento (salida estructurada con Zod), integración Stripe (checkout + portal + webhooks, código completo pero sin probar en vivo — falta que el usuario cree su cuenta de Stripe), límites por plan free/pro (probado end-to-end), panel de equipo con listado + invitación, y README.md completo. Pendiente de Fase 3: deploy a Vercel y GIF demostrativo. Próximo paso: cuando el usuario tenga cuenta de Stripe, conectar keys reales, crear el Price de $29/mes, probar el flujo de checkout/webhook end-to-end, y hacer el deploy.*

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
