-- FitCore — seed data
-- Apply with: mysql -u root -p fitcore < database/seed.sql
-- NOTE: password_hash values are PLAINTEXT placeholders ('123456').
--       Replace with bcrypt hashes before any non-local use.

USE fitcore;

INSERT INTO users (id, email, password_hash, role, name, avatar) VALUES
    ('trainer1', 'trainer@fitcore.com', '123456', 'trainer', 'Coach Pro', 'C'),
    ('nacho1',   'nacho@fitcore.com',   '123456', 'athlete', 'Nacho',     'N'),
    ('carlos1',  'carlos@example.com',  '123456', 'athlete', 'Carlos M.', 'C');

INSERT INTO exercises (id, name, muscle, type, description) VALUES
    ('e1',  'Press de Banca',         'pecho',   'fuerza',    'Ejercicio compuesto para el pecho con barra o mancuernas.'),
    ('e2',  'Press Inclinado',        'pecho',   'fuerza',    'Variante que enfatiza la parte superior del pecho.'),
    ('e3',  'Dominadas',              'espalda', 'fuerza',    'Ejercicio de tracción con peso corporal.'),
    ('e4',  'Remo con Barra',         'espalda', 'fuerza',    'Movimiento de jalón horizontal para espalda media.'),
    ('e5',  'Sentadilla',             'piernas', 'fuerza',    'El rey de los ejercicios de piernas.'),
    ('e6',  'Peso Muerto Rumano',     'piernas', 'fuerza',    'Isquiotibiales y glúteos.'),
    ('e7',  'Press Militar',          'hombros', 'fuerza',    'Press vertical para el deltoides frontal.'),
    ('e8',  'Elevaciones Laterales',  'hombros', 'fuerza',    'Aislamiento del deltoides medial.'),
    ('e9',  'Curl de Bíceps',         'brazos',  'fuerza',    'Ejercicio básico de aislamiento para el bíceps.'),
    ('e10', 'Extensión de Tríceps',   'brazos',  'fuerza',    'Aislamiento del tríceps con polea o mancuerna.'),
    ('e11', 'Plancha',                'core',    'fuerza',    'Ejercicio isométrico para el core completo.'),
    ('e12', 'Abdominales',            'core',    'fuerza',    'Curl abdominal clásico.'),
    ('e13', 'Correr',                 'piernas', 'cardio',    'Cardio de bajo a alto impacto.'),
    ('e14', 'Bicicleta',              'piernas', 'cardio',    'Cardio de bajo impacto.'),
    ('e15', 'Estiramiento de Cadera', 'piernas', 'movilidad', 'Mejora la movilidad de cadera.');
