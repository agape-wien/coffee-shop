-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('COFFEE', 'OTHER');

-- CreateEnum
CREATE TYPE "PartStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'PICKED_UP', 'CANCELLED');

-- CreateTable
CREATE TABLE "AdminConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "passwordHash" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "qrBaseUrl" TEXT NOT NULL DEFAULT '',
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "showDescription" BOOLEAN NOT NULL DEFAULT true,
    "showComposition" BOOLEAN NOT NULL DEFAULT true,
    "showImage" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AdminConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "paused" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "composition" TEXT,
    "imageUrl" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "type" "ItemType" NOT NULL,
    "ee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "me" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemTranslation" (
    "itemId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "description" TEXT,
    "composition" TEXT,

    CONSTRAINT "MenuItemTranslation_pkey" PRIMARY KEY ("itemId","language")
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT,
    "qrToken" TEXT NOT NULL,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCounter" (
    "date" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyCounter_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "tableId" TEXT NOT NULL,
    "coffeeStatus" "PartStatus" DEFAULT 'PENDING',
    "otherStatus" "PartStatus" DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Table_number_key" ON "Table"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Table_qrToken_key" ON "Table"("qrToken");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemTranslation" ADD CONSTRAINT "MenuItemTranslation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

