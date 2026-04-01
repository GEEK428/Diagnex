-- CreateTable
CREATE TABLE "code_systems" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "source_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concepts" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "system_id" INTEGER NOT NULL,

    CONSTRAINT "concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mappings" (
    "id" SERIAL NOT NULL,
    "source_concept_id" INTEGER NOT NULL,
    "target_concept_id" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "mapping_type" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "code_systems_name_key" ON "code_systems"("name");

-- CreateIndex
CREATE INDEX "concepts_display_name_idx" ON "concepts"("display_name");

-- CreateIndex
CREATE INDEX "concepts_code_idx" ON "concepts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "concepts_code_system_id_key" ON "concepts"("code", "system_id");

-- CreateIndex
CREATE INDEX "mappings_source_concept_id_idx" ON "mappings"("source_concept_id");

-- CreateIndex
CREATE INDEX "mappings_target_concept_id_idx" ON "mappings"("target_concept_id");

-- AddForeignKey
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "code_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mappings" ADD CONSTRAINT "mappings_source_concept_id_fkey" FOREIGN KEY ("source_concept_id") REFERENCES "concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mappings" ADD CONSTRAINT "mappings_target_concept_id_fkey" FOREIGN KEY ("target_concept_id") REFERENCES "concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
