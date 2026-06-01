import { WELCOME_FROM, WELCOME_REPLY_TO_EMAIL } from "@/config";
import type { EmailDataRequired } from "@/services/email/resend";
import {
  Body,
  Head,
  Html,
  Preview,
  render,
  Text,
} from "@react-email/components";

export interface WelcomeSignupTemplateProps {
  firstName?: string;
}

export async function getWelcomeSignupEmailParams(
  email: string,
  firstName?: string,
): Promise<EmailDataRequired> {
  if (!email) {
    throw new Error("Email is required");
  }

  const emailHtml = await render(
    <WelcomeSignupTemplate firstName={firstName} />,
  );
  const emailText = await render(
    <WelcomeSignupTemplate firstName={firstName} />,
    { plainText: true },
  );

  const params: EmailDataRequired = {
    subject: "Welcome to In Depo Veritas",
    to: email,
    from: WELCOME_FROM,
    html: emailHtml,
    text: emailText,
    replyTo: WELCOME_REPLY_TO_EMAIL,
  };

  return params;
}

export default function WelcomeSignupTemplate({
  firstName,
}: WelcomeSignupTemplateProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  return (
    <Html>
      <Head />
      <Preview>
        Welcome to In Depo Veritas - Kevin here to help you get started
      </Preview>
      <Body style={{ fontFamily: "Arial, sans-serif" }}>
        <Text>{greeting}</Text>

        <Text>
          Support here with In Depo Veritas. Glad to see you've signed up! Be
          sure to let me know of any questions. Feel free to reply to this
          email.
        </Text>

        <Text>
          We also always welcome feedback. We frequently add new features
          frequently. Hoping we can be your go-to tool for deposition summaries.
        </Text>

        <Text>
          Support
          <br />
          --
          <br />
          Support @ In Depo Veritas
          <br />
          support@indepoveritas.com
        </Text>
      </Body>
    </Html>
  );
}

WelcomeSignupTemplate.PreviewProps = {
  firstName: "John",
} as WelcomeSignupTemplateProps;
