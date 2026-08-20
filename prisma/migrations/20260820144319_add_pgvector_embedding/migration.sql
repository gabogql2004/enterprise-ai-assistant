-- Habilita pgvector antes de usar el tipo "vector" abajo. Idempotente: no
-- falla si ya estaba creada (como en este entorno local).
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "DocumentChunk" ADD COLUMN     "embedding" vector(512);

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");
