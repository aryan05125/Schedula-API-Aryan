import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Patient } from './patient.entity';

export type UserRole = 'doctor' | 'patient';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: 'google' })
  provider: string; // 'google'

  @Column({ type: 'varchar', nullable: true })
  password: string | null; // not used for google

  @Column({ type: 'varchar' })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relation: One user ↔ One patient
  @OneToOne(() => Patient, (patient) => patient.user, { cascade: true })
  @JoinColumn()
  patient: Patient;
}
