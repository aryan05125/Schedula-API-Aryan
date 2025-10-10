import { Controller, Post, Get, Patch, Param, Body } from '@nestjs/common';
import { WaitingListService } from './waiting-list.service';
import { Patient } from '../entities/patient.entity';
import { Doctor } from '../entities/doctor.entity';

@Controller('api/v1/waiting-list')
export class WaitingListController {
  constructor(private readonly waitingListService: WaitingListService) {}

  /**
   * 1️⃣ Add patient to waiting list
   * Body example:
   * {
   *   "patient": { "id": 1, "name": "Aryan" },
   *   "doctor": { "id": 2, "name": "Dr. Mehta" },
   *   "date": "2025-10-08",
   *   "slotTime": "10:00"
   * }
   */
  @Post()
  async addToWaitingList(@Body() body: any) {
    const { patient, doctor, date, slotTime } = body;

    // ✅ Now call using object instead of 4 parameters
    return this.waitingListService.addToWaitingList({
      patient: patient as Patient,
      doctor: doctor as Doctor,
      date,
      slotTime,
    });
  }

  /**
   * 2️⃣ Get doctor’s waiting list for a given date
   * GET /api/v1/waiting-list/doctor/:doctorId/:date
   */
  @Get('doctor/:doctorId/:date')
  async getWaitingListForDoctor(
    @Param('doctorId') doctorId: string,
    @Param('date') date: string,
  ) {
    return this.waitingListService.getWaitingListForDoctor(Number(doctorId), date);
  }

  /**
   * 3️⃣ Promote a patient from waiting list → creates confirmed appointment
   */
  @Patch(':id/promote')
  async promote(@Param('id') id: string) {
    return this.waitingListService.promoteFromWaitingList(id);
  }

  /**
   * 4️⃣ Cancel a waiting list entry
   */
  @Patch(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.waitingListService.cancelWaiting(id);
  }
}
