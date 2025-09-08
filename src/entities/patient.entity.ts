import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Doctor } from './doctor.entity';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  age: number;

  @ManyToOne(() => User, (user) => user.patients, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Doctor, (doctor) => doctor.patients, { onDelete: 'CASCADE' })
  doctor: Doctor;
}
