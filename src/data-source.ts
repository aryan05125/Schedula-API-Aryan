import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,   // ✅ connection string for migrations
  entities: [User, Doctor, Patient],
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // keep migrations safe
  ssl: {
    rejectUnauthorized: false, // 👈 important for Render
  },
});
