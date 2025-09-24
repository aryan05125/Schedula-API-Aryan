import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Slot } from './entities/slot.entity';
import { Doctor } from '../entities/doctor.entity';

@Injectable()
export class SlotService {
  constructor(
    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  async createSlot(data: Partial<Slot> & { doctorId: number }) {
    // ✅ doctorId થી doctor શોધવું
    const doctor = await this.doctorRepo.findOne({ where: { id: data.doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const slot = this.slotRepo.create({
      startTime: data.startTime,
      endTime: data.endTime,
      capacity: data.capacity ?? 1,
      date: data.date,
      type: data.type ?? 'wave',
      doctor, // relation assign
    });

    return this.slotRepo.save(slot);
  }

  async updateSlot(id: number, data: Partial<Slot>) {
    await this.slotRepo.update(id, data);
    return this.slotRepo.findOne({ where: { id } });
  }

  async getSlotsByDoctor(doctorId: number, date?: string) {
    const where: any = { doctor: { id: doctorId } };
    if (date) where.date = date;
    return this.slotRepo.find({ where });
  }
}
