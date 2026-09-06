import { db, sqlClient } from '../client';
import { quotes, quoteLines, customers, users, products } from '../schema/sales.schema';
import { invoices, invoiceLines, subscriptions, billingSchedules } from '../schema/billing.schema';
import { fulfillmentSplits, backorders } from '../schema/fulfillment.schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

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
      set: { totalAmount: '4050.00' },
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

  const existingSubscription = await db.select().from(subscriptions).where(eq(subscriptions.quoteId, q1.id));
  const [subscription] = existingSubscription.length
    ? existingSubscription
    : await db.insert(subscriptions).values({
        customerId: goldCust.id,
        quoteId: q1.id,
        productId: saasProd.id,
        planName: saasProd.name,
        status: 'active',
        quantity: 10,
        unitPrice: saasProd.basePrice,
        discountPct: '0.00',
        monthlyAmount: String(Number(saasProd.basePrice) * 10),
        amount: String(Number(saasProd.basePrice) * 10),
        mrr: String(Number(saasProd.basePrice) * 10),
        currency: 'USD',
        billingInterval: 'monthly',
        intervalDays: 30,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        nextBillingDate: new Date(Date.now() + 30 * 86400000),
      }).returning();

  const [invoice] = await db.insert(invoices).values({
    invoiceNumber: 'INV-DEMO-001',
    customerId: goldCust.id,
    quoteId: q1.id,
    invoiceType: 'one_time',
    totalAmount: '4050.00',
    subtotal: '4050.00',
    taxAmount: '0.00',
    discountAmount: '450.00',
    currency: 'USD',
    status: 'sent',
    dueDate: new Date(Date.now() + 14 * 86400000),
    issuedAt: new Date(),
    sentTo: 'procurement@acme.com',
  }).onConflictDoUpdate({
    target: invoices.invoiceNumber,
    set: { totalAmount: '4050.00', status: 'sent', quoteId: q1.id },
  }).returning();

  await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoice.id));
  await db.insert(invoiceLines).values({
    invoiceId: invoice.id,
    productId: hwProd.id,
    description: hwProd.name,
    quantity: 1,
    unitPrice: hwProd.basePrice,
    discountPct: '10.00',
    totalPrice: '4050.00',
    fulfillmentRequired: true,
  });

  await db.delete(billingSchedules).where(eq(billingSchedules.subscriptionId, subscription.id));
  for (let month = 0; month < 6; month += 1) {
    const start = new Date(Date.now() + month * 30 * 86400000);
    const end = new Date(Date.now() + (month + 1) * 30 * 86400000);
    await db.insert(billingSchedules).values({
      subscriptionId: subscription.id,
      scheduleDate: start,
      periodStart: start,
      periodEnd: end,
      dueDate: start,
      amount: String(Number(saasProd.basePrice) * 10),
      currency: 'USD',
      status: month === 0 ? 'pending' : 'pending',
    });
  }

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
      set: { totalAmount: '12000.00' },
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

  const warehouseRows: any = await db.execute(sql`SELECT id FROM fulfillment.warehouses ORDER BY code LIMIT 2`);
  const warehouseIds = (warehouseRows.rows || warehouseRows).map((row: { id: string }) => row.id);
  if (warehouseIds.length >= 2) {
    await db.execute(sql`DELETE FROM fulfillment.fulfillment_splits WHERE quote_id = ${q1.id}`);
    await db.insert(fulfillmentSplits).values({
      quoteId: q1.id,
      productId: hwProd.id,
      warehouseId: warehouseIds[0],
      allocatedQty: 1,
      shippingCost: '125.00',
      distanceKm: '32.00',
      status: 'pending',
      estimatedDeliveryDays: 3,
    });
    await db.execute(sql`DELETE FROM fulfillment.backorders WHERE quote_id = ${q2.id}`);
    await db.insert(backorders).values({
      quoteId: q2.id,
      productId: hwProd.id,
      requestedQty: 20,
      allocatedQty: 0,
      backorderQty: 20,
      status: 'open',
      estimatedRestockDate: new Date(Date.now() + 14 * 86400000),
    });
  }

  console.log(`✅ Demo quotes created: ${q1.quoteNumber} (ID: ${q1.id}) and ${q2.quoteNumber} (ID: ${q2.id})`);
  await sqlClient.end();
}

seedDemoQuotes();
