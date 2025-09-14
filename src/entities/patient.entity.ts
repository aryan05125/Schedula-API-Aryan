import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Doctor } from './doctor.entity';
import { User } from './user.entity';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ unique: true })
  phone: string;

  // ✅ Explicit type set → varchar, nullable true
  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relation: Many patients → One doctor
  @ManyToOne(() => Doctor, (doctor) => doctor.patients, { nullable: true })
  doctor: Doctor;

  // Relation: One patient ↔ One user
  @OneToOne(() => User, (user) => user.patient)
  user: User;

  async setPassword(password: string) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(password, salt);
  }

  async validatePassword(password: string): Promise<boolean> {
    if (!this.password) {
      return false;
    }
    return await bcrypt.compare(password, this.password);
  }
}
