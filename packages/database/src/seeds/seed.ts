import { db, sqlClient } from '../client';
import { users, customerTiers, products, priceLists, priceListItems, customers, discountCeilings, productRecommendations, quotes, approvals, approvalSteps } from '../schema/sales.schema';
import { warehouses, warehouseStock } from '../schema/fulfillment.schema';
import { eq, inArray } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // 1. Seed Customer Tiers
    console.log('Seeding customer tiers...');
    const tierData = [
      {
        name: 'Standard',
        code: 'STD',
        maxDiscountPct: '10.00',
        approvalThresholdPct: '5.00',
        description: 'Standard tier - baseline commercial terms (up to 10% discount)',
      },
      {
        name: 'Silver',
        code: 'SLV',
        maxDiscountPct: '15.00',
        approvalThresholdPct: '8.00',
        description: 'Silver partner tier (up to 15% discount)',
      },
      {
        name: 'Gold',
        code: 'GLD',
        maxDiscountPct: '25.00',
        approvalThresholdPct: '15.00',
        description: 'Gold enterprise tier (up to 25% discount)',
      },
      {
        name: 'Platinum',
        code: 'PLT',
        maxDiscountPct: '35.00',
        approvalThresholdPct: '20.00',
        description: 'Platinum strategic account tier (up to 35% discount)',
      },
    ];

    const insertedTiers: Record<string, string> = {};
    for (const t of tierData) {
      const [record] = await db
        .insert(customerTiers)
        .values(t)
        .onConflictDoUpdate({
          target: customerTiers.code,
          set: {
            maxDiscountPct: t.maxDiscountPct,
            approvalThresholdPct: t.approvalThresholdPct,
            description: t.description,
          },
        })
        .returning();
      insertedTiers[t.code] = record.id;
    }
    console.log(`✅ ${tierData.length} customer tiers seeded.`);

    // 2. Seed Users
    console.log('Seeding RBAC users...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const userData = [
      { email: 'admin@dealflow360.com', name: 'System Administrator', role: 'admin' as const },
      { email: 'rep1@dealflow360.com', name: 'Alice Rep', role: 'sales_rep' as const },
      { email: 'rep2@dealflow360.com', name: 'Bob Rep', role: 'sales_rep' as const },
      { email: 'manager@dealflow360.com', name: 'Carol Manager', role: 'sales_manager' as const },
      { email: 'finance@dealflow360.com', name: 'Dave Finance', role: 'finance' as const },
      { email: 'procurement@acme.com', name: 'Sarah Connor (Acme Corp)', role: 'customer' as const },
      { email: 'purchasing@globex.com', name: 'Hank Scorpio (Globex)', role: 'customer' as const },
      { email: 'billing@initech.com', name: 'Peter Gibbons (Initech)', role: 'customer' as const },
      { email: 'ops@apexlogistics.com', name: 'Elena Rostova (Apex Logistics)', role: 'customer' as const },
      { email: 'it-purchasing@nexushealth.org', name: 'Marcus Vance (Nexus Health)', role: 'customer' as const },
    ];

    const insertedUsers: Record<string, string> = {};
    for (const u of userData) {
      const [record] = await db
        .insert(users)
        .values({
          email: u.email,
          name: u.name,
          role: u.role,
          hashedPassword: passwordHash,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: { name: u.name, role: u.role, hashedPassword: passwordHash },
        })
        .returning();
      insertedUsers[u.email] = record.id;
    }
    console.log(`✅ ${userData.length} users seeded.`);

    // 3. Seed 20 Base Products
    console.log('Seeding 20 products...');
    const productData = [
      // Hardware
      {
        sku: 'HW-SRV-001',
        name: 'Enterprise Rack Server 1U (Dual Xeon 32C, 256GB RAM)',
        category: 'hardware' as const,
        basePrice: '4500.00',
        unitCost: '3000.00',
        unit: 'each',
        taxRate: '0.0800',
        description: '1U High-density compute node for virtualization',
      },
      {
        sku: 'HW-SRV-002',
        name: 'Enterprise Rack Server 2U (Dual EPYC 64C, 512GB RAM)',
        category: 'hardware' as const,
        basePrice: '8200.00',
        unitCost: '5500.00',
        unit: 'each',
        taxRate: '0.0800',
        description: '2U Scalable compute server with NVMe backplane',
      },
      {
        sku: 'HW-SW-24P',
        name: 'Managed Gigabit Switch 24-Port PoE+',
        category: 'hardware' as const,
        basePrice: '1200.00',
        unitCost: '750.00',
        unit: 'each',
        taxRate: '0.0800',
        description: 'L3 managed access switch with 4x 10G SFP+ uplinks',
      },
      {
        sku: 'HW-SW-48P',
        name: 'Enterprise PoE+ Switch 48-Port 10GbE',
        category: 'hardware' as const,
        basePrice: '2800.00',
        unitCost: '1800.00',
        unit: 'each',
        taxRate: '0.0800',
        description: 'High-bandwidth campus aggregation switch',
      },
      {
        sku: 'HW-FW-10G',
        name: 'NextGen Security Gateway 10Gbps',
        category: 'hardware' as const,
        basePrice: '6500.00',
        unitCost: '4200.00',
        unit: 'each',
        taxRate: '0.0800',
        description: 'Hardware firewall appliance with deep packet inspection',
      },
      {
        sku: 'HW-SAN-50T',
        name: 'Storage Area Network Array 50TB All-Flash',
        category: 'hardware' as const,
        basePrice: '14000.00',
        unitCost: '9500.00',
        unit: 'each',
        taxRate: '0.0800',
        description: 'Redundant dual-controller active-active NVMe array',
      },
      {
        sku: 'HW-UPS-3KVA',
        name: 'Online Rackmount Smart-UPS 3kVA',
        category: 'hardware' as const,
        basePrice: '1850.00',
        unitCost: '1100.00',
        unit: 'each',
        taxRate: '0.0800',
        description: 'Zero-transfer time double-conversion battery backup',
      },
      // SaaS Subscriptions
      {
        sku: 'SAAS-CORE-MO',
        name: 'DealFlow360 Core Platform Monthly',
        category: 'subscription' as const,
        basePrice: '99.00',
        unitCost: '15.00',
        unit: 'seat/month',
        taxRate: '0.0000',
        description: 'Standard SaaS license billed per active user monthly',
      },
      {
        sku: 'SAAS-CORE-YR',
        name: 'DealFlow360 Core Platform Annual',
        category: 'subscription' as const,
        basePrice: '990.00',
        unitCost: '150.00',
        unit: 'seat/year',
        taxRate: '0.0000',
        description: 'Annual commit license per user with 2 months free equivalent',
      },
      {
        sku: 'SAAS-PRO-MO',
        name: 'DealFlow360 Enterprise Pro Monthly',
        category: 'subscription' as const,
        basePrice: '199.00',
        unitCost: '25.00',
        unit: 'seat/month',
        taxRate: '0.0000',
        description: 'Pro tier including unlimited approval hierarchies & Kafka feeds',
      },
      {
        sku: 'SAAS-PRO-YR',
        name: 'DealFlow360 Enterprise Pro Annual',
        category: 'subscription' as const,
        basePrice: '1990.00',
        unitCost: '250.00',
        unit: 'seat/year',
        taxRate: '0.0000',
        description: 'Annual enterprise commit with dedicated customer success engineer',
      },
      {
        sku: 'SAAS-AI-ADDON',
        name: 'AI Quotation & Copilot Addon',
        category: 'subscription' as const,
        basePrice: '49.00',
        unitCost: '8.00',
        unit: 'user/month',
        taxRate: '0.0000',
        description: 'Automated deal intelligence and pricing recommendation assistant',
      },
      {
        sku: 'SAAS-AUDIT-COMP',
        name: 'Advanced Compliance & Immutable Audit Retention',
        category: 'subscription' as const,
        basePrice: '299.00',
        unitCost: '30.00',
        unit: 'tenant/month',
        taxRate: '0.0000',
        description: '7-year WORM compliance retention and cryptographic chain verification',
      },
      {
        sku: 'SAAS-API-BURST',
        name: 'High-Throughput API Gateway Tier',
        category: 'subscription' as const,
        basePrice: '450.00',
        unitCost: '50.00',
        unit: 'tenant/month',
        taxRate: '0.0000',
        description: '10,000 req/min rate limit allocation on Kong gateway',
      },
      // Professional Services
      {
        sku: 'PS-ONBOARD-01',
        name: 'Standard Enterprise Onboarding Package',
        category: 'services' as const,
        basePrice: '5000.00',
        unitCost: '2500.00',
        unit: 'package',
        taxRate: '0.0000',
        description: '4-week guided installation, catalog ingestion, and RBAC rollout',
      },
      {
        sku: 'PS-ARCH-CONS',
        name: 'Principal Solutions Architect Consulting (Per Day)',
        category: 'services' as const,
        basePrice: '2400.00',
        unitCost: '1200.00',
        unit: 'day',
        taxRate: '0.0000',
        description: 'Dedicated solution architect for custom pipeline architecture',
      },
      {
        sku: 'PS-DATA-MIGR',
        name: 'Legacy CRM & Billing Data Migration Service',
        category: 'services' as const,
        basePrice: '8500.00',
        unitCost: '4000.00',
        unit: 'engagement',
        taxRate: '0.0000',
        description: 'Full historical quote, customer, and contract extraction & validation',
      },
      {
        sku: 'PS-TRAIN-WKS',
        name: 'Sales Rep & Operations Training Workshop',
        category: 'services' as const,
        basePrice: '3500.00',
        unitCost: '1500.00',
        unit: 'session',
        taxRate: '0.0000',
        description: 'Live interactive training session with role-based certification',
      },
      {
        sku: 'PS-CUSTOM-INT',
        name: 'Custom ERP / Billing Integration Engagement',
        category: 'services' as const,
        basePrice: '12000.00',
        unitCost: '6500.00',
        unit: 'project',
        taxRate: '0.0000',
        description: 'Bespoke webhook/Kafka connector built to ERP endpoints',
      },
      {
        sku: 'PS-SLA-PREM',
        name: '24/7 Premium Mission-Critical Support SLA',
        category: 'services' as const,
        basePrice: '1500.00',
        unitCost: '600.00',
        unit: 'month',
        taxRate: '0.0000',
        description: '15-minute response time SLA with dedicated escalation hotline',
      },
    ];

    const insertedProducts: Record<string, string> = {};
    for (const p of productData) {
      const [record] = await db
        .insert(products)
        .values(p)
        .onConflictDoUpdate({
          target: products.sku,
          set: {
            name: p.name,
            category: p.category,
            basePrice: p.basePrice,
            unitCost: p.unitCost,
            unit: p.unit,
            description: p.description,
          },
        })
        .returning();
      insertedProducts[p.sku] = record.id;
    }
    console.log(`✅ ${productData.length} products seeded.`);

    // 4. Seed Price Lists & Overrides
    console.log('Seeding Price Lists...');
    const [goldPriceList] = await db
      .insert(priceLists)
      .values({
        name: 'Gold Enterprise Preferred Pricing',
        tierId: insertedTiers['GLD'],
      })
      .returning();

    // Add item overrides for Gold tier
    await db
      .insert(priceListItems)
      .values([
        {
          priceListId: goldPriceList.id,
          productId: insertedProducts['HW-SRV-001'],
          price: '3825.00', // 15% discount
        },
        {
          priceListId: goldPriceList.id,
          productId: insertedProducts['SAAS-PRO-YR'],
          price: '1592.00', // 20% discount
        },
      ])
      .onConflictDoNothing();
    console.log('✅ Price Lists and overrides seeded.');

    // 5. Seed Enterprise Customers
    console.log('Seeding enterprise accounts...');
    const customerData = [
      {
        name: 'Acme Corporation',
        email: 'procurement@acme.com',
        company: 'Acme Industrial Corp',
        tier: 'gold' as const,
        tierId: insertedTiers['GLD'],
        creditLimit: '500000.00',
        location: 'San Francisco, CA',
        deliveryLatitude: '37.774900',
        deliveryLongitude: '-122.419400',
      },
      {
        name: 'Globex Systems',
        email: 'purchasing@globex.com',
        company: 'Globex Corporation',
        tier: 'silver' as const,
        tierId: insertedTiers['SLV'],
        creditLimit: '250000.00',
        location: 'Austin, TX',
        deliveryLatitude: '30.267200',
        deliveryLongitude: '-97.743100',
      },
      {
        name: 'Initech Software',
        email: 'billing@initech.com',
        company: 'Initech LLC',
        tier: 'bronze' as const,
        tierId: insertedTiers['STD'],
        creditLimit: '50000.00',
        location: 'Dallas, TX',
        deliveryLatitude: '32.776700',
        deliveryLongitude: '-96.797000',
      },
      {
        name: 'Apex Logistics Global',
        email: 'ops@apexlogistics.com',
        company: 'Apex Logistics International Inc.',
        tier: 'platinum' as const,
        tierId: insertedTiers['PLT'],
        creditLimit: '1200000.00',
        location: 'Chicago, IL',
        deliveryLatitude: '41.878100',
        deliveryLongitude: '-87.629800',
      },
      {
        name: 'Nexus Health Systems',
        email: 'it-purchasing@nexushealth.org',
        company: 'Nexus Healthcare Alliance',
        tier: 'platinum' as const,
        tierId: insertedTiers['PLT'],
        creditLimit: '950000.00',
        location: 'New York, NY',
        deliveryLatitude: '40.712800',
        deliveryLongitude: '-74.006000',
      },
      {
        name: 'Cyberdyne Quantum AI',
        email: 'supply@cyberdyne-quantum.io',
        company: 'Cyberdyne Quantum Labs',
        tier: 'gold' as const,
        tierId: insertedTiers['GLD'],
        creditLimit: '750000.00',
        location: 'San Jose, CA',
        deliveryLatitude: '37.338200',
        deliveryLongitude: '-121.886300',
      },
      {
        name: 'Vanguard FinTech',
        email: 'infrastructure@vanguardfin.com',
        company: 'Vanguard Financial Technologies Ltd',
        tier: 'gold' as const,
        tierId: insertedTiers['GLD'],
        creditLimit: '600000.00',
        location: 'Newark, NJ',
        deliveryLatitude: '40.735700',
        deliveryLongitude: '-74.172400',
      },
      {
        name: 'Starlight Media Studios',
        email: 'tech@starlightstudios.com',
        company: 'Starlight Media & Broadcast',
        tier: 'silver' as const,
        tierId: insertedTiers['SLV'],
        creditLimit: '200000.00',
        location: 'Los Angeles, CA',
        deliveryLatitude: '34.052200',
        deliveryLongitude: '-118.243700',
      },
      {
        name: 'Hooli Cloud Computing',
        email: 'hardware-ops@hooli.com',
        company: 'Hooli Enterprises',
        tier: 'platinum' as const,
        tierId: insertedTiers['PLT'],
        creditLimit: '2000000.00',
        location: 'Seattle, WA',
        deliveryLatitude: '47.606200',
        deliveryLongitude: '-122.332100',
      },
      {
        name: 'Pied Piper Data',
        email: 'richard@piedpiper.com',
        company: 'Pied Piper Compression Technologies',
        tier: 'bronze' as const,
        tierId: insertedTiers['STD'],
        creditLimit: '80000.00',
        location: 'Palo Alto, CA',
        deliveryLatitude: '37.441900',
        deliveryLongitude: '-122.143000',
      },
    ];

    for (const c of customerData) {
      await db
        .insert(customers)
        .values(c)
        .onConflictDoUpdate({
          target: customers.email,
          set: {
            name: c.name,
            company: c.company,
            tier: c.tier,
            tierId: c.tierId,
            creditLimit: c.creditLimit,
            location: c.location,
            deliveryLatitude: c.deliveryLatitude,
            deliveryLongitude: c.deliveryLongitude,
          },
        });
    }
    console.log(`✅ ${customerData.length} enterprise accounts seeded.`);
    // 6. Seed Discount Ceilings (Phase 2 Governance)
    console.log('Seeding discount ceilings...');
    const ceilingData = [
      // Standard / Bronze
      { tierId: insertedTiers['STD'], category: 'hardware' as const, maxDiscountPct: '10.00' },
      { tierId: insertedTiers['STD'], category: 'subscription' as const, maxDiscountPct: '15.00' },
      { tierId: insertedTiers['STD'], category: 'services' as const, maxDiscountPct: '5.00' },

      // Silver
      { tierId: insertedTiers['SLV'], category: 'hardware' as const, maxDiscountPct: '15.00' },
      { tierId: insertedTiers['SLV'], category: 'subscription' as const, maxDiscountPct: '20.00' },
      { tierId: insertedTiers['SLV'], category: 'services' as const, maxDiscountPct: '10.00' },

      // Gold
      { tierId: insertedTiers['GLD'], category: 'hardware' as const, maxDiscountPct: '20.00' },
      { tierId: insertedTiers['GLD'], category: 'subscription' as const, maxDiscountPct: '30.00' },
      { tierId: insertedTiers['GLD'], category: 'services' as const, maxDiscountPct: '15.00' },

      // Platinum
      { tierId: insertedTiers['PLT'], category: 'hardware' as const, maxDiscountPct: '25.00' },
      { tierId: insertedTiers['PLT'], category: 'subscription' as const, maxDiscountPct: '40.00' },
      { tierId: insertedTiers['PLT'], category: 'services' as const, maxDiscountPct: '20.00' },
    ];

    for (const c of ceilingData) {
      await db
        .insert(discountCeilings)
        .values(c)
        .onConflictDoUpdate({
          target: [discountCeilings.tierId, discountCeilings.category],
          set: { maxDiscountPct: c.maxDiscountPct },
        });
    }
    console.log(`✅ ${ceilingData.length} discount ceilings seeded.`);

    // 7. Seed Product Recommendations (Phase 3 Upsell / Cross-sell Intelligence)
    console.log('Seeding product recommendations...');
    const serverProduct = insertedProducts['HW-SRV-001'];
    const upsProduct = insertedProducts['HW-UPS-3KVA'];
    const slaProduct = insertedProducts['PS-SLA-PREM'];
    const onboardingProduct = insertedProducts['PS-ONBOARD-01'];
    const saasProProduct = insertedProducts['SAAS-PRO-YR'];
    const saasAiProduct = insertedProducts['SAAS-AI-ADDON'];

    if (serverProduct && upsProduct && slaProduct) {
      const recs = [
        {
          sourceProductId: serverProduct,
          recommendedProductId: upsProduct,
          relationshipType: 'cross_sell',
          reason: 'Servers require redundant rack power protection for high availability uptime SLA.',
          confidenceScore: '0.95',
          marginBoostPct: '8.00',
        },
        {
          sourceProductId: serverProduct,
          recommendedProductId: slaProduct,
          relationshipType: 'upsell',
          reason: 'Mission-critical server deployments include 24/7 dedicated escalation support.',
          confidenceScore: '0.90',
          marginBoostPct: '15.00',
        },
      ];
      if (saasProProduct && saasAiProduct) {
        recs.push({
          sourceProductId: saasProProduct,
          recommendedProductId: saasAiProduct,
          relationshipType: 'cross_sell',
          reason: 'Enterprise Pro accounts benefit from AI Quotation Copilot deal guidance.',
          confidenceScore: '0.88',
          marginBoostPct: '12.00',
        });
      }
      if (saasProProduct && onboardingProduct) {
        recs.push({
          sourceProductId: saasProProduct,
          recommendedProductId: onboardingProduct,
          relationshipType: 'cross_sell',
          reason: 'Enterprise SaaS deployment accelerator guarantees time-to-value within 4 weeks.',
          confidenceScore: '0.92',
          marginBoostPct: '10.00',
        });
      }

      for (const r of recs) {
        await db
          .insert(productRecommendations)
          .values(r)
          .onConflictDoUpdate({
            target: [productRecommendations.sourceProductId, productRecommendations.recommendedProductId],
            set: { reason: r.reason, confidenceScore: r.confidenceScore, marginBoostPct: r.marginBoostPct },
          });
      }
      console.log(`✅ ${recs.length} product recommendations seeded.`);
    }

    // 8. Seed Regional Warehouses & Inventory Stock (Spatial Fulfillment)
    console.log('Seeding regional warehouses...');
    const warehouseData = [
      {
        code: 'WH-DAL-01',
        name: 'South Central Distribution Hub (Dallas, TX)',
        address: '1200 Logistics Way, Dallas, TX 75261',
        latitude: '32.776700',
        longitude: '-96.797000',
        isActive: true,
      },
      {
        code: 'WH-EWR-01',
        name: 'Northeast Cargo Center (Newark, NJ)',
        address: '500 Airport Rd, Newark, NJ 07114',
        latitude: '40.735700',
        longitude: '-74.172400',
        isActive: true,
      },
      {
        code: 'WH-SJC-01',
        name: 'Silicon Valley Fulfillment Hub (San Jose, CA)',
        address: '2500 Technology Dr, San Jose, CA 95110',
        latitude: '37.338200',
        longitude: '-121.886300',
        isActive: true,
      },
      {
        code: 'WH-ORD-01',
        name: 'Midwest Regional Depot (Chicago, IL)',
        address: '8800 Express Blvd, Chicago, IL 60666',
        latitude: '41.878100',
        longitude: '-87.629800',
        isActive: true,
      },
    ];

    const insertedWarehouses: Record<string, string> = {};
    for (const wh of warehouseData) {
      const [record] = await db
        .insert(warehouses)
        .values(wh)
        .onConflictDoUpdate({
          target: warehouses.code,
          set: { name: wh.name, address: wh.address, latitude: wh.latitude, longitude: wh.longitude },
        })
        .returning();
      insertedWarehouses[wh.code] = record.id;
    }
    console.log(`✅ ${Object.keys(insertedWarehouses).length} regional warehouses seeded.`);

    // Seed stock across warehouses for Hardware SKUs
    console.log('Seeding warehouse inventory stock...');
    const allProducts = await db.select().from(products);
    const hardwareProducts = allProducts.filter((p: any) => p.category === 'hardware');

    for (const whCode of Object.keys(insertedWarehouses)) {
      const whId = insertedWarehouses[whCode];
      for (const hp of hardwareProducts) {
        // Stock distribution varies per warehouse for realistic split testing
        let initialQty = 50;
        if (whCode === 'WH-DAL-01') initialQty = 30;
        if (whCode === 'WH-EWR-01') initialQty = 25;
        if (whCode === 'WH-SJC-01') initialQty = 40;
        if (whCode === 'WH-ORD-01') initialQty = 20;

        await db
          .insert(warehouseStock)
          .values({
            warehouseId: whId,
            productId: hp.id,
            availableQty: initialQty,
            reservedQty: 0,
          })
          .onConflictDoUpdate({
            target: [warehouseStock.warehouseId, warehouseStock.productId],
            set: { availableQty: initialQty },
          });
      }
    }
    console.log(`✅ Warehouse stock seeded across ${Object.keys(insertedWarehouses).length} hubs for ${hardwareProducts.length} hardware products.`);

    // 9. Seed Quotations & Approval Workflows (Demo FRD Data)
    console.log('Seeding demo quotations and approval workflows...');

    const rep1User = insertedUsers['rep1@dealflow360.com'];
    const managerUser = insertedUsers['manager@dealflow360.com'];
    const financeUser = insertedUsers['finance@dealflow360.com'];

    const acmeCust = await db.select().from(customers).where(eq(customers.email, 'procurement@acme.com')).then(res => res[0]);
    const globexCust = await db.select().from(customers).where(eq(customers.email, 'purchasing@globex.com')).then(res => res[0]);
    const initechCust = await db.select().from(customers).where(eq(customers.email, 'billing@initech.com')).then(res => res[0]);

    if (rep1User && acmeCust && globexCust) {
      // Quote 1: Q-1042 (Acme Corp, High Risk, assigned to Carol Manager)
      const [quote1042] = await db
        .insert(quotes)
        .values({
          quoteNumber: 'Q-1042',
          repId: rep1User,
          customerId: acmeCust.id,
          status: 'pending_approval',
          totalAmount: '12400.00',
          costTotal: '7500.00',
          grossMarginPct: '39.52',
          brsScore: '18.50',
          currentApprovalStep: 1,
        })
        .onConflictDoUpdate({
          target: quotes.quoteNumber,
          set: {
            status: 'pending_approval',
            totalAmount: '12400.00',
            brsScore: '18.50',
            currentApprovalStep: 1,
          },
        })
        .returning();

      // Quote 2: Q-1039 (Beta / Globex Corp, Medium Risk, assigned to Dave Finance)
      const [quote1039] = await db
        .insert(quotes)
        .values({
          quoteNumber: 'Q-1039',
          repId: rep1User,
          customerId: globexCust.id,
          status: 'pending_approval',
          totalAmount: '29700.00',
          costTotal: '18000.00',
          grossMarginPct: '39.39',
          brsScore: '12.00',
          currentApprovalStep: 1,
        })
        .onConflictDoUpdate({
          target: quotes.quoteNumber,
          set: {
            status: 'pending_approval',
            totalAmount: '29700.00',
            brsScore: '12.00',
            currentApprovalStep: 1,
          },
        })
        .returning();

      // Clear existing approvals for these quotes if re-seeding
      const existingApprovals = await db.select().from(approvals).where(inArray(approvals.quoteId, [quote1042.id, quote1039.id]));
      for (const app of existingApprovals) {
        await db.delete(approvalSteps).where(eq(approvalSteps.approvalId, app.id));
        await db.delete(approvals).where(eq(approvals.id, app.id));
      }

      // Create Approval Record for Q-1042 (Sales Manager step)
      const [app1042] = await db
        .insert(approvals)
        .values({
          quoteId: quote1042.id,
          brsScore: '18.50',
          approvalLevel: 'level_2',
          status: 'pending',
        })
        .returning();

      await db.insert(approvalSteps).values([
        {
          approvalId: app1042.id,
          stepOrder: 1,
          roleRequired: 'sales_manager',
          assignedUserId: managerUser,
          decision: 'pending',
        },
      ]);

      // Create Approval Record for Q-1039 (Finance step)
      const [app1039] = await db
        .insert(approvals)
        .values({
          quoteId: quote1039.id,
          brsScore: '12.00',
          approvalLevel: 'level_1',
          status: 'pending',
        })
        .returning();

      await db.insert(approvalSteps).values([
        {
          approvalId: app1039.id,
          stepOrder: 1,
          roleRequired: 'finance',
          assignedUserId: financeUser,
          decision: 'pending',
        },
      ]);

      console.log('✅ Demo quotes (Q-1042, Q-1039) and approval workflows seeded.');
    }

    console.log('🎉 Database seed completed successfully!');
  } catch (err) {
    console.error('❌ Database seed error:', err);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

seed();
