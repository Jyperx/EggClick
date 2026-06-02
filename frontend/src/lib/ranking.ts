export interface RankInfo {
    id: number; // 1 to 16
    name: string;
    nextThreshold: number | null;
    scaleClass: string;
}

const RANK_THRESHOLDS = [
    { id: 16, threshold: 1000000000, name: 'Egger IV', scaleClass: 'scale-125' },
    { id: 15, threshold: 750000000, name: 'Egger III', scaleClass: 'scale-100' },
    { id: 14, threshold: 500000000, name: 'Egger II', scaleClass: 'scale-90' },
    { id: 13, threshold: 250000000, name: 'Egger I', scaleClass: 'scale-75' },
    { id: 12, threshold: 100000000, name: 'Oro IV', scaleClass: 'scale-125' },
    { id: 11, threshold: 50000000, name: 'Oro III', scaleClass: 'scale-100' },
    { id: 10, threshold: 25000000, name: 'Oro II', scaleClass: 'scale-90' },
    { id: 9, threshold: 10000000, name: 'Oro I', scaleClass: 'scale-75' },
    { id: 8, threshold: 5000000, name: 'Plata IV', scaleClass: 'scale-125' },
    { id: 7, threshold: 2500000, name: 'Plata III', scaleClass: 'scale-100' },
    { id: 6, threshold: 1000000, name: 'Plata II', scaleClass: 'scale-90' },
    { id: 5, threshold: 500000, name: 'Plata I', scaleClass: 'scale-75' },
    { id: 4, threshold: 150000, name: 'Bronce IV', scaleClass: 'scale-125' },
    { id: 3, threshold: 50000, name: 'Bronce III', scaleClass: 'scale-100' },
    { id: 2, threshold: 10000, name: 'Bronce II', scaleClass: 'scale-90' },
    { id: 1, threshold: 0, name: 'Bronce I', scaleClass: 'scale-75' }
];

export function getRankInfo(clicks: number): RankInfo {
    for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
        if (clicks >= RANK_THRESHOLDS[i].threshold) {
            const nextTier = i > 0 ? RANK_THRESHOLDS[i - 1].threshold : null;
            return {
                id: RANK_THRESHOLDS[i].id,
                name: RANK_THRESHOLDS[i].name,
                nextThreshold: nextTier,
                scaleClass: RANK_THRESHOLDS[i].scaleClass
            };
        }
    }
    // Fallback
    return {
        id: 1,
        name: 'Bronce I',
        nextThreshold: RANK_THRESHOLDS[RANK_THRESHOLDS.length - 2].threshold,
        scaleClass: 'scale-75'
    };
}
