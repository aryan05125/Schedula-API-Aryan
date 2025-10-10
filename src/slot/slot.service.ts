import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Slot } from './entities/slot.entity';
import { Doctor } from '../entities/doctor.entity';
import { Appointment } from '../appointment/entities/appointment.entity';
import { NotificationService } from '../notification/notification.service';
import { WaitingListService } from '../waiting-list/waiting-list.service';
import { AppointmentService } from '../appointment/appointment.service';

@Injectable()
export class SlotService {
  private readonly logger = new Logger(SlotService.name);

  constructor(
    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,

    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    private readonly notificationService: NotificationService,
    private readonly waitingListService: WaitingListService,

    @Inject(forwardRef(() => AppointmentService))
    private readonly appointmentService: AppointmentService,

    private readonly dataSource: DataSource,
  ) {}

  // -------------------------------
  // 🧩 Utility Functions
  // -------------------------------
  private validateTimeRange(start?: string, end?: string) {
    if (!start || !end) throw new BadRequestException('Start and End times are required');
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (eh * 60 + em <= sh * 60 + sm)
      throw new BadRequestException('Invalid range: end must be after start');
  }

  private convertToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private convertToHHMM(minutes: number): string {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private getDurationInMinutes(start: string, end: string): number {
    return this.convertToMinutes(end) - this.convertToMinutes(start);
  }

  private async checkOverlap(
    doctorId: number,
    date: string,
    start: string,
    end: string,
    excludeSlotId?: number,
  ) {
    const overlaps = await this.slotRepo.find({
      where: {
        doctor: { id: doctorId },
        date,
        startTime: LessThanOrEqual(end),
        endTime: MoreThanOrEqual(start),
      },
    });
    if (overlaps.length && (!excludeSlotId || overlaps[0].id !== excludeSlotId)) {
      throw new ConflictException('Overlapping slot exists for this doctor');
    }
  }

  // -------------------------------
  // 🧠 Recurring → Custom Session Migration (Fixed)
  // -------------------------------
  async migrateRecurringToCustomSessions(doctorId: number) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const appointments = await this.appointmentRepo.find({
      where: { doctor: { id: doctorId }, status: 'confirmed' },
      order: { date: 'ASC' },
    });

    if (!appointments.length) throw new BadRequestException('No confirmed appointments to migrate');

    const customSlots: Slot[] = [];

    for (const appt of appointments) {
      const reportingTime = appt.reportingTime ?? '00:00'; // ✅ safe fallback

      const exists = await this.slotRepo.findOne({
        where: {
          doctor: { id: doctorId },
          date: appt.date,
          startTime: LessThanOrEqual(reportingTime),
          endTime: MoreThanOrEqual(reportingTime),
        },
      });

      if (!exists) {
        const newSlot = this.slotRepo.create({
          date: appt.date,
          startTime: reportingTime,
          endTime: this.convertToHHMM(this.convertToMinutes(reportingTime) + 30),
          capacity: 1,
          doctor,
          ...(doctor as any),
        }) as unknown as Slot;

        newSlot['isCustom'] = true;
        newSlot.auditLogs = [
          {
            action: 'custom_session_created',
            oldRange: '-',
            newRange: `${reportingTime}-${this.convertToHHMM(
              this.convertToMinutes(reportingTime) + 30,
            )}`,
            timestamp: new Date(),
          },
        ];

        const savedSlot = await this.slotRepo.save(newSlot);
        customSlots.push(savedSlot);
      }
    }

    await this.notificationService.createNotification({
      userId: String(doctorId),
      type: 'migration_complete',
      message: `Recurring sessions migrated to ${customSlots.length} custom slots.`,
    });

    return { migratedCount: customSlots.length, customSlots };
  }

  // 🔄 Handle Affected Appointments (unchanged)
  private async handleAffectedAppointments(manager, slot: Slot, doctor: Doctor, actionType: string) {
    const appointments = await manager.find(Appointment, {
      where: { doctor: { id: doctor.id }, date: slot.date },
      relations: ['patient'],
      order: { reportingTime: 'ASC' },
    });
    if (!appointments.length) return;

    const start = slot.shrinkedStart ?? slot.startTime;
    const end = slot.shrinkedEnd ?? slot.endTime;
    const capacity = slot.capacity ?? 1;
    const duration = this.getDurationInMinutes(start, end);
    const interval = Math.floor(duration / capacity);

    let count = 0;
    const cancelled: Appointment[] = [];

    for (const appt of appointments) {
      if (count < capacity) {
        const newTime = this.convertToHHMM(this.convertToMinutes(start) + count * interval);
        appt.reportingTime = newTime ?? '00:00'; // ✅ safe
        await manager.save(appt);
        count++;
        await this.notificationService.createNotification({
          userId: appt.patient.id,
          type: 'appointment_rescheduled',
          message: `Your appointment has been rescheduled to ${newTime} on ${slot.date}.`,
        });
      } else {
        appt.status = 'cancelled';
        appt.cancellationReason = `Cancelled due to ${actionType} overflow`;
        await manager.save(appt);
        cancelled.push(appt);
      }
    }

    if (cancelled.length > 0) {
      await this.notificationService.createNotification({
        userId: String(doctor.id),
        type: 'appointments_cancelled',
        message: `${cancelled.length} appointments cancelled for ${slot.date} due to ${actionType}.`,
      });

      const cancelledIds = cancelled.map((c) => c.id);
      this.logger.log(`[SlotService] Found ${cancelled.length} affected appointments outside new window`);
      this.logger.log(`[AppointmentService] Cancelling appointments: [${cancelledIds.join(', ')}]`);

      let rescheduleResults: {
        oldAppointmentId: string;
        newAppointmentId: string | null;
        note?: string;
        newDate?: string;
      }[] = [];
      try {
        rescheduleResults = await this.appointmentService.autoRescheduleCancelledAppointments(
          cancelled,
          doctor,
        );
      } catch (err) {
        this.logger.warn(`[SlotService] Auto-reschedule failed: ${String(err)}`);
        rescheduleResults = cancelled.map((c) => ({
          oldAppointmentId: c.id,
          newAppointmentId: null,
          note: `autoReschedule failed: ${String(err)}`,
        }));
      }

      let rescheduledCount = 0;
      let waitingListCount = 0;
      for (const r of rescheduleResults) {
        if (r.newAppointmentId) {
          rescheduledCount++;
          this.logger.log(`[AutoReschedule] Appointment #${r.oldAppointmentId} → rescheduled to ${r.newDate}`);
        } else if (r.note && r.note.toLowerCase().includes('waiting')) {
          waitingListCount++;
          this.logger.log(`[AutoReschedule] Appointment #${r.oldAppointmentId} → added to waiting list`);
        } else {
          this.logger.log(`[AutoReschedule] Appointment #${r.oldAppointmentId} → ${r.note ?? 'no action'}`);
        }
      }

      this.logger.log(
        `✅ Auto-reschedule complete (${rescheduleResults.length} processed, ${rescheduledCount} rescheduled, ${waitingListCount} waiting list)`,
      );
    }
  }
}
