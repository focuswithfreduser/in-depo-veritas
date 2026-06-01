import type { EmailDataRequired } from "@/services/email/resend";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  render,
  Section,
  Text,
} from "@react-email/components";
import { Footer, styles } from "../components";
import { SEND_FROM, REPLY_TO_EMAIL } from "@/config";

export interface TeamInvitationEmailProps {
  inviterName: string;
  organizationName: string;
  inviteUrl: string;
}

export async function getTeamInvitationEmailParams(
  email: string,
  inviterName: string,
  organizationName: string,
  inviteUrl: string,
): Promise<EmailDataRequired> {
  const emailHtml = await render(
    <TeamInvitationEmail
      inviterName={inviterName}
      organizationName={organizationName}
      inviteUrl={inviteUrl}
    />,
  );
  const emailText = await render(
    <TeamInvitationEmail
      inviterName={inviterName}
      organizationName={organizationName}
      inviteUrl={inviteUrl}
    />,
    {
      plainText: true,
    },
  );

  const params: EmailDataRequired = {
    subject: `${inviterName} invited you to join ${organizationName} on In Depo Veritas`,
    to: email,
    from: SEND_FROM,
    replyTo: REPLY_TO_EMAIL,
    html: emailHtml,
    text: emailText,
  };

  return params;
}

export default function TeamInvitationEmail({
  inviterName,
  organizationName,
  inviteUrl,
}: TeamInvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        You've been invited to join {organizationName} on In Depo Veritas
      </Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>You've been invited!</Heading>

          <Section>
            <Text>
              {inviterName} has invited you to join {organizationName} on In
              Depo Veritas.
            </Text>
            <Text>
              Click the link below to accept the invitation and join the team:
            </Text>
            <Section style={styles.buttonContainer}>
              <Link href={inviteUrl} style={styles.button}>
                Accept Invitation
              </Link>
            </Section>
            <Text style={{ fontSize: "14px", color: "#666" }}>
              If you have any questions, please reply to this email.
            </Text>
            <Text>Best regards,</Text>
            <Text>The In Depo Veritas Team</Text>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}
