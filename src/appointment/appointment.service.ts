import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { ConfirmAppointmentDto } from './dto/confirm-appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,

    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  // 1️⃣ Doctors list with filters
  async getDoctors(filters?: any): Promise<Doctor[]> {
    const query = this.doctorRepo.createQueryBuilder('doctor');

    if (filters?.specialization) {
      query.andWhere('doctor.specialization = :specialization', { specialization: filters.specialization });
    }
    if (filters?.location) {
      query.andWhere('doctor.location = :location', { location: filters.location });
    }
    if (filters?.experience) {
      query.andWhere('doctor.experience >= :experience', { experience: filters.experience });
    }
    if (filters?.maxFee) {
      query.andWhere('doctor.fee <= :maxFee', { maxFee: filters.maxFee });
    }

    return query.getMany();
  }

  // 2️⃣ Slots (Wave & Stream Scheduling + recurring pattern check)
  async getDoctorSlots(doctorId: number, date?: string) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    // 📅 Recurring pattern check
    if (date && doctor.recurringDays?.length) {
      const reqDate = new Date(date);
      const weekday = reqDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      if (!doctor.recurringDays.includes(weekday)) {
        return []; // no slots if doctor not available that day
      }
    }

    if (doctor.scheduleType === 'wave') {
      return this.generateWaveSlots(doctor);
    } else {
      return this.generateStreamSlot(doctor);
    }
  }

  private generateWaveSlots(doctor: Doctor) {
    const slots: { slotId: number; start: string; end: string; capacity: number }[] = [];

    if (!doctor.consultingStart || !doctor.consultingEnd || !doctor.slotDuration) {
      return [];
    }

    const [startHour, startMin] = doctor.consultingStart.split(':').map(Number);
    const [endHour, endMin] = doctor.consultingEnd.split(':').map(Number);

    let start = startHour * 60 + startMin;
    let end = endHour * 60 + endMin;

    let slotId = 1;
    for (let time = start; time + doctor.slotDuration <= end; time += doctor.slotDuration) {
      const h1 = Math.floor(time / 60).toString().padStart(2, '0');
      const m1 = (time % 60).toString().padStart(2, '0');
      const h2 = Math.floor((time + doctor.slotDuration) / 60).toString().padStart(2, '0');
      const m2 = ((time + doctor.slotDuration) % 60).toString().padStart(2, '0');

      slots.push({
        slotId: slotId++,
        start: `${h1}:${m1}`,
        end: `${h2}:${m2}`,
        capacity: doctor.capacityPerSlot ?? 1,
      });
    }

    return slots;
  }

  private generateStreamSlot(doctor: Doctor) {
    return [
      {
        slotId: 1,
        start: doctor.consultingStart,
        end: doctor.consultingEnd,
        capacity: doctor.totalCapacity ?? 1,
      },
    ];
  }

  // 3️⃣ Confirm appointment (with reporting time logic and custom date support)
  async confirmAppointment(dto: ConfirmAppointmentDto) {
    const { patientId, doctorId, slotId, date, time } = dto;

    const patient = await this.patientRepo.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const appointmentDate = date ?? new Date().toISOString().split('T')[0]; // fallback today
    let reportingTime: string;

    if (doctor.scheduleType === 'wave') {
      if (!slotId) throw new BadRequestException('slotId is required for wave scheduling');

      const slots = this.generateWaveSlots(doctor);
      const slot = slots.find((s) => s.slotId === Number(slotId));
      if (!slot) throw new NotFoundException('Slot not found');

      const perSlotExisting = await this.countAppointmentsInSlot(doctor.id, appointmentDate, slot.start, slot.end);

      if (perSlotExisting >= slot.capacity) {
        throw new BadRequestException('Slot capacity full');
      }

      const slotDurationMins = this.durationInMinutes(slot.start, slot.end);
      const interval = Math.floor(slotDurationMins / (slot.capacity || 1));

      const index = perSlotExisting;
      const [sh, sm] = slot.start.split(':').map(Number);
      const reportingMinutes = sh * 60 + sm + index * interval;
      const rh = Math.floor(reportingMinutes / 60).toString().padStart(2, '0');
      const rm = (reportingMinutes % 60).toString().padStart(2, '0');
      reportingTime = `${rh}:${rm}`;
    } else {
      const existing = await this.appointmentRepo.count({
        where: { doctor: { id: doctor.id }, date: appointmentDate },
      });

      if ((doctor.totalCapacity ?? 0) <= existing) {
        throw new BadRequestException('Stream capacity full for this date');
      }

      const perPatientMinutes = 10;
      const [h, m] = doctor.consultingStart.split(':').map(Number);
      const reportingMinutes = h * 60 + m + existing * perPatientMinutes;
      const rh = Math.floor(reportingMinutes / 60).toString().padStart(2, '0');
      const rm = (reportingMinutes % 60).toString().padStart(2, '0');
      reportingTime = `${rh}:${rm}`;
    }

    const appointment = this.appointmentRepo.create({
      patient,
      doctor,
      date: appointmentDate,
      time: reportingTime,
      status: 'confirmed',
    });

    return this.appointmentRepo.save(appointment);
  }

  private async countAppointmentsInSlot(doctorId: number, date: string, slotStart: string, slotEnd: string): Promise<number> {
    const qb = this.appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoin('appointment.doctor', 'doctor')
      .where('doctor.id = :doctorId', { doctorId })
      .andWhere('appointment.date = :date', { date })
      .andWhere('appointment.time >= :slotStart', { slotStart })
      .andWhere('appointment.time < :slotEnd', { slotEnd });

    return qb.getCount();
  }

  private durationInMinutes(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  }

  // 4️⃣ Appointment details
  async getAppointment(id: string) {
    const appointment = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['patient', 'doctor'],
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    return {
      id: appointment.id,
      date: appointment.date,
      reportingTime: appointment.time,
      status: appointment.status,
      doctor: {
        id: appointment.doctor.id,
        name: appointment.doctor.name,
        specialization: appointment.doctor.specialization,
        location: appointment.doctor.location,
      },
      patient: {
        id: appointment.patient.id,
        name: appointment.patient.name,
        email: appointment.patient.email,
      },
    };
  }
}