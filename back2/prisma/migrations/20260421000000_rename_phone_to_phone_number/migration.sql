-- Rename phone columns to align with Better Auth phoneNumber plugin field names.
-- Data is preserved; only column names change.

ALTER TABLE "users" RENAME COLUMN "phone" TO "phoneNumber";
ALTER TABLE "users" RENAME COLUMN "phoneVerified" TO "phoneNumberVerified";

-- The unique index on phone follows the column rename automatically in PostgreSQL.
-- The manual index needs recreation under the new name.
DROP INDEX IF EXISTS "users_phone_idx";
CREATE INDEX "users_phoneNumber_idx" ON "users"("phoneNumber");
