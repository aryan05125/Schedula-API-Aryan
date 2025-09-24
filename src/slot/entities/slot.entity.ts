import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Doctor } from '../../entities/doctor.entity';

@Entity('slots')
export class Slot {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.slots, { onDelete: 'CASCADE' })
  doctor: Doctor;

  @Column()
  startTime: string; // HH:mm

  @Column()
  endTime: string; // HH:mm

  @Column({ type: 'int', default: 1 })
  capacity: number;

  @Column({ default: 'active' })
  status: string; // active / full / cancelled

  @Column()
  date: string; // YYYY-MM-DD

  @Column({ default: 'wave' })
  type: string; // wave / stream
}
