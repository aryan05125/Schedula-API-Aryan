import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { Patient } from './patient.entity';
import { User } from './user.entity';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  specialization: string;

  @OneToOne(() => User, (user) => user.doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Patient, (patient) => patient.doctor)
  patients: Patient[];
}
