import {
  Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class UpdateFcmTokenDto {
  @ApiProperty({ example: 'fcm_device_token_here' })
  @IsString()
  fcmToken: string;
}

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated notification history' })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: any,
    @Query('page')  page  = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.getNotifications(user.id, +page, +limit);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  unreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.id).then((count) => ({ count }));
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  markRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Post('fcm-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register or update FCM device token for push notifications' })
  updateFcmToken(@CurrentUser() user: any, @Body() dto: UpdateFcmTokenDto) {
    return this.notificationsService.updateFcmToken(user.id, dto.fcmToken);
  }

  @Get('ws/status')
  @ApiOperation({ summary: 'WebSocket server stats — online users, is current user online' })
  wsStatus(@CurrentUser() user: any) {
    return {
      onlineUsers: this.gateway.getOnlineUserCount(),
      youAreOnline: this.gateway.isUserOnline(user.id),
      wsEndpoint: '/notifications',
    };
  }
}
