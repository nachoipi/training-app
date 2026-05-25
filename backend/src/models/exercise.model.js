import { uid } from '../services/auth.service.js';

let exercises = [
    { id: 'e1',  name: 'Press de Banca',          muscle: 'pecho',   type: 'fuerza',    desc: 'Ejercicio compuesto para el pecho con barra o mancuernas.' },
    { id: 'e2',  name: 'Press Inclinado',          muscle: 'pecho',   type: 'fuerza',    desc: 'Variante que enfatiza la parte superior del pecho.' },
    { id: 'e3',  name: 'Dominadas',                muscle: 'espalda', type: 'fuerza',    desc: 'Ejercicio de tracción con peso corporal.' },
    { id: 'e4',  name: 'Remo con Barra',           muscle: 'espalda', type: 'fuerza',    desc: 'Movimiento de jalón horizontal para espalda media.' },
    { id: 'e5',  name: 'Sentadilla',               muscle: 'piernas', type: 'fuerza',    desc: 'El rey de los ejercicios de piernas.' },
    { id: 'e6',  name: 'Peso Muerto Rumano',       muscle: 'piernas', type: 'fuerza',    desc: 'Isquiotibiales y glúteos.' },
    { id: 'e7',  name: 'Press Militar',            muscle: 'hombros', type: 'fuerza',    desc: 'Press vertical para el deltoides frontal.' },
    { id: 'e8',  name: 'Elevaciones Laterales',    muscle: 'hombros', type: 'fuerza',    desc: 'Aislamiento del deltoides medial.' },
    { id: 'e9',  name: 'Curl de Bíceps',           muscle: 'brazos',  type: 'fuerza',    desc: 'Ejercicio básico de aislamiento para el bíceps.' },
    { id: 'e10', name: 'Extensión de Tríceps',     muscle: 'brazos',  type: 'fuerza',    desc: 'Aislamiento del tríceps con polea o mancuerna.' },
    { id: 'e11', name: 'Plancha',                  muscle: 'core',    type: 'fuerza',    desc: 'Ejercicio isométrico para el core completo.' },
    { id: 'e12', name: 'Abdominales',              muscle: 'core',    type: 'fuerza',    desc: 'Curl abdominal clásico.' },
    { id: 'e13', name: 'Correr',                   muscle: 'piernas', type: 'cardio',    desc: 'Cardio de bajo a alto impacto.' },
    { id: 'e14', name: 'Bicicleta',                muscle: 'piernas', type: 'cardio',    desc: 'Cardio de bajo impacto.' },
    { id: 'e15', name: 'Estiramiento de Cadera',   muscle: 'piernas', type: 'movilidad', desc: 'Mejora la movilidad de cadera.' },
];

export const ExerciseModel = {
    findAll: async ({ muscle, type, q } = {}) => {
        let result = [...exercises];
        if (muscle) result = result.filter(e => e.muscle === muscle);
        if (type)   result = result.filter(e => e.type === type);
        if (q)      result = result.filter(e => e.name.toLowerCase().includes(String(q).toLowerCase()));
        return result;
    },
    create: async ({ name, muscle, type, desc }) => {
        const ex = { id: uid(), name, muscle, type, desc: desc || '', createdAt: new Date().toISOString() };
        exercises.push(ex);
        return ex;
    },
    remove: async (id) => {
        const idx = exercises.findIndex(e => e.id === id);
        if (idx === -1) return false;
        exercises.splice(idx, 1);
        return true;
    },
};
