import { Controller, Post, Get, Body, Param, Patch } from '@nestjs/common';
import { SlotService } from './slot.service';

@Controller('api/v1/slots')
export class SlotController {
  constructor(private readonly slotService: SlotService) {}

  @Post()
  async createSlot(@Body() body: any) {
    return this.slotService.createSlot(body);
  }

  @Patch(':id')
  async updateSlot(@Param('id') id: number, @Body() body: any) {
    return this.slotService.updateSlot(id, body);
  }

  @Get('doctor/:doctorId')
  async getSlotsByDoctor(@Param('doctorId') doctorId: number) {
    return this.slotService.getSlotsByDoctor(doctorId);
  }
}
