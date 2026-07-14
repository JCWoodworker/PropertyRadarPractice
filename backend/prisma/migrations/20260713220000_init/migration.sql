-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'Needs Estimate',
    "roof_age_years" INTEGER NOT NULL,
    "roof_material" TEXT NOT NULL,
    "last_inspection" DATE NOT NULL,
    "distress_flag" BOOLEAN NOT NULL DEFAULT false,
    "distress_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_lookup_cache" (
    "id" TEXT NOT NULL,
    "query_address" TEXT NOT NULL,
    "formatted_address" TEXT NOT NULL,
    "county" TEXT,
    "state" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "place_type" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_lookup_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_tenant_id_idx" ON "leads"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "property_lookup_cache_query_address_key" ON "property_lookup_cache"("query_address");
