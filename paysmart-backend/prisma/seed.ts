/**
 * prisma/seed.ts
 * Seeds mock merchants with billInquiryUrl + payment methods for end-to-end testing.
 * Run: npx ts-node prisma/seed.ts  OR  npx prisma db seed
 */

import { PrismaClient, MerchantCategory } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { randomBytes } from 'crypto';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MOCK_BASE = 'http://localhost:3000/api/v1/mock-merchant';

interface MerchantSeed {
  name:            string;
  slug:            string;
  category:        MerchantCategory;
  description?:    string;
  billInquiryUrl:  string;
  paymentMethods?: object; // JSON stored in paymentMethods column: { esewa, banks }
}

const merchants: MerchantSeed[] = [
  {
    name:           'Himalayan College',
    slug:           'himalayan-college',
    category:       MerchantCategory.EDUCATION,
    description:    'Himalayan College fee payment portal',
    billInquiryUrl: `${MOCK_BASE}/himalayan-college/bill-inquiry`,
    paymentMethods: {
      esewa: '9841234567',
      banks: [
        { bankName: 'NIC Asia Bank',   accountNumber: '0110100123456701', accountHolder: 'Himalayan College Pvt. Ltd.', branchCode: 'Baneshwor, Kathmandu' },
        { bankName: 'Global IME Bank', accountNumber: '00101010012345',   accountHolder: 'Himalayan College Pvt. Ltd.', branchCode: 'Koteshwor, Kathmandu' },
      ],
    },
  },
  {
    name:           'NEA Electricity',
    slug:           'nea-electricity',
    category:       MerchantCategory.ELECTRICITY,
    description:    'Nepal Electricity Authority bill payment',
    billInquiryUrl: `${MOCK_BASE}/nea-electricity/bill-inquiry`,
    paymentMethods: {
      esewa: '9800000001',
      banks: [
        { bankName: 'Rastriya Banijya Bank', accountNumber: '100010001234560', accountHolder: 'Nepal Electricity Authority', branchCode: 'Durbar Marg, Kathmandu' },
      ],
    },
  },
  {
    name:           'KUKL Water',
    slug:           'kukl-water',
    category:       MerchantCategory.WATER,
    description:    'KUKL water bill payment',
    billInquiryUrl: `${MOCK_BASE}/kukl-water/bill-inquiry`,
    paymentMethods: {
      esewa: '9800000002',
      banks: [
        { bankName: 'Nepal Bank Ltd.', accountNumber: '0010010012345', accountHolder: 'KUKL', branchCode: 'Tripureshwor, Kathmandu' },
      ],
    },
  },
  {
    name:           'Vianet',
    slug:           'vianet',
    category:       MerchantCategory.INTERNET,
    description:    'Vianet internet bill payment',
    billInquiryUrl: `${MOCK_BASE}/vianet/bill-inquiry`,
    paymentMethods: { esewa: '9800000010' },
  },
  {
    name:           'WorldLink',
    slug:           'worldlink',
    category:       MerchantCategory.INTERNET,
    description:    'WorldLink Communications internet bill',
    billInquiryUrl: `${MOCK_BASE}/worldlink/bill-inquiry`,
    paymentMethods: { esewa: '9800000011' },
  },
  {
    name:           'Subisu',
    slug:           'subisu',
    category:       MerchantCategory.INTERNET,
    description:    'Subisu CableNet internet bill',
    billInquiryUrl: `${MOCK_BASE}/subisu/bill-inquiry`,
    paymentMethods: { esewa: '9800000012' },
  },
  {
    name:           'DishHome',
    slug:           'dishhome',
    category:       MerchantCategory.TV,
    description:    'DishHome satellite TV subscription',
    billInquiryUrl: `${MOCK_BASE}/dishhome/bill-inquiry`,
    paymentMethods: { esewa: '9800000020' },
  },
  {
    name:           'Nepal Traffic Police',
    slug:           'nepal-traffic-police',
    category:       MerchantCategory.TRAFFIC,
    description:    'Nepal Traffic Police fine payment (e-Challan)',
    billInquiryUrl: `${MOCK_BASE}/nepal-traffic-police/bill-inquiry`,
    paymentMethods: {
      esewa: '9800000030',
      banks: [
        { bankName: 'Rastriya Banijya Bank', accountNumber: '100010009876540', accountHolder: 'Nepal Traffic Police', branchCode: 'Naxal, Kathmandu' },
      ],
    },
  },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma  = new PrismaClient({ adapter } as any);

  console.log('[Seed] Upserting mock merchants...\n');

  for (const m of merchants) {
    const merchant = await prisma.merchant.upsert({
      where:  { slug: m.slug },
      update: {
        name:           m.name,
        category:       m.category,
        billInquiryUrl: m.billInquiryUrl,
        description:    m.description,
        paymentMethods: m.paymentMethods ?? undefined,
        isActive:       true,
      },
      create: {
        name:           m.name,
        slug:           m.slug,
        category:       m.category,
        billInquiryUrl: m.billInquiryUrl,
        description:    m.description,
        paymentMethods: m.paymentMethods ?? undefined,
        apiKey:         `seed_${randomBytes(16).toString('hex')}`,
        isActive:       true,
      },
    });
    const pm = m.paymentMethods as any;
    console.log(`  ✓ ${merchant.slug.padEnd(25)} eSewa: ${pm?.esewa ?? 'none'}`);
  }

  console.log('\n[Seed] Done!');
  console.log('\n════════════════════════════════════════════════════════════');
  console.log(' TEST ACCOUNTS — enter these in Smart Bills to get a bill');
  console.log('════════════════════════════════════════════════════════════');
  console.log(' Feature           Customer ID      Amount    Due date');
  console.log('────────────────────────────────────────────────────────────');
  console.log(' Himalayan College  2024001         15,000    2026-05-31');
  console.log(' Himalayan College  2024002         12,000    2026-05-31');
  console.log(' Himalayan College  2024003         25,000    2026-05-31');
  console.log(' NEA Electricity    123456           1,450    2026-05-31');
  console.log(' NEA Electricity    789012             980    2026-05-31');
  console.log(' KUKL Water         KUKL-1234          450    2026-05-31');
  console.log(' Vianet             VNT-001           1,050    2026-05-31');
  console.log(' WorldLink          WL-12345          1,299    2026-05-31');
  console.log(' DishHome           DH-001234           599    2026-05-31');
  console.log(' Traffic Police     KTM-2026-100      1,000    2026-05-31');
  console.log(' Traffic Police     KTM-2026-200      2,000    2026-05-31');
  console.log('════════════════════════════════════════════════════════════');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
