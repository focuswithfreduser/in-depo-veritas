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

export async function getSummaryReadyParams() {
  const appUrl = `${env.NEXT_PUBLIC_DEPLOYMENT_URL}/app`;

  const html = await render(<SummaryReadyTemplate appUrl={appUrl} />);
  const text = await render(<SummaryReadyTemplate appUrl={appUrl} />, {
    plainText: true,
  });

  return {
    html,
    text,
  };
}

export default function SummaryReadyTemplate({ appUrl }: { appUrl: string }) {
  return (
    <Html>
      <Head />
      <Preview>Your In Depo Veritas deposition summary is ready</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section>
            <Heading as="h2" style={styles.heading}>
              Summary Ready
            </Heading>
          </Section>

          <Section>
            <Text>
              Great news! Your In Depo Veritas deposition summary is ready for
              download.
            </Text>
          </Section>

          <Section style={styles.buttonContainer}>
            <Button style={styles.button} href={appUrl}>
              View Your Summaries
            </Button>
          </Section>

          <Section>
            <Text>Happy you're working with us!</Text>
          </Section>

          <Footer />

          <Section>
            <Text
              style={{ fontSize: "0.9em", color: "#666", marginTop: "2em" }}
            >
              P.S. This is a real email from the In Depo Veritas team. Feel free
              to reply if you have any questions!
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

SummaryReadyTemplate.PreviewProps = {
  appUrl: "https://indepoveritas.com/app",
};
