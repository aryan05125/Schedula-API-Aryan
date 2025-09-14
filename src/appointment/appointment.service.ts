import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';

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

  // 1️⃣ Doctors list
  async getDoctors(): Promise<Doctor[]> {
    return this.doctorRepo.find();
  }

  // 2️⃣ Slots
  async getDoctorSlots(doctorId: number) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    return [
      { slotId: 1, time: '10:00–10:15' },
      { slotId: 2, time: '10:15–10:30' },
      { slotId: 3, time: '10:30–10:45' },
    ];
  }

  // 4️⃣ Confirm appointment
  async confirmAppointment(patientId: string, doctorId: number, time: string) {
    const patient = await this.patientRepo.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const appointment = this.appointmentRepo.create({
      patient,
      doctor,
      date: new Date().toISOString().split('T')[0],
      time,
      status: 'confirmed',
    });

    return this.appointmentRepo.save(appointment);
  }

  // 5️⃣ Appointment details
  async getAppointment(id: string) {
    const appointment = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['patient', 'doctor'],
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }
}
