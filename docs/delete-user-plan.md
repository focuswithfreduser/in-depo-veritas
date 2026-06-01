# Plan: Delete User Feature

## Overview
Add an admin action to delete users from the admin panel. The feature includes a confirmation dialog that displays what will be deleted (including document count) before performing the deletion.

## UI Flow

1. User clicks the three-dot menu (`...`) in the Users table
2. A new "Delete User" option appears below "Resend Invite"
3. Clicking "Delete User" opens a ShadCN Dialog (confirmation modal)
4. The dialog shows:
   - Warning message
   - User name being deleted
   - Count of documents that will be deleted
   - Cancel and Delete buttons
5. On confirmation, the deletion is performed and the table refreshes

## Frontend Implementation

### 1. Update User Actions Menu

**File:** `src/app/app/admin/users/components/columns.tsx`

**Changes to `UserAdminRowActions` component (line 267):**
- Add state for delete dialog: `const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);`
- Add new `DropdownMenuItem` for "Delete User" after "Resend Invite" (after line 316)
- Pass document count and organization info to the new dialog component
- Calculate organization info from row data:
  - For each organization in `members`, check if user is sole member
  - Can determine by querying/calculating member count per organization
- Add the delete dialog component below `ToggleAdminDialog` (after line 325)

**New dropdown item structure:**
```tsx
<DropdownMenuItem 
  onClick={() => setDeleteDialogOpen(true)}
  className="text-destructive focus:text-destructive"
>
  Delete User
</DropdownMenuItem>
```

### 2. Create Delete User Dialog Component

**New File:** `src/app/app/admin/users/components/delete-user-dialog.tsx`

**Component structure:**
- Props: `open`, `onOpenChange`, `userId`, `userName`, `documentCount`, `organizations`
  - `organizations` includes: `{ name: string, isSoleMember: boolean }[]`
- Use ShadCN Dialog component (pattern from `toggle-admin-dialog.tsx`)
- Use tRPC mutation: `api.admin.deleteUser.useMutation()`
- Show destructive variant button for the delete action
- Display loading state while deleting
- On success: show toast, close dialog, invalidate/refresh users list
- On error: show error toast (error message from backend)

**Dialog content:**
- Title: "Delete User"
- Description: "Are you sure you want to delete [userName]? This action cannot be undone."
- List of items to be deleted:
  - `{documentCount}` document(s) and their associated data
  - User account and profile
  - Active sessions
- **Organization handling:**
  - If user is sole member of organization(s):
    - Show: "This will also delete the following organization(s): [org names]"
  - If user shares organization(s):
    - Show: "This will remove them from the following organization(s): [org names]"
    - Note: "These organizations will not be deleted as they have other members"
- Buttons: Cancel (outline) and Delete (destructive)

### 3. Update Type Definitions

**File:** `src/app/app/admin/users/components/types.ts` (if exists)

Ensure the `UserAdminView` type includes the document count (it already does via `_count.documents`).

## Backend Implementation

### 1. Create Delete User Utility Function

**New File:** `src/server/utils/delete-user.ts`

**Function: `deleteUser(userId: string)`**

This function will handle the cascading deletion process:

1. **Fetch user data:**
   - Get user with all documents and memberships
   - Validate user exists

2. **Identify organizations to delete:**
   - Find organizations where user is the only member
   - Query: Get all organizations where `members.length === 1` and that member is this user
   - Store list of organization IDs to delete

3. **Delete all user documents:**
   - Loop through user's documents
   - Call existing `deleteDocument(documentId)` for each document
   - This handles: document files, summary files, trigger cancellations, summary chunks, abstracts, metadata

4. **Delete verification codes (manual):**
   - Not in schema relations
   - Delete where `identifier = user.email`

5. **Delete organizations where user is sole member:**
   - Delete organizations identified in step 2
   - This will cascade delete: domains, members, invitations, documents, subscriptions (via schema)

6. **Delete user record:**
   - Final deletion of the User record
   - Cascades will automatically handle:
     - Sessions (cascade via schema line 52)
     - Accounts (cascade via schema line 66)
     - Members in shared organizations (cascade via schema line 134)
     - Invitations sent by user (cascade via schema line 151)

**Error handling:**
- Wrap in try-catch
- Log errors for debugging
- Use transaction for database operations where appropriate
- File/trigger operation errors are logged but don't block deletion

### 2. Add Admin Router Endpoint

**File:** `src/server/api/routers/admin.ts`

**New procedure: `deleteUser`**

Location: After `resendInvite` procedure (after line 670)

```typescript
deleteUser: adminProcedure
  .input(
    z.object({
      userId: z.string(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { userId } = input;

    // Prevent deleting yourself
    if (userId === ctx.session.user.id) {
      throw new Error("You cannot delete your own account");
    }

    // Call the utility function
    await deleteUser(userId);

    return { success: true };
  }),
```

**Imports needed:**
- Import the new `deleteUser` utility at the top of the file

## Database Considerations

### Cascade Behavior (from schema.prisma)

**Will cascade automatically:**
- ✅ Session (line 52: `onDelete: Cascade`)
- ✅ Account (line 66: `onDelete: Cascade`)
- ✅ Member (line 134: `onDelete: Cascade`)
- ✅ Invitation (line 151: `onDelete: Cascade`)
- ✅ Document (line 181: `onDelete: Cascade`)

**Requires manual deletion:**
- ⚠️ Verification codes (no relation in schema)
  - Delete where `identifier = user.email`

**Handled by deleteDocument() for each document:**
- ✅ SummaryAbstract (via deleteDocument)
- ✅ SummaryMetadata (via deleteDocument)
- ✅ SummaryChunk (via deleteDocument)
- ✅ Document files in storage (via deleteDocument)
- ✅ Trigger runs (via deleteDocument)

## Files to Create

1. `src/server/utils/delete-user.ts` - User deletion utility function
2. `src/app/app/admin/users/components/delete-user-dialog.tsx` - Confirmation dialog component

## Files to Modify

1. `src/app/app/admin/users/components/columns.tsx` - Add delete menu item and dialog state
2. `src/server/api/routers/admin.ts` - Add deleteUser endpoint

## Edge Cases & Considerations

### 1. Self-Deletion Prevention ✅
- Backend check: Prevent admin from deleting their own account
- Throw error if `userId === ctx.session.user.id`
- Error will be displayed to user via toast

### 2. Organizations - CRITICAL ✅
**This is the most important edge case to handle properly.**

The modal needs to fetch and display organization information:

**Case A: User is the only member of organization(s)**
- Modal shows: "This will also delete the following organization(s):"
- List the organization name(s)
- Backend deletes the organization(s) when deleting the user

**Case B: User shares organization(s) with others**
- Modal shows: "This will remove them from the following organization(s):"
- List the organization name(s)
- Note: "These organizations will not be deleted as they have other members"
- Backend only removes the user from these organizations (via Member cascade)

**Implementation details:**
- Frontend needs to fetch user's memberships with organization member counts
- Can use existing data from `UserAdminView.members` 
- Check if `members.length === 1` for each organization
- Backend needs to delete organizations where user is sole member
- Use `db.organization.deleteMany()` for organizations to delete

### 3. Active Sessions ✅
- All sessions are deleted via cascade (schema line 52)
- User is immediately logged out on all devices
- No additional logout logic needed

### 4. Error Handling ✅
- All errors thrown in backend will be displayed to user via toast
- If file deletion fails, log warning and continue
- If database operations fail, transaction rolls back

## Testing Checklist

### Frontend
- [ ] Delete button appears in dropdown menu
- [ ] Dialog opens with correct user information
- [ ] Document count displays correctly
- [ ] Cancel button closes dialog without action
- [ ] Delete button shows loading state
- [ ] Success toast appears after deletion
- [ ] Table refreshes after deletion
- [ ] Error toast shows if deletion fails

### Backend
- [ ] Cannot delete own account
- [ ] Cannot delete if last admin (if implemented)
- [ ] All documents are deleted
- [ ] All files are removed from storage
- [ ] All database records cascade correctly
- [ ] Verification codes are cleaned up
- [ ] Returns success on completion
- [ ] Returns error on failure

### Edge Cases
- [ ] User with 0 documents
- [ ] User who is admin
- [ ] User who is member of multiple organizations
- [ ] User who is the only member of an organization (should delete org)
- [ ] User who is the only member of multiple organizations (should delete all)
- [ ] User with active sessions (should be deleted)
- [ ] User tries to delete themselves (should fail with error)
- [ ] Mixed: sole member of some orgs, shared member of others

## Implementation Order

1. **Backend first:**
   - Create `delete-user.ts` utility function
   - Add `deleteUser` endpoint to admin router
   - Test with API client (e.g., Postman)

2. **Frontend:**
   - Create `delete-user-dialog.tsx` component
   - Update `columns.tsx` with new menu item
   - Test in UI

3. **Refinement:**
   - Add last-admin protection if desired
   - Improve error messages
   - Add organization warning if desired

## Decisions Made

1. ✅ **Self-deletion prevention:** Implement backend check, throw error
2. ✅ **Last admin protection:** Not implementing
3. ✅ **Performance:** Not a concern, use synchronous deletion
4. ✅ **Audit trail:** Not implementing, hard delete only
5. ✅ **Organizations:** Show in modal, delete if sole member, preserve if shared
6. ✅ **Active sessions:** Delete via cascade (automatic)
7. ✅ **Error handling:** All backend errors displayed to user via toast

## Notes

- Follow existing patterns from `toggle-admin-dialog.tsx` for consistency
- Use ShadCN's destructive button variant for the delete action
- Use the existing `deleteDocument` utility to avoid code duplication
- Error handling should be comprehensive but non-blocking where possible (files)
