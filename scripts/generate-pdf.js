const puppeteer = require("puppeteer");

function pxToIn(px) {
  return px / 96;
}

async function generatePdfBuffer({ url }) {
  const browser = await puppeteer.launch({ headless: "new" });

  try {
    const page = await browser.newPage();

    await page.setViewport({ width: 794, height: 900, deviceScaleFactor: 1 });

    await page.goto(url, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    // ✅ garante que as fontes foram carregadas e aplicadas
    await page.waitForFunction(() => {
      // document.fonts existe na maioria dos browsers modernos
      // quando não existe, retorna true pra não travar
      if (!document.fonts) return true;
      return document.fonts.status === "loaded";
    }, { timeout: 15000 });

    // topo
    await page.evaluate(() => window.scrollTo(0, 0));

    // CSS de export (não altera tipografia!)
    await page.addStyleTag({
      content: `
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        .viewport { padding: 0 !important; }
        .page {
          margin: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          overflow: visible !important;
          background: #fff !important;
          width: 210mm !important;
        }
        #btnExportPdf, .export-btn { display: none !important; }
        .columns { align-items: flex-start !important; }
      `,
    });

    // espera layout “assentar”
    await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));

    const heightPx = await page.evaluate(() => {
      const cv = document.getElementById("cv");
      if (!cv) {
        const doc = document.documentElement;
        return Math.ceil(Math.max(doc.scrollHeight, doc.offsetHeight) + 20);
      }
      const rect = cv.getBoundingClientRect();
      const h = Math.max(cv.scrollHeight, rect.height);
      return Math.ceil(h + 20);
    });

    const pdfWidth = "210mm";
    const pdfHeight = `${pxToIn(heightPx)}in`;

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: false,
      width: pdfWidth,
      height: pdfHeight,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      pageRanges: "1",
      scale: 1
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = { generatePdfBuffer };