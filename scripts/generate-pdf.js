const puppeteer = require("puppeteer");

/**
 * Aguarda dois ciclos de renderização para garantir
 * que o layout terminou de recalcular.
 */
async function waitForLayout(page) {
  await page.evaluate(() => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  });
}

/**
 * Gera o PDF do currículo.
 *
 * @param {Object} options
 * @param {string} options.url URL completa do currículo
 * @param {string} [options.language="pt-BR"] Idioma atual
 * @returns {Promise<Buffer>}
 */
async function generatePdfBuffer({
  url,
  language = "pt-BR"
}) {
  if (!url) {
    throw new Error(
      "A URL do currículo é obrigatória para gerar o PDF."
    );
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none"
    ]
  });

  try {
    const page = await browser.newPage();

    /*
     * A viewport fica maior que os 210 mm do currículo.
     *
     * Isso evita que a barra de rolagem reduza a área útil
     * e altere as quebras de linha durante a exportação.
     */
    await page.setViewport({
      width: 1200,
      height: 900,
      deviceScaleFactor: 1
    });

    /*
     * Usa os estilos de tela durante a geração.
     */
    await page.emulateMediaType("screen");

    /*
     * Abre o currículo.
     */
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 30000
    });

    /*
     * Aguarda o sistema de tradução terminar.
     *
     * O i18n.js define:
     * data-language-ready="true"
     */
    await page.waitForFunction(
      () => {
        return (
          document.documentElement.dataset.languageReady ===
          "true"
        );
      },
      {
        timeout: 15000
      }
    );

    /*
     * Aguarda as fontes locais.
     */
    await page.evaluate(async () => {
      if (!document.fonts) {
        return;
      }

      await Promise.all([
        document.fonts.load('400 14px "Inter"'),
        document.fonts.load('600 14px "Inter"'),
        document.fonts.load('700 14px "Inter"'),
        document.fonts.ready
      ]);
    });

    /*
     * Aguarda todas as imagens, incluindo a foto.
     */
    await page.evaluate(async () => {
      const images = Array.from(document.images);

      await Promise.all(
        images.map((image) => {
          if (image.complete) {
            return Promise.resolve();
          }

          return new Promise((resolve) => {
            image.addEventListener("load", resolve, {
              once: true
            });

            image.addEventListener("error", resolve, {
              once: true
            });
          });
        })
      );
    });

    /*
     * Garante que a página esteja no topo.
     */
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    /*
     * CSS exclusivo da exportação.
     *
     * Não altera tipografia.
     * Remove margens, sombras e todos os controles.
     */
    await page.addStyleTag({
      content: `
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }

        body {
          overflow: visible !important;
        }

        .viewport {
          margin: 0 !important;
          padding: 0 !important;
        }

        .page {
          width: 210mm !important;
          margin: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          overflow: visible !important;
          background: #ffffff !important;
        }

        .columns {
          align-items: flex-start !important;
        }

        .page-actions,
        .action-btn,
        #btnExportPdf,
        #btnToggleLanguage,
        .export-btn,
        .language-btn {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `
    });

    /*
     * Remove os controles diretamente do DOM.
     *
     * Essa proteção adicional garante que nenhum botão
     * seja incluído no PDF, mesmo que alguma regra CSS
     * seja sobrescrita.
     */
    await page.evaluate(() => {
      const selectors = [
        ".page-actions",
        "#btnExportPdf",
        "#btnToggleLanguage",
        ".export-btn",
        ".language-btn"
      ];

      selectors.forEach((selector) => {
        document
          .querySelectorAll(selector)
          .forEach((element) => {
            element.remove();
          });
      });
    });

    /*
     * Aguarda o layout recalcular após remover os botões.
     */
    await waitForLayout(page);

    /*
     * Mede largura e altura reais do currículo.
     */
    const dimensions = await page.evaluate(() => {
      const cv = document.getElementById("cv");

      if (!cv) {
        throw new Error(
          'Elemento do currículo com id="cv" não encontrado.'
        );
      }

      const rect = cv.getBoundingClientRect();

      return {
        widthPx: rect.width,
        heightPx: Math.max(
          rect.height,
          cv.scrollHeight,
          cv.offsetHeight
        )
      };
    });

    if (
      !dimensions.widthPx ||
      !dimensions.heightPx
    ) {
      throw new Error(
        "Não foi possível calcular as dimensões do currículo."
      );
    }

    /*
     * Converte a altura proporcionalmente à largura A4.
     *
     * Isso é mais confiável do que assumir diretamente 96 DPI,
     * porque usa a proporção real do elemento renderizado.
     *
     * A folga de 1 mm evita cortes no final.
     */
    const heightMm =
      (dimensions.heightPx / dimensions.widthPx) * 210 + 1;

    /*
     * Gera um PDF com uma única página alta.
     */
    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: false,

      width: "210mm",
      height: `${heightMm}mm`,

      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm"
      },

      pageRanges: "1",
      scale: 1,
      displayHeaderFooter: false
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

module.exports = {
  generatePdfBuffer
};