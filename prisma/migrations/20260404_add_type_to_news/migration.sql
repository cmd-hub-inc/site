-- Add type field to News table
ALTER TABLE "News" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'general';

-- Create index on type field
CREATE INDEX "News_type_idx" ON "News"("type");
