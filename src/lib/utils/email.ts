import publicDomains from "email-providers/all.json";

const temporaryEmailBaseDomains = [
  "10minutemail",
  "mailinator",
  "guerrillamail",
  "throwawaymail",
  "temp-mail",
  "getnada",
  "trashmail",
  "dispostable",
  "maildrop",
  "yopmail",
  "fakeinbox",
  "emailondeck",
  "spambog",
  "mohmal",
  "instantemailaddress",
  "dropmail",
  "mintemail",
  "spamgourmet",
  "sharklasers",
  "guerillamail",
  "spam4me",
  "mailnesia",
  "mailcatch",
  "bouncr",
  "discardmail",
  "getairmail",
  "mail-tester",
  "moakt",
  "tempail",
  "mytempemail",
  "easytrashmail",
  "tmail",
  "mailforspam",
  "inboxkitten",
  "temp-email",
  "disposablemail",
  "trashmailgenerator",
  "opayq",
];

type EmailType = "public" | "temporary" | "private";
type EmailData = {
  type: EmailType;
  domain: string;
};

export function getEmailData(email: string): EmailData {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email format");
  }

  const domain = email.split("@")[1]?.toLowerCase();

  if (!domain) {
    throw new Error("Invalid email format");
  }

  const baseDomain = domain.split(".")[0]!;

  if (temporaryEmailBaseDomains.includes(baseDomain)) {
    return {
      type: "temporary",
      domain,
    };
  }

  if (publicDomains.includes(domain)) {
    return {
      type: "public",
      domain,
    };
  }

  return {
    type: "private",
    domain,
  };
}
