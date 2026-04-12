-- AlterEnum
-- ADD VALUE must run outside a transaction in PostgreSQL before the new
-- values can be referenced in subsequent statements.

ALTER TYPE "Blockchain" ADD VALUE IF NOT EXISTS 'BASE_SEPOLIA';
ALTER TYPE "Blockchain" ADD VALUE IF NOT EXISTS 'BASE';

