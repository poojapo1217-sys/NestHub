import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'comfort-stay-pg-dev-jwt-secret-change-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbClient: (process.env.DB_HOST ? 'mysql' : (process.env.DB_CLIENT || 'sqlite')) as 'mysql' | 'sqlite',
  mysql: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pg_hostel_management',
  },
  sqlitePath: path.resolve(process.cwd(), process.env.SQLITE_PATH || './data/pg_hostel_management.db'),
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads'),
};
