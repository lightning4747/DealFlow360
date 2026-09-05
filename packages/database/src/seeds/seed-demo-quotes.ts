import { db, sqlClient } from '../client';
import { quotes, quoteLines, customers, users, products } from '../schema/sales.schema';
import { eq } from 'drizzle-orm';

async function seedDemoQuotes() {
  console.log('Seeding demo quotes for BRS calculation presentation...');

  // 1. Get a rep
  const [rep] = await db.select().from(users).where(eq(users.email, 'rep1@dealflow360.com'));
  // 2. Get customer
  const [goldCust] = await db.select().from(customers).where(eq(customers.name, 'Acme Corporation'));
  // 3. Get products
  const allProds = await db.select().from(products);
  const hwProd = allProds.find((p) => p.category === 'hardware') || allProds[0];
  const saasProd = allProds.find((p) => p.category === 'subscription') || allProds[1];

  // Expiration 7 days in future
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Quote 1: Within ceiling (BRS = 0 => Auto-Approve)
  const q1Num = 'QTE-DEMO-001-AUTO';
  const [q1] = await db
    .insert(quotes)
    .values({
      quoteNumber: q1Num,
      repId: rep.id,
      customerId: goldCust.id,
      status: 'draft',
      totalAmount: '4050.00',
      expiresAt,
    })
    .onConflictDoUpdate({
      target: quotes.quoteNumber,
      set: { status: 'draft', totalAmount: '4050.00' },
    })
    .returning();

  await db.delete(quoteLines).where(eq(quoteLines.quoteId, q1.id));
  await db.insert(quoteLines).values([
    {
      quoteId: q1.id,
      productId: hwProd.id,
      quantity: 1,
      unitPrice: hwProd.basePrice,
      discountPct: '10.00', // Gold hardware ceiling is 20% -> 0% violation!
      lineTotal: String(Number(hwProd.basePrice) * 0.9),
      lineType: 'one_time',
    },
  ]);

  // Quote 2: Breaches ceiling (BRS ~ 35 => Level 2: Sales Manager + Finance)
  const q2Num = 'QTE-DEMO-002-L2';
  const [q2] = await db
    .insert(quotes)
    .values({
      quoteNumber: q2Num,
      repId: rep.id,
      customerId: goldCust.id,
      status: 'draft',
      totalAmount: '12000.00',
      expiresAt,
    })
    .onConflictDoUpdate({
      target: quotes.quoteNumber,
      set: { status: 'draft', totalAmount: '12000.00' },
    })
    .returning();

  await db.delete(quoteLines).where(eq(quoteLines.quoteId, q2.id));
  await db.insert(quoteLines).values([
    {
      quoteId: q2.id,
      productId: hwProd.id,
      quantity: 2,
      unitPrice: hwProd.basePrice,
      discountPct: '27.00', // Gold ceiling 20% -> (27 - 20)/20 * 100 = 35% violation!
      lineTotal: String(Number(hwProd.basePrice) * 2 * 0.73),
      lineType: 'one_time',
    },
  ]);

  console.log(`✅ Demo quotes created: ${q1.quoteNumber} (ID: ${q1.id}) and ${q2.quoteNumber} (ID: ${q2.id})`);
  await sqlClient.end();
}

seedDemoQuotes();
