# DealFlow360 — Frontend Design Plan

Design lead brief for the 18-screen surface (login → quote → approval → fulfillment → subscription → billing → invoice → payment, plus product/pricing admin). Stack is fixed by [Tech-stack.md](Tech-stack.md): Next.js, Tailwind, shadcn/Radix, Recharts, `apps/web`. This doc is the visual system that sits on top of it.

---

## 0. Subject, audience, job

DealFlow360 is not a marketing site — it's the **console sales, finance, and ops people work inside all day** to move a deal from quote to cash. Three distinct users touch it: a sales rep building a quote, a manager/finance approver clearing a discount, and an ops/fulfillment or admin person watching stock and deal health. The design's job is to make **where a deal is, and what's blocking it**, legible at a glance across dense, numeric, multi-stage screens — not to look like a landing page.

The real state machine (from [05-QUOTATION_LIFECYCLE_GOVERNANCE.md](05-QUOTATION_LIFECYCLE_GOVERNANCE.md)) is: `draft → pending_approval → sent → under_negotiation → confirmed → fulfilled` (with `rejected` / `cancelled` branches), then billing runs `Order Confirmed → Shipped → Invoiced → Paid`. This is a genuine sequence, not a marketing device — it's the one thing worth building the whole visual identity around, and it matches the product's own name.

---

## 1. Design plan (pass 1)

**Color** — 4-6 named values, layered on the tweakcn "Minimal Neutral" base already chosen (`https://tweakcn.com/r/themes/cmho4nr9l000h04l1gu419ckw`: near-white/near-black neutrals, no baked-in hue, `oklch` destructive red, DM Sans, 1rem radius). Because that base is intentionally colorless, the app needs exactly **one** accent hue plus functional status colors — nothing decorative on top.

| Token | Value | Role |
|---|---|---|
| `--ink` | `oklch(0.1450 0 0)` (theme foreground) | text, rails, borders — the neutral base carries the UI |
| `--paper` | `oklch(1 0 0)` (theme background) | canvas |
| `--flow` (accent) | `oklch(0.47 0.13 255)` ≈ `#3B5BA9` deep ink-blue | the *one* brand color: active stage marker, primary actions, links, focus ring |
| `--stage-done` | `oklch(0.55 0.09 165)` ≈ `#3E8E6E` muted teal-green | completed stage / approved / paid |
| `--stage-blocked` | `oklch(0.62 0.19 35)` ≈ `#C7562B` burnt sienna | rejected / at-risk / stockout |
| `--stage-pending` | `oklch(0.75 0.13 85)` ≈ `#C9962E` ochre | pending approval / awaiting stock / draft-not-sent |

I deliberately avoided the AI-tell terracotta (`#D97757`) for the primary accent and picked an ink-blue instead — it reads as "ledger/finance," not "AI demo." Green/ochre/sienna are used **only** as status semantics (they appear already as `success`/`warning` tokens in the current `globals.css`), never as decoration.

**Type** — DM Sans (already the tweakcn pick) for all UI text and headings; **Geist Mono** (also in the theme) reserved strictly for things that are literally tabular or coded: money amounts, quote/invoice IDs (`Q-1042`, `INV-1042`), percentages in discount tables, timestamps in audit trails. This is a *functional* use of mono (column alignment of numerals), not a label-decoration tell. No serif anywhere — two families, clearly distinct roles, matches guidance.

Type scale (DM Sans): 13 / 14 / 16 / 20 / 26 / 34px, weights 500 (body/labels), 600 (section headers), 700 (page title + KPI numerals only). No all-caps labels; sentence case throughout.

**Layout** — one-sentence concepts + wireframes:

*Shell*: a slim left icon-rail (persistent, matches the existing top-nav tabs: Dashboard/Quotations/Approvals/Fulfillment/Subscriptions/Invoices/Deal Health/Reports/Products) with content right-aligned to a max content width, left-aligned text throughout (this is a working tool — center alignment would fight scanability of tables).

```
┌──┬────────────────────────────────────────────┐
│  │  Page title            [primary action]     │
│ r│  ──────────────────────────────────────────  │
│ a│  Stage rail (on detail pages only)           │
│ i│  ──────────────────────────────────────────  │
│ l│  Content: table | form | KPI row + list      │
│  │                                              │
└──┴────────────────────────────────────────────┘
```

*List pages* (Quotations, Approvals, Fulfillment, Subscriptions, Invoices, Products): a plain hairline-ruled table/board, never a grid of shadow-cards — rows are the content, and a status chip is the only color per row.

*Detail pages* (Quotation/Approval/Fulfillment/Billing/Invoice Detail): a signature horizontal **stage rail** at the top (filled node = done, ink-blue ring = current, hollow = upcoming) driven directly off the real state machine — then a plain sectioned body below (header + hairline rule per section, not boxed cards).

*Dashboards* (Sales, Deal Health, Admin Reporting): a KPI row (3-4 numerals, label below, no icon-in-a-circle decoration) then a list/table below — the mockup's own three-tile pattern, kept, because it's the correct density for a status-check screen, not a default reach.

**Principles**

1. The stage rail is the one recurring signature — it appears nowhere else in category, and it's load-bearing (it's the actual `status` enum), so repetition here is information, not a template.
2. One accent color, ink-blue, used only for the current stage and primary actions — everything else is neutral ink/paper plus the three functional status hues.
3. Money and IDs are set in mono and right- or left-anchored consistently, like a ledger — never centered.
4. No card-izing every section. A box/border only appears where content is genuinely a discrete, separately-actioned unit (a KPI tile, a line-item row, a negotiation message).
5. One motion moment per page at most, and only where it answers a person's action or a live number changing — never a load-in fade.

---

## 2. Review against the brief (pass 2 — what I changed and why)

- **First instinct** was the SaaS-card-kit: every dashboard tile and list row in its own rounded-shadow card. Rejected — with 18 dense screens that's the fastest way to look like a generated admin template, and the mockup itself already draws lists as plain ruled tables, not cards. Changed to hairline-rule sections, cards reserved for KPI tiles and negotiation messages only.
- **First color instinct** was the warm cream + terracotta combo (direct AI-generic tell #1). Rejected outright; picked ink-blue on the neutral base instead, which also reads more "ledger/ops tool" than "marketing site."
- **First instinct** for stage progress was numbered circles 1/2/3/4 with connecting lines — that's the generic "process steps" pattern. Kept the connecting-rail *shape* but tied every node directly to the real `status` enum values and made the current node's fill the app's only bold visual event per page, so it's diagrammatic (a state machine), not decorative numbering.
- Dropped an initially-planned "recent activity" auto-scroll ticker on the Sales Dashboard (react-bits marquee) — reads as gimmicky motion on a page whose job is quick scanning, not spectacle. Kept motion only for the KPI counters and the stage-rail transition.

---

## 3. Final tokens (for `apps/web/app/globals.css`)

Install the base theme, then layer status tokens on top (the current file already has `--success`/`--warning`/`--destructive` — keep those names, just retune values to match):

```bash
pnpm dlx shadcn@latest add https://tweakcn.com/r/themes/cmho4nr9l000h04l1gu419ckw
```

After install, add (light mode shown; mirror in `.dark`):

```css
:root {
  --flow: 224 47% 43%;          /* #3B5BA9 ink-blue — primary/ring, overrides theme primary */
  --success: 158 39% 40%;       /* #3E8E6E — confirmed / approved / paid */
  --warning: 39 62% 51%;        /* #C9962E — pending / draft / awaiting stock */
  --destructive: 16 65% 47%;    /* #C7562B — rejected / at-risk / stockout (retuned off theme red) */
  --font-mono-data: "Geist Mono", ui-monospace, monospace;
}
```

Map `--primary` → `--flow` in `tailwind.config.ts` so every shadcn primitive (Button, Ring, Switch) picks it up for free.

---

## 4. Setup commands

```bash
# 1. shadcn + tweakcn theme (run once, from apps/web)
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add https://tweakcn.com/r/themes/cmho4nr9l000h04l1gu419ckw

# 2. Core primitives used across the 18 screens
pnpm dlx shadcn@latest add button badge card dialog input label select \
  table tabs textarea progress separator dropdown-menu sheet \
  tooltip popover command avatar skeleton sonner

# 3. React Bits — copy-paste per component via their CLI, add only the few used deliberately (see §6)
pnpm dlx shadcn@latest add https://reactbits.dev/r/CountUp-TS-CSS
pnpm dlx shadcn@latest add https://reactbits.dev/r/AnimatedList-TS-CSS
pnpm dlx shadcn@latest add https://reactbits.dev/r/SpotlightCard-TS-CSS
```

React Bits ships as source you own (not an npm dep) — treat each as a starting point to restyle with the tokens above, not a drop-in. Use it for exactly three things (see motion plan, §7) and nowhere else, so it doesn't become the generic "animated background blob" tell.

---

## 5. Component inventory

Reuses what already exists in `apps/web/components/` and names new pieces consistently with it:

| Component | Status | Used on |
|---|---|---|
| `shared/stage-badge.tsx` | exists — extend into `shared/stage-rail.tsx` | all *Detail pages (4/5/7/10/13) |
| `shared/risk-pill.tsx` | exists | Approvals list/detail, Deal Health |
| `shared/money.tsx` | exists — enforce mono numerals | every table with amounts |
| `shared/quote-totals-bar.tsx` | exists | Quotation Detail |
| `quotations/pipeline-board.tsx` | exists | Quotations List (kanban view toggle) |
| `quotations/quote-card.tsx` | exists — restyle: drop shadow, hairline border only | Quotations List |
| `shared/kpi-tile.tsx` | **new** | Sales Dashboard, Deal Health, Admin Reporting |
| `shared/ledger-table.tsx` | **new** — generic right-anchored numeric table wrapper on shadcn `Table` | Fulfillment, Invoices, Billing, Subscriptions |
| `shared/status-chip.tsx` | **new** — solid-fill pill, 4 semantic variants | every list page |
| `portal/negotiation-view.tsx` | exists | Customer Portal Negotiation |
| `quote-builder/*` panels | exist | Quotation Detail assembly |
| `admin/*` dialogs | exist | Product/Discount-tier admin |
| `workspace/top-nav.tsx` | exists — convert to left icon-rail per layout | app shell |
| `shared/audit-timeline.tsx` | **new** | Approval Detail, Invoice Detail |

---

## 6. Page-by-page spec (all 18)

Route paths reference the existing `app/` route groups where they already exist.

**1. Login** (`app/login`) — centered single card, no marketing copy, no illustration. Just wordmark, email/password, "Log in." One line of helper text below the fold explaining domain-based role routing. No accent color except the button.

**2. Sales Dashboard** (`app/(workspace)/dashboard`) — KPI row: *Pending approvals*, *Open quotations*, *At-risk deals* (`kpi-tile`, numerals animate via React Bits CountUp on mount only, once). Below: a plain two-column split — Recent Activity (static list, no ticker) and quick actions (New Quotation / View Approvals).

**3. Quotations List** (`app/(workspace)/quotations`) — toggle between table and `pipeline-board` (kanban by status — this already exists and matches the state machine, so it's a legitimate reuse of the "column = stage" idea, not a generic kanban add-on). Table view: Customer, Amount (mono), Stage (`status-chip`), Updated, Owner.

**4. Quotation Detail** (`app/(workspace)/quotations/[id]`) — `stage-rail` at top (Draft → Pending Approval → Sent → Negotiation → Confirmed). Below: `line-items-table` (ledger style), `quote-totals-bar`, then upsell/cross-sell as a plain 3-up row of text+price, not cards with images.

**5. Approval Detail** — `stage-rail` reused, current node = approver level. Body: "Why this quote was flagged" as a short plain-language paragraph (per writing guidance — explain the trigger, not a vague banner), a `risk-pill` line for discount/tier breach, then Approve / Return for Revision / Reject as three distinctly weighted buttons (primary / ghost / destructive-outline) — never three equal buttons.

**6. Approvals List** — grouped by urgency (Pending / Escalated / Approved) as three plain sections with counts in the header, not tabs — because the mockup shows all three simultaneously and that's the actual triage view a manager needs.

**7. Fulfillment Detail** — warehouse allocation table (`ledger-table`), Accept Suggested Split as primary, Manual Override as secondary text-link-style action (it's the exception path, shouldn't visually compete).

**8. Fulfillment & Stock List** — table with an inline availability bar (thin horizontal fill, not a progress "card") per row; orders awaiting fulfillment as a second plain section below, not a separate page.

**9. Subscriptions List** — status chips: Active / Trial / Cancelled. Recurring amount in mono, right-aligned. Row click → Billing Detail.

**10. Billing Detail** — two plain sections: One-Time Lines, Recurring Lines — both `ledger-table`. Modify / Cancel Subscription as a right-aligned action pair at the bottom, Cancel styled destructive-outline (never solid red as a casual button).

**11. Customer Portal Negotiation** — the one screen a *customer* sees, so it gets slightly warmer framing (still ink/paper, no new hue): message thread (`negotiation-view`, existing) left, counter-offer numbers right-anchored in mono so the customer can compare against the original line without hunting. Submit Request / Confirm Order weighted primary/secondary by which the deal state actually allows.

**12. Invoices List** — same table pattern as Quotations, Status chip vocabulary: Unpaid / Overdue (destructive) / Paid (success).

**13. Invoice Detail** — second use of the stage rail, this time the billing lifecycle (Order Confirmed → Shipped → Invoiced → Paid) — same component, different `steps` prop, reinforcing that the rail *is* the app's status language everywhere, not a one-off.

**14. Deal Health & Anomaly Dashboard** — KPI row (Stalled Deals, Discount Anomalies, Delivery Slippage) then a flat list of flagged items, each with one-line plain-language reason (`audit-timeline`-style entry) and a single action (Escalate / Nudge Rep) — no bar charts here, this is a triage list, not analytics.

**15. Admin/Reporting Dashboard** — this is the one screen where Recharts earns its place: 2 small line/bar charts (Quotes Created trend, Avg Approval Time trend) using the neutral+flow palette, plus Export PDF/CSV as secondary actions in the header, not buried.

**16. Product Catalog** (`app/(admin)/admin/products`) — plain table, Total Products / Price Lists / Variants as a compact KPI strip above it (reuses `kpi-tile` at smaller size).

**17. Product Details** (`admin/product-form-dialog.tsx`, promoted to a full page for the deep-edit case) — form in two columns (General info / Product classes) matching the mockup, attribute matrix as a `ledger-table` (Attribute, Values, Extra price in mono).

**18. Discount Tiers & Approval Chains** (`admin/tiers`) — two side-by-side plain tables (Tier→Max Discount, Category→Max Discount) then the approval-chain rule list below as a 3-row table (Discount range, Max Discount, Approval path) — this is config, so it should look like a settings table, not a dashboard; Save Configuration as the single primary action bottom-right.

---

## 7. Motion plan (React Bits, used exactly 3 places)

1. **CountUp** on the three dashboard KPI tiles (Sales Dashboard, Deal Health, Admin Reporting) — numerals count up once on first paint only, ~600ms, respects `prefers-reduced-motion` (render final value instantly if set).
2. **Stage-rail fill transition** — when a deal's stage actually changes (approve/reject/confirm action), the rail's current node animates its fill (200ms) — motion answers the action just taken, per guidance.
3. **SpotlightCard** hover, restricted to the Approvals List's "Escalated" row group only — a subtle border-glow on hover to draw the eye to the highest-urgency items, not applied to every row/card in the app.

Everything else — page loads, list renders, tab switches — is instant, no fade/slide-up choreography.

---

## 8. Accessibility & responsive floor

- Visible focus ring = `--flow` on every interactive element (shadcn default wired to `--ring`).
- Status is never color-only: every `status-chip` and `risk-pill` carries text, not just a hue.
- Stage rail collapses to a compact "Stage 3 of 5 — Sent" text summary under 640px instead of the horizontal rail.
- Tables scroll horizontally within their own container below 768px; page body never scrolls sideways.
- All amounts use `<span class="tabular-nums font-mono">` regardless of viewport.
- `prefers-reduced-motion` disables CountUp and the spotlight hover glow; stage-rail fill becomes an instant swap.

---

## 9. Copy voice (per writing guidance)

- Buttons name the action's result in the product's own vocabulary: "Send for approval," "Approve," "Return for revision," "Confirm order," "Cancel subscription" — never "Submit."
- A rejection or flag explains the trigger in plain language ("Discount exceeds this tier's 10% limit — needs finance sign-off"), not a generic "Validation failed."
- Empty states are an instruction, not a mood: Approvals List empty → "No approvals waiting. New requests appear here as reps submit quotes over their discount limit." not "Nothing here yet!"
- No middle-dot meta strings, no ALL-CAPS eyebrows, no trailing arrows on links — sentence case labels throughout ("Fulfillment", not "FULFILLMENT").