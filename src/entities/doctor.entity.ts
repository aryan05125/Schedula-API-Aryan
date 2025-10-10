import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Patient } from './patient.entity';
import { Appointment } from '../appointment/entities/appointment.entity';
import { Slot } from '../slot/entities/slot.entity';
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
  consultingStart: string;
  @Column({ type: 'varchar', nullable: true })
  consultingEnd: string;
  @Column({ type: 'int', nullable: true })
  slotDuration: number;
  @Column({ type: 'int', nullable: true })
  capacityPerSlot: number;
  @Column({ type: 'int', nullable: true })
  totalCapacity: number;
  @Column('simple-array', { nullable: true })
  recurringDays: string[];
  // ✅ Future-day booking
  @Column({ default: false })
  allowFutureAppointments: boolean;
  // ✅ Booking window for same-day booking
  @Column({ type: 'varchar', nullable: true })
  bookingWindowStart?: string;
  @Column({ type: 'varchar', nullable: true })
  bookingWindowEnd?: string;

  // ✅ NEW: Allow next-day auto-booking if slot or consulting time is over
  @Column({ default: false  })
  allowNextDayAppointments: boolean;

  @OneToMany(() => Patient, (patient) => patient.doctor)
  patients: Patient[];
  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments: Appointment[];
  @OneToMany(() => Slot, (slot) => slot.doctor)
  slots: Slot[];
}