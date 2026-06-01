// import { Link, Section, Text, Hr, Img } from "@react-email/components";
import { env } from "@/create-env.mjs";

export const styles = {
  main: {
    backgroundColor: "rgba(252, 228, 120, 0.1)",
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  },
  container: {
    margin: "0 auto",
    padding: "20px 0 48px",
    maxWidth: "560px",
    fontSize: "18px",
    lineHeight: "1.4",
    color: "#000",
  },
  bold: {
    fontWeight: "700",
  },

  heading: {
    fontSize: "24px",
    letterSpacing: "-0.5px",
    lineHeight: "1.3",
    fontWeight: "400",
    color: "#000",
    padding: "17px 0 0",
  },
  buttonContainer: {
    padding: "27px 0 27px",
  },
  button: {
    backgroundColor: "#F5B43C",
    borderRadius: "3px",
    fontWeight: "600",
    color: "#000",
    fontSize: "15px",
    textDecoration: "none",
    textAlign: "left" as const,
    display: "inline-block",
    padding: "11px 23px",
  },
  sectionCentered: {
    display: "block",
  },
  footerLink: {
    fontSize: "14px",
    color: "#F5B43C",
    padding: "27px 0 27px",
    textDecoration: "underline",
    textAlign: "left" as const,
  },
  hr: {
    borderColor: "#dfe1e4",
    margin: "42px 0 26px",
  },
  code: {
    fontFamily: "monospace",
    fontWeight: "700",
    padding: "1px 4px",
    backgroundColor: "#dfe1e4",
    letterSpacing: "-0.3px",
    fontSize: "21px",
    borderRadius: "4px",
    color: "#000",
  },
  logoUrl:
    "https://jnyuzoopvdcxuvwgatgw.supabase.co/storage/v1/object/public/public-media/logo.png",
  logoImage: {
    display: "block",
  },
};

export function Footer() {
  return (
    <>
      {/* <Hr style={styles.hr} />
      <Img
        style={styles.logoImage}
        src={styles.logoUrl}
        width="75"
        height="75"
        alt="In Depo Veritas, LLC"
      />
      <Section style={styles.sectionCentered}>
        <Text>
          Copyright{` `}
          {new Date().getFullYear()}{" "}
          <Link href={env.NEXT_PUBLIC_DEPLOYMENT_URL} style={styles.footerLink}>
            In Depo Veritas, LLC
          </Link>
          . All rights reserved.
        </Text>
      </Section> */}
    </>
  );
}
