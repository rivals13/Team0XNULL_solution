import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Schedule')
@ApiBearerAuth('JWT')
@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // ─── Core CRUD ─────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Create a payment schedule',
    description:
      'Creates the schedule in DB, enqueues a balance-check job 1 day before ' +
      'and 1 hour before execution, then sends a confirmation SMS.',
  })
  create(@CurrentUser() user: any, @Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all schedules for the current user' })
  findAll(@CurrentUser() user: any) {
    return this.scheduleService.findAllByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single schedule' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.scheduleService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a schedule',
    description: 'If nextRunAt changes, old balance-check jobs are removed and new ones queued.',
  })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.scheduleService.update(id, user.id, dto);
  }

  // ─── State transitions ─────────────────────────────────────────────────────

  @Patch(':id/pause')
  @ApiOperation({
    summary: 'Pause a schedule',
    description: 'Removes pending balance-check jobs from the queue.',
  })
  pause(@CurrentUser() user: any, @Param('id') id: string) {
    return this.scheduleService.pause(id, user.id);
  }

  @Patch(':id/resume')
  @ApiOperation({
    summary: 'Resume a paused schedule',
    description: 'Re-enqueues balance-check jobs for the next run.',
  })
  resume(@CurrentUser() user: any, @Param('id') id: string) {
    return this.scheduleService.resume(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a schedule',
    description: 'Permanently cancels the schedule and removes all pending queue jobs.',
  })
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.scheduleService.cancel(id, user.id);
  }

  // ─── Queue introspection ───────────────────────────────────────────────────

  @Get(':id/balance-check-status')
  @ApiOperation({ summary: 'Check whether balance-check jobs are queued for this schedule' })
  async balanceCheckStatus(@CurrentUser() user: any, @Param('id') id: string) {
    await this.scheduleService.findOne(id, user.id); // ownership check
    return this.scheduleService.getBalanceCheckJobStatus(id);
  }
}
