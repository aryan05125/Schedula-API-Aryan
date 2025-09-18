import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';

// 🔗 Database Connection Config
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'aryan512',
  database: 'internship_db',
  entities: [User, Doctor, Patient],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
