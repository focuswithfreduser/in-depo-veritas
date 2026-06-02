import { REPLY_TO_EMAIL, SEND_FROM } from "@/config";
import { Footer, styles } from "@/emails/components";
import type { EmailDataRequired } from "@/services/email/resend";
import {
  Body,
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
  otp: string,
  loginUrl: string,
): Promise<EmailDataRequired> {
  if (!email) {
    throw new Error("Email is required");
  }

  const emailHtml = await render(
    <AdminInviteTemplate name={name} otp={otp} loginUrl={loginUrl} />,
  );
  const emailText = await render(
    <AdminInviteTemplate name={name} otp={otp} loginUrl={loginUrl} />,
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
  otp: string;
  loginUrl: string;
}

export default function AdminInviteTemplate({
  name,
  otp,
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

          <Section>
            <Text style={{ fontWeight: "bold" }}>Login URL: {loginUrl}</Text>
          </Section>

          <Section>
            <Text>Use the following one-time code to log in:</Text>
            <Heading as="h1" style={{ fontSize: "32px", fontWeight: "bold" }}>
              {otp}
            </Heading>
            <Text style={{ fontSize: "14px", color: "#666" }}>
              This code expires in 3 days.
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
  otp: "123456",
  loginUrl: "https://app.indepoveritas.com/login",
};
