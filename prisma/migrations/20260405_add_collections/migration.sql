-- CreateTable Collection
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable CollectionCommand
CREATE TABLE "CollectionCommand" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Collection_createdBy_idx" ON "Collection"("createdBy");

-- CreateIndex
CREATE INDEX "Collection_createdAt_idx" ON "Collection"("createdAt");

-- CreateIndex
CREATE INDEX "Collection_updatedAt_idx" ON "Collection"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionCommand_collectionId_commandId_key" ON "CollectionCommand"("collectionId", "commandId");

-- CreateIndex
CREATE INDEX "CollectionCommand_collectionId_idx" ON "CollectionCommand"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionCommand_commandId_idx" ON "CollectionCommand"("commandId");

-- CreateIndex
CREATE INDEX "CollectionCommand_addedAt_idx" ON "CollectionCommand"("addedAt");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionCommand" ADD CONSTRAINT "CollectionCommand_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionCommand" ADD CONSTRAINT "CollectionCommand_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "Command"("id") ON DELETE CASCADE;
