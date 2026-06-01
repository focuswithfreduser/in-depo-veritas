import { DocumentStatus } from "@/app/generated/prisma";
import { env } from "@/create-env.mjs";
import { logoBase64 } from "@/images/logo";
import { db } from "@/lib/db";
import { getDownloadUrl, uploadFile } from "@/lib/supabase-service";
import { Browser } from "puppeteer-core";

export async function takeScreenshot(
  id: string,
  organizationId: string,
  isFull: boolean,
) {
  const URL = isFull
    ? `${env.NEXT_PUBLIC_DEPLOYMENT_URL}/doc/${id}/full`
    : `${env.NEXT_PUBLIC_DEPLOYMENT_URL}/doc/${id}`;

  let browser;
  try {
    const isVercel = !!process.env.VERCEL_ENV;
    let puppeteer: any,
      launchOptions: any = {
        headless: true,
      };

    if (isVercel) {
      const chromium = (await import("@sparticuz/chromium")).default;
      puppeteer = await import("puppeteer-core");
      launchOptions = {
        ...launchOptions,
        args: chromium.args,
        executablePath: await chromium.executablePath(),
      };
    } else {
      puppeteer = await import("puppeteer");
    }

    browser = (await puppeteer.launch(launchOptions)) as Browser;
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      "x-api-key": env.SCREENSHOT_API_KEY,
    });
    await page.goto(URL, { waitUntil: "networkidle2" });

    // Get current date for the header
    const createdAtString = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const tempPdfPath = `/tmp/screenshot-${id}-${timestamp}-${randomId}.pdf`;

    const pdf = await page.pdf({
      path: tempPdfPath,
      format: "A4",
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; font-size: 10px; color: #6b7280; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; margin: 0 40px 20px 40px;">
          <div>AI-summary generated on ${createdAtString} • verify before official use</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${logoBase64}" alt="Logo" width="20" height="20" style="vertical-align: middle;" />
            indepoveritas.com
          </div>
        </div>
      `,
      footerTemplate: "",
      // margin: {
      //   top: "80px",
      //   bottom: "40px",
      //   left: "40px",
      //   right: "40px",
      // },
    });

    const filePath = `${organizationId}/${id}-summary-v2.pdf`;
    await uploadFile(filePath, Buffer.from(pdf), "application/pdf");
    return filePath;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function takeScreenshotAndSave(
  id: string,
  organizationId: string,
  isFull: boolean,
) {
  const filePath = await takeScreenshot(id, organizationId, isFull);
  await db.document.update({
    where: { id },
    data: {
      summaryUrl: filePath,
      status: DocumentStatus.complete,
    },
  });

  const downloadUrl = await getDownloadUrl(filePath);
  return downloadUrl.signedUrl;
}
