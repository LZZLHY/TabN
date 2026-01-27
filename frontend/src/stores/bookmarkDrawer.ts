import { create } from 'zustand'

type BookmarkDrawerStore = {
  open: boolean
  isPreviewMode: boolean // 预览模式：从设置页打开，不影响 history
  setOpen: (open: boolean) => void
  setOpenForPreview: (open: boolean) => void // 预览模式打开/关闭
  toggle: () => void
}

export const useBookmarkDrawerStore = create<BookmarkDrawerStore>((set) => ({
  open: false,
  isPreviewMode: false,
  setOpen: (open) => set({ open, isPreviewMode: false }),
  setOpenForPreview: (open) => set({ open, isPreviewMode: open }),
  toggle: () => set((s) => ({ open: !s.open, isPreviewMode: false })),
}))
