import app from './app.js';
import { PORT } from './config/env.js';

app.listen(PORT, () => {
    console.log(`\n⚡ FitCore API → http://localhost:${PORT}`);
    console.log(`   Trainer: trainer@fitcore.com / 123456`);
    console.log(`   Atleta:  nacho@fitcore.com   / 123456\n`);
});
