import { Controller, Post, Get, Body, Param, Patch, Query } from '@nestjs/common';
import { SlotService } from './slot.service';

@Controller('api/v1/slots')
export class SlotController {
  constructor(private readonly slotService: SlotService) {}

  // ✅ Create new slot
  @Post()
  async createSlot(@Body() body: any) {
    return this.slotService.createSlot(body);
  }

  // ✅ Update slot
  @Patch(':id')
  async updateSlot(@Param('id') id: number, @Body() body: any) {
    return this.slotService.updateSlot(id, body);
  }

  // ✅ Get all slots of a doctor (with optional date)
  @Get('doctor/:doctorId')
  async getSlotsByDoctor(
    @Param('doctorId') doctorId: number,
    @Query('date') date?: string,
  ) {
    return this.slotService.getSlotsByDoctor(doctorId, date);
  }

  // ✅ Expand Session (Elastic Scheduling)
  @Post('expand')
  async expandSession(@Body() body: any) {
    const { doctorId, date, newStart, newEnd } = body;
    return this.slotService.expandSession(doctorId, date, newStart, newEnd);
  }

  // ✅ Shrink Session (Elastic Scheduling)
  @Post('shrink')
  async shrinkSession(@Body() body: any) {
    const { doctorId, date, newStart, newEnd } = body;
    return this.slotService.shrinkSession(doctorId, date, newStart, newEnd);
  }

  // ✅ Dynamic Capacity Adjustment (Elastic Scheduling Enhancement)
  @Post('adjust-capacity')
  async adjustSlotCapacity(@Body() body: any) {
    const { doctorId, slotId, newCapacity } = body;
    return this.slotService.adjustSlotCapacity(doctorId, slotId, newCapacity);
  }

  // ✅ Reduce Subslot Duration
  @Post('reduce-subslot')
  async reduceSubslot(@Body() body: any) {
    const { doctorId, slotId, reductionPercent } = body;
    return this.slotService.reduceSubslotDuration(doctorId, slotId, reductionPercent);
  }

  // ✅ Unified Refactored Capacity & Scheduling Logic (New)
  @Post('update-scheduling')
  async updateScheduling(@Body() body: any) {
    return this.slotService.applySchedulingUpdate(body);
  }
}
