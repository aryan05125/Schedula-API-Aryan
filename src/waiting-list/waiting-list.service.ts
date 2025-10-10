import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitingList } from './waiting-list.entity';
import { Patient } from '../entities/patient.entity';
import { Doctor } from '../entities/doctor.entity';
import { Appointment } from '../appointment/entities/appointment.entity';

@Injectable()
export class WaitingListService {
  private readonly logger = new Logger(WaitingListService.name);

  constructor(
    @InjectRepository(WaitingList)
    private readonly waitingRepo: Repository<WaitingList>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
  ) {}

  /**
   * ✅ Add patient to waiting list (with duplicate prevention)
   */
  async addToWaitingList(data: {
    patient: Patient;
    doctor: Doctor;
    date: string;
    slotTime?: string;
  }) {
    const { patient, doctor, date, slotTime } = data;

    if (!patient || !doctor || !date) {
      throw new BadRequestException('Missing required waiting list parameters');
    }

    // ✅ Prevent duplicate waiting entries for same patient-doctor-date
    const existing = await this.waitingRepo.findOne({
      where: {
        patient: { id: patient.id },
        doctor: { id: doctor.id },
        date,
        status: 'waiting',
      },
    });

    if (existing) {
      this.logger.log(
        `Duplicate waiting list entry prevented for patient ${patient.id}, doctor ${doctor.id}, date ${date}`,
      );
      return existing;
    }

    // ✅ Use undefined instead of null for slotTime
    const entry = this.waitingRepo.create({
      patient,
      doctor,
      date,
      slotTime: slotTime ?? undefined,
      status: 'waiting',
      createdAt: new Date(),
    });

    const saved = await this.waitingRepo.save(entry);
    this.logger.log(
      `Added patient ${patient.name} to waiting list for Dr.${doctor.name} on ${date} (${slotTime ?? 'N/A'})`,
    );

    return saved;
  }

  /**
   * ✅ Get waiting list for a specific doctor & date
   */
  async getWaitingListForDoctor(doctorId: number, date: string) {
    return this.waitingRepo.find({
      where: { doctor: { id: Number(doctorId) }, date },
      relations: ['patient', 'doctor'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * ✅ Promote waiting list entry manually (doctor/admin trigger)
   */
  async promoteFromWaitingList(id: string) {
    const entry = await this.waitingRepo.findOne({
      where: { id },
      relations: ['patient', 'doctor'],
    });

    if (!entry) throw new NotFoundException('Waiting list entry not found');

    entry.status = 'promoted';
    await this.waitingRepo.save(entry);

    // ✅ Auto-create confirmed appointment when promoted
    const appointment = this.appointmentRepo.create({
      patient: entry.patient,
      doctor: entry.doctor,
      date: entry.date,
      reportingTime: entry.slotTime ?? '09:00',
      status: 'confirmed',
    });
    await this.appointmentRepo.save(appointment);

    this.logger.log(
      `Promoted waiting entry ${entry.id} → Appointment created for patient ${entry.patient.name}`,
    );

    return { entry, appointment };
  }

  /**
   * ✅ Cancel waiting list entry
   */
  async cancelWaiting(id: string) {
    const entry = await this.waitingRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Waiting list entry not found');

    entry.status = 'cancelled';
    await this.waitingRepo.save(entry);

    this.logger.log(`Waiting list entry ${id} cancelled`);
    return entry;
  }

  /**
   * ✅ Auto-promote top 'count' waiting patients when new slot opens
   */
  async autoPromoteFromWaitingList(
    doctorId: number,
    date: string,
    count: number,
  ) {
    const waitingEntries = await this.waitingRepo.find({
      where: { doctor: { id: doctorId }, date, status: 'waiting' },
      order: { createdAt: 'ASC' },
      take: count,
      relations: ['patient', 'doctor'],
    });

    if (!waitingEntries.length) return 0;

    for (const entry of waitingEntries) {
      const appointment = this.appointmentRepo.create({
        patient: entry.patient,
        doctor: entry.doctor,
        date: entry.date,
        reportingTime: entry.slotTime ?? '09:00',
        status: 'confirmed',
      });
      await this.appointmentRepo.save(appointment);

      entry.status = 'promoted';
      await this.waitingRepo.save(entry);
    }

    this.logger.log(
      `Auto-promoted ${waitingEntries.length} patient(s) from waiting list for doctor ${doctorId} on ${date}`,
    );

    return waitingEntries.length;
  }
}
