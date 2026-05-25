const USERS = [
    { id: 'trainer1', email: 'trainer@fitcore.com', password: '123456', role: 'trainer', name: 'Coach Pro', avatar: 'C' },
    { id: 'nacho1',   email: 'nacho@fitcore.com',   password: '123456', role: 'athlete', name: 'Nacho',     avatar: 'N' },
];

const MOCK_ATHLETES = [
    { id: 'nacho1',  name: 'Nacho',     email: 'nacho@fitcore.com',   sessions: 24, routines: 3, lastSession: '2026-05-14', avatar: 'N' },
    { id: 'carlos1', name: 'Carlos M.', email: 'carlos@example.com',  sessions: 18, routines: 2, lastSession: '2026-05-15', avatar: 'C' },
];

export const UserModel = {
    findAll:        async () => USERS.map(({ password, ...u }) => u),
    findByEmail:    async (email) => USERS.find(u => u.email.toLowerCase() === String(email).toLowerCase().trim()) || null,
    findById:       async (id) => USERS.find(u => u.id === id) || null,
    findAthletes:   async () => MOCK_ATHLETES,
};
