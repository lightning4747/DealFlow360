import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorator';
import { ApprovalRoutingService } from './approval-routing.service';
import { AuditLogService } from './audit-log.service';

@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GovernanceController {
  constructor(
    private readonly approvalService: ApprovalRoutingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // 1. Submit Quote for Governance Check & Approval
  @Post([
    'quotes/:id/submit',
    'sales/quotes/:id/submit',
    'internal/quotes/:id/submit',
  ])
  @Roles('sales_rep')
  async submitQuote(@Param('id') quoteId: string, @Req() req: any) {
    return this.approvalService.submitQuote(quoteId, req.user);
  }

  // 2. Approver Queue (Get pending approvals)
  @Get([
    'approvals',
    'sales/approvals',
    'internal/approvals',
  ])
  @Roles('sales_manager', 'finance')
  async listApprovals(@Req() req: any, @Query('status') status?: string) {
    const data = await this.approvalService.listPendingApprovals(req.user, status);
    return { data, meta: null, error: null };
  }

  // 3. Approval Details
  @Get([
    'approvals/:id',
    'sales/approvals/:id',
    'internal/approvals/:id',
  ])
  @Roles('sales_manager', 'finance')
  async getApprovalDetails(@Param('id') approvalId: string) {
    const data = await this.approvalService.getApprovalDetails(approvalId);
    return { data, meta: null, error: null };
  }

  // 4. Approve Action
  @Post([
    'approvals/:id/approve',
    'sales/approvals/:id/approve',
    'internal/approvals/:id/approve',
    'sales/quotes/:id/approve',
  ])
  @Roles('sales_manager', 'finance')
  async approveQuote(
    @Param('id') approvalId: string,
    @Body() body: { comment?: string },
    @Req() req: any,
  ) {
    return this.approvalService.decideApproval(approvalId, 'approved', body?.comment, req.user);
  }

  // 5. Reject Action
  @Post([
    'approvals/:id/reject',
    'sales/approvals/:id/reject',
    'internal/approvals/:id/reject',
    'sales/quotes/:id/reject',
  ])
  @Roles('sales_manager', 'finance')
  async rejectQuote(
    @Param('id') approvalId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.approvalService.decideApproval(approvalId, 'rejected', body?.reason, req.user);
  }

  // 6. Audit Trail for Quote or Entity
  @Get([
    'audit/:entityType/:entityId',
    'sales/audit/:entityType/:entityId',
  ])
  @Roles('sales_manager', 'finance')
  async getAuditLogs(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLogService.getLogsForEntity(entityType, entityId);
  }
}
