import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  type: string; // e.g. slot_created, appointment_confirmed

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  isRead: boolean;

  // ✅ Email and SMS contact fields
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phoneNumber: string | null;

  // ✅ NEW: Appointment details for richer notifications
  @Column({ type: 'json', nullable: true })
  appointmentDetails?: {
    appointmentId?: string;
    doctorName?: string;
    patientName?: string;
    date?: string;
    reportingTime?: string;
  };

  // ✅ Optional channel tracking (in-app, email, sms)
  @Column({ type: 'varchar', nullable: true })
  channel?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
