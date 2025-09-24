import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { ConfirmAppointmentDto } from './dto/confirm-appointment.dto';
import { Slot } from '../slot/entities/slot.entity';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,
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

  // 3️⃣ Confirm appointment (with reporting time logic + elastic scheduling)
  async confirmAppointment(dto: ConfirmAppointmentDto) {
    const { patientId, doctorId, slotId, date } = dto;

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
        // ✅ Elastic Scheduling → Create new Slot in DB
        const newSlot = this.slotRepo.create({
          doctor,
          startTime: slot.end,
          endTime: this.addMinutes(slot.end, doctor.slotDuration ?? 10),
          capacity: doctor.capacityPerSlot ?? 1,
          date: appointmentDate,
          type: 'wave',
        });
        await this.slotRepo.save(newSlot);

        throw new BadRequestException('Original slot full. New slot created via elastic scheduling.');
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
        // ✅ Elastic scheduling placeholder for stream
        throw new BadRequestException('Stream capacity full. Elastic scheduling pending.');
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

  private addMinutes(time: string, mins: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    const hh = Math.floor(total / 60).toString().padStart(2, '0');
    const mm = (total % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
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

  // 5️⃣ Get patient appointments with filter (upcoming, past, cancelled)
  async getPatientAppointments(patientId: string, filter?: string) {
    const patient = await this.patientRepo.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const today = new Date().toISOString().split('T')[0];
    const qb = this.appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .where('patient.id = :patientId', { patientId });

    if (filter === 'upcoming') {
      qb.andWhere('appointment.date >= :today', { today }).andWhere('appointment.status = :status', { status: 'confirmed' });
    } else if (filter === 'past') {
      qb.andWhere('appointment.date < :today', { today }).andWhere('appointment.status = :status', { status: 'confirmed' });
    } else if (filter === 'cancelled') {
      qb.andWhere('appointment.status = :status', { status: 'cancelled' });
    }

    return qb.orderBy('appointment.date', 'ASC').getMany();
  }

  // 6️⃣ Cancel appointment
  async cancelAppointment(id: string) {
    const appointment = await this.appointmentRepo.findOne({ where: { id } });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status === 'cancelled') {
      throw new BadRequestException('Appointment already cancelled');
    }

    appointment.status = 'cancelled';
    return this.appointmentRepo.save(appointment);
  }
}
