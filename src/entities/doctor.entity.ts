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

  @OneToMany(() => Patient, (patient) => patient.doctor)
  patients: Patient[];

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments: Appointment[];
} // <-- Closing bracket added
