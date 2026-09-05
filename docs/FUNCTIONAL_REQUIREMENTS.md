Based on the detailed markdown description, here is a comprehensive Functional Requirements Document (FRD) for the DealFlow360 platform.

---

# Functional Requirements Document: DealFlow360

**Version:** 1.0
**Date:** October 26, 2023
**Project:** DealFlow360 - An Intelligent, Self-Governing Sales Operations Platform

## 1. Introduction

### 1.1 Purpose
This document outlines the functional requirements for the DealFlow360 platform, a comprehensive B2B sales operations solution. The platform aims to move beyond simple quote-to-invoice tools, providing an intelligent, self-governing deal engine that handles complex discount governance, multi-warehouse fulfillment, hybrid billing (one-time and recurring), and customer-facing negotiation.

### 1.2 Scope
The DealFlow360 platform encompasses a backend configuration area for administrators and a frontend workspace for sales representatives, managers, finance users, and customers. The core functionality includes:

- **Sales Backend (Configuration):** Product management, pricing, discount tiers, approval workflows, warehouse management, and subscription plan setup.
- **Sales Frontend (Workspace):** Quotation building with upsell/cross-sell suggestions, discount approval routing, warehouse split management, and deal health monitoring.
- **Customer Portal:** A restricted view for customers to negotiate and confirm quotations.
- **Reporting & Dashboards:** Real-time analytics on deal health, stalled quotes, and discount anomalies.

### 1.3 Definitions and Acronyms
- **B2B:** Business-to-Business
- **FRD:** Functional Requirements Document
- **UI:** User Interface
- **SaaS:** Software as a Service
- **MRR:** Monthly Recurring Revenue
- **BRS:** Blended Risk Score

### 1.4 Overall Description
DealFlow360 is a web-based application designed for B2B sales teams. It provides a single platform for managing the entire sales lifecycle from quotation to cash, with a focus on automation, governance, and real-time collaboration.

## 2. Overall Description & Modules

### 2.1 System Overview
The system is composed of five primary modules:
1.  **Sales Backend (Configuration Area):** For system setup and administration.
2.  **Sales Frontend (Rep Workspace):** The primary tool for sales representatives to manage deals.
3.  **Customer Portal:** A separate interface for customers to view and negotiate quotes.
4.  **Deal Health & Anomaly Dashboard:** A monitoring and reporting hub for managers and operations.
5.  **Core Business Logic Engine:** The backend logic handling approval routing, discount governance, and warehouse splitting.

### 2.2 User Roles

| Role | Description | Key Responsibilities |
| :--- | :--- | :--- |
| **Sales Rep** | Frontline sales user | Builds quotations, applies discounts, tracks approval/fulfillment, responds to customer negotiation. |
| **Sales Manager / Approver** | First-line manager | Reviews/approves/rejects quotations, configures discount tiers/approval chains, monitors deal health. |
| **Finance / Ops User** | Second-line approver / operations | Handles second-level approvals for high-risk discounts, manages fulfillment splits, reconciles billing. |
| **Customer (Portal User)** | External buyer | Views quotation, requests changes, counters discounts, confirms final terms. |
| **Admin** | System administrator | Manages backend setup (products, price lists, warehouses, subscriptions), views platform-wide analytics. |

## 3. Functional Requirements

### A. Sales Backend (Configuration Area)

#### A1. Authentication & Access Control
- **FR-01: User Authentication:** The system SHALL support secure login and signup for internal users (Sales Reps, Managers, Finance, Admins).
- **FR-02: Customer Authentication:** The system SHALL provide a separate login mechanism (magic link or email/password) for customer portal users.
- **FR-03: Role-Based Access Control (RBAC):** The system SHALL restrict access to features and data based on the assigned user role (Admin, Manager, Rep, Finance, Customer).

#### A2. Product & Price List Management
- **FR-04: Product Management:** Admin SHALL be able to create, read, update, and delete (CRUD) products with the following attributes:
    - General Info: Name, Category, Base Price, Unit, Tax Rate, Description.
    - Variants: Ability to define product variants (e.g., Size, Pack) with specific extra prices.
- **FR-05: Price List Management:** Admin SHALL be able to create and manage customer tier-based price lists, associating specific prices with customer segments (Bronze, Silver, Gold).

#### A3. Discount Tier & Approval Chain Setup
- **FR-06: Discount Tier Configuration:** Admin SHALL be able to define discount ceilings per customer tier (e.g., Bronze: 5%, Silver: 10%, Gold: 15%).
- **FR-07: Category-Specific Discounts:** Admin SHALL be able to set category-specific discount ceilings that override the customer-tier ceiling for specific product categories (e.g., Services: 10% max, Hardware: 20% max).
- **FR-08: Approval Chain Configuration:** Admin SHALL be able to configure multi-step approval workflows based on discount ranges.
    - *Example:* 5-10% requires Sales Manager; 10%+ requires Sales Manager then Finance.
- **FR-09: Blended Risk Score Logic:** The system SHALL calculate a blended risk score for a quotation based on each line item's discount against its respective threshold. The system SHALL route the quotation to the highest required approval level based on this combined score.
- **FR-10: Audit Trail:** The system SHALL log all approval actions (approve, reject, return, edits) with user, timestamp, and reason.

#### A4. Warehouse & Fulfillment Setup
- **FR-11: Warehouse Management:** Admin SHALL be able to CRUD warehouses, including name, location, and shipping cost weighting.
- **FR-12: Stock Management:** Admin SHALL be able to configure current stock levels and replenishment rules per warehouse.

#### A5. Subscription / Recurring Plan Setup
- **FR-13: Subscription Plan Management:** Admin SHALL be able to define recurring plans (Monthly, Quarterly, Yearly) and attach them to specific products or services.
- **FR-14: Proration Rules:** Admin SHALL be able to configure proration rules for mid-cycle changes (quantity or plan changes) and cancellation/partial refund rules.

#### A6. Upsell / Cross-Sell Rule Setup (Optional)
- **FR-15: Recommendation Configuration:** Admin SHALL be able to define product pairings based on historical data or manual rules and mark products as "promoted."

#### A7. Reporting & Dashboard Configuration
- **FR-16: Report Filters:** The system SHALL provide a reporting dashboard with filtering capabilities:
    - **Period:** Today, Week, Custom Range.
    - **Sales Team / Rep:** Filter by responsible user.
    - **Approval Status:** Pending, Approved, Rejected.
    - **Product / Category:** Filter to analyze specific product performance.
- **FR-17: Export Functionality:** Reports SHALL be exportable in PDF and XLS formats.

### B. Sales Frontend (Rep Workspace Experience)

#### B1. Sales Workspace & Navigation
- **FR-18: Top Navigation Menu:** The workspace SHALL provide a top navigation bar with:
    - **Quotations:** Link to the quotation list.
    - **Pipeline:** Link to a Kanban-style deal view.
    - **Reload Data:** Button to refresh pricing, stock, and approval data.
    - **Go to Back-end:** Button to navigate to the configuration/settings area.
    - **Close Workspace:** Button to end the session.

#### B2. Quotation List / Pipeline View
- **FR-19: Quotation Dashboard:** The system SHALL display a list of quotations as cards with key details: Customer, Amount, and Stage (e.g., Draft, Pending Approval). Clicking a card SHALL open the Quotation Builder.

#### B3. Quotation Builder Screen
- **FR-20: Product Selection:** Rep SHALL be able to add products from various categories (Hardware, Services, Subscriptions) to a cart.
- **FR-21: Quote Management:** Rep SHALL be able to adjust quantities and apply line-level or order-level discounts.
- **FR-22: Live Feedback:** The system SHALL display a live total and a margin indicator that updates as items are added or changed.
- **FR-23: Quote Submission:** Rep SHALL be able to "Confirm" the quotation, which triggers the automatic approval routing logic or moves it directly to fulfillment if no approval is needed.

#### B4. Discount Approval Screen
- **FR-24: Review Screen:** When approval is required, the system SHALL display a dedicated screen showing:
    - The Blended Risk Score.
    - The required approval chain (e.g., Sales Manager, then Finance).
- **FR-25: Approval Actions:** Approvers SHALL be able to Approve, Reject, or Return the quotation for revision. A confirmation screen with a full audit trail entry SHALL be displayed after action.

#### B5. Upsell and Cross-Sell Panel
- **FR-26: Real-time Recommendations:** While building a quote, the system SHALL display a panel with ranked upsell/cross-sell suggestions based on co-purchase history and promotions.
- **FR-27: Suggestion Details:** Each suggestion SHALL show the product name, margin delta, and a promotion tag (if applicable).
- **FR-28: Action Buttons:** Rep SHALL be able to "Add to Quote" or "Dismiss" a suggestion. The margin indicator SHALL update immediately upon addition.

#### B6. Fulfillment and Warehouse Split Screen
- **FR-29: Recommended Split:** The system SHALL display a recommended warehouse split based on live stock levels.
- **FR-30: Split Details:** The screen SHALL show warehouse name, quantity fulfilled, and estimated shipment cost for each split.
- **FR-31: Fulfillment Actions:** Rep/Finance SHALL be able to "Accept Suggested Split" or use a "Manual Override" to adjust the quantities.
- **FR-32: Backorder Management:** If stock arrives after initial fulfillment, the system SHALL automatically prompt the user to "Consolidate Remaining Backorder."

#### B7. Subscription and Billing Screen
- **FR-33: Hybrid Billing View:** The system SHALL display one-time and recurring lines separately on the same order screen.
- **FR-34: Billing Schedule:** The system SHALL display the upcoming billing schedule for recurring lines.
- **FR-35: Subscription Management:** Rep/Finance SHALL be able to cancel or modify a subscription, which triggers proration logic and automatic partial refund/credit note generation as per configured rules.

#### B8. Customer Portal Negotiation Screen
- **FR-36: Secure Access:** This screen SHALL be a separate, restricted view for authenticated customers only.
- **FR-37: Quote Details:** The screen SHALL display the full quotation and its current status (Sent, Under Negotiation, Confirmed).
- **FR-38: Negotiation Tools:** Customers SHALL have a tool to submit line-level comments/change requests and a field to propose a counter-discount.
- **FR-39: Customer Actions:** Customers SHALL be able to "Submit Request" or "Confirm Quotation."
- **FR-40: Auto-Approval Re-Route:** If a customer's final confirmed terms exceed approval thresholds, the quotation SHALL automatically be re-submitted into the approval workflow (FR-24).
- **FR-41: Direct Fulfillment:** If the final terms are within thresholds, the order SHALL proceed directly to fulfillment.

#### B9. Deal Health and Anomaly Dashboard
- **FR-42: Dashboard Widgets:** The dashboard SHALL display key alerts:
    - Stalled Deals (Quotations inactive for >X days, configurable).
    - Discount Anomaly Alerts (Discounts > [Rep's Historical Average + Threshold]).
    - Delivery Promise Slippage Indicators.
- **FR-43: Actionable Alerts:** Clicking on an alert SHALL link directly to the relevant quotation.
- **FR-44: Nudge / Escalation:** The system SHALL provide a mechanism to trigger an automated nudge or escalation from an alert.

### C. Core Business Logic Engine

#### C1. Blended Discount Risk Score
- **FR-45: Line-Level Evaluation:** The engine SHALL evaluate each line item's discount against its specific allowed limit (defined by customer tier and product category rules).
- **FR-46: Aggregation Logic:** The engine SHALL aggregate minor violations across multiple lines to calculate a "blended" risk score for the entire order.
- **FR-47: Workflow Determination:** The engine SHALL use the final score to determine the required approval workflow, preventing small, widespread margin erosion.

#### C2. Warehouse Splitting Logic
- **FR-48: Real-Time Stock Check:** The system SHALL check real-time stock levels across all warehouses during fulfillment.
- **FR-49: Cost Optimization:** The system SHALL aim to minimize the number of shipments and cost based on configured shipping cost weights.
- **FR-50: Manual Override:** The system SHALL allow a manual override of the suggested split.

#### C3. Subscription Billing Engine
- **FR-51: Proration:** The system SHALL calculate prorated charges or credits for mid-cycle changes to subscriptions (quantity upgrades, plan changes, cancellations).
- **FR-52: Billing Schedule Generation:** The system SHALL generate a billing schedule for recurring lines, distinct from the one-time invoice.

## 4. End-to-End Flow & Non-Functional Requirements

### 4.1 End-to-End Flow (High-Level)
The system must support the following complete flow:
1.  **Configuration:** Admin sets up products, price lists, discount tiers, warehouses, and subscription plans.
2.  **Quotation Creation:** Rep logs in, creates a quotation, and adds products/discounts.
3.  **Upsell:** Rep views and accepts an upsell suggestion.
4.  **Approval:** If applicable, the quote enters the approval workflow automatically. Manager and/or Finance approve the terms.
5.  **Fulfillment:** System recommends a warehouse split. User accepts it.
6.  **Billing:** System handles one-time and recurring subscription lines separately.
7.  **Negotiation:** Customer logs in, proposes a change or counter-discount.
8.  **Re-Approval:** If the customer's counter changes terms beyond thresholds, the quote re-enters the approval flow.
9.  **Order Confirmation:** Customer confirms the final order.
10. **Monitoring:** Manager reviews the Deal Health dashboard throughout the cycle.

### 4.2 Non-Functional Requirements

- **NFR-01: Technology Agnostic:** The solution may be built using any programming language, framework, or database.
- **NFR-02: Performance:** The system must be responsive. Key actions like adding a product to a quote or triggering an approval should feel instantaneous to the user.
- **NFR-03: Security:** User authentication and role-based access control must be robust. Customer data must be isolated.
- **NFR-04: Scalability:** The system should be designed to handle a growing number of users, products, and quotations.
- **NFR-05: Auditability:** All critical actions (approvals, discounts, manual overrides) must be fully auditable.

---

## 5. Acceptance Criteria

For the project to be considered "solid," the following **Quick Test Flow** must function correctly:

1.  **Setup:** A user can log in and set up basic backend data (a discount tier, a warehouse, and a subscription plan).
2.  **Auto-Approval Routing:** A quotation with a discount that exceeds its limit automatically asks for approval without manual intervention.
3.  **Upsell Integration:** An upsell suggestion is added to a quote, and the total/margin update immediately.
4.  **Fulfillment Split:** The system suggests splitting stock across warehouses when needed, and the user can accept the suggestion.
5.  **Hybrid Billing:** A one-time product and a recurring subscription on the same order are billed correctly and separately.
6.  **Portal & Re-Approval:** A customer can log in, request a bigger discount, and the system automatically sends the quote back for approval if the terms exceed the set threshold.
7.  **Invoice Status:** After the order is confirmed and payment is recorded, the invoice status updates correctly.

---

## 6. Appendices

### Appendix A: Glossary
- **Blended Risk Score:** An algorithm that assesses the total discount risk of an order by aggregating line-item deviations, rather than just looking at the worst single infraction.
- **Proration:** The action of adjusting the amount payable by a subscriber when they change their subscription mid-cycle.

### Appendix B: Data Model Considerations
A relational or document database must support entities for:
- Users (with roles)
- Customers
- Products & Categories
- Price Lists & Tiers
- Warehouses & Inventory
- Subscription Plans & Schedules
- Quotations & Line Items
- Approvals (with audit trails)
- Fulfillments
- Invoices & Payments

### Appendix C: Integration Points
- **Payment Gateway:** For recording payments and finalizing invoices.
- **Email Service:** For sending quotation links, alerts, and nudges.

---
*This document serves as the single source of truth for the functional requirements of the DealFlow360 platform.*