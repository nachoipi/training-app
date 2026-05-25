// Constants
export const DEFAULT_EXERCISES = [
    { id: 'e1',  name: 'Press de Banca',          muscle: 'pecho',   type: 'fuerza',    desc: 'Ejercicio compuesto para el pecho con barra o mancuernas.' },
    { id: 'e2',  name: 'Press Inclinado',          muscle: 'pecho',   type: 'fuerza',    desc: 'Variante que enfatiza la parte superior del pecho.' },
    { id: 'e3',  name: 'Aperturas con Mancuerna',  muscle: 'pecho',   type: 'fuerza',    desc: 'Aislamiento del pectoral con rango completo de movimiento.' },
    { id: 'e4',  name: 'Dominadas',                muscle: 'espalda', type: 'fuerza',    desc: 'Ejercicio de tracción con peso corporal.' },
    { id: 'e5',  name: 'Remo con Barra',           muscle: 'espalda', type: 'fuerza',    desc: 'Movimiento de jalón horizontal para espalda media.' },
    { id: 'e6',  name: 'Jalón al Pecho',           muscle: 'espalda', type: 'fuerza',    desc: 'Ejercicio de polea para el dorsal ancho.' },
    { id: 'e7',  name: 'Sentadilla',               muscle: 'piernas', type: 'fuerza',    desc: 'El rey de los ejercicios de piernas.' },
    { id: 'e8',  name: 'Prensa de Piernas',        muscle: 'piernas', type: 'fuerza',    desc: 'Alternativa a la sentadilla con mayor control.' },
    { id: 'e9',  name: 'Peso Muerto Rumano',       muscle: 'piernas', type: 'fuerza',    desc: 'Isquiotibiales y glúteos.' },
    { id: 'e10', name: 'Press Militar',            muscle: 'hombros', type: 'fuerza',    desc: 'Press vertical para el deltoides frontal.' },
    { id: 'e11', name: 'Elevaciones Laterales',    muscle: 'hombros', type: 'fuerza',    desc: 'Aislamiento del deltoides medial.' },
    { id: 'e12', name: 'Curl de Bíceps',           muscle: 'brazos',  type: 'fuerza',    desc: 'Ejercicio básico de aislamiento para el bíceps.' },
    { id: 'e13', name: 'Extensión de Tríceps',     muscle: 'brazos',  type: 'fuerza',    desc: 'Aislamiento del tríceps.' },
    { id: 'e14', name: 'Plancha',                  muscle: 'core',    type: 'fuerza',    desc: 'Ejercicio isométrico para el core completo.' },
    { id: 'e15', name: 'Abdominales',              muscle: 'core',    type: 'fuerza',    desc: 'Curl abdominal clásico.' },
    { id: 'e16', name: 'Correr',                   muscle: 'piernas', type: 'cardio',    desc: 'Cardio de bajo a alto impacto.' },
    { id: 'e17', name: 'Bicicleta',                muscle: 'piernas', type: 'cardio',    desc: 'Cardio de bajo impacto.' },
    { id: 'e18', name: 'Estiramiento de Cadera',   muscle: 'piernas', type: 'movilidad', desc: 'Mejora la movilidad de cadera.' },
];

export const MOCK_ATHLETES = [
    {
        id: 'nacho1', name: 'Nacho', email: 'nacho@fitcore.com', sessions: 24, routines: 3, lastSession: '2026-05-14', avatar: 'N',
        sessionHistory: [
            { date: '2026-05-14', duration: 55, routineName: 'Full Body A' },
            { date: '2026-05-11', duration: 60, routineName: 'Empuje' },
            { date: '2026-05-08', duration: 45, routineName: 'Full Body A' },
            { date: '2026-05-05', duration: 50, routineName: 'Tirón' },
        ],
    },
    {
        id: 'carlos1', name: 'Carlos M.', email: 'carlos@example.com', sessions: 18, routines: 2, lastSession: '2026-05-15', avatar: 'C',
        sessionHistory: [
            { date: '2026-05-15', duration: 40, routineName: 'Piernas' },
            { date: '2026-05-12', duration: 50, routineName: 'Empuje' },
            { date: '2026-05-09', duration: 45, routineName: 'Piernas' },
        ],
    },
    {
        id: 'laura1', name: 'Laura P.', email: 'laura@example.com', sessions: 31, routines: 4, lastSession: '2026-05-12', avatar: 'L',
        sessionHistory: [
            { date: '2026-05-12', duration: 65, routineName: 'Full Body B' },
            { date: '2026-05-10', duration: 55, routineName: 'Cardio + Core' },
            { date: '2026-05-07', duration: 70, routineName: 'Full Body B' },
            { date: '2026-05-04', duration: 60, routineName: 'Cardio + Core' },
            { date: '2026-05-01', duration: 50, routineName: 'Full Body B' },
        ],
    },
    {
        id: 'diego1', name: 'Diego R.', email: 'diego@example.com', sessions: 8, routines: 1, lastSession: '2026-05-10', avatar: 'D',
        sessionHistory: [
            { date: '2026-05-10', duration: 35, routineName: 'Iniciación' },
            { date: '2026-05-06', duration: 30, routineName: 'Iniciación' },
            { date: '2026-04-30', duration: 35, routineName: 'Iniciación' },
        ],
    },
    {
        id: 'ana1', name: 'Ana S.', email: 'ana@example.com', sessions: 45, routines: 5, lastSession: '2026-05-16', avatar: 'A',
        sessionHistory: [
            { date: '2026-05-16', duration: 75, routineName: 'Hipertrofia A' },
            { date: '2026-05-14', duration: 70, routineName: 'Hipertrofia B' },
            { date: '2026-05-12', duration: 65, routineName: 'Hipertrofia A' },
            { date: '2026-05-10', duration: 80, routineName: 'Hipertrofia B' },
            { date: '2026-05-08', duration: 72, routineName: 'Hipertrofia A' },
        ],
    },
];

export const INTENSITY_LABELS = { 1: '😴 Suave', 2: '💪 Normal', 3: '🔥 Intenso', 4: '⚡ Extremo' };
export const TYPE_ICONS = { fuerza: '🏋️ Fuerza', cardio: '🏃 Cardio', movilidad: '🧘 Movilidad' };
export const DAYS = [
    { key: 'Lun', label: 'L' }, { key: 'Mar', label: 'M' }, { key: 'Mié', label: 'X' },
    { key: 'Jue', label: 'J' }, { key: 'Vie', label: 'V' }, { key: 'Sáb', label: 'S' },
    { key: 'Dom', label: 'D' },
];
