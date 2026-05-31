// UI enums. Domain data (exercises, athletes, routines, sessions) lives in
// Supabase and is loaded via the API — see frontend/src/services/*.

export const INTENSITY_LABELS = { 1: '😴 Suave', 2: '💪 Normal', 3: '🔥 Intenso', 4: '⚡ Extremo' };
export const TYPE_ICONS = { fuerza: '🏋️ Fuerza', cardio: '🏃 Cardio', movilidad: '🧘 Movilidad' };
export const DAYS = [
    { key: 'Lun', label: 'L' }, { key: 'Mar', label: 'M' }, { key: 'Mié', label: 'X' },
    { key: 'Jue', label: 'J' }, { key: 'Vie', label: 'V' }, { key: 'Sáb', label: 'S' },
    { key: 'Dom', label: 'D' },
];
