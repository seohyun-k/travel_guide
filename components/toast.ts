"use client";
import { create } from "zustand";

export const useToast = create<{ msg: string | null; show: (m: string) => void }>((set) => {
  let t: ReturnType<typeof setTimeout> | undefined;
  return {
    msg: null,
    show: (m) => {
      clearTimeout(t);
      set({ msg: m });
      t = setTimeout(() => set({ msg: null }), 2200);
    },
  };
});
export const toast = (m: string) => useToast.getState().show(m);
