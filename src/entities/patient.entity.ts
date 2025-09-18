import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Doctor } from './doctor.entity';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  phone: string;

  @Column()
  age: number;

  // Relation: Patient ↔ User (One-to-One)
  @OneToOne(() => User, (user) => user.patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Relation: Patient ↔ Doctor (Many-to-One)
  @ManyToOne(() => Doctor, (doctor) => doctor.patients, {
    onDelete: 'CASCADE',
  })
  doctor: Doctor;
}
