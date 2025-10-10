import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../entities/patient.entity';
import { Doctor } from '../../entities/doctor.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Patient, (patient) => patient.appointments, { eager: true })
  patient: Patient;

  @ManyToOne(() => Doctor, (doctor) => doctor.appointments, { eager: true })
  doctor: Doctor;

  @Column()
  date: string;

  // ✅ Fix: make reportingTime nullable for backward compatibility
  @Column({ type: 'varchar', nullable: true })
  reportingTime?: string; // HH:mm

  @Column({ default: 'confirmed' })
  status: string;

  @Column({ nullable: true })
  cancellationReason?: string;

  @CreateDateColumn()
  createdAt: Date;
}
