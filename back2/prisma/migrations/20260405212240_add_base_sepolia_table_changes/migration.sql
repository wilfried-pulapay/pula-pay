-- AlterTable: runs in a separate migration so the new enum values added in
-- the previous migration are fully committed before being referenced here.

ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "challengeId" TEXT;

ALTER TABLE "wallets" ALTER COLUMN "walletSetId" DROP NOT NULL;
ALTER TABLE "wallets" ALTER COLUMN "blockchain" SET DEFAULT 'BASE_SEPOLIA';
