-- CreateTable
CREATE TABLE "QuotationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationTemplateItemDetail" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationTemplateItemDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuotationTemplate_name_key" ON "QuotationTemplate"("name");

-- CreateIndex
CREATE INDEX "QuotationTemplate_deletedAt_idx" ON "QuotationTemplate"("deletedAt");

-- CreateIndex
CREATE INDEX "QuotationTemplateItem_templateId_idx" ON "QuotationTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "QuotationTemplateItemDetail_itemId_idx" ON "QuotationTemplateItemDetail"("itemId");

-- AddForeignKey
ALTER TABLE "QuotationTemplateItem" ADD CONSTRAINT "QuotationTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuotationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationTemplateItemDetail" ADD CONSTRAINT "QuotationTemplateItemDetail_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "QuotationTemplateItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
