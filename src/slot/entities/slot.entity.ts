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

  // ✅ Session override fields
  @Column({ default: false })
  isOverride: boolean;

  @Column({ type: 'varchar', nullable: true })
  expandedStart: string;

  @Column({ type: 'varchar', nullable: true })
  expandedEnd: string;

  @Column({ type: 'varchar', nullable: true })
  shrinkedStart: string;

  @Column({ type: 'varchar', nullable: true })
  shrinkedEnd: string;

  // ✅ Track last override type
  @Column({ type: 'varchar', nullable: true })
  lastOverrideType: string; // 'expand' | 'shrink'

  // ✅ Audit log for traceability
  @Column({ type: 'json', nullable: true })
  auditLogs: { action: string; oldRange: string; newRange: string; performedBy?: string; timestamp: Date }[];
}
