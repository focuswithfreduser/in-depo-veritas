import "server-only";

import { env } from "@/create-env.mjs";
import { Resend } from "resend";
import { createLazyResource } from "@/lib/utils/lazy-resource";

const resend = createLazyResource(() => new Resend(env.RESEND_API_KEY));

export async function sendEmail(
  to: string,
  from: string,
  subject: string,
  html: string,
  text: string,
  messageId?: string | null,
  replyTo?: string,
) {
  const params: {
    to: string[];
    from: string;
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
    headers?: Record<string, string>;
  } = {
    to: Array.isArray(to) ? to : [to],
    from,
    subject,
    html,
    text,
  };

  if (replyTo) {
    params.replyTo = replyTo;
  }

  if (messageId) {
    params.headers = {
      "In-Reply-To": messageId,
    };
  }

  return resend.emails.send(params);
}
export interface ResendAttachment {
  content: string;
  filename: string;
  contentType?: string;
  disposition?: string;
  contentId?: string;
}

export interface ResendResponse {
  id: string;
  to: string[];
  from: string;
  subject: string;
}

// Compatible interface for email templates
export interface EmailDataRequired {
  to: string | string[];
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}
