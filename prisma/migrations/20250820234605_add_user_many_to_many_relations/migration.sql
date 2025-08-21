-- CreateTable
CREATE TABLE "_UserEntities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_UserProperties" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_UserEntities_AB_unique" ON "_UserEntities"("A", "B");

-- CreateIndex
CREATE INDEX "_UserEntities_B_index" ON "_UserEntities"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_UserProperties_AB_unique" ON "_UserProperties"("A", "B");

-- CreateIndex
CREATE INDEX "_UserProperties_B_index" ON "_UserProperties"("B");

-- AddForeignKey
ALTER TABLE "_UserEntities" ADD CONSTRAINT "_UserEntities_A_fkey" FOREIGN KEY ("A") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserEntities" ADD CONSTRAINT "_UserEntities_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserProperties" ADD CONSTRAINT "_UserProperties_A_fkey" FOREIGN KEY ("A") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserProperties" ADD CONSTRAINT "_UserProperties_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
