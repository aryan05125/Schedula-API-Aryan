import { DataSource } from 'typeorm';
import { User } from './src/entities/user.entity';
import { Doctor } from './src/entities/doctor.entity';
import { Patient } from './src/entities/patient.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',      
  password: 'aryan512', 
  database: 'internship_db',
  entities: [User, Doctor, Patient],
  migrations: ['./src/migrations/*.ts'],
});
