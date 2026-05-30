/**
 * prisma/seed.ts
 * Seeds mock merchants with billInquiryUrl pointing to the local mock endpoint.
 * Run: npx ts-node prisma/seed.ts  OR  npx prisma db seed
 */

import { PrismaClient, MerchantCategory } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { randomBytes } from 'crypto';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// NestJS global prefix = 'api', URI versioning = 'v1'
// → actual path: http://localhost:3000/api/v1/mock-merchant
const MOCK_BASE = 'http://localhost:3000/api/v1/mock-merchant';

interface MerchantSeed {
  name: string;
  slug: string;
  category: MerchantCategory;
  billInquiryUrl: string;
  description?: string;
}

const merchants: MerchantSeed[] = [
  {
    name:           'Himalayan College',
    slug:           'himalayan-college',
    category:       MerchantCategory.EDUCATION,
    billInquiryUrl: `${MOCK_BASE}/himalayan-college/bill-inquiry`,
    description:    'Himalayan College fee payment portal',
  },
  {
    name:           'NEA Electricity',
    slug:           'nea-electricity',
    category:       MerchantCategory.ELECTRICITY,
    billInquiryUrl: `${MOCK_BASE}/nea-electricity/bill-inquiry`,
    description:    'Nepal Electricity Authority bill payment',
  },
  {
    name:           'Vianet',
    slug:           'vianet',
    category:       MerchantCategory.INTERNET,
    billInquiryUrl: `${MOCK_BASE}/vianet/bill-inquiry`,
    description:    'Vianet internet bill payment',
  },
  {
    name:           'WorldLink',
    slug:           'worldlink',
    category:       MerchantCategory.INTERNET,
    billInquiryUrl: `${MOCK_BASE}/worldlink/bill-inquiry`,
    description:    'WorldLink internet bill payment',
  },
  {
    name:           'KUKL Water',
    slug:           'kukl-water',
    category:       MerchantCategory.WATER,
    billInquiryUrl: `${MOCK_BASE}/kukl-water/bill-inquiry`,
    description:    'Kathmandu Upatyaka Khanepani Limited water bill',
  },
  {
    name:           'Nepal Traffic Police',
    slug:           'nepal-traffic-police',
    category:       MerchantCategory.TRAFFIC,
    billInquiryUrl: `${MOCK_BASE}/nepal-traffic-police/bill-inquiry`,
    description:    'Nepal Traffic Police fine payment',
  },
  {
    name:           'DishHome',
    slug:           'dishhome',
    category:       MerchantCategory.TV,
    billInquiryUrl: `${MOCK_BASE}/dishhome/bill-inquiry`,
    description:    'DishHome satellite TV subscription',
  },
  {
    name:           'Subisu',
    slug:           'subisu',
    category:       MerchantCategory.INTERNET,
    billInquiryUrl: `${MOCK_BASE}/subisu/bill-inquiry`,
    description:    'Subisu internet bill payment',
  },
];

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter } as any);

  console.log('[Seed] Upserting mock merchants...');

  for (const m of merchants) {
    const merchant = await prisma.merchant.upsert({
      where:  { slug: m.slug },
      update: {
        name:           m.name,
        category:       m.category,
        billInquiryUrl: m.billInquiryUrl,
        description:    m.description,
        isActive:       true,
      },
      create: {
        name:           m.name,
        slug:           m.slug,
        category:       m.category,
        billInquiryUrl: m.billInquiryUrl,
        description:    m.description,
        apiKey:         `seed_${randomBytes(16).toString('hex')}`,
        isActive:       true,
      },
    });
    console.log(`  [OK] ${merchant.slug} (id: ${merchant.id})`);
  }

  console.log('[Seed] Done!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
