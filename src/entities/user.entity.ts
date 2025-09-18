import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { Patient } from './patient.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  // Relation: User ↔ Patient (One-to-One)
  @OneToOne(() => Patient, (patient) => patient.user)
  patient: Patient;
}
