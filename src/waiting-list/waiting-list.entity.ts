import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Patient } from '../entities/patient.entity';
import { Doctor } from '../entities/doctor.entity';

@Entity('waiting_list')
export class WaitingList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  doctor: Doctor;

  @Column()
  date: string;

  // ✅ Made nullable because slotTime may not always be provided
  @Column({ type: 'varchar', nullable: true })
  slotTime?: string;

  @Column({ default: 'waiting' })
  status: 'waiting' | 'promoted' | 'cancelled';

  @CreateDateColumn()
  createdAt: Date;
}
