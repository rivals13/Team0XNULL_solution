import { Controller, Get, Patch, Param, Req, Body } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService, UserPreferences } from './users.service';

interface AuthRequest extends Request {
  user: { id: string };
}

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // ─── GET /users/health-score/:userId ──────────────────────────────────────

  @Get('health-score/:userId')
  @ApiParam({ name: 'userId', description: 'PaySmart user ID' })
  @ApiOperation({
    summary: 'Get financial health score for a user',
    description: `
Calculates a **0–100 financial health score** based on three factors:

| Factor | Weight | Direction |
|---|---|---|
| On-time bill payments | × 2 | Positive |
| Missed / overdue payments | × 3 | Negative |
| Avg balance maintained (proxy: avg completed-txn amount) | 0–20 pts | Positive |

**Formula**: \`score = clamp(50 + (on_time × 2) − (missed × 3) + balance_score, 0, 100)\`

**Grades**: A (80-100) · B (60-79) · C (40-59) · D (20-39) · F (0-19)
    `.trim(),
  })
  @ApiResponse({
    status: 200,
    description: 'Health score with full breakdown',
    schema: {
      example: {
        score: 74,
        grade: 'B',
        breakdown: {
          on_time_payments: 8,
          missed_payments: 2,
          avg_balance_maintained: 6500,
          on_time_contribution: 16,
          missed_penalty: -6,
          balance_score: 5,
        },
        insight: 'Good overall, but reducing missed payments will push you higher.',
        calculatedAt: '2026-05-26T08:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  getHealthScore(@Param('userId') userId: string) {
    return this.users.getHealthScore(userId);
  }

  // ─── GET /users/preferences ───────────────────────────────────────────────

  @Get('preferences')
  @ApiOperation({ summary: 'Get the current user\'s payment preferences' })
  getPreferences(@Req() req: AuthRequest) {
    return this.users.getPreferences(req.user.id);
  }

  // ─── PATCH /users/preferences ─────────────────────────────────────────────

  @Patch('preferences')
  @ApiOperation({ summary: 'Update payment preferences (partial update)' })
  updatePreferences(@Req() req: AuthRequest, @Body() body: Partial<UserPreferences>) {
    return this.users.updatePreferences(req.user.id, body);
  }

  // ─── GET /users/bills/my ──────────────────────────────────────────────────

  @Get('bills/my')
  @ApiOperation({ summary: 'Get all pending/overdue bills for the current student' })
  @ApiResponse({ status: 200, description: 'List of bills' })
  getMyBills(@Req() req: AuthRequest) {
    return this.users.getBillsForUser(req.user.id);
  }

  // ─── GET /users/:id ────────────────────────────────────────────────────────

  @Get(':id')
  @ApiParam({ name: 'id', description: 'PaySmart user ID' })
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.users.findById(id);
  }
}
