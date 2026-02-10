-- AlterTable
ALTER TABLE "PhoneAssignment" ADD COLUMN     "issuedById" TEXT;

-- AddForeignKey
ALTER TABLE "PhoneAssignment" ADD CONSTRAINT "PhoneAssignment_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
