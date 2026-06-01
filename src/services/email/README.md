# Email Services

This directory contains email sending services for the application.

## Available Email Services

- `send-summary-group-email.tsx`: Sends summary group emails to users with PDF attachments
- `send-admin-file-fail.tsx`: Sends notifications to admins about file processing failures

## Usage Examples

### Sending Admin File Failure Notifications

```typescript
import { sendAdminFileFail, FailedFileInfo } from "@/services/email/send-admin-file-fail";

// Example usage in a file processing error handler
async function handleFileProcessingError(
  fileId: string,
  fileName: string,
  summaryRequestId: string,
  userEmail: string,
  errorMessage: string
) {
  const failedFile: FailedFileInfo = {
    fileId,
    fileName,
    summaryRequestId,
    userEmail,
    errorMessage
  };
  
  // You can collect multiple failed files and send them in a single email
  await sendAdminFileFail([failedFile]);
}

// Example usage with multiple files
async function notifyAdminOfMultipleFailures(failedFiles: FailedFileInfo[]) {
  await sendAdminFileFail(failedFiles);
}
```

### Deep Link Format

The admin file failure emails include deep links to the failed files in the format:

```
/app/admin/files/{fileId}/{summaryRequestId}
```

For example:
```
/app/admin/files/w2f42r6c6t6ndsd8ot5xevsg/cm7xxlyxr0001rrgltmesv9xx
```

Where:
- `w2f42r6c6t6ndsd8ot5xevsg` is the file ID
- `cm7xxlyxr0001rrgltmesv9xx` is the summary request ID 