# Email Normalization Plan

## Problem Statement

Emails are currently stored with their original casing, but email addresses are case-insensitive per RFC 5321. This creates issues where:
- `User@Example.com` and `user@example.com` could be treated as different users
- Better Auth lookups may fail if the user enters their email with different casing than stored
- Invitation matching fails when email casing differs between invite and login

## Current State Analysis

### Email Entry Points

| Location | File | Current Behavior |
|----------|------|------------------|
| **Login Form** | `src/app/(auth)/login/components/login-form.tsx` | Email passed directly to Better Auth as-is |
| **Admin Invite User** | `src/server/api/routers/admin.ts` (line 493-587) | Email stored directly to DB without normalization |
| **Team Invite** | `src/server/api/routers/organization.ts` (line 85-171) | Email stored to Invitation table as-is |
| **Accept Invitation** | `src/server/api/routers/organization.ts` (line 335-395) | Compares session email to invitation email (case-sensitive) |
| **Better Auth Hook** | `src/lib/auth.ts` (line 42-80) | No normalization in `create.before` hook |

### Database Tables with Email Fields

1. **User** (`prisma/schema.prisma` line 15-41)
   - `email String` with `@@unique([email])` constraint
   - PostgreSQL unique constraints are case-sensitive by default

2. **Invitation** (`prisma/schema.prisma` line 141-155)
   - `email String` - no unique constraint, but used for lookups

3. **Verification** (`prisma/schema.prisma` line 79-89)
   - `identifier String` - stores email for OTP verification

### Existing Helper (Unused)

```typescript
// src/lib/utils/index.ts (line 74-76)
export const formatEmail = (email: string) => {
  return email.toLowerCase().trim();
};
```

This function exists but is **not imported or used anywhere**.

---

## Implementation

### 1. Better Auth Database Hook

**File:** `src/lib/auth.ts`

Modify the `databaseHooks.user.create.before` hook to normalize email before user creation:

```typescript
databaseHooks: {
  user: {
    create: {
      before: async (user, ctx) => {
        return {
          data: {
            ...user,
            email: user.email.toLowerCase().trim(), // ADD THIS
            firstName: user.name.split(" ")[0],
          },
        };
      },
      // ... after hook unchanged
    },
  },
  // ... session hooks unchanged
},
```

**Why:** This catches any user created through Better Auth, including edge cases.

### 2. Admin Invite User Endpoint

**File:** `src/server/api/routers/admin.ts`

Normalize email immediately after input destructuring:

```typescript
inviteUser: adminProcedure
  .input(
    z.object({
      email: z.string().email(),
      // ... other fields
    }),
  )
  .mutation(async ({ input }) => {
    const { 
      email: rawEmail,  // Rename
      name, 
      organizationName, 
      sendEmail: shouldSendEmail 
    } = input;
    
    const email = rawEmail.toLowerCase().trim(); // ADD THIS

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });
    // ... rest unchanged
  }),
```

**Changes needed:**
- Line 503: Rename `email` to `rawEmail` and normalize
- All subsequent uses of `email` in this function will use normalized value (user creation, verification creation, email sending)

### 3. Team Invite Endpoint

**File:** `src/server/api/routers/organization.ts`

Same pattern - normalize after input:

```typescript
inviteTeamMember: protectedOrganizationProcedure
  .input(
    z.object({
      email: z.string().email(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const email = input.email.toLowerCase().trim(); // ADD THIS
    
    // Use normalized email in all lookups and storage
    const existingMember = await ctx.db.member.findFirst({
      where: {
        organizationId,
        user: {
          email, // Now normalized
        },
      },
    });
    // ... rest uses normalized email
  }),
```

### 4. Login Flow (Better Auth Client)

**File:** `src/app/(auth)/login/components/login-form.tsx`

Normalize before sending to Better Auth:

```typescript
const sendOtpMutation = useMutation({
  mutationFn: async () => {
    return authClient.emailOtp.sendVerificationOtp({
      email: email.toLowerCase().trim(), // NORMALIZE HERE
      type: "sign-in",
    });
  },
  // ...
});
```

Also normalize in:
- `verifyOtpMutation` (line 99-124)
- `resendOtpMutation` (line 126-145)

**Alternative:** Create a derived `normalizedEmail` that's used everywhere:

```typescript
const normalizedEmail = email.toLowerCase().trim();

// Use normalizedEmail in all API calls
```

### 5. Accept Invitation Lookup

**File:** `src/server/api/routers/organization.ts`

The `acceptInvitation` procedure compares `ctx.session.user.email` to `invitation.email`. If existing data has mixed casing, this could fail.

**Fix:** Normalize both sides in the comparison:

```typescript
acceptInvitation: protectedProcedure
  .input(
    z.object({
      invitationId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const normalizedSessionEmail = ctx.session.user.email.toLowerCase().trim();
    
    // Get the invitation with case-insensitive email match
    const invitation = await ctx.db.invitation.findFirst({
      where: {
        id: input.invitationId,
        status: "pending",
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // Compare emails case-insensitively
    if (!invitation || invitation.email.toLowerCase().trim() !== normalizedSessionEmail) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invitation not found or expired",
      });
    }
    // ... rest unchanged
  }),
```

### 6. Data Migration Script

Create a migration script to normalize existing emails. This should be run manually, not as an automatic Prisma migration.

**New file:** `src/scripts/normalize-emails.ts`

```typescript
import { db } from "@/lib/db";

async function normalizeExistingEmails() {
  // Get all users
  const users = await db.user.findMany({
    select: { id: true, email: true },
  });

  const conflicts: string[] = [];
  const updates: { id: string; oldEmail: string; newEmail: string }[] = [];

  for (const user of users) {
    const normalizedEmail = user.email.toLowerCase().trim();
    
    if (normalizedEmail !== user.email) {
      // Check if normalized email would conflict
      const existingUser = await db.user.findFirst({
        where: { 
          email: normalizedEmail,
          NOT: { id: user.id }
        },
      });

      if (existingUser) {
        conflicts.push(
          `CONFLICT: ${user.email} (id: ${user.id}) would conflict with ${existingUser.email} (id: ${existingUser.id})`
        );
      } else {
        updates.push({
          id: user.id,
          oldEmail: user.email,
          newEmail: normalizedEmail,
        });
      }
    }
  }

  // Report conflicts
  if (conflicts.length > 0) {
    console.log("\n⚠️  CONFLICTS DETECTED - Manual resolution required:");
    conflicts.forEach(c => console.log(c));
    console.log("\nResolve conflicts before running updates.\n");
  }

  // Report planned updates
  console.log(`\n📝 Planned updates: ${updates.length}`);
  updates.forEach(u => console.log(`  ${u.oldEmail} -> ${u.newEmail}`));

  // DRY RUN by default
  if (process.env.APPLY_UPDATES !== "true") {
    console.log("\n🔒 DRY RUN - No changes made. Set APPLY_UPDATES=true to apply.\n");
    return;
  }

  // Apply updates
  console.log("\n🚀 Applying updates...");
  for (const update of updates) {
    await db.user.update({
      where: { id: update.id },
      data: { email: update.newEmail },
    });
    console.log(`  ✓ Updated ${update.oldEmail} -> ${update.newEmail}`);
  }

  // Also normalize invitations
  const invitations = await db.invitation.findMany({
    select: { id: true, email: true },
  });

  for (const invitation of invitations) {
    const normalizedEmail = invitation.email.toLowerCase().trim();
    if (normalizedEmail !== invitation.email) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { email: normalizedEmail },
      });
      console.log(`  ✓ Invitation: ${invitation.email} -> ${normalizedEmail}`);
    }
  }

  // Also normalize verification identifiers
  const verifications = await db.verification.findMany({
    select: { id: true, identifier: true },
  });

  for (const verification of verifications) {
    const normalizedIdentifier = verification.identifier.toLowerCase().trim();
    if (normalizedIdentifier !== verification.identifier) {
      await db.verification.update({
        where: { id: verification.id },
        data: { identifier: normalizedIdentifier },
      });
      console.log(`  ✓ Verification: ${verification.identifier} -> ${normalizedIdentifier}`);
    }
  }

  console.log("\n✅ Migration complete!\n");
}

normalizeExistingEmails().catch(console.error);
```

**Run with:**
```bash
# Dry run first
pnpm tsx src/scripts/normalize-emails.ts

# Then apply
APPLY_UPDATES=true pnpm tsx src/scripts/normalize-emails.ts
```

### 7. Use Existing `formatEmail` Utility

**Current location:** `src/lib/utils/index.ts`

The function already exists, just needs to be imported where needed:

```typescript
export const formatEmail = (email: string) => {
  return email.toLowerCase().trim();
};
```

**Import in:**
- `src/server/api/routers/admin.ts`
- `src/server/api/routers/organization.ts`
- `src/lib/auth.ts`

**Client-side:** For the login form, either:
1. Inline the normalization (simplest)
2. Create a shared utility in a client-safe location

---

## Implementation Checklist

### Server-Side Changes

- [ ] **`src/lib/auth.ts`** - Add email normalization to `databaseHooks.user.create.before`
- [ ] **`src/server/api/routers/admin.ts`** - Normalize email in `inviteUser` mutation
- [ ] **`src/server/api/routers/organization.ts`** - Normalize email in `inviteTeamMember` mutation
- [ ] **`src/server/api/routers/organization.ts`** - Case-insensitive comparison in `acceptInvitation`

### Client-Side Changes

- [ ] **`src/app/(auth)/login/components/login-form.tsx`** - Normalize email before all Better Auth calls

### Data Migration

- [ ] Create `src/scripts/normalize-emails.ts` migration script
- [ ] Run dry-run to identify conflicts
- [ ] Resolve any duplicate email conflicts manually
- [ ] Run migration to normalize existing data

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Duplicate emails after normalization | Migration script checks for conflicts before applying |
| Breaking existing logins | Normalization at login ensures lookup matches regardless of stored case |
| Email display changes | Only storage is normalized; display can show original if needed (we don't preserve original) |
| Better Auth internal lookups | The `create.before` hook ensures consistent storage |

---

## Testing Plan

1. **New user creation via admin invite**
   - Create user with `Test@Example.COM`
   - Verify stored as `test@example.com`

2. **Login with different casing**
   - User stored as `test@example.com`
   - Login with `TEST@EXAMPLE.COM`
   - Should find user and send OTP

3. **Team invitation**
   - Invite `Team@Test.com`
   - Verify invitation stored as `team@test.com`
   - User logs in as `TEAM@test.com`
   - Should be able to accept invitation

4. **Migration script**
   - Run dry-run on production data copy
   - Verify conflict detection works
   - Verify updates are correct

---

## Deployment

1. **Deploy code changes** - All entry points normalize before storage
2. **Run migration script** - Normalize existing data
3. **Monitor** - Watch for any edge cases

This order ensures new data is clean immediately, then existing data is cleaned up.
