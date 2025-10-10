import { Controller, Get, Param, Post, Body, Patch } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly notifService: NotificationService) {}

  // ✅ Fix: userId is now string, since Notification.userId is string
  @Get(':userId')
  async getUserNotifications(@Param('userId') userId: string) {
    return this.notifService.getUserNotifications(userId);
  }

  @Post()
  async createNotification(@Body() body: any) {
    return this.notifService.createNotification(body);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notifService.markAsRead(id);
  }
}
