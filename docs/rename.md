# Rebranding Plan: ResIpsaAI → In Depo Veritas

## Overview
This document outlines the comprehensive rebranding from "ResIpsaAI" to "In Depo Veritas". This includes all code references, configuration files, documentation, assets, and infrastructure references.

## Naming Conventions to Apply

- **ResIpsaAI** → **InDepoVeritas** (no spaces, PascalCase)
- **Res Ipsa AI** → **In Depo Veritas** (with spaces, display name)
- **resipsaai** → **indepoveritas** (lowercase, no spaces)
- **resipsa-ai** → **in-depo-veritas** (kebab-case)
- **resipsa** → **indepoveritas** (lowercase, simple form)

## 1. Configuration Files

### 1.1 Package.json
- **File**: `package.json`
- **Line 2**: Change project name from `"name": "resipsa"` to `"name": "indepoveritas"`

### 1.2 Database Setup
- **File**: `setupdb.sh`
- **Line 10**: Change `db_name="resipsa"` to `db_name="indepoveritas"`
- **Line 65**: Change docker container name from `postgres-resipsa` to `postgres-indepoveritas`

### 1.3 Next.js Configuration
- **File**: `next.config.ts`
- **Line 13**: Change hostname pattern from `"*.resipsaai.com"` to `"*.indepoveritas.com"`

### 1.4 README
- **File**: `README.md`
- **Line 1**: Change title from `# Res Ipsa` to `# In Depo Veritas`
- **Line 6**: Change stripe webhook URL from `http://local.resipsaai.com:4049` to `http://local.indepoveritas.com:4049`

## 2. Source Code - Configuration & Constants

### 2.1 Email Configuration
- **File**: `src/config.ts`
- **Lines 7-13**: Update all email addresses and sender names:
  - `SEND_FROM`: "Res Ipsa AI" → "In Depo Veritas"
  - `WELCOME_FROM`: "Support from Res Ipsa" → "Support from In Depo Veritas"
  - Email domains: `@resipsaai.com` → `@indepoveritas.com`
  - All variations: `support@updates.resipsaai.com` → `support@updates.indepoveritas.com`
  - `support@resipsaai.com` → `support@indepoveritas.com`

### 2.2 Stripe Integration
- **File**: `src/server/utils/stripe.ts`
- **Line 13**: Change `name: "resipsa-ai"` to `name: "in-depo-veritas"`
- **Line 14**: Change `url: "https://resipsaai.com/"` to `url: "https://indepoveritas.com/"`

### 2.3 Stripe Product Data
- **File**: `src/stripe/data.ts`
- **Line 23**: Change `name: "Res Ipsa AI - Essential Plan Subscription"` to `name: "In Depo Veritas - Essential Plan Subscription"`

### 2.4 Local Storage Keys
- **File**: `src/stores/chat-store.ts`
- **Line 108**: Change `name: "resipsa-chat-storage"` to `name: "indepoveritas-chat-storage"`

## 3. UI Components

### 3.1 Logo Components
- **File**: `src/features/shared/resipsa-logo-button.tsx`
  - **Filename**: Rename to `indepoveritas-logo-button.tsx`
  - **Line 4**: Rename function from `ResipsaLogoButton()` to `InDepoVeritasLogoButton()`
  - **Line 11**: Change alt text from "Res Ipsa Company Logo" to "In Depo Veritas Company Logo"
  - **Line 16**: Change text from `<span>Res Ipsa AI</span>` to `<span>In Depo Veritas</span>`

- **File**: `src/components/logo.tsx`
  - **Line 7**: Uncomment and change to `<span className="text-2xl font-bold">In Depo Veritas</span>`

### 3.2 Sidebar Component
- **File**: `src/components/app-sidebar.tsx`
- **Line 39**: Update import from `resipsa-logo-button` to `indepoveritas-logo-button`
- **Line 159**: Update component name from `<ResipsaLogoButton />` to `<InDepoVeritasLogoButton />`

### 3.3 Image References
- **File**: `src/features/mail-view/mail-container.tsx`
- **Line 260**: Change alt text from "ResIpsa Logo" to "InDepoVeritas Logo"

### 3.4 Banner Component
- **File**: `src/components/no-new-users-banner.tsx`
- **Line 10**: Change text from "Res Ipsa AI is no longer accepting new users" to "In Depo Veritas is no longer accepting new users"
- **Line 12**: Change email from `support@resipsa.ai` to `support@indepoveritas.com`

### 3.5 Onboarding Form
- **File**: `src/components/onboarding-form.tsx`
- **Line 128**: Change text from "Res Ipsa AI" to "In Depo Veritas"

## 4. Page Metadata & Layouts

### 4.1 Root Layout
- **File**: `src/app/layout.tsx`
- **Lines 26-27**: Change title and description from "Res Ipsa" to "In Depo Veritas"

### 4.2 Default Layout
- **File**: `src/default-layout.tsx`
- **Line 7**: Change title from "Res Ipsa AI" to "In Depo Veritas"

### 4.3 App Pages
- **File**: `src/app/app/page.tsx`
- **Line 5**: Change title from "Res Ipsa AI: Depositions" to "In Depo Veritas: Depositions"

- **File**: `src/app/app/admin/documents/page.tsx`
- **Line 5**: Change title from "Res Ipsa AI Admin Site" to "In Depo Veritas Admin Site"
- **Line 6**: Change description from "Allow Res Ipsa Admin users..." to "Allow In Depo Veritas Admin users..."

- **File**: `src/app/app/settings/layout.tsx`
- **Line 8**: Change description from "Res Ipsa Settings" to "In Depo Veritas Settings"

### 4.4 Error Pages
- **File**: `src/app/global-error.tsx`
- **Line 24**: Change text from "Go back to Res Ipsa AI" to "Go back to In Depo Veritas"

- **File**: `src/app/[...not-found]/page.tsx`
- **Line 14**: Change text from "Go back to Res Ipsa AI" to "Go back to In Depo Veritas"

### 4.5 Auth Pages
- **File**: `src/app/(auth)/login/components/login-form.tsx`
- **Line 187**: Change text from "Res Ipsa AI" to "In Depo Veritas"

## 5. Email Templates

### 5.1 Authentication Emails
- **File**: `src/emails/user/send-auth-code.tsx`
- **Line 30**: Change subject from "...your Res Ipsa AI verification code" to "...your In Depo Veritas verification code"
- **Line 49**: Change preview text from "Your Res Ipsa AI verification code..." to "Your In Depo Veritas verification code..."

### 5.2 Welcome Email
- **File**: `src/emails/user/welcome-signup.tsx`
- **Line 33**: Change subject from "Welcome into Res Ipsa AI" to "Welcome to In Depo Veritas"
- **Line 53**: Change heading from "Welcome to Res Ipsa AI..." to "Welcome to In Depo Veritas..."
- **Line 59**: Change text from "Support here with Res Ipsa AI..." to "Support here with In Depo Veritas..."
- **Line 73**: Change signature from "Engineering @ Res Ipsa AI" to "Support @ In Depo Veritas"
- **Line 75**: Change email from `support@resipsaai.com` to `support@indepoveritas.com`

### 5.3 Summary Ready Email
- **File**: `src/emails/user/summary-ready.tsx`
- **Line 34**: Change preview from "Your Res Ipsa AI deposition summary..." to "Your In Depo Veritas deposition summary..."
- **Line 45**: Change text from "...Your Res Ipsa AI deposition summary..." to "...Your In Depo Veritas deposition summary..."
- **Line 66**: Change text from "...from the Res Ipsa AI team" to "...from the In Depo Veritas team"
- **Line 77**: Change `appUrl: "https://resipsaai.com/app"` to `appUrl: "https://indepoveritas.com/app"`

### 5.4 Team Invitation Email
- **File**: `src/emails/user/team-invitation.tsx`
- **Line 48**: Change subject from "...join ... on Res Ipsa" to "...join ... on In Depo Veritas"
- **Line 68**: Change heading from "...join ... on Res Ipsa" to "...join ... on In Depo Veritas"
- **Line 91**: Change signature from "The Res Ipsa Team" to "The In Depo Veritas Team"

### 5.5 File Failure Email
- **File**: `src/emails/user/all-files-failed.tsx`
- **Line 106**: Change `url: "https://resipsaai.com"` to `url: "https://indepoveritas.com"`

### 5.6 Admin Emails
- **File**: `src/emails/admin/new-user-signup.tsx`
- **Line 53**: Change preview from "New Res Ipsa AI user signup..." to "New In Depo Veritas user signup..."
- **Line 61**: Change text from "...signed up to Res Ipsa AI..." to "...signed up to In Depo Veritas..."
- **Line 96**: Change email from `support@resipsaai.com` to `support@indepoveritas.com`

- **File**: `src/emails/admin/file-failures.tsx`
- **Line 55**: Change preview from "Res Ipsa AI File Processing Failures Alert" to "In Depo Veritas File Processing Failures Alert"

### 5.7 Email Components
- **File**: `src/emails/components.tsx`
- **Lines 84, 91**: Change "Res Ipsa AI, LLC" to "In Depo Veritas, LLC"

## 6. Landing Page / Splash Screen

### 6.1 Pricing Section
- **File**: `src/features/splash-screen/pricing.tsx`
- **Line 47**: Change text from "Res Ipsa AI - Essential Plan" to "In Depo Veritas - Essential Plan"

### 6.2 FAQ Section
- **File**: `src/features/splash-screen/faq.tsx`
- Multiple references throughout (Lines 141, 163, 165, 214, 222, 234):
  - Replace all instances of "Res Ipsa AI" with "In Depo Veritas"
  - Update all occurrences in the FAQ content discussing the product name

## 7. Screenshots & Testing
- **File**: `src/features/create-summaries/screenshot/take-screenshot.ts`
- **Line 66**: Change comment from `resipsaai.com` to `indepoveritas.com`

## 8. Image Assets

### 8.1 Logo Files (Public Directory)
All logo files in `/public/` need to be replaced with new "In Depo Veritas" branded versions:
- `favicon-150x150.png`
- `favicon.ico`
- `logo-footer.png`
- `logo-web.png`
- `logo.png`

### 8.2 Logo Base64
- **File**: `src/images/logo.ts`
- **Line 1**: Replace entire base64 encoded logo with new In Depo Veritas logo

### 8.3 Favicon SVG
- **File**: `src/images/favicon.svg`
- Replace with new In Depo Veritas favicon SVG

## 9. File Renames Required

The following files need to be renamed to reflect the new brand:

1. `src/features/shared/resipsa-logo-button.tsx` → `indepoveritas-logo-button.tsx`

## 10. External Services & Infrastructure

### 10.1 Domain Names
- Primary domain: `resipsaai.com` → `indepoveritas.com`
- Email subdomain: `updates.resipsaai.com` → `updates.indepoveritas.com`
- Local development: `local.resipsaai.com` → `local.indepoveritas.com`

### 10.2 Email Addresses to Update
All email addresses need to be updated in external services:
- `support@resipsaai.com` → `support@indepoveritas.com`
- `support@updates.resipsaai.com` → `support@updates.indepoveritas.com`
- `updates@updates.resipsaai.com` → `updates@updates.indepoveritas.com`

### 10.3 Stripe Configuration
- Update product names in Stripe dashboard
- Update webhook URLs to point to new domain
- Update company information in Stripe account

### 10.4 DNS & Hosting
- Set up new domain `indepoveritas.com`
- Configure DNS records
- Update Vercel project settings
- Update SSL certificates

### 10.5 Environment Variables
Review and update `.env` files (not in repo) with new domain references:
- Database connection strings (if they include domain)
- API endpoints
- Webhook URLs
- Email service configurations

## 11. Database Considerations

### 11.1 Database Name
- Current: `resipsa`
- New: `indepoveritas`
- **Action**: May need to create migration or rename existing database

### 11.2 Stored Data
Review database for any stored references to "Res Ipsa" or "ResIpsaAI" in:
- User-facing messages
- System notifications
- Configuration data
- Email templates stored in DB

## 12. Legal & Copyright

### 12.1 Company Name References
- Email footers: "Res Ipsa AI, LLC" → "In Depo Veritas, LLC" (or appropriate legal entity)
- Copyright notices
- Terms of service
- Privacy policy

## 13. Third-Party Integrations

Review and update integrations that may reference the old brand:
- Email service provider (Resend)
- Stripe product descriptions
- OAuth applications
- API integrations
