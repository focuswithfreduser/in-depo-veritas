import { env } from "@/create-env.mjs";
import { Footer, styles } from "@/emails/components";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  render,
  Section,
  Text,
} from "@react-email/components";

interface AllFilesFailedProps {
  url: string;
  failedFiles: string[];
}

export async function getAllFilesFailedTemplate(failedFiles: string[]) {
  const url = `${env.NEXT_PUBLIC_DEPLOYMENT_URL}/app/support`;

  const html = await render(<Template url={url} failedFiles={failedFiles} />);
  const text = await render(<Template url={url} failedFiles={failedFiles} />, {
    plainText: true,
  });

  return {
    html,
    text,
  };
}

export default function Template({ url, failedFiles }: AllFilesFailedProps) {
  return (
    <Html>
      <Head />
      <Preview>We're working on resolving an issue with your summaries</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section>
            <Heading as="h2" style={styles.heading}>
              We're Working on Your Summaries
            </Heading>
          </Section>

          <Section>
            <Text>
              We wanted to let you know that we've encountered an issue while
              processing your deposition summaries. Our support team has been
              automatically notified and is actively working to resolve this.
            </Text>
          </Section>

          {failedFiles.length > 0 && (
            <Section>
              <Text style={{ fontWeight: "bold" }}>Affected Files:</Text>
              <ul style={{ paddingLeft: "20px" }}>
                {failedFiles.map((fileName, index) => (
                  <li key={index} style={{ margin: "8px 0" }}>
                    {fileName}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section>
            <Text>
              You don't need to take any action at this time. We'll notify you
              as soon as your summaries are ready or if we need any additional
              information.
            </Text>
          </Section>

          <Section style={styles.buttonContainer}>
            <Button style={styles.button} href={url}>
              Contact Support
            </Button>
          </Section>

          <Section>
            <Text>
              We apologize for any inconvenience and appreciate your patience.
            </Text>
          </Section>

          <Footer />

          <Section>
            <Text
              style={{ fontSize: "0.9em", color: "#666", marginTop: "2em" }}
            >
              P.S. If you have any questions, feel free to reply to this email
              or contact our support team directly.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

Template.PreviewProps = {
  url: "https://indepoveritas.com",
  failedFiles: ["deposition1.pdf", "deposition2.pdf", "deposition3.pdf"],
};
