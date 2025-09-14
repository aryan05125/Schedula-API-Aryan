import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Patient } from './patient.entity';

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

  // Relation: Doctor ↔ Patients (One-to-Many)
  @OneToMany(() => Patient, (patient) => patient.doctor)
  patients: Patient[];
}
