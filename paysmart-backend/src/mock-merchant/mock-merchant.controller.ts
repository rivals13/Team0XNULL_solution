import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

/**
 * MockMerchantController
 *
 * Simulates external merchant bill-inquiry APIs for development/testing.
 * Does NOT require JWT auth — it represents a 3rd-party merchant endpoint.
 */
@ApiTags('Mock Merchant (Dev/Test)')
@Controller('mock-merchant')
export class MockMerchantController {
  @Public()
  @Get(':slug/bill-inquiry')
  @ApiOperation({ summary: 'Mock bill inquiry endpoint (dev only — simulates external merchant API)' })
  @ApiParam({ name: 'slug', example: 'himalayan-college' })
  @ApiQuery({ name: 'customerId', example: '2024001', required: false })
  inquireBill(
    @Param('slug')              slug:       string,
    @Query('customerId') customerId: string,
  ) {
    const MOCKS: Record<string, object> = {
      'himalayan-college': {
        amount:        15000,
        dueDate:       '2026-06-15',
        description:   '2nd Semester Fee 2082/83',
        invoiceNumber: 'HC-2026-001',
        studentName:   'Demo Student',
      },
      'nea-electricity': {
        amount:        1250,
        dueDate:       '2026-06-10',
        description:   'NEA Electricity Bill May 2026',
        invoiceNumber: 'NEA-2026-005',
        meterReading:  '1234 kWh',
      },
      'vianet': {
        amount:        1050,
        dueDate:       '2026-06-07',
        description:   'Vianet Internet June 2026',
        invoiceNumber: 'VNT-2026-012',
      },
      'kukl-water': {
        amount:        450,
        dueDate:       '2026-06-20',
        description:   'KUKL Water Bill May 2026',
        invoiceNumber: 'KUKL-2026-008',
      },
      'nepal-traffic-police': {
        amount:      1000,
        dueDate:     '2026-07-15',
        description: 'Traffic Fine - No Helmet',
        chitNumber:  'KTM-2026-4521',
        violation:   'No Helmet',
      },
      'worldlink': {
        amount:        1299,
        dueDate:       '2026-06-12',
        description:   'WorldLink Internet June 2026',
        invoiceNumber: 'WL-2026-089',
      },
      'dishhome': {
        amount:        599,
        dueDate:       '2026-06-18',
        description:   'DishHome Family Pack June 2026',
        invoiceNumber: 'DH-2026-034',
      },
      'subisu': {
        amount:        999,
        dueDate:       '2026-06-08',
        description:   'Subisu Internet June 2026',
        invoiceNumber: 'SUB-2026-021',
      },
    };

    const mock = MOCKS[slug];
    if (!mock) {
      return {
        amount:        500,
        dueDate:       new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        description:   `${slug} bill`,
        invoiceNumber: `${slug.toUpperCase()}-2026-001`,
      };
    }
    return mock;
  }
}
