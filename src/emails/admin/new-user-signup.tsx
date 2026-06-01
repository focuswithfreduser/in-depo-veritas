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
import type { EmailDataRequired } from "@/services/email/resend";
import { env } from "@/create-env.mjs";

import { SEND_FROM, ADMIN_EMAIL } from "@/config";
import { Footer, styles } from "../components";

export interface NewUserTemplateProps {
  email: string;
}

const USERS_URL = `${env.NEXT_PUBLIC_DEPLOYMENT_URL}/app/admin/users`;

export async function getNewUserSignupEmailParams(
  email: string,
): Promise<EmailDataRequired> {
  const emailHtml = await render(<NewUserTemplate email={email} />);
  const emailText = await render(<NewUserTemplate email={email} />, {
    plainText: true,
  });

  const params: EmailDataRequired = {
    subject: "New User Signup",
    to: ADMIN_EMAIL,
    from: SEND_FROM,
    html: emailHtml,
    text: emailText,
  };

  return params;
}

export default function NewUserTemplate({ email }: NewUserTemplateProps) {
  // Update for getEmailData utils function when #513 is merged
  const domain = email.split("@")[1];
  const userUrl = `${USERS_URL}?email=${encodeURIComponent(email)}`;

  return (
    <Html>
      <Head />
      <Preview>New In Depo Veritas user signup: {email}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>New User Signup Alert</Heading>

          <Section>
            <Text style={styles.bold}>Action Required</Text>
            <Text>
              A new user has signed up to In Depo Veritas and needs access
              approval.
            </Text>
          </Section>

          <Section>
            <Text style={styles.bold}>User Details</Text>
            <Text>
              Email: <Link href={`mailto:${email}`}>{email}</Link>
            </Text>
            <Text>
              Domain: <Link href={`https://${domain}`}>{domain}</Link>
            </Text>
          </Section>

          <Section>
            <Text style={styles.bold}>Next Steps</Text>
            <Text>• Check if user looks real</Text>
            <Text>• Verify domain authenticity</Text>
            <Text>• Give beta access in the admin panel:</Text>
          </Section>

          <Section style={styles.buttonContainer}>
            <Button style={styles.button} href={userUrl}>
              Review User Request
            </Button>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

NewUserTemplate.PreviewProps = {
  email: "kevin@indepoveritas.com",
} as NewUserTemplateProps;
