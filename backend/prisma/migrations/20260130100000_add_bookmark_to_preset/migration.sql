-- 删除现有的预设数据（因为它们没有关联书签）
DELETE FROM "IconPreset";

-- 添加 bookmarkId 列
ALTER TABLE "IconPreset" ADD COLUMN "bookmarkId" TEXT NOT NULL;

-- 添加外键约束
ALTER TABLE "IconPreset" ADD CONSTRAINT "IconPreset_bookmarkId_fkey" FOREIGN KEY ("bookmarkId") REFERENCES "Bookmark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 创建索引
CREATE INDEX "IconPreset_bookmarkId_idx" ON "IconPreset"("bookmarkId");
