import { create } from 'zustand'

type BookmarkDrawerStore = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useBookmarkDrawerStore = create<BookmarkDrawerStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
