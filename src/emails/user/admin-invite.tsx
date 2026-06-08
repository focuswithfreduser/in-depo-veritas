import { REPLY_TO_EMAIL, SEND_FROM } from "@/config";
import { Footer, styles } from "@/emails/components";
import type { EmailDataRequired } from "@/services/email/resend";
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

export async function getAdminInviteParams(
  email: string,
  name: string,
  loginUrl: string,
): Promise<EmailDataRequired> {
  if (!email) {
    throw new Error("Email is required");
  }

  const emailHtml = await render(
    <AdminInviteTemplate name={name} loginUrl={loginUrl} />,
  );
  const emailText = await render(
    <AdminInviteTemplate name={name} loginUrl={loginUrl} />,
    {
      plainText: true,
    },
  );

  const params: EmailDataRequired = {
    subject: "Welcome to In Depo Veritas",
    to: email,
    from: SEND_FROM,
    html: emailHtml,
    text: emailText,
    replyTo: REPLY_TO_EMAIL,
  };

  return params;
}

interface AdminInviteTemplateProps {
  name: string;
  loginUrl: string;
}

export default function AdminInviteTemplate({
  name,
  loginUrl,
}: AdminInviteTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to In Depo Veritas - Your account is ready</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section>
            <Heading as="h2" style={styles.heading}>
              Welcome to In Depo Veritas
            </Heading>
          </Section>

          <Section>
            <Text>Hi {name},</Text>
            <Text>
              Your account has been created! You can now log in to In Depo
              Veritas and start creating deposition summaries.
            </Text>
          </Section>

          <Section style={styles.buttonContainer}>
            <Button style={styles.button} href={loginUrl}>
              Log in to In Depo Veritas
            </Button>
          </Section>

          <Section>
            <Text>
              Your email is already filled in on the login page — just click
              &ldquo;Send verification code&rdquo; and we&rsquo;ll email you a
              one-time code to sign in.
            </Text>
            <Text style={{ fontSize: "14px", color: "#666" }}>
              If the button doesn&rsquo;t work, paste this link into your
              browser: {loginUrl}
            </Text>
          </Section>

          <Section>
            <Text>
              If you have any questions, feel free to reach out to our support
              team.
            </Text>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

AdminInviteTemplate.PreviewProps = {
  name: "John Doe",
  loginUrl: "https://app.indepoveritas.com/login?email=john%40example.com",
};
