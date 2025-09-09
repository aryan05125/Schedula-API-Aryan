import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Doctor } from './doctor.entity';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  age: number;

  @OneToOne(() => User, (user) => user.patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Doctor, (doctor) => doctor.patients, { onDelete: 'CASCADE' })
  doctor: Doctor;
}
