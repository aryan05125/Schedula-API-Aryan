import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { ConfirmAppointmentDto } from './dto/confirm-appointment.dto';
import { Slot } from '../slot/entities/slot.entity';
import { SlotService } from '../slot/slot.service';
import { NotificationService } from '../notification/notification.service';
import { WaitingListService } from '../waiting-list/waiting-list.service';
@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,
    private readonly slotService: SlotService,
    private readonly notificationService: NotificationService,
    private readonly waitingListService: WaitingListService,
  ) {}
  // 1️⃣ Doctors list
  async getDoctors(filters?: any): Promise<Doctor[]> {
    const query = this.doctorRepo.createQueryBuilder('doctor');
    if (filters?.specialization)
      query.andWhere('doctor.specialization = :specialization', {
        specialization: filters.specialization,
      });
    if (filters?.location)
      query.andWhere('doctor.location = :location', { location: filters.location });
    if (filters?.experience)
      query.andWhere('doctor.experience >= :experience', {
        experience: filters.experience,
      });
    if (filters?.maxFee)
      query.andWhere('doctor.fee <= :maxFee', { maxFee: filters.maxFee });
    return query.getMany();
  }
  // 2️⃣ Slots (Wave / Stream Scheduling)
  async getDoctorSlots(doctorId: number, date?: string) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (date && doctor.recurringDays?.length) {
      const reqDate = new Date(date);
      const weekday = reqDate
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase();
      if (!doctor.recurringDays.includes(weekday)) return [];
    }
    return doctor.scheduleType === 'wave'
      ? this.generateWaveSlots(doctor)
      : this.generateStreamSlot(doctor);
  }
  private generateWaveSlots(doctor: Doctor) {
    const slots: { slotId: number; start: string; end: string; capacity: number }[] = [];
    if (!doctor.consultingStart || !doctor.consultingEnd || !doctor.slotDuration)
      return [];
    const [startHour, startMin] = doctor.consultingStart.split(':').map(Number);
    const [endHour, endMin] = doctor.consultingEnd.split(':').map(Number);
    const start = startHour * 60 + startMin;
    const end = endHour * 60 + endMin;
    let slotId = 1;
    for (let time = start; time + doctor.slotDuration <= end; time += doctor.slotDuration) {
      const h1 = Math.floor(time / 60).toString().padStart(2, '0');
      const m1 = (time % 60).toString().padStart(2, '0');
      const h2 = Math.floor((time + doctor.slotDuration) / 60)
        .toString()
        .padStart(2, '0');
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
  private nowHHMM(): string {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
  private isTimeBetween(time: string, start: string, end: string) {
    const toMins = (t: string) => {
      const [hh, mm] = t.split(':').map(Number);
      return hh * 60 + mm;
    };
    const t = toMins(time);
    return t >= toMins(start) && t <= toMins(end);
  }
  // 🆕 Find next available date (up to 7 days ahead)
  private findNextAvailableDate(doctor: Doctor, fromDate: string): string {
    const startDate = new Date(fromDate);
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(startDate);
      nextDate.setDate(startDate.getDate() + i);
      const weekday = nextDate
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase();
      if (!doctor.recurringDays?.length || doctor.recurringDays.includes(weekday)) {
        return nextDate.toISOString().split('T')[0];
      }
    }
    throw new BadRequestException('No available future slots found for doctor');
  }
  // 🆕 Auto-book next available slot
  private async autoBookNextAvailableSlot(
    patient: Patient,
    doctor: Doctor,
    date: string,
  ) {
    const slots =
      doctor.scheduleType === 'wave'
        ? this.generateWaveSlots(doctor)
        : this.generateStreamSlot(doctor);
    if (!slots.length) throw new BadRequestException('No slots found for doctor');
    const firstSlot = slots[0];
    const reportingTime = firstSlot.start;
    const appointment = this.appointmentRepo.create({
      patient,
      doctor,
      date,
      reportingTime,
      status: 'confirmed',
    });
    const saved = await this.appointmentRepo.save(appointment);
    await this.notificationService.createNotification({
      userId: String(patient.id),
      type: 'appointment_auto_booked',
      message: `Your appointment has been auto-booked for ${date} at ${reportingTime}.`,
      sendEmail: true,
      sendSms: true,
    });
    await this.notificationService.createNotification({
      userId: String(doctor.id),
      type: 'appointment_auto_booked',
      message: `New auto-booked appointment with ${patient.name} on ${date} at ${reportingTime}.`,
    });
    return saved;
  }
  /**
   * 🆕 Auto-reschedule cancelled/affected appointments:
   * - tries next 3 working days
   * - else adds to waiting list
   */
  async autoRescheduleCancelledAppointments(appointments: Appointment[], doctor: Doctor) {
    const results: { oldAppointmentId: string; newAppointmentId: string | null; note?: string; newDate?: string }[] = [];
    for (const appt of appointments) {
      try {
        const patient = appt.patient;
        if (!patient) {
          results.push({ oldAppointmentId: appt.id, newAppointmentId: null, note: 'missing patient' });
          continue;
        }
        let nextDate: string | null = null;
        let found = false;
        // Try next 3 working days
        for (let i = 1; i <= 3; i++) {
          try {
            nextDate = this.findNextAvailableDate(doctor, appt.date);
            const availableSlot = await this.slotRepo.findOne({
              where: { doctor: { id: doctor.id }, date: MoreThan(appt.date) },
              order: { date: 'ASC' },
            });
            if (availableSlot) {
              const newAppt = await this.autoBookNextAvailableSlot(patient, doctor, nextDate!);
              results.push({
                oldAppointmentId: appt.id,
                newAppointmentId: newAppt.id,
                newDate: nextDate,
              });
              found = true;
              break;
            }
          } catch {}
        }
        // If no slot → add to waiting list
        if (!found) {
          const waiting = await this.waitingListService.addToWaitingList({
            patient,
            doctor,
            date: nextDate ?? appt.date,
            slotTime: undefined,
          });
          results.push({
            oldAppointmentId: appt.id,
            newAppointmentId: null,
            note: 'no slot found → added to waiting list',
          });
          await this.notificationService.createNotification({
            userId: String(patient.id),
            type: 'appointment_waiting_list',
            message: `No slot available for next 3 days. You’ve been added to the waiting list.`,
          });
        }
      } catch (err) {
        this.logger.warn(`Auto-reschedule failed for ${appt.id}: ${String(err)}`);
        results.push({ oldAppointmentId: appt.id, newAppointmentId: null, note: String(err) });
      }
    }
    return results;
  }

  // 3️⃣ Confirm appointment (unchanged logic)// 3️⃣ Confirm appointment (final stable logic)
async confirmAppointment(dto: ConfirmAppointmentDto) {
  const { patientId, doctorId, slotId, date } = dto;

  const patient = await this.patientRepo.findOne({ where: { id: patientId } });
  if (!patient) throw new NotFoundException('Patient not found');

  const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
  if (!doctor) throw new NotFoundException('Doctor not found');

  const appointmentDate = date ?? new Date().toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const currentTime = this.nowHHMM();

  // ✅ 1. Past-date check
  if (new Date(appointmentDate) < new Date(todayStr)) {
    throw new BadRequestException('Cannot book appointment for past dates');
  }

  // ✅ 2. Future-day restriction (check first)
  if (appointmentDate !== todayStr && !doctor.allowFutureAppointments) {
    const waiting = await this.waitingListService.addToWaitingList({
      patient,
      doctor,
      date: appointmentDate,
      slotTime: undefined,
    });
    return {
      success: true,
      message:
        'Future-day appointment not allowed for this doctor. Added to waiting list.',
      waiting,
    };
  }

  // ✅ 3. Same-day booking window validation (after future-day check)
  if (
    appointmentDate === todayStr &&
    doctor.bookingWindowStart &&
    doctor.bookingWindowEnd
  ) {
    const allowed = this.isTimeBetween(
      currentTime,
      doctor.bookingWindowStart,
      doctor.bookingWindowEnd,
    );
    if (!allowed) {
      const waiting = await this.waitingListService.addToWaitingList({
        patient,
        doctor,
        date: appointmentDate,
        slotTime: undefined,
      });
      return {
        success: true,
        message: 'Booking window closed, added to waiting list.',
        waiting,
      };
    }
  }

  // ✅ 4. Slot / capacity logic
  let reportingTime: string;

  if (doctor.scheduleType === 'wave') {
    if (!slotId)
      throw new BadRequestException('slotId is required for wave scheduling');
    const slots = this.generateWaveSlots(doctor);
    const slot = slots.find((s) => s.slotId === Number(slotId));
    if (!slot) throw new NotFoundException('Slot not found');

    const perSlotExisting = await this.countAppointmentsInSlot(
      doctor.id,
      appointmentDate,
      slot.start,
      slot.end,
    );

    if (perSlotExisting >= (slot.capacity || 1)) {
      const waiting = await this.waitingListService.addToWaitingList({
        patient,
        doctor,
        date: appointmentDate,
        slotTime: slot.start,
      });
      return {
        success: true,
        message: 'Slot full, added to waiting list.',
        waiting,
      };
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
    // Stream scheduling
    const existing = await this.appointmentRepo.count({
      where: { doctor: { id: doctor.id }, date: appointmentDate },
    });

    if ((doctor.totalCapacity ?? 0) <= existing) {
      const waiting = await this.waitingListService.addToWaitingList({
        patient,
        doctor,
        date: appointmentDate,
        slotTime: doctor.consultingStart,
      });
      return {
        success: true,
        message: 'Doctor capacity full, added to waiting list.',
        waiting,
      };
    }

    const perPatientMinutes = 10;
    const [h, m] = doctor.consultingStart.split(':').map(Number);
    const reportingMinutes = h * 60 + m + existing * perPatientMinutes;
    const rh = Math.floor(reportingMinutes / 60).toString().padStart(2, '0');
    const rm = (reportingMinutes % 60).toString().padStart(2, '0');
    reportingTime = `${rh}:${rm}`;
  }

  // ✅ 5. Consulting hours check (moved after all logic)
  if (
    appointmentDate === todayStr &&
    !this.isTimeBetween(currentTime, doctor.consultingStart, doctor.consultingEnd)
  ) {
    throw new BadRequestException('Booking not allowed outside consulting hours.');
  }

  // ✅ 6. Save appointment
  const appointment = this.appointmentRepo.create({
    patient,
    doctor,
    date: appointmentDate,
    reportingTime,
    status: 'confirmed',
  });
  const saved = await this.appointmentRepo.save(appointment);

  // ✅ 7. Send notifications
  await this.notificationService.createNotification({
    userId: String(doctor.id),
    type: 'appointment_confirmed',
    message: `New appointment with ${patient.name} at ${reportingTime} on ${appointmentDate}.`,
  });

  await this.notificationService.createNotification({
    userId: String(patient.id),
    type: 'appointment_confirmed',
    message: `Appointment confirmed with Dr.${doctor.name} at ${reportingTime} on ${appointmentDate}.`,
  });

  // ✅ 8. Return success
  return {
    success: true,
    message: 'Appointment confirmed successfully',
    appointment: {
      id: saved.id,
      patient: { id: patient.id, name: patient.name, email: patient.email },
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
      },
      date: saved.date,
      reportingTime: saved.reportingTime,
      status: saved.status,
    },
  };
}


  private async countAppointmentsInSlot(
    doctorId: number,
    date: string,
    slotStart: string,
    slotEnd: string,
  ) {
    return this.appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoin('appointment.doctor', 'doctor')
      .where('doctor.id = :doctorId', { doctorId })
      .andWhere('appointment.date = :date', { date })
      .andWhere('appointment.reportingTime >= :slotStart', { slotStart })
      .andWhere('appointment.reportingTime < :slotEnd', { slotEnd })
      .getCount();
  }
  private durationInMinutes(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  }

  async getAppointment(id: string) {
    const appointment = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['patient', 'doctor'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async getPatientAppointments(patientId: string, filter?: string) {
    const patient = await this.patientRepo.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const today = new Date().toISOString().split('T')[0];
    const qb = this.appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .where('patient.id = :patientId', { patientId });

    if (filter === 'upcoming')
      qb
        .andWhere('appointment.date >= :today', { today })
        .andWhere('appointment.status = :status', { status: 'confirmed' });
    else if (filter === 'past')
      qb
        .andWhere('appointment.date < :today', { today })
        .andWhere('appointment.status = :status', { status: 'confirmed' });
    else if (filter === 'cancelled')
      qb.andWhere('appointment.status = :status', { status: 'cancelled' });

    return qb.orderBy('appointment.date', 'ASC').getMany();
  }

  async cancelAppointment(id: string, reason?: string) {
    const appointment = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['doctor', 'patient'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    appointment.status = 'cancelled';
    appointment.cancellationReason = reason || 'Cancelled by user request';
    const saved = await this.appointmentRepo.save(appointment);

    await this.notificationService.createNotification({
      userId: String(appointment.doctor.id),
      type: 'appointment_cancelled',
      message: `Appointment with ${appointment.patient.name} cancelled.`,
    });

    await this.notificationService.createNotification({
      userId: appointment.patient.id,
      type: 'appointment_cancelled',
      message: `Your appointment with Dr.${appointment.doctor.name} cancelled.`,
    });

    return saved;
  }

  // ✅ Reschedule All Future Appointments
  async rescheduleAllFutureAppointments(
    doctorId: number,
    shift_minutes: number,
  ) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const today = new Date().toISOString().split('T')[0];
    const futureAppointments = await this.appointmentRepo.find({
      where: {
        doctor: { id: doctorId },
        date: In([today]),
        status: 'confirmed',
      },
      relations: ['patient'],
    });

    for (const appt of futureAppointments) {
      const [hh, mm] = appt.reportingTime.split(':').map(Number);
      const totalMins = hh * 60 + mm + shift_minutes;
      const newHH = String(Math.floor(totalMins / 60)).padStart(2, '0');
      const newMM = String(totalMins % 60).padStart(2, '0');
      appt.reportingTime = `${newHH}:${newMM}`;
      await this.appointmentRepo.save(appt);

      await this.notificationService.createNotification({
        userId: appt.patient.id,
        type: 'appointment_rescheduled',
        message: `Your appointment has been rescheduled to ${appt.reportingTime}`,
      });
    }

    return {
      message: 'Rescheduled all future appointments successfully',
      updatedCount: futureAppointments.length,
    };
  }

  // ✅ Reschedule Selected Appointments
  async rescheduleSelectedAppointments(
    appointmentIds: string[],
    shift_minutes: number,
  ) {
    const appointments = await this.appointmentRepo.find({
      where: { id: In(appointmentIds) },
      relations: ['doctor', 'patient'],
    });

    for (const appt of appointments) {
      const [hh, mm] = appt.reportingTime.split(':').map(Number);
      const totalMins = hh * 60 + mm + shift_minutes;
      const newHH = String(Math.floor(totalMins / 60)).padStart(2, '0');
      const newMM = String(totalMins % 60).padStart(2, '0');
      appt.reportingTime = `${newHH}:${newMM}`;
      await this.appointmentRepo.save(appt);

      await this.notificationService.createNotification({
        userId: appt.patient.id,
        type: 'appointment_rescheduled',
        message: `Your appointment has been rescheduled to ${appt.reportingTime}`,
      });
    }

    return {
      message: 'Rescheduled selected appointments successfully',
      updatedCount: appointments.length,
    };
  }
}