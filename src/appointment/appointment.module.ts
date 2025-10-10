import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { Appointment } from './entities/appointment.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { Slot } from '../slot/entities/slot.entity';
import { SlotModule } from '../slot/slot.module';           // ✅ Provides SlotService
import { NotificationModule } from '../notification/notification.module'; // ✅ Provides NotificationService
import { WaitingListModule } from '../waiting-list/waiting-list.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Doctor, Patient, Slot]),
    SlotModule,           // ✅ Access SlotService
    NotificationModule,   // ✅ Access NotificationService
    WaitingListModule, // ✅ here
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}