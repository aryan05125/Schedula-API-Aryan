import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { Patient } from './patient.entity';
import { Doctor } from './doctor.entity';

export type UserRole = 'doctor' | 'patient' | 'admin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: ['doctor', 'patient', 'admin'],
    default: 'patient',
  })
  role: UserRole;

  @OneToOne(() => Patient, (patient) => patient.user)
  patient: Patient;

  @OneToOne(() => Doctor, (doctor) => doctor.user)
  doctor: Doctor;
}
