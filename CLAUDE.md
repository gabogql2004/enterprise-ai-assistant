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
IA:            Claude API (Anthropic) — modelo claude-sonnet-4-6, chat + embeddings
Auth:          NextAuth o Clerk (soporte nativo de roles y organizaciones)
Pagos:         Stripe (suscripciones, checkout, webhooks)
Deploy:        Vercel (frontend + backend integrados vía Next.js)
```

**Notas de decisión:**
- Next.js elegido (en vez de mantener React + Express separados como en P1/P2) porque simplifica el deploy de un SaaS real en un solo repo, y es un stack muy demandado en el mercado.
- pgvector preferido sobre Pinecone si el volumen de documentos es bajo/medio, para evitar un servicio externo adicional; Pinecone queda como alternativa si se necesita escalar.
- Clerk sobre NextAuth si se quiere ahorrar tiempo en la gestión de organizaciones y roles (tiene soporte nativo); NextAuth si se prefiere más control y menor costo.

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
- **Stripe webhooks** necesitan el body en formato *raw* (no JSON parseado) para poder verificar la firma — en Next.js esto requiere configuración especial en el route handler.
- Los **embeddings** tienen un costo por llamada a la API — evitar regenerarlos si el documento no cambió (cachear o verificar hash del contenido antes de reprocesar).
- **NextAuth/Clerk + multi-tenancy:** asegurarse de que la sesión incluya siempre `organizationId`, no solo `userId`, para no tener que hacer un JOIN extra en cada request.

---

## 📦 Versiones clave de dependencias

```
next: ^14.x
prisma: ^5.x
@anthropic-ai/sdk: ^0.30.x
stripe: ^16.x
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

**Ubicación:** `lib/claudeService.ts`, consumido desde `app/api/chat/` y `app/api/sentiment/`

### Flujo RAG (chat sobre documentos)

1. **Ingesta (una vez por documento):**
   - Extraer texto del PDF/Word subido
   - Dividir en chunks (~500 tokens cada uno) vía `lib/chunking.ts`
   - Generar embedding de cada chunk
   - Guardar chunk + embedding en `DocumentChunk` (pgvector)

2. **Consulta (cada pregunta del usuario):**
   - Generar embedding de la pregunta
   - Buscar los 3-5 chunks más similares (similitud coseno) en `vectorStore.ts`
   - Construir prompt:
     ```
     Responde la siguiente pregunta basándote ÚNICAMENTE en el contexto
     proporcionado. Si la respuesta no está en el contexto, indica que
     no tienes esa información.

     Contexto:
     [chunks relevantes encontrados]

     Pregunta: [pregunta del usuario]
     ```
   - Enviar a Claude API, guardar respuesta en `Message`

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
- [ ] Setup de proyecto (Next.js + PostgreSQL + Prisma)
- [ ] Autenticación con organizaciones (NextAuth o Clerk)
- [ ] Upload y procesamiento básico de documentos (extracción de texto)
- [ ] Chat simple sin RAG todavía (Claude respondiendo directo, sin contexto de documentos)

### Fase 2 — RAG real + roles
- [ ] Setup de vector DB (pgvector o Pinecone)
- [ ] Pipeline completo de embeddings + chunking
- [ ] Chat con RAG funcional (respuestas basadas en documentos reales)
- [ ] Sistema de roles (admin/usuario/viewer)
- [ ] Historial de conversaciones

### Fase 3 — Sentimiento + suscripciones + pulido
- [ ] Módulo de análisis de sentimiento
- [ ] Integración Stripe (checkout + webhooks)
- [ ] Límites por plan (free vs pro)
- [ ] Panel de administración de equipo
- [ ] Deploy y documentación completa (README con GIF demostrativo)

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

*Última actualización: contexto inicial del proyecto, antes de comenzar Fase 1.*

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
