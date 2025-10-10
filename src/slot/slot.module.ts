import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Slot } from './entities/slot.entity';
import { SlotService } from './slot.service';
import { SlotController } from './slot.controller';
import { Doctor } from '../entities/doctor.entity';
import { Appointment } from '../appointment/entities/appointment.entity';
import { NotificationModule } from '../notification/notification.module'; // ✅ import NotificationModule
import { AppointmentModule } from '../appointment/appointment.module'; // ✅ import AppointmentModule
import { WaitingListModule } from '../waiting-list/waiting-list.module'; // ✅ import WaitingListModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Slot, Doctor, Appointment]), // ✅ include Appointment
    NotificationModule, // ✅ import NotificationModule
    forwardRef(() => AppointmentModule),
    forwardRef(() => WaitingListModule), // ✅ fix: forwardRef added
  ],
  providers: [SlotService],
  controllers: [SlotController],
  exports: [SlotService],
})
export class SlotModule {}