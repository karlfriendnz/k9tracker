-- Trainer-owned shop products (physical or digital)
CREATE TYPE "ProductKind" AS ENUM ('PHYSICAL', 'DIGITAL');

CREATE TABLE "products" (
  "id"          TEXT PRIMARY KEY,
  "trainerId"   TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "kind"        "ProductKind" NOT NULL DEFAULT 'PHYSICAL',
  "priceCents"  INTEGER,
  "imageUrl"    TEXT,
  "downloadUrl" TEXT,
  "category"    TEXT,
  "featured"    BOOLEAN NOT NULL DEFAULT false,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "products_trainerId_fkey"
    FOREIGN KEY ("trainerId") REFERENCES "trainer_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "products_trainerId_idx" ON "products"("trainerId");
CREATE INDEX "products_category_idx" ON "products"("category");
