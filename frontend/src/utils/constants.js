// UI enums. Domain data (exercises, athletes, routines, sessions) lives in
// Supabase and is loaded via the API — see frontend/src/services/*.

export const INTENSITY_LABELS = { 1: '😴 Suave', 2: '💪 Normal', 3: '🔥 Intenso', 4: '⚡ Extremo' };
export const TYPE_ICONS = { fuerza: '🏋️ Fuerza', cardio: '🏃 Cardio', movilidad: '🧘 Movilidad' };
export const DAYS = [
    { key: 'Lun', label: 'L' }, { key: 'Mar', label: 'M' }, { key: 'Mié', label: 'X' },
    { key: 'Jue', label: 'J' }, { key: 'Vie', label: 'V' }, { key: 'Sáb', label: 'S' },
    { key: 'Dom', label: 'D' },
];

// Muscle groups for primary_muscles / secondary_muscles. Slugs are stored
// in the DB; labels are what trainers see in the UI.
export const MUSCLE_OPTIONS = [
    { value: 'pecho',    label: 'Pecho' },
    { value: 'espalda',  label: 'Espalda' },
    { value: 'piernas',  label: 'Piernas' },
    { value: 'hombros',  label: 'Hombros' },
    { value: 'brazos',   label: 'Brazos' },
    { value: 'core',     label: 'Core' },
];

// Controlled equipment list. Extend here (no migration needed — the DB column
// is a free VARCHAR; the list is enforced only by the editor UI).
export const EQUIPMENT_OPTIONS = [
    { value: 'barra',           label: 'Barra' },
    { value: 'mancuernas',      label: 'Mancuernas' },
    { value: 'polea',           label: 'Polea' },
    { value: 'maquina',         label: 'Máquina' },
    { value: 'peso-corporal',   label: 'Peso corporal' },
    { value: 'banda-elastica',  label: 'Banda elástica' },
    { value: 'kettlebell',      label: 'Kettlebell' },
    { value: 'otros',           label: 'Otros' },
];

export const MUSCLE_LABELS = Object.fromEntries(MUSCLE_OPTIONS.map(o => [o.value, o.label]));
export const EQUIPMENT_LABELS = Object.fromEntries(EQUIPMENT_OPTIONS.map(o => [o.value, o.label]));
