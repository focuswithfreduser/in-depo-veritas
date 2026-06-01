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

export async function getAuthCodeParams(
  email: string,
  emailCode: string,
): Promise<EmailDataRequired> {
  if (!email) {
    throw new Error("Email is required");
  }

  const emailHtml = await render(<AuthCodeTemplate code={emailCode} />);
  const emailText = await render(<AuthCodeTemplate code={emailCode} />, {
    plainText: true,
  });

  const params: EmailDataRequired = {
    subject: `${emailCode} is your In Depo Veritas verification code`,
    to: email,
    from: SEND_FROM,
    html: emailHtml,
    text: emailText,
    replyTo: REPLY_TO_EMAIL,
  };

  return params;
}

interface AuthCodeTemplateProps {
  code: string;
}

export default function AuthCodeTemplate({ code }: AuthCodeTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Your In Depo Veritas verification code is {code}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section>
            <Heading as="h2" style={styles.heading}>
              Verification code
            </Heading>
          </Section>

          <Section>
            <Text>Enter the following verification code when prompted:</Text>
            <Heading as="h1">{code}</Heading>
          </Section>

          <Section>
            <Text>
              To protect your account, do not share this email or code.
            </Text>
          </Section>

          <Section>
            <Text>
              If you didn't make this request, you can safely ignore this email.
            </Text>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

AuthCodeTemplate.PreviewProps = {
  code: "123456",
};
