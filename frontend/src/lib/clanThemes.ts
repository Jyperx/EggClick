export interface ClanTheme {
    text: string;
    border: string;
    boxGlow: string;
    dropGlow: string;
    textGlow: string;
}

export const CLAN_THEMES: Record<number, ClanTheme> = {
    1: { text: "text-amber-400", border: "border-2 border-amber-500/50", boxGlow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]", dropGlow: "drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]", textGlow: "drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" },
    2: { text: "text-red-400", border: "border-2 border-red-500/50", boxGlow: "shadow-[0_0_15px_rgba(239,68,68,0.3)]", dropGlow: "drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]", textGlow: "drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" },
    3: { text: "text-blue-400", border: "border-2 border-blue-500/50", boxGlow: "shadow-[0_0_15px_rgba(59,130,246,0.3)]", dropGlow: "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]", textGlow: "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" },
    4: { text: "text-emerald-400", border: "border-2 border-emerald-500/50", boxGlow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]", dropGlow: "drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]", textGlow: "drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" },
    5: { text: "text-pink-400", border: "border-2 border-pink-500/50", boxGlow: "shadow-[0_0_15px_rgba(236,72,153,0.3)]", dropGlow: "drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]", textGlow: "drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" },
    6: { text: "text-cyan-400", border: "border-2 border-cyan-500/50", boxGlow: "shadow-[0_0_15px_rgba(6,182,212,0.3)]", dropGlow: "drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]", textGlow: "drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" },
    7: { text: "text-orange-400", border: "border-2 border-orange-500/50", boxGlow: "shadow-[0_0_15px_rgba(249,115,22,0.3)]", dropGlow: "drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]", textGlow: "drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" },
    8: { text: "text-rose-400", border: "border-2 border-rose-500/50", boxGlow: "shadow-[0_0_15px_rgba(244,63,94,0.3)]", dropGlow: "drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]", textGlow: "drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" },
    9: { text: "text-lime-400", border: "border-2 border-lime-500/50", boxGlow: "shadow-[0_0_15px_rgba(132,204,22,0.3)]", dropGlow: "drop-shadow-[0_0_8px_rgba(132,204,22,0.6)]", textGlow: "drop-shadow-[0_0_8px_rgba(132,204,22,0.6)]" },
    10: { text: "text-violet-400", border: "border-2 border-violet-500/50", boxGlow: "shadow-[0_0_15px_rgba(139,92,246,0.3)]", dropGlow: "drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]", textGlow: "drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]" },
};

export function getClanTheme(shieldId: number | null | undefined): ClanTheme {
    return CLAN_THEMES[shieldId || 1] || CLAN_THEMES[1];
}
