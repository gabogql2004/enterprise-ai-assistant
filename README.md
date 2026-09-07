# Enterprise AI Assistant

SaaS B2B multi-tenant que permite a empresas subir documentos internos (políticas, manuales, FAQs) y consultarlos mediante un asistente conversacional con IA usando **RAG (Retrieval Augmented Generation)**. Incluye análisis de sentimiento sobre feedback de clientes y un modelo de suscripción con Stripe.

> Proyecto de portafolio. El plan de desarrollo completo, las decisiones técnicas y los gotchas conocidos viven en [`CLAUDE.md`](./CLAUDE.md).

**Demo en vivo:** https://enterprise-ai-assistant-lake.vercel.app

## Funcionalidad

- **Multi-tenancy real**: cada organización tiene sus propios usuarios, documentos, conversaciones y análisis — nunca se filtran entre organizaciones.
- **Autenticación con roles**: `admin` / `usuario` / `viewer`, gestionados vía NextAuth (Credentials).
- **Ingesta de documentos**: sube PDF o Word, se extrae el texto, se divide en chunks y se generan embeddings automáticamente.
- **Chat con RAG**: el asistente responde preguntas basándose únicamente en los documentos de tu organización — si no encuentra la respuesta en el contexto, lo dice en vez de inventar.
- **Historial de conversaciones**, privado por usuario.
- **Análisis de sentimiento** de feedback de clientes, con salida estructurada (sentimiento, temas, resumen).
- **Suscripciones con Stripe**: plan gratuito con límites (5 documentos, 50 mensajes/mes) y plan Pro sin límite, gestionado vía Stripe Checkout + Customer Portal.
- **Panel de equipo**: invita miembros con un rol específico dentro de tu organización.

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend / Backend | Next.js 16 (App Router) + TailwindCSS v4 + shadcn/ui |
| Base de datos | PostgreSQL + Prisma 7 |
| Vector DB | pgvector (extensión de Postgres) |
| Chat / IA | Claude API (Anthropic, `claude-sonnet-4-6`) |
| Embeddings | Voyage AI (`voyage-3-lite`) — Claude API no tiene endpoint de embeddings |
| Auth | NextAuth (Credentials Provider) |
| Pagos | Stripe (Checkout + Customer Portal + webhooks) |

## Setup local

### 1. Prerrequisitos

- Node.js 20+
- PostgreSQL con la extensión `pgvector` disponible (en Mac, [Postgres.app](https://postgresapp.com/) 15+ ya la trae precompilada)
- Cuentas (todas tienen tier gratis) en [Anthropic](https://console.anthropic.com/), [Voyage AI](https://www.voyageai.com/) y, opcionalmente, [Stripe](https://stripe.com/) (modo test)

### 2. Instalar y configurar

```bash
npm install
cp .env.example .env
```

Completa `.env` con tus credenciales:

```
DATABASE_URL=postgresql://usuario@localhost:5432/enterprise_ai_assistant?schema=public
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...
STRIPE_SECRET_KEY=sk_test_...        # opcional para desarrollo sin billing
STRIPE_WEBHOOK_SECRET=whsec_...      # opcional
STRIPE_PRICE_ID_PRO=price_...        # opcional
NEXTAUTH_SECRET=...                  # genera uno con: openssl rand -base64 32
```

### 3. Base de datos

```bash
# Crea la base de datos (ajusta el nombre si usaste otro en DATABASE_URL)
createdb enterprise_ai_assistant

npx prisma migrate dev
```

La primera migración habilita `pgvector` automáticamente (`CREATE EXTENSION IF NOT EXISTS vector`).

### 4. Levantar el servidor

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — te redirige a `/login`. Crea una cuenta desde ahí (queda como `admin` de una organización nueva).

### 5. (Opcional) Probar Stripe localmente

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Comandos

```bash
npm run dev              # Servidor de desarrollo
npm run build             # Build de producción
npm run lint               # Linting
npx prisma studio          # Explorador visual de la base de datos
npx prisma migrate dev    # Aplicar migraciones nuevas
```

## Estructura del proyecto

```
app/
├── (auth)/                # login, register
├── (dashboard)/            # chat, documents, sentiment, team, billing
├── api/
│   ├── auth/                # NextAuth + registro
│   ├── documents/            # upload + extracción + chunking + embeddings
│   ├── chat/                 # RAG + historial de conversaciones
│   ├── sentiment/             # análisis de sentimiento
│   ├── team/                  # invitar/listar miembros
│   └── stripe/                 # checkout, portal, webhook
lib/
├── claudeService.ts        # chat RAG + análisis de sentimiento (Claude)
├── vectorStore.ts            # embeddings (Voyage AI) + búsqueda por similitud
├── chunking.ts                 # división de documentos en chunks
├── documentExtraction.ts         # extracción de texto de PDF/Word
├── planLimits.ts                   # límites del plan free
├── auth.ts                           # configuración de NextAuth
├── prisma.ts / stripe.ts               # clientes de infraestructura
prisma/schema.prisma            # modelo de datos completo
```

## Deploy

Desplegado en Vercel + Neon (Postgres serverless con `pgvector`). Stack de infra:

- **Base de datos**: proyecto en [Neon](https://console.neon.tech/), migrado con `prisma migrate deploy` (incluye `CREATE EXTENSION IF NOT EXISTS vector`).
- **Hosting**: Vercel, repo conectado a `gabogql2004/enterprise-ai-assistant` (auto-deploy en cada push a `main`).
- **Webhook de Stripe**: endpoint registrado vía API de Stripe apuntando a `/api/stripe/webhook` de la URL de producción (el signing secret de `stripe listen` usado en desarrollo es solo local, no sirve en producción — cada entorno necesita su propio webhook endpoint y secret).

**Dos problemas específicos de correr `pdf-parse` en el runtime serverless de Vercel** (no aparecen en local ni en el build, solo en producción) — ambos ya resueltos en `next.config.ts`:

1. `pdfjs-dist` (dependencia de `pdf-parse`) hace un `require()` dinámico de `@napi-rs/canvas` (para polyfillear `DOMMatrix`) envuelto en `try/catch`. El *output file tracing* de Vercel (`@vercel/nft`) no detecta ese require dinámico por análisis estático, así que no copia el módulo — ni su binario nativo — a la función serverless. Sin el polyfill, la extracción de PDF falla con `DOMMatrix is not defined`.
2. Por el mismo motivo de file tracing, tampoco se copiaba `pdfjs-dist/legacy/build/pdf.worker.mjs`, y la extracción fallaba con `Cannot find module '.../pdf.worker.mjs'`.

Solución: `outputFileTracingIncludes` en `next.config.ts` fuerza explícitamente la inclusión de `@napi-rs/canvas`, su binario `linux-x64-gnu`, y todo `pdfjs-dist` en el bundle de `/api/documents`.

Otro ajuste necesario: **Vercel bloquea los scripts de instalación de dependencias por seguridad** (`npm warn allow-scripts`), lo que impedía que `prisma generate` corriera automáticamente tras `npm install` — el build fallaba con `Module '"@prisma/client"' has no exported member 'PrismaClient'`. Se agregó `"postinstall": "prisma generate"` a `package.json` para forzarlo explícitamente (script propio, no de una dependencia de terceros, así que sí se ejecuta).

No hay GIF demostrativo todavía.

## Seguridad multi-tenant

Toda query que involucra `Document`, `Conversation`, `Message` o `SentimentAnalysis` filtra explícitamente por `organizationId`, obtenido siempre de la sesión autenticada — nunca de un parámetro enviado por el cliente. El historial de conversaciones además filtra por `userId`: cada persona ve solo lo suyo dentro de su organización.
