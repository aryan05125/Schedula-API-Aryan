import { Controller, Get, Param, Post, Body, Query } from '@nestjs/common';
import { AppointmentService } from './appointment.service';

@Controller('api/v1')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  // 1️⃣ Get list of doctors (with filters)
  @Get('doctors')
  async getDoctors(
    @Query('specialization') specialization?: string,
    @Query('location') location?: string,
    @Query('experience') experience?: number,
    @Query('maxFee') maxFee?: number,
  ) {
    const filters = { specialization, location, experience, maxFee };
    const doctors = await this.appointmentService.getDoctors(filters);
    return { success: true, doctors };
  }

  // 2️⃣ Get available slots for a doctor
  @Get('doctors/:id/available-slots')
  getDoctorSlots(@Param('id') id: number) {
    return this.appointmentService.getDoctorSlots(id);
  }

  // 3️⃣ Confirm appointment
  @Post('appointments/confirm')
  confirmAppointment(
    @Body('patientId') patientId: string,
    @Body('doctorId') doctorId: number,
    @Body('time') time: string,
  ) {
    return this.appointmentService.confirmAppointment(patientId, doctorId, time);
  }

  // 4️⃣ Get appointment details
  @Get('appointments/:id')
  getAppointment(@Param('id') id: string) {
    return this.appointmentService.getAppointment(id);
  }
}
