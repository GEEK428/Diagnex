-- CreateEnum
CREATE TYPE "SystemType" AS ENUM ('AUTHORITY', 'LOCAL');

-- CreateEnum
CREATE TYPE "ConceptLifecycleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "code_systems" ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "type" "SystemType" NOT NULL DEFAULT 'LOCAL';

-- AlterTable
ALTER TABLE "concepts" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "deactivated_at" TIMESTAMP(3),
ADD COLUMN     "lifecycle_status" "ConceptLifecycleStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "system_versions" (
    "id" SERIAL NOT NULL,
    "system_id" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concept_count" INTEGER NOT NULL,
    "imported_by" TEXT,
    "notes" TEXT,

    CONSTRAINT "system_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_versions_system_id_idx" ON "system_versions"("system_id");

-- AddForeignKey
ALTER TABLE "system_versions" ADD CONSTRAINT "system_versions_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "code_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
