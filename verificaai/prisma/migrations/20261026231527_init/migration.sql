-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('SIMILARITY', 'AI_DETECTION');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('COMPLETED', 'FAILED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "MatchKind" AS ENUM ('EXACT', 'APPROXIMATE');

-- CreateEnum
CREATE TYPE "MatchCategory" AS ENUM ('QUOTE', 'REFERENCE', 'UNCLASSIFIED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('USER_DOCUMENT', 'COLLECTION', 'EXTERNAL');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyAnalyses" INTEGER NOT NULL,
    "maxFileSizeMb" INTEGER NOT NULL,
    "maxDocuments" INTEGER NOT NULL,
    "allowExternal" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "planId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageKey" TEXT,
    "text" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'READY',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "retentionUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "type" "AnalysisType" NOT NULL,
    "status" "AnalysisStatus" NOT NULL,
    "method" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "provider" TEXT,
    "score" DOUBLE PRECISION,
    "scoreExcludingCitations" DOUBLE PRECISION,
    "summary" TEXT,
    "details" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimilarityMatch" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceDocumentId" TEXT,
    "sourceCollectionDocId" TEXT,
    "sourceTitle" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    "matchedText" TEXT NOT NULL,
    "sourceExcerpt" TEXT NOT NULL,
    "kind" "MatchKind" NOT NULL,
    "category" "MatchCategory" NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "wordCount" INTEGER NOT NULL,

    CONSTRAINT "SimilarityMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceCollection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "url" TEXT,
    "text" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SystemError" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Document_ownerId_createdAt_idx" ON "Document"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Analysis_userId_createdAt_idx" ON "Analysis"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Analysis_documentId_idx" ON "Analysis"("documentId");

-- CreateIndex
CREATE INDEX "SimilarityMatch_analysisId_idx" ON "SimilarityMatch"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "SourceCollection_name_key" ON "SourceCollection"("name");

-- CreateIndex
CREATE INDEX "SourceDocument_collectionId_idx" ON "SourceDocument"("collectionId");

-- CreateIndex
CREATE INDEX "UsageRecord_userId_kind_createdAt_idx" ON "UsageRecord"("userId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "UsageRecord_kind_createdAt_idx" ON "UsageRecord"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "SystemError_createdAt_idx" ON "SystemError"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_idx" ON "ConsentRecord"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarityMatch" ADD CONSTRAINT "SimilarityMatch_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarityMatch" ADD CONSTRAINT "SimilarityMatch_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarityMatch" ADD CONSTRAINT "SimilarityMatch_sourceCollectionDocId_fkey" FOREIGN KEY ("sourceCollectionDocId") REFERENCES "SourceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "SourceCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
