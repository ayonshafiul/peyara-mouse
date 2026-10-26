import {create} from 'zustand';

interface DeckSelectionState {
  /** Non-persisted map of selected action ids. */
  selected: Record<string, true>;
  toggle: (id: string) => void;
  setMany: (ids: string[], select: boolean) => void;
  replaceAll: (ids: string[]) => void;
  clear: () => void;
}

export const useDeckSelectionStore = create<DeckSelectionState>()(set => ({
  selected: {},

  toggle: id =>
    set(s => {
      if (s.selected[id]) {
        const next = {...s.selected};
        delete next[id];
        return {selected: next};
      }
      return {selected: {...s.selected, [id]: true}};
    }),

  setMany: (ids, select) =>
    set(s => {
      if (ids.length === 0) {
        return s;
      }
      if (select) {
        let changed = false;
        const next = {...s.selected};
        for (const id of ids) {
          if (!next[id]) {
            next[id] = true;
            changed = true;
          }
        }
        return changed ? {selected: next} : s;
      }
      let changed = false;
      const next = {...s.selected};
      for (const id of ids) {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? {selected: next} : s;
    }),

  replaceAll: ids =>
    set(() => {
      const next: Record<string, true> = {};
      for (const id of ids) {
        next[id] = true;
      }
      return {selected: next};
    }),

  clear: () => set(() => ({selected: {}})),
}));
