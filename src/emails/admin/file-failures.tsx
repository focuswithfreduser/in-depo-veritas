import { env } from "@/create-env.mjs";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  render,
} from "@react-email/components";
import { Footer, styles } from "../components";

export interface FileFailureTemplateProps {
  failedFiles: {
    fileId: string;
    fileName: string;
    summaryRequestId: string;
    userEmail: string;
    errorMessage: string;
  }[];
}

export type FailedFileInfo = {
  fileId: string;
  fileName: string;
  summaryRequestId: string;
  userEmail: string;
  errorMessage: string;
};

export async function getFileFailuresEmailParams(
  failedFiles: FailedFileInfo[],
) {
  const html = await render(<FileFailureTemplate failedFiles={failedFiles} />);
  const text = await render(<FileFailureTemplate failedFiles={failedFiles} />, {
    plainText: true,
  });

  return {
    html,
    text,
  };
}

export default function FileFailureTemplate({
  failedFiles,
}: FileFailureTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>In Depo Veritas File Processing Failures Alert</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            File Processing Failures Alert
          </Heading>

          <Section>
            <Text style={styles.bold}>Action Required</Text>
            <Text>
              The following files have failed processing and require attention:
            </Text>
          </Section>

          <Section>
            {failedFiles.map((file, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "20px",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "15px",
                }}
              >
                <Text style={styles.bold}>
                  Failed File #{index + 1}:{" "}
                  <Link
                    href={`${env.NEXT_PUBLIC_DEPLOYMENT_URL}/app/admin/documents/${file.fileId}/${file.summaryRequestId}`}
                  >
                    {file.fileName}
                  </Link>
                </Text>
                <Text>
                  <strong>User:</strong>{" "}
                  <Link href={`mailto:${file.userEmail}`}>
                    {file.userEmail}
                  </Link>
                </Text>
                <Text>
                  <strong>Error Message:</strong>{" "}
                  <span style={{ color: "#cc0000" }}>{file.errorMessage}</span>
                </Text>
                <Text>
                  <Button
                    style={{ ...styles.button, marginTop: "10px" }}
                    href={`${env.NEXT_PUBLIC_DEPLOYMENT_URL}/app/admin/documents/${file.fileId}/${file.summaryRequestId}`}
                  >
                    View File Details
                  </Button>
                </Text>
              </div>
            ))}
          </Section>

          <Section>
            <Text style={styles.bold}>Next Steps</Text>
            <Text>• Review each failed file</Text>
            <Text>• Check error messages for patterns</Text>
            <Text>• Contact users if necessary</Text>
            <Text>• Update processing system if needed</Text>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

FileFailureTemplate.PreviewProps = {
  failedFiles: [
    {
      fileId: "w2f42r6c6t6ndsd8ot5xevsg",
      fileName: "deposition1.pdf",
      summaryRequestId: "cm7xxlyxr0001rrgltmesv9xx",
      userEmail: "user@example.com",
      errorMessage: "Failed to process file: Invalid PDF structure",
    },
    {
      fileId: "a1b2c3d4e5f6g7h8i9j0k1l2",
      fileName: "deposition2.pdf",
      summaryRequestId: "m3n4o5p6q7r8s9t0u1v2w3x4",
      userEmail: "another@example.com",
      errorMessage: "Processing timeout: File too large",
    },
  ],
} as FileFailureTemplateProps;
