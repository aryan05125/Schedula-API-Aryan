import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Patient } from './patient.entity';
import { Appointment } from '../appointment/entities/appointment.entity';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  specialization: string;

  @Column()
  experience: number;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'decimal', nullable: true })
  fee: number;

  // 🔑 Scheduling fields
  @Column({ type: 'enum', enum: ['wave', 'stream'], default: 'wave' })
  scheduleType: 'wave' | 'stream';

  @Column({ type: 'varchar', nullable: true })
  consultingStart: string; // e.g. "09:00"

  @Column({ type: 'varchar', nullable: true })
  consultingEnd: string; // e.g. "12:00"

  @Column({ type: 'int', nullable: true })
  slotDuration: number; // in minutes (for wave scheduling)

  @Column({ type: 'int', nullable: true })
  capacityPerSlot: number; // for wave scheduling

  @Column({ type: 'int', nullable: true })
  totalCapacity: number; // for stream scheduling

  // 🔁 Recurring pattern: which days doctor is available
  @Column('simple-array', { nullable: true })
  recurringDays: string[]; // e.g. ["monday", "wednesday", "friday"]

  @OneToMany(() => Patient, (patient) => patient.doctor)
  patients: Patient[];

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments: Appointment[];
}
