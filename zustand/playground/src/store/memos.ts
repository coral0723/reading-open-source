import { create } from "zustand";

type StoreState = {
  memo: string;
  setMemo: (text: string) => void;
  memos: string[],
  setMemos: (newMemo: string) => void;
}

export const useMemosStore = create<StoreState>((set) => ({
  memo: '',
  setMemo: (text) => set({ memo: text }),
  memos: [],
  setMemos: (newMemo) => 
    set((prev) => ({
      memos: [...prev.memos, newMemo],
    })),
}));
