import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,   // 👈 single connection string
  entities: [User, Doctor, Patient],
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // keep migrations
});
