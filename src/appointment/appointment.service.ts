import { Injectable, NotFoundException } from '@nestjs/common';
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
      query.andWhere('doctor.specialization = :specialization', {
        specialization: filters.specialization,
      });
    }

    if (filters?.location) {
      query.andWhere('doctor.location = :location', {
        location: filters.location,
      });
    }

    if (filters?.experience) {
      query.andWhere('doctor.experience >= :experience', {
        experience: filters.experience,
      });
    }

    if (filters?.maxFee) {
      query.andWhere('doctor.fee <= :maxFee', {
        maxFee: filters.maxFee,
      });
    }

    return query.getMany();
  }

  // 2️⃣ Slots (Wave & Stream Scheduling)
  async getDoctorSlots(doctorId: number, date?: string) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (doctor.scheduleType === 'wave') {
      return this.generateWaveSlots(doctor);
    } else {
      return this.generateStreamSlot(doctor);
    }
  }

  private generateWaveSlots(doctor: Doctor) {
    const slots: { slotId: number; time: string; capacity: number }[] = [];

    if (!doctor.consultingStart || !doctor.consultingEnd || !doctor.slotDuration) {
      return [];
    }

    let [startHour, startMin] = doctor.consultingStart.split(':').map(Number);
    let [endHour, endMin] = doctor.consultingEnd.split(':').map(Number);

    let start = startHour * 60 + startMin;
    let end = endHour * 60 + endMin;

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
        time: `${h1}:${m1}–${h2}:${m2}`,
        capacity: doctor.capacityPerSlot ?? 1,
      });
    }

    return slots;
  }

  private generateStreamSlot(doctor: Doctor) {
    return [
      {
        slotId: 1,
        time: `${doctor.consultingStart}–${doctor.consultingEnd}`,
        capacity: doctor.totalCapacity ?? 1,
      },
    ];
  }

  // 3️⃣ Confirm appointment (✅ DTO handled)
  async confirmAppointment(dto: ConfirmAppointmentDto) {
    const { patientId, doctorId, slotId, time } = dto;

    const patient = await this.patientRepo.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    let finalTime = time;

    if (doctor.scheduleType === 'wave') {
      const slots = this.generateWaveSlots(doctor);
      const slot = slots.find((s) => s.slotId === Number(slotId));
      if (!slot) throw new NotFoundException('Slot not found');
      finalTime = slot.time;
    } else if (doctor.scheduleType === 'stream') {
      finalTime = time ?? doctor.consultingStart;
    }

    const appointment = this.appointmentRepo.create({
      patient,
      doctor,
      date: new Date().toISOString().split('T')[0],
      time: finalTime,
      status: 'confirmed',
    });

    return this.appointmentRepo.save(appointment);
  }

  // 4️⃣ Appointment details
  async getAppointment(id: string) {
    const appointment = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['patient', 'doctor'],
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }
}
