import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitingList } from './waiting-list.entity';
import { WaitingListService } from './waiting-list.service';
import { WaitingListController } from './waiting-list.controller';
import { Patient } from '../entities/patient.entity';
import { Doctor } from '../entities/doctor.entity';
import { Appointment } from '../appointment/entities/appointment.entity';

@Module({
  imports: [
    // ✅ Register all entities required for this module
    TypeOrmModule.forFeature([WaitingList, Patient, Doctor, Appointment]),
  ],
  controllers: [WaitingListController],
  providers: [WaitingListService],
  exports: [WaitingListService], // ✅ Must export this for other modules (like SlotModule)
})
export class WaitingListModule {}
