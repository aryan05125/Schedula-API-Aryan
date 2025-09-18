import { Controller, Get, Param, Post, Body, Query } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { ConfirmAppointmentDto } from './dto/confirm-appointment.dto';

@Controller('api/v1')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

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

  @Get('doctors/:id/available-slots')
  getDoctorSlots(@Param('id') id: number, @Query('date') date?: string) {
    return this.appointmentService.getDoctorSlots(id, date);
  }

  @Post('appointments/confirm')
  confirmAppointment(@Body() dto: ConfirmAppointmentDto) {
    return this.appointmentService.confirmAppointment(dto);
  }

  @Get('appointments/:id')
  async getAppointment(@Param('id') id: string) {
    const appointment = await this.appointmentService.getAppointment(id);
    return { success: true, appointment };
  }
}
