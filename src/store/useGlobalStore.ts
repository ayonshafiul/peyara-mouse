import {create} from 'zustand';

interface GlobalState {
  showBottomBar: boolean;
  setShowBottomBar: (show: boolean) => void;
}

export const useGlobalStore = create<GlobalState>(set => ({
  showBottomBar: true,
  setShowBottomBar: show => set({showBottomBar: show}),
}));
