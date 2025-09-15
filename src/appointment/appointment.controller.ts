import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { AppointmentService } from './appointment.service';

@Controller('api/v1')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  // 1️⃣ Get list of doctors
  @Get('doctors')
  getDoctors() {
    return this.appointmentService.getDoctors();
  }

  // 2️⃣ Get available slots for a doctor
  @Get('doctors/:id/available-slots')
  getDoctorSlots(@Param('id') id: number) {
    return this.appointmentService.getDoctorSlots(id);
  }

  // 4️⃣ Confirm appointment
  @Post('appointments/confirm')
  confirmAppointment(
    @Body('patientId') patientId: string,
    @Body('doctorId') doctorId: number,
    @Body('time') time: string,
  ) {
    return this.appointmentService.confirmAppointment(patientId, doctorId, time);
  }

  // 5️⃣ Get appointment details
  @Get('appointments/:id')
  getAppointment(@Param('id') id: string) {
    return this.appointmentService.getAppointment(id);
  }
}