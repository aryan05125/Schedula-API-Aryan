import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
  } from 'typeorm';
  import { Patient } from './patient.entity';
  
  @Entity('otps')
  export class Otp {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    otp: string;
  
    @Column()
    email: string;
  
    @Column()
    phone: string;
  
    @Column()
    expiresAt: Date;
  
    @Column({ default: false })
    isVerified: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  
    // Relation: Many OTPs → One patient
    @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
    patient: Patient;
  }
  