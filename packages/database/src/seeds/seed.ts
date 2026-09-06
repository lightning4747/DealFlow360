import { db } from '../client';
import {
  quotes,
  quoteLines,
  approvals,
  approvalSteps,
  invoices,
  invoiceLines,
  subscriptions,
  payments,
  products,
  customers,
  users,
} from '../schema/sales.schema';
import { warehouses, warehouseStock } from '../schema/fulfillment.schema';
import { seedCoreDomain } from './runners/seed-core';
import { eq } from 'drizzle-orm';

async function runSeed() {
  console.log('🚀 Launching Production-Grade Modular Data Seeder...');

  try {
    // 1. Seed Core Domain (Users, Tiers, Warehouses, Customers)
    const { insertedTiers, insertedUsers, insertedWarehouses, insertedCustomers } = await seedCoreDomain();

    // 2. Fetch or Ensure Catalog Products
    const catalogProducts = await db.select().from(products);
    if (catalogProducts.length === 0) {
      console.log('⚠️ Catalog products empty, please ensure base catalog products exist.');
    }

    // 3. Clear Stale Transactional Data for Clean High-Volume Injection
    console.log('🧹 Cleaning stale transactional records...');
    const { sqlClient } = await import('../client');
    await sqlClient`TRUNCATE sales.quotes, sales.quote_lines, sales.approvals, sales.approval_steps, billing.invoices, billing.invoice_lines, billing.subscriptions, billing.payments CASCADE;`;

    console.log('📦 Generating 105 Production-Grade Quotations...');

    const repList = Object.values(insertedUsers).filter((u) => u.role === 'sales_rep');
    const managerList = Object.values(insertedUsers).filter((u) => u.role === 'sales_manager');
    const financeList = Object.values(insertedUsers).filter((u) => u.role === 'finance');
    const customerList = Object.keys(insertedCustomers);

    const statuses = [
      'draft',
      'pending_approval',
      'sent',
      'under_negotiation',
      'confirmed',
      'fulfilled',
      'cancelled',
      'rejected',
    ] as const;

    const insertedQuoteIds: string[] = [];

    // Explicit Demo Anchor Quotes (Q-1042, Q-1039)
    const acmeId = insertedCustomers['procurement@acme.com'];
    const globexId = insertedCustomers['purchasing@globex.com'];
    const rep1 = insertedUsers['rep1@dealflow360.com']?.id || repList[0].id;
    const manager1 = insertedUsers['manager@dealflow360.com']?.id || managerList[0].id;
    const finance1 = insertedUsers['finance@dealflow360.com']?.id || financeList[0].id;

    if (acmeId && globexId) {
      // Q-1042
      const [q1042] = await db
        .insert(quotes)
        .values({
          quoteNumber: 'Q-1042',
          repId: rep1,
          customerId: acmeId,
          status: 'pending_approval',
          totalAmount: '12400.00',
          costTotal: '7500.00',
          grossMarginPct: '39.52',
          brsScore: '18.50',
          currentApprovalStep: 1,
        })
        .returning();

      const [app1042] = await db
        .insert(approvals)
        .values({ quoteId: q1042.id, brsScore: '18.50', approvalLevel: 'level_2', status: 'pending' })
        .returning();

      await db.insert(approvalSteps).values([
        { approvalId: app1042.id, stepOrder: 1, roleRequired: 'sales_manager', assignedUserId: manager1, decision: 'pending' },
      ]);

      // Q-1039
      const [q1039] = await db
        .insert(quotes)
        .values({
          quoteNumber: 'Q-1039',
          repId: rep1,
          customerId: globexId,
          status: 'pending_approval',
          totalAmount: '29700.00',
          costTotal: '18000.00',
          grossMarginPct: '39.39',
          brsScore: '12.00',
          currentApprovalStep: 1,
        })
        .returning();

      const [app1039] = await db
        .insert(approvals)
        .values({ quoteId: q1039.id, brsScore: '12.00', approvalLevel: 'level_1', status: 'pending' })
        .returning();

      await db.insert(approvalSteps).values([
        { approvalId: app1039.id, stepOrder: 1, roleRequired: 'finance', assignedUserId: finance1, decision: 'pending' },
      ]);

      insertedQuoteIds.push(q1042.id, q1039.id);
    }

    // Generate remaining 103 quotes dynamically
    for (let i = 1; i <= 103; i++) {
      const quoteNum = `Q-${2000 + i}`;
      const assignedRep = repList[i % repList.length];
      const customerEmail = customerList[i % customerList.length];
      const custId = insertedCustomers[customerEmail];
      const status = statuses[i % statuses.length];

      const amountVal = (1500 + (i * 350) % 45000).toFixed(2);
      const costVal = (parseFloat(amountVal) * 0.65).toFixed(2);
      const brsVal = (5.0 + (i * 1.7) % 22.0).toFixed(2);

      const [q] = await db
        .insert(quotes)
        .values({
          quoteNumber: quoteNum,
          repId: assignedRep.id,
          customerId: custId,
          status,
          totalAmount: amountVal,
          costTotal: costVal,
          grossMarginPct: '35.00',
          brsScore: brsVal,
          currentApprovalStep: 1,
        })
        .returning();

      // Seed line items for this quote
      if (catalogProducts.length > 0) {
        const prod = catalogProducts[i % catalogProducts.length];
        await db.insert(quoteLines).values({
          quoteId: q.id,
          productId: prod.id,
          quantity: 2 + (i % 10),
          unitPrice: prod.basePrice,
          unitCost: prod.unitCost || '100.00',
          discountPct: (i % 15).toFixed(2),
          lineTotal: amountVal,
          lineType: prod.category === 'subscription' ? 'recurring' : 'one_time',
        });
      }

      // Seed Governance Approvals if pending_approval, confirmed, or rejected
      if (status === 'pending_approval' || status === 'confirmed' || status === 'rejected') {
        const reqRole = parseFloat(brsVal) > 15 ? 'finance' : 'sales_manager';
        const assignedUser = reqRole === 'finance' ? financeList[i % financeList.length].id : managerList[i % managerList.length].id;
        const appStatus = status === 'pending_approval' ? 'pending' : status === 'confirmed' ? 'approved' : 'rejected';

        const [app] = await db
          .insert(approvals)
          .values({
            quoteId: q.id,
            brsScore: brsVal,
            approvalLevel: parseFloat(brsVal) > 15 ? 'level_2' : 'level_1',
            status: appStatus as any,
          })
          .returning();

        await db.insert(approvalSteps).values({
          approvalId: app.id,
          stepOrder: 1,
          roleRequired: reqRole as any,
          assignedUserId: assignedUser,
          decision: appStatus as any,
        });
      }

      // Seed Invoices & Payments for confirmed / fulfilled quotes
      if (status === 'confirmed' || status === 'fulfilled') {
        const invNum = `INV-${5000 + i}`;
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const invRows = await sqlClient`
          INSERT INTO billing.invoices (invoice_number, customer_id, quote_id, total_amount, subtotal, tax_amount, status, due_date)
          VALUES (${invNum}, ${custId}, ${q.id}, ${amountVal}, ${amountVal}, ${(parseFloat(amountVal) * 0.08).toFixed(2)}, ${status === 'fulfilled' ? 'paid' : 'pending'}, ${dueDate})
          RETURNING id;
        `;
        const invId = invRows[0].id;

        if (status === 'fulfilled') {
          const gwId = `pay_test_${i}_${Date.now()}`;
          await sqlClient`
            INSERT INTO billing.payments (invoice_id, customer_id, amount, status, payment_method, gateway_transaction_id)
            VALUES (${invId}, ${custId}, ${amountVal}, 'succeeded', 'card', ${gwId});
          `;
        }
      }
    }

    // Seed stock inventory across all 12 spatial warehouses
    console.log('📦 Seeding warehouse inventory stock across all 12 spatial hubs...');
    for (const whCode of Object.keys(insertedWarehouses)) {
      const whId = insertedWarehouses[whCode];
      for (const prod of catalogProducts) {
        await sqlClient`
          INSERT INTO fulfillment.warehouse_stock (warehouse_id, product_id, available_qty, reserved_qty)
          VALUES (${whId}, ${prod.id}, 150, 10)
          ON CONFLICT (warehouse_id, product_id)
          DO UPDATE SET available_qty = 150;
        `;
      }
    }

    console.log('🎉 Production-Grade Seeding Completed Successfully!');
    console.log(`✅ Seeded ${Object.keys(insertedUsers).length} Users.`);
    console.log(`✅ Seeded ${Object.keys(insertedWarehouses).length} Spatial Warehouses.`);
    console.log(`✅ Seeded 105 Quotations & Approval Workflows.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed with error:', err);
    process.exit(1);
  }
}

runSeed();
