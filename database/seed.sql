-- FitCore — seed data (PostgreSQL)
-- Apply with: psql "$DATABASE_URL" -f database/seed.sql
-- NOTE: password_hash is a bcrypt hash of the placeholder password '123456'.
--       Regenerate per-user before any real deployment.

INSERT INTO users (id, email, password_hash, role, name, avatar) VALUES
    ('trainer1',      'trainer@fitcore.com',      '$2a$10$QvQSeNXOD0th7J6D8dHOIOXN.uK.Yh3XVTvrDPKW/Trgj9eVU7NfO', 'trainer', 'Coach Pro',    'C'),
    ('nacho1',        'nacho@fitcore.com',        '$2a$10$QvQSeNXOD0th7J6D8dHOIOXN.uK.Yh3XVTvrDPKW/Trgj9eVU7NfO', 'athlete', 'Nacho',        'N'),
    ('test_trainer1', 'test_trainer@fitcore.com', '$2a$10$QvQSeNXOD0th7J6D8dHOIOXN.uK.Yh3XVTvrDPKW/Trgj9eVU7NfO', 'trainer', 'Test Trainer', 'T'),
    ('test_athlete1', 'test_athlete@fitcore.com', '$2a$10$QvQSeNXOD0th7J6D8dHOIOXN.uK.Yh3XVTvrDPKW/Trgj9eVU7NfO', 'athlete', 'Test Athlete', 'T')
ON CONFLICT (id) DO NOTHING;

INSERT INTO exercises (id, name, muscle, type, description, built_in) VALUES
    ('e1',  'Press de Banca',           'pecho',   'fuerza',    'Ejercicio compuesto para el pecho con barra o mancuernas.', true),
    ('e2',  'Press Inclinado',          'pecho',   'fuerza',    'Variante que enfatiza la parte superior del pecho.',        true),
    ('e3',  'Dominadas',                'espalda', 'fuerza',    'Ejercicio de tracción con peso corporal.',                  true),
    ('e4',  'Remo con Barra',           'espalda', 'fuerza',    'Movimiento de jalón horizontal para espalda media.',        true),
    ('e5',  'Sentadilla',               'piernas', 'fuerza',    'El rey de los ejercicios de piernas.',                      true),
    ('e6',  'Peso Muerto Rumano',       'piernas', 'fuerza',    'Isquiotibiales y glúteos.',                                 true),
    ('e7',  'Press Militar',            'hombros', 'fuerza',    'Press vertical para el deltoides frontal.',                 true),
    ('e8',  'Elevaciones Laterales',    'hombros', 'fuerza',    'Aislamiento del deltoides medial.',                         true),
    ('e9',  'Curl de Bíceps',           'brazos',  'fuerza',    'Ejercicio básico de aislamiento para el bíceps.',           true),
    ('e10', 'Extensión de Tríceps',     'brazos',  'fuerza',    'Aislamiento del tríceps con polea o mancuerna.',            true),
    ('e11', 'Plancha',                  'core',    'fuerza',    'Ejercicio isométrico para el core completo.',               true),
    ('e12', 'Abdominales',              'core',    'fuerza',    'Curl abdominal clásico.',                                   true),
    ('e13', 'Correr',                   'piernas', 'cardio',    'Cardio de bajo a alto impacto.',                            true),
    ('e14', 'Bicicleta',                'piernas', 'cardio',    'Cardio de bajo impacto.',                                   true),
    ('e15', 'Estiramiento de Cadera',   'piernas', 'movilidad', 'Mejora la movilidad de cadera.',                            true),
    ('e16', 'Aperturas con Mancuerna',  'pecho',   'fuerza',    'Aislamiento del pectoral con rango completo de movimiento.', true),
    ('e17', 'Jalón al Pecho',           'espalda', 'fuerza',    'Ejercicio de polea para el dorsal ancho.',                  true),
    ('e18', 'Prensa de Piernas',        'piernas', 'fuerza',    'Alternativa a la sentadilla con mayor control.',            true)
ON CONFLICT (id) DO NOTHING;
