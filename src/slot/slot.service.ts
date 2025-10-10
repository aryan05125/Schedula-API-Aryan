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

    // circular dependency safe injection
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
  // 🧩 Create / Update / Get Slots
  // -------------------------------
  async createSlot(data: Partial<Slot> & { doctorId: number }) {
    this.validateTimeRange(data.startTime, data.endTime);
    const doctor = await this.doctorRepo.findOne({ where: { id: data.doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    await this.checkOverlap(doctor.id, data.date!, data.startTime!, data.endTime!);

    const slot = this.slotRepo.create({
      ...data,
      doctor,
      auditLogs: [
        {
          action: 'create',
          oldRange: '-',
          newRange: `${data.startTime}-${data.endTime}`,
          timestamp: new Date(),
        },
      ],
    });
    const saved = await this.slotRepo.save(slot);
    await this.notificationService.createNotification({
      userId: String(doctor.id),
      type: 'slot_created',
      message: `New slot created on ${data.date} from ${data.startTime} to ${data.endTime}`,
    });
    return saved;
  }

  async updateSlot(id: number, data: Partial<Slot>) {
    const slot = await this.slotRepo.findOne({ where: { id }, relations: ['doctor'] });
    if (!slot) throw new NotFoundException('Slot not found');

    if (data.startTime && data.endTime)
      await this.checkOverlap(slot.doctor.id, slot.date, data.startTime, data.endTime, id);

    await this.slotRepo.update(id, data);
    const updated = await this.slotRepo.findOne({ where: { id }, relations: ['doctor'] });
    await this.notificationService.createNotification({
      userId: String(updated!.doctor.id),
      type: 'slot_updated',
      message: `Slot updated for ${updated!.date} (${updated!.startTime}-${updated!.endTime})`,
    });
    return updated;
  }

  async getSlotsByDoctor(doctorId: number, date?: string) {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    const where: any = { doctor: { id: doctor.id } };
    if (date) where.date = date;
    return this.slotRepo.find({ where, relations: ['doctor'] });
  }

  // -------------------------------
  // 🧠 Wrapper Methods for Controller
  // -------------------------------
  async expandSession(doctorId: number, date: string, newStart: string, newEnd: string) {
    return this.applySchedulingUpdate({
      doctorId,
      date,
      newStart,
      newEnd,
      actionType: 'expand',
    });
  }

  async shrinkSession(doctorId: number, date: string, newStart: string, newEnd: string) {
    return this.applySchedulingUpdate({
      doctorId,
      date,
      newStart,
      newEnd,
      actionType: 'shrink',
    });
  }

  async adjustSlotCapacity(doctorId: number, slotId: number, newCapacity: number) {
    return this.applySchedulingUpdate({
      doctorId,
      slotId,
      date: '',
      newCapacity,
      actionType: 'capacity_adjust',
    });
  }

  async reduceSubslotDuration(doctorId: number, slotId: number, reductionPercent: number) {
    return this.applySchedulingUpdate({
      doctorId,
      slotId,
      date: '',
      reductionPercent,
      actionType: 'subslot_reduction',
    });
  }

  // -------------------------------
  // 🧠 Recurring → Custom Session Migration
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
      const exists = await this.slotRepo.findOne({
        where: {
          doctor: { id: doctorId },
          date: appt.date,
          startTime: LessThanOrEqual(appt.reportingTime),
          endTime: MoreThanOrEqual(appt.reportingTime),
        },
      });

      if (!exists) {
        const newSlot = this.slotRepo.create({
          date: appt.date,
          startTime: appt.reportingTime,
          endTime: this.convertToHHMM(this.convertToMinutes(appt.reportingTime) + 30),
          capacity: 1,
          doctor,
          // bypass missing type-checks (safe)
          ...(doctor as any),
        }) as unknown as Slot;

        newSlot['isCustom'] = true; // dynamic prop for audit
        newSlot.auditLogs = [
          {
            action: 'custom_session_created',
            oldRange: '-',
            newRange: `${appt.reportingTime}-${this.convertToHHMM(
              this.convertToMinutes(appt.reportingTime) + 30,
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

  // -------------------------------
  // 🧩 Core Scheduling Updates
  // -------------------------------
  async applySchedulingUpdate(options: {
    doctorId: number;
    slotId?: number;
    date: string;
    newStart?: string;
    newEnd?: string;
    newCapacity?: number;
    reductionPercent?: number;
    actionType: 'expand' | 'shrink' | 'capacity_adjust' | 'subslot_reduction';
  }) {
    const { doctorId, slotId, date, newStart, newEnd, newCapacity, reductionPercent, actionType } =
      options;

    return await this.dataSource.transaction(async (manager) => {
      const doctor = await manager.findOne(Doctor, { where: { id: doctorId } });
      if (!doctor) throw new NotFoundException('Doctor not found');
      let slots: Slot[] = [];

      if (slotId) {
        const slot = await manager.findOne(Slot, { where: { id: slotId }, relations: ['doctor'] });
        if (!slot) throw new NotFoundException('Slot not found');
        slots = [slot];
      } else {
        if (!date) throw new BadRequestException('Date required when slotId not given');
        slots = await manager.find(Slot, { where: { doctor: { id: doctorId }, date } });
        if (!slots.length) throw new NotFoundException('No slots found for date');
      }

      // Logging top-level action
      this.logger.log(`[SlotService] ${actionType} request received for doctor ${doctorId}`);

      for (const slot of slots) {
        switch (actionType) {
          case 'expand':
            await this.checkOverlap(doctorId, date, newStart!, newEnd!, slot.id);
            slot.expandedStart = newStart!;
            slot.expandedEnd = newEnd!;
            break;

          case 'shrink':
            this.validateTimeRange(newStart, newEnd);
            slot.shrinkedStart = newStart!;
            slot.shrinkedEnd = newEnd!;
            break;

          case 'capacity_adjust':
            slot.capacity = newCapacity!;
            break;

          case 'subslot_reduction':
            const totalMins = this.getDurationInMinutes(slot.startTime, slot.endTime);
            const reducedMins = Math.floor(totalMins * ((100 - reductionPercent!) / 100));
            const reducedEnd = this.convertToHHMM(this.convertToMinutes(slot.startTime) + reducedMins);
            slot.shrinkedEnd = reducedEnd;
            break;
        }
        slot.isOverride = true;
        slot.lastOverrideType = actionType;
        slot.auditLogs = [
          ...(slot.auditLogs || []),
          {
            action: actionType,
            oldRange: `${slot.startTime}-${slot.endTime}`,
            newRange: `${slot.shrinkedStart ?? slot.startTime}-${slot.shrinkedEnd ?? slot.endTime}`,
            timestamp: new Date(),
          },
        ];

        await manager.save(slot);

        // handle appointments (cancels + auto-reschedule)
        await this.handleAffectedAppointments(manager, slot, doctor, actionType);
      }

      return { message: `${actionType} completed successfully`, slots };
    });
  }

  // -------------------------------
  // 🔄 Handle Affected Appointments
  // -------------------------------
  private async handleAffectedAppointments(manager, slot: Slot, doctor: Doctor, actionType: string) {
    // fetch appointments for this slot date (with patient relation)
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
        appt.reportingTime = newTime;
        await manager.save(appt);
        count++;
        await this.notificationService.createNotification({
          userId: appt.patient.id,
          type: 'appointment_rescheduled',
          message: `Your appointment has been rescheduled to ${newTime} on ${slot.date}.`,
        });
      } else {
        // mark cancelled
        appt.status = 'cancelled';
        appt.cancellationReason = `Cancelled due to ${actionType} overflow`;
        await manager.save(appt);
        cancelled.push(appt);
      }
    }

    if (cancelled.length > 0) {
      // notify doctor (summary)
      await this.notificationService.createNotification({
        userId: String(doctor.id),
        type: 'appointments_cancelled',
        message: `${cancelled.length} appointments cancelled for ${slot.date} due to ${actionType}.`,
      });

      // log details
      const cancelledIds = cancelled.map((c) => c.id);
      this.logger.log(`[SlotService] Found ${cancelled.length} affected appointments outside new window`);
      this.logger.log(`[AppointmentService] Cancelling appointments: [${cancelledIds.join(', ')}]`);

      // Attempt auto-reschedule using appointmentService helper.
      // appointmentService.autoRescheduleCancelledAppointments expects appointments with patient relation.
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

      // Format logs for each result (desired console output)
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
