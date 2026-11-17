---
name: PG & Hostel Management System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#44474e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#485f83'
  primary: '#00142f'
  on-primary: '#ffffff'
  primary-container: '#0f294a'
  on-primary-container: '#7a91b7'
  inverse-primary: '#b0c8f1'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#001815'
  on-tertiary: '#ffffff'
  tertiary-container: '#002f2a'
  on-tertiary-container: '#28a094'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#b0c8f1'
  on-primary-fixed: '#001b3b'
  on-primary-fixed-variant: '#30476a'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  stat-value:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  code-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
---

## Brand & Style

This design system delivers an enterprise-grade, high-trust SaaS management interface tailored for student housing, co-living networks, and PG/hostel operators. The aesthetic balances institutional authority with modern operational speed, projecting reliability, financial accuracy, and multi-property clarity.

The visual style blends **Corporate / Modern SaaS** with high-density data utility:
- **Clean Structure:** Crisp boundaries, standardized container hierarchies, and deliberate vertical rhythm ensure managers can parse dense rental, bed-occupancy, and dues tables without fatigue.
- **Context Awareness:** Prominent visual anchor points for multi-tenant property switchers and role contexts (Property Owner, Property Manager, Resident Warden, Account Auditor).
- **Localized Polish:** Seamless integration of Indian business patterns, specifically rupee currency notation (`₹XX,XX,AAA`), dual fiscal cycle tags, and localized date-time structures (`DD MMM YYYY`).
- **Emotional Output:** Composed, accountable, institutional, and swift.

## Colors

The palette establishes absolute functional clarity. The primary deep navy anchors the chrome, navigational anchors, and core operational controls, while bright accent blue directs forward actions and active links. Functional semantics (fees collection, overdue rents, bed allocations) use purpose-built status colors.

### Core Roles
- **Primary Navy (`#0F294A` / `#1A365D`):** Primary command tier, sidebar navigation canvas, dense table header texts, and primary action buttons.
- **Secondary Vibrant Blue (`#2563EB`):** Interactive focal points, active tab highlights, primary links, key action buttons, and focused inputs.
- **Tertiary Teal / Emerald (`#0D9488` / `#10B981`):** Rent received, 100% occupied status, paid invoices, verified KYC badges, and positive cash flow indicators.
- **Warning Amber (`#F59E0B`):** Upcoming lease expiry, pending repairs, partial fee collection, and provisional bookings.
- **Danger Crimson (`#EF4444`):** Defaulters, overdue dues, critical maintenance emergencies, and eviction notices.
- **Neutral Slate (`#F8FAFC`, `#F1F5F9`, `#E2E8F0`, `#64748B`, `#0F172A`):** App backgrounds, card surfaces, ghost dividers, muted meta tags, and body typography.

### Application Rules
- Maintain light mode by default with a slate-tinted canvas (`#F8FAFC`) to minimize glare during prolonged shifts.
- Avoid using accent blue for status pills; status pills must strictly reflect actual entity states (e.g., Emerald for "Occupied", Amber for "Reserved", Crimson for "Overdue").

## Typography

Typography relies entirely on the geometric and utilitarian clarity of `Inter`. Its tall x-height and clear counterforms maintain legibility across high-density inventory views, financial ledgers, and resident directories.

### Hierarchy & Formatting
- **Financial Figures & Metrics:** Always set currency amounts using tabular figures (`font-variant-numeric: tabular-nums`) with `stat-value` or `headline-md`. Space out currency prefixes neatly (e.g., `₹ 48,500`).
- **Dates & Records:** Render timestamps in `body-sm` using the standardized `DD MMM YYYY` format (e.g., `14 Oct 2025`) alongside relative time badges (`Overdue by 3d`).
- **Property & Room Identifiers:** Display bed and room tags (e.g., `B-204-A`) using uppercase medium tracking (`label-md` or `code-mono`) to prevent operator error during check-ins and audits.

## Layout & Spacing

The layout is built around a standard 12-column responsive fluid grid designed for enterprise administrative control.

### Structural Breakpoints
- **Desktop (≥ 1280px):** 12-column layout. Fixed left-hand navigation sidebar (260px expanded, 72px icon-only rail). Global header holds property switcher, branch selector, and role profile. Margin is `2rem`, gutter is `1.5rem`.
- **Tablet / Laptop (768px – 1279px):** 8-column layout. Collapsible slide-over drawer navigation. Spacing tightens: margins reduce to `1.5rem`, gutters to `1rem`.
- **Mobile (< 768px):** 4-column single-stack layout. Bottom tab navigation for primary quick actions (Rooms, Tenants, Payments, More). Margin is `1rem`, gutter is `0.75rem`.

### Spacing Rules
- KPI metrics decks use `space-lg` (16px) gaps internally and `space-xl` (24px) spacing from subsequent sections.
- Form fields in tenant onboarding dialogs adhere to a strict `space-md` (12px) stack gap with `space-sm` (8px) between label and input.

## Elevation & Depth

This system avoids dramatic skeuomorphic depth, relying on **clean, flat tonal surfaces combined with micro-borders and soft ambient shadows**.

### Elevation Stack
- **Surface 0 (App Canvas):** `#F8FAFC`. Zero elevation, non-interactive ground plane.
- **Surface 1 (Card & Module Layer):** `#FFFFFF` background with border `1px solid #E2E8F0` and subtle ambient drop shadow: `box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.05)`.
- **Surface 2 (Hovered Cards & Tables):** Elevated interactive elements lift on hover: `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`, border shifts to `#CBD5E1`.
- **Surface 3 (Flyouts, Menus & Dropdowns):** Multi-tenant switchers, contextual action menus: `box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)`.
- **Surface 4 (Modals & Slide-over Drawers):** Overlay check-in workflows, bed allocation panels: `#FFFFFF` bounded with `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`, flanked by backdrop barrier `#0F172A` at 40% opacity (`backdrop-blur-sm`).

## Shapes

The design system employs a refined, rounded geometric profile (`roundedness: 2`). This keeps containers structural and serious while eliminating sterile sharp corners.

### Radii Hierarchy
- **Base UI Controls (Inputs, Buttons, Dropdowns):** `rounded-md` (`0.375rem` / 6px) to maintain a precise operational feel.
- **Cards, Modular Dashboards, Panels:** `rounded-xl` (`0.75rem` / 12px) to clearly frame KPI clusters and data segments.
- **Status Pills, Count Chips, Avatar Enclosures:** Full pill shape (`rounded-full` / 9999px) to clearly differentiate metadata tags from clickable inputs.
- **Modal Dialogs & Floating Sheets:** `rounded-2xl` (`1rem` / 16px) for softened, modern framing.

## Components

### 1. Navigation & Context Switchers
- **Multi-Tenant Property Switcher:** Located at the top of the sidebar. Displays a combined property name, city tag, and building thumbnail with a distinct chevron trigger. Features an interactive dropdown showing property occupancy stats (`e.g., Koramangala Hub - 94% Full`).
- **Role Switcher:** Segmented control or dropdown tagged with permission badges (`Super Admin`, `Warden`, `Accountant`). Switches available actions and masks sensitive financial metrics for non-admin accounts.

### 2. KPI Stat Cards
- Enclosed in `rounded-xl` containers with `#FFFFFF` background and `#E2E8F0` border.
- Structure:
  - Top row: Metric title in `body-sm` (`#64748B`) alongside a muted circular icon container.
  - Middle: High-emphasis number (`stat-value`) formatted in Indian denomination (e.g., `₹ 8,42,000`).
  - Bottom row: Micro trend indicator with an arrow pill (Emerald for growth, Crimson for decline) paired with comparison context (`vs last month`).

### 3. Data Tables & Status Pills
- **Header:** `#F8FAFC` background, uppercase `label-sm` text (`#64748B`), borders set to `#E2E8F0`.
- **Row Styling:** `48px` default row height, hover transition to `#F1F5F9`. Fixed right column for action kebab (`...`).
- **Status Pills:** Pill-shaped tags (`rounded-full`) with light tonal backgrounds and bold text:
  - *Occupied / Paid:* `#ECFDF5` background, `#065F46` text.
  - *Vacant / Available:* `#EFF6FF` background, `#1D4ED8` text.
  - *Under Maintenance / Due Soon:* `#FFFBEB` background, `#92400E` text.
  - *Defaulter / Eviction / Overdue:* `#FEF2F2` background, `#991B1B` text.

### 4. Interactive Bed Matrix Grid
- A dedicated spatial component for PG hostels. Visualizes rooms as grouped cells containing bed chips (`Bed A`, `Bed B`, `Bed C`).
- Color-coded borders represent bed status (Green for vacant, Navy for occupied, Amber for notice period). Clicking opens a resident drawer.

### 5. Buttons & Action Triggers
- **Primary:** `#0F294A` solid background, white text, subtle hover shift to `#1A365D`.
- **Secondary / Action:** `#2563EB` solid background, white text. Used for positive flows such as "Collect Rent" and "Check-in Resident".
- **Outline / Ghost:** Transparent background, `1px solid #E2E8F0`, `#0F172A` text, hover fills with `#F1F5F9`.
- **Destructive:** `#EF4444` solid background or red outline for ejecting residents, canceling bookings, or marking bad debt.

### 6. Inputs & Form Controls
- Inputs use a `38px` base height with `0.375rem` corners.
- Default border is `#CBD5E1`. On focus, transition to `#2563EB` with a `0 0 0 3px rgba(37, 99, 235, 0.15)` focus ring.
- Currency fields include an integrated `#F1F5F9` prepended prefix block displaying `₹`.
- Checkboxes and radio buttons use `#2563EB` for selected states with clear white tick/dot glyphs.