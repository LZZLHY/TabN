-- CreateTable
CREATE TABLE "IconPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconType" "IconType",
    "iconData" TEXT,
    "iconUrl" TEXT,
    "iconBg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IconPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IconPreset_userId_idx" ON "IconPreset"("userId");

-- AddForeignKey
ALTER TABLE "IconPreset" ADD CONSTRAINT "IconPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
