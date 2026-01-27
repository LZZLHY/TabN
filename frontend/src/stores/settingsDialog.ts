import { create } from 'zustand'

type SettingsDialogState = {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useSettingsDialogStore = create<SettingsDialogState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
