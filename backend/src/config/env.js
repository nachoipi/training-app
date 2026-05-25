import 'dotenv/config';

export const PORT = parseInt(process.env.PORT || '3000', 10);

export const DB_HOST     = process.env.DB_HOST     || 'localhost';
export const DB_PORT     = parseInt(process.env.DB_PORT || '3306', 10);
export const DB_USER     = process.env.DB_USER     || 'root';
export const DB_PASSWORD = process.env.DB_PASSWORD || '';
export const DB_NAME     = process.env.DB_NAME     || 'fitcore';

export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
