import { Injectable, Inject, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { eq, and, asc } from 'drizzle-orm';
import { DRIZZLE_DB } from '../database/database.module';
import {
  quotes,
  quoteLines,
  customers,
  customerTiers,
  discountCeilings,
  approvals,
  approvalSteps,
  users,
  products,
} from '@dealflow360/database';
import { BrsCalculationService } from './brs-calculator.service';
import { AuditLogService } from './audit-log.service';
import { KafkaService } from '../events/kafka/kafka.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class ApprovalRoutingService {
  private readonly logger = new Logger(ApprovalRoutingService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: any,
    private readonly brsService: BrsCalculationService,
    private readonly auditLogService: AuditLogService,
    private readonly kafkaService: KafkaService,
    private readonly queueService: QueueService,
  ) {}

  async submitQuote(quoteId: string, actor: { id: string; role: string; name: string }) {
    // 1. Fetch Quote
    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, quoteId));
    if (!quote) {
      throw new NotFoundException(`Quote with ID ${quoteId} not found`);
    }

    if (quote.status !== 'draft') {
      throw new BadRequestException(`Quote cannot be submitted in status '${quote.status}'. Only 'draft' quotes can be submitted.`);
    }

    // 2. Fetch Customer & Tier
    const [customer] = await this.db.select().from(customers).where(eq(customers.id, quote.customerId));
    if (!customer) {
      throw new BadRequestException(`Quote has no valid customer associated`);
    }

    // Guard: Expiry date >= today + 1 day
    if (quote.expiresAt) {
      const minExpiry = new Date();
      minExpiry.setHours(minExpiry.getHours() + 23); // at least tomorrow
      if (new Date(quote.expiresAt) < minExpiry) {
        throw new BadRequestException('Quote expiration must be at least 24 hours into the future');
      }
    }

    // 3. Fetch Quote Lines with products
    const lines = await this.db
      .select({
        lineId: quoteLines.id,
        productId: quoteLines.productId,
        quantity: quoteLines.quantity,
        unitPrice: quoteLines.unitPrice,
        discountPct: quoteLines.discountPct,
        category: products.category,
      })
      .from(quoteLines)
      .innerJoin(products, eq(quoteLines.productId, products.id))
      .where(eq(quoteLines.quoteId, quoteId));

    if (!lines || lines.length === 0) {
      throw new BadRequestException('Cannot submit a quote with no line items');
    }

    // Guard: all unit prices > 0 and quantities > 0
    for (const l of lines) {
      if (Number(l.unitPrice) <= 0) {
        throw new BadRequestException(`Line item unit price must be greater than zero`);
      }
      if (l.quantity <= 0) {
        throw new BadRequestException(`Line item quantity must be greater than zero`);
      }
    }

    // 4. Fetch Tier Discount Ceilings
    const ceilings = await this.db
      .select()
      .from(discountCeilings)
      .where(eq(discountCeilings.tierId, customer.tierId || ''));

    const ceilingMap = new Map<string, number>();
    for (const c of ceilings) {
      ceilingMap.set(c.category, Number(c.maxDiscountPct));
    }

    // 5. Build BRS inputs & calculate BRS
    const brsInputs = lines.map((l: any) => {
      const ceilingPct = ceilingMap.get(l.category) ?? 10.0; // fallback default
      return {
        lineId: l.lineId,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        appliedDiscountPct: Number(l.discountPct),
        tierCeilingPct: ceilingPct,
      };
    });

    const brsResult = this.brsService.computeBRS(brsInputs);
    const brsScore = brsResult.brs;

    // 6. Update Quote Lines with appliedCeilingPct and violationScore
    for (const res of brsResult.lineResults) {
      const matchedInput = brsInputs.find((i: any) => i.lineId === res.lineId);
      await this.db
        .update(quoteLines)
        .set({
          appliedCeilingPct: matchedInput ? String(matchedInput.tierCeilingPct) : null,
          violationScore: String(res.violationScore),
        })
        .where(eq(quoteLines.id, res.lineId));
    }

    // 7. Decide Routing
    if (brsScore === 0) {
      // Auto-approved! Transition directly to sent
      const [updatedQuote] = await this.db
        .update(quotes)
        .set({
          status: 'sent',
          brsScore: String(brsScore),
          blendedRiskScore: String(brsScore),
          currentApprovalStep: 0,
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, quoteId))
        .returning();

      await this.auditLogService.log({
        entityType: 'quote',
        entityId: quoteId,
        action: 'auto_approve',
        actorId: actor.id,
        actorRole: actor.role,
        stateBefore: { status: quote.status },
        stateAfter: { status: 'sent', brs: 0 },
        metadata: { brsResult },
      });

      await this.kafkaService.publishEvent('quote.events', 'quote.submitted', quoteId, {
        quoteId,
        brs: 0,
        approvalRequired: false,
        approvalLevel: null,
      });

      return {
        quote: updatedQuote,
        brsResult,
        approvalRequired: false,
        message: 'Quote verified against discount ceilings. BRS=0. Automatically approved and sent.',
      };
    }

    // BRS > 0: Approval Required
    const approvalLevel = brsResult.approvalLevel; // level_1, level_2, level_3
    const newQuoteStatus = 'pending_approval';

    // Atomic Transaction for Approval & Steps creation
    const createdApproval = await this.db.transaction(async (tx: any) => {
      // 1. Update quote status & BRS
      const [q] = await tx
        .update(quotes)
        .set({
          status: newQuoteStatus,
          brsScore: String(brsScore),
          blendedRiskScore: String(brsScore),
          currentApprovalStep: 1,
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, quoteId))
        .returning();

      // 2. Insert approval
      const [appr] = await tx
        .insert(approvals)
        .values({
          quoteId,
          brsScore: String(brsScore),
          approvalLevel,
          status: 'pending',
        })
        .returning();

      // 3. Insert sequential steps based on level
      // Level 1: Step 1 (Sales Manager)
      // Level 2: Step 1 (Sales Manager), Step 2 (Finance)
      // Level 3: Step 1 (Sales Manager), Step 2 (Finance) (+ Admin Alert)
      const stepsToInsert: Array<{
        approvalId: string;
        stepOrder: number;
        roleRequired: 'sales_manager' | 'finance';
        decision: 'pending' | 'approved' | 'rejected';
      }> = [
        {
          approvalId: appr.id,
          stepOrder: 1,
          roleRequired: 'sales_manager',
          decision: 'pending',
        },
      ];

      if (approvalLevel === 'level_2' || approvalLevel === 'level_3') {
        stepsToInsert.push({
          approvalId: appr.id,
          stepOrder: 2,
          roleRequired: 'finance',
          decision: 'pending',
        });
      }

      await tx.insert(approvalSteps).values(stepsToInsert);

      // 4. Audit Log
      await this.auditLogService.log(
        {
          entityType: 'quote',
          entityId: quoteId,
          action: 'submit_for_approval',
          actorId: actor.id,
          actorRole: actor.role,
          stateBefore: { status: quote.status },
          stateAfter: { status: newQuoteStatus, brs: brsScore, approvalLevel },
          metadata: { approvalId: appr.id, stepsCount: stepsToInsert.length },
        },
        tx,
      );

      return appr;
    });

    // Publish Kafka events
    await this.kafkaService.publishEvent('quote.events', 'quote.submitted', quoteId, {
      quoteId,
      brs: brsScore,
      approvalRequired: true,
      approvalLevel: approvalLevel === 'level_1' ? 1 : approvalLevel === 'level_2' ? 2 : 3,
    });

    await this.kafkaService.publishEvent('approval.events', 'approval.created', createdApproval.id, {
      approvalId: createdApproval.id,
      quoteId,
      repId: quote.repId,
      brs: brsScore,
      requiredLevel: approvalLevel === 'level_1' ? 1 : approvalLevel === 'level_2' ? 2 : 3,
      assignedRole: 'sales_manager',
    });

    // Enqueue BullMQ routing & email notifications
    await this.queueService.enqueueApprovalRouting({
      quoteId,
      repId: quote.repId,
      customerId: quote.customerId,
      brs: brsScore,
      approvalLevel: approvalLevel as any,
    });

    await this.queueService.enqueueEmail({
      to: 'manager@dealflow360.com',
      recipientName: 'Sales Manager',
      templateId: 'approval-request',
      variables: {
        quoteId,
        quoteNumber: quote.quoteNumber,
        brsScore,
        approvalLevel,
      },
      idempotencyKey: `approval-req-${quoteId}-step1`,
    });

    return {
      quoteId,
      brsResult,
      approvalRequired: true,
      approval: createdApproval,
      message: `Quote requires ${approvalLevel.toUpperCase()} approval (BRS: ${brsScore}). Routed to Sales Manager.`,
    };
  }

  async listPendingApprovals(user: { id: string; role: string }) {
    // Fetch approvals that are pending
    const pendingApprovals = await this.db
      .select({
        id: approvals.id,
        quoteId: approvals.quoteId,
        quoteNumber: quotes.quoteNumber,
        totalAmount: quotes.totalAmount,
        brsScore: approvals.brsScore,
        approvalLevel: approvals.approvalLevel,
        status: approvals.status,
        currentApprovalStep: quotes.currentApprovalStep,
        createdAt: approvals.createdAt,
        customerId: quotes.customerId,
        repId: quotes.repId,
      })
      .from(approvals)
      .innerJoin(quotes, eq(approvals.quoteId, quotes.id))
      .where(eq(approvals.status, 'pending'))
      .orderBy(asc(approvals.createdAt));

    // For each pending approval, get steps
    const results = [];
    for (const app of pendingApprovals) {
      const steps = await this.db
        .select()
        .from(approvalSteps)
        .where(eq(approvalSteps.approvalId, app.id))
        .orderBy(asc(approvalSteps.stepOrder));

      const activeStep = steps.find((s: any) => s.stepOrder === app.currentApprovalStep);

      // Check if user is authorized to act on active step
      const canAct =
        user.role === 'admin' || (activeStep && activeStep.roleRequired === user.role);

      results.push({
        ...app,
        activeStep,
        steps,
        canAct,
      });
    }

    return results;
  }

  async getApprovalDetails(approvalId: string) {
    const [appr] = await this.db.select().from(approvals).where(eq(approvals.id, approvalId));
    if (!appr) {
      throw new NotFoundException(`Approval with ID ${approvalId} not found`);
    }

    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, appr.quoteId));
    const [customer] = quote
      ? await this.db.select().from(customers).where(eq(customers.id, quote.customerId))
      : [null];

    const lines = await this.db
      .select({
        id: quoteLines.id,
        productId: quoteLines.productId,
        productName: products.name,
        category: products.category,
        quantity: quoteLines.quantity,
        unitPrice: quoteLines.unitPrice,
        discountPct: quoteLines.discountPct,
        appliedCeilingPct: quoteLines.appliedCeilingPct,
        violationScore: quoteLines.violationScore,
        lineTotal: quoteLines.lineTotal,
      })
      .from(quoteLines)
      .innerJoin(products, eq(quoteLines.productId, products.id))
      .where(eq(quoteLines.quoteId, appr.quoteId));

    const steps = await this.db
      .select({
        id: approvalSteps.id,
        stepOrder: approvalSteps.stepOrder,
        roleRequired: approvalSteps.roleRequired,
        assignedUserId: approvalSteps.assignedUserId,
        decision: approvalSteps.decision,
        decisionReason: approvalSteps.decisionReason,
        decidedAt: approvalSteps.decidedAt,
      })
      .from(approvalSteps)
      .where(eq(approvalSteps.approvalId, approvalId))
      .orderBy(asc(approvalSteps.stepOrder));

    return {
      approval: appr,
      quote,
      customer,
      lines,
      steps,
    };
  }

  async decideApproval(
    approvalId: string,
    decision: 'approved' | 'rejected',
    reason: string | undefined,
    actor: { id: string; role: string; name: string },
  ) {
    const [appr] = await this.db.select().from(approvals).where(eq(approvals.id, approvalId));
    if (!appr) {
      throw new NotFoundException(`Approval with ID ${approvalId} not found`);
    }

    if (appr.status !== 'pending') {
      throw new BadRequestException(`Approval is already in '${appr.status}' state`);
    }

    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, appr.quoteId));
    if (!quote) {
      throw new NotFoundException(`Associated quote not found`);
    }

    const steps = await this.db
      .select()
      .from(approvalSteps)
      .where(eq(approvalSteps.approvalId, approvalId))
      .orderBy(asc(approvalSteps.stepOrder));

    const currentStepIndex = (quote.currentApprovalStep || 1) - 1;
    const activeStep = steps[currentStepIndex];

    if (!activeStep) {
      throw new BadRequestException(`No active approval step found at step order ${quote.currentApprovalStep}`);
    }

    // Role check
    if (actor.role !== 'admin' && actor.role !== activeStep.roleRequired) {
      throw new ForbiddenException(
        `Your role '${actor.role}' is not authorized to decide step ${activeStep.stepOrder} (required: '${activeStep.roleRequired}')`,
      );
    }

    // Rejection validation
    if (decision === 'rejected') {
      if (!reason || reason.trim().length < 10) {
        throw new BadRequestException('A non-empty rejection reason of at least 10 characters is mandatory.');
      }

      // Mark step rejected, approval rejected, and revert quote to draft or rejected
      await this.db.transaction(async (tx: any) => {
        await tx
          .update(approvalSteps)
          .set({
            decision: 'rejected',
            decisionReason: reason.trim(),
            assignedUserId: actor.id,
            decidedAt: new Date(),
          })
          .where(eq(approvalSteps.id, activeStep.id));

        await tx
          .update(approvals)
          .set({
            status: 'rejected',
            updatedAt: new Date(),
          })
          .where(eq(approvals.id, approvalId));

        await tx
          .update(quotes)
          .set({
            status: 'rejected',
            updatedAt: new Date(),
          })
          .where(eq(quotes.id, appr.quoteId));

        await this.auditLogService.log(
          {
            entityType: 'approval',
            entityId: approvalId,
            action: 'approval_rejected',
            actorId: actor.id,
            actorRole: actor.role,
            stateBefore: { status: 'pending', step: activeStep.stepOrder },
            stateAfter: { status: 'rejected', reason: reason.trim() },
            metadata: { quoteId: appr.quoteId },
          },
          tx,
        );
      });

      // Events & Queue
      await this.kafkaService.publishEvent('approval.events', 'approval.rejected', approvalId, {
        approvalId,
        quoteId: appr.quoteId,
        approverId: actor.id,
        reason: reason.trim(),
        timestamp: new Date().toISOString(),
      });

      await this.queueService.enqueueEmail({
        to: 'rep@dealflow360.com',
        recipientName: 'Sales Rep',
        templateId: 'rejection-notice',
        variables: {
          quoteId: appr.quoteId,
          quoteNumber: quote.quoteNumber,
          reason: reason.trim(),
          approverName: actor.name,
        },
        idempotencyKey: `reject-${approvalId}-${activeStep.id}`,
      });

      return {
        approvalId,
        status: 'rejected',
        quoteStatus: 'rejected',
        message: 'Approval request rejected and returned with feedback.',
      };
    }

    // Decision === 'approved'
    // Check if there are further steps
    const isLastStep = activeStep.stepOrder === steps.length;

    if (isLastStep) {
      // All steps cleared! Final approval
      await this.db.transaction(async (tx: any) => {
        await tx
          .update(approvalSteps)
          .set({
            decision: 'approved',
            decisionReason: reason || 'Approved',
            assignedUserId: actor.id,
            decidedAt: new Date(),
          })
          .where(eq(approvalSteps.id, activeStep.id));

        await tx
          .update(approvals)
          .set({
            status: 'approved',
            updatedAt: new Date(),
          })
          .where(eq(approvals.id, approvalId));

        await tx
          .update(quotes)
          .set({
            status: 'sent',
            updatedAt: new Date(),
          })
          .where(eq(quotes.id, appr.quoteId));

        await this.auditLogService.log(
          {
            entityType: 'approval',
            entityId: approvalId,
            action: 'approval_completed',
            actorId: actor.id,
            actorRole: actor.role,
            stateBefore: { status: 'pending', step: activeStep.stepOrder },
            stateAfter: { status: 'approved', quoteStatus: 'sent' },
            metadata: { quoteId: appr.quoteId },
          },
          tx,
        );
      });

      await this.kafkaService.publishEvent('approval.events', 'approval.approved', approvalId, {
        approvalId,
        quoteId: appr.quoteId,
        approverId: actor.id,
        level: steps.length as any,
        comment: reason || 'Approved',
        timestamp: new Date().toISOString(),
      });

      await this.kafkaService.publishEvent('quote.events', 'quote.approved', appr.quoteId, {
        quoteId: appr.quoteId,
        approvalId,
        approverId: actor.id,
        finalStatus: 'sent',
        timestamp: new Date().toISOString(),
      });

      return {
        approvalId,
        status: 'approved',
        quoteStatus: 'sent',
        allApprovalsCleared: true,
        message: 'All approval steps successfully cleared. Quote transitioned to SENT.',
      };
    } else {
      // Step advanced to next step (e.g. Sales Manager -> Finance)
      const nextStepOrder = activeStep.stepOrder + 1;
      const nextStep = steps.find((s: any) => s.stepOrder === nextStepOrder);

      await this.db.transaction(async (tx: any) => {
        await tx
          .update(approvalSteps)
          .set({
            decision: 'approved',
            decisionReason: reason || 'Approved step',
            assignedUserId: actor.id,
            decidedAt: new Date(),
          })
          .where(eq(approvalSteps.id, activeStep.id));

        await tx
          .update(quotes)
          .set({
            currentApprovalStep: nextStepOrder,
            updatedAt: new Date(),
          })
          .where(eq(quotes.id, appr.quoteId));

        await this.auditLogService.log(
          {
            entityType: 'approval',
            entityId: approvalId,
            action: 'approval_step_advanced',
            actorId: actor.id,
            actorRole: actor.role,
            stateBefore: { step: activeStep.stepOrder },
            stateAfter: { step: nextStepOrder, nextRole: nextStep?.roleRequired },
            metadata: { quoteId: appr.quoteId },
          },
          tx,
        );
      });

      await this.kafkaService.publishEvent('approval.events', 'approval.step_advanced', approvalId, {
        approvalId,
        quoteId: appr.quoteId,
        previousStep: activeStep.stepOrder,
        currentStep: nextStepOrder,
        nextRoleRequired: nextStep?.roleRequired || 'finance',
      });

      await this.queueService.enqueueEmail({
        to: 'finance@dealflow360.com',
        recipientName: 'Finance Controller',
        templateId: 'finance-escalation',
        variables: {
          quoteId: appr.quoteId,
          quoteNumber: quote.quoteNumber,
          managerName: actor.name,
        },
        idempotencyKey: `finance-step2-${approvalId}`,
      });

      return {
        approvalId,
        status: 'pending',
        currentApprovalStep: nextStepOrder,
        nextRoleRequired: nextStep?.roleRequired,
        allApprovalsCleared: false,
        message: `Step ${activeStep.stepOrder} approved. Escalated to Step ${nextStepOrder} (${nextStep?.roleRequired}).`,
      };
    }
  }
}
