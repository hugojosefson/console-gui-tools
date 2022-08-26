export const MODES = ["random", "linear"] as const;
export type Mode = typeof MODES[number];
