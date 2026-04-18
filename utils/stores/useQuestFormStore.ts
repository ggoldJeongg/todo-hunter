import { create } from "zustand";

type Difficulty = "easy" | "normal" | "hard";

interface QuestFormState {
  questName: string;
  tagged: "STR" | "INT" | "EMO" | "FIN" | "LIV";
  selectedDate: string;
  isWeekly: boolean;
  selectedDays: string[];
  difficulty: Difficulty;
  setQuestName: (name: string) => void;
  setTagged: (tag: "STR" | "INT" | "EMO" | "FIN" | "LIV") => void;
  setSelectedDate: (date: string) => void;
  setIsWeekly: (isWeekly: boolean) => void;
  setSelectedDays: (days: string[]) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  resetForm: () => void;
}

export const useQuestFormStore = create<QuestFormState>((set) => ({
  questName: "",
  tagged: "STR",
  selectedDate: "",
  isWeekly: false,
  selectedDays: [],
  difficulty: "normal",

  setQuestName: (name) => set({ questName: name }),
  setTagged: (tag) => set({ tagged: tag }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setIsWeekly: (isWeekly) => set({ isWeekly }),
  setSelectedDays: (days) => set({ selectedDays: days }),
  setDifficulty: (difficulty) => set({ difficulty }),

  resetForm: () => set({
    questName: "", tagged: "STR", selectedDate: "",
    isWeekly: false, selectedDays: [], difficulty: "normal",
  }),
}));
