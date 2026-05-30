ALTER TABLE "FeedbackSubmission"
ADD COLUMN "attachmentUrl" TEXT,
ADD COLUMN "attachmentName" TEXT,
ADD COLUMN "attachmentMimeType" TEXT,
ADD COLUMN "attachmentSizeBytes" INTEGER;
