/**
 * scripts/server.js
 *
 * Responsável por:
 * - iniciar o servidor Express;
 * - servir os arquivos estáticos do projeto;
 * - receber o idioma selecionado;
 * - chamar o Puppeteer para gerar o PDF;
 * - devolver o PDF para download.
 */

const express = require("express");
const path = require("path");
const { generatePdfBuffer } = require("./generate-pdf");

const app = express();
const PORT = process.env.PORT || 3000;

/* ============================================================
   1) CONFIGURAÇÕES GERAIS
============================================================ */

const SUPPORTED_LANGUAGES = ["pt-BR", "en-US"];
const DEFAULT_LANGUAGE = "pt-BR";

/**
 * Retorna um idioma válido.
 */
function normalizeLanguage(language) {
  return SUPPORTED_LANGUAGES.includes(language)
    ? language
    : DEFAULT_LANGUAGE;
}

/**
 * Retorna o nome do PDF conforme o idioma.
 */
function getPdfFileName(language) {
  return language === "en-US"
    ? "Gabriel_Felipe_Souza_Santos_Resume.pdf"
    : "Gabriel_Felipe_Souza_Santos_Curriculo.pdf";
}

/**
 * Retorna uma mensagem de erro conforme o idioma.
 */
function getErrorMessage(language) {
  return language === "en-US"
    ? "The PDF could not be generated."
    : "Não foi possível gerar o PDF.";
}

/* ============================================================
   2) ARQUIVOS ESTÁTICOS
============================================================ */

/**
 * Serve os arquivos do projeto:
 * - index.html;
 * - styles.css;
 * - scripts;
 * - assets;
 * - fontes;
 * - imagens;
 * - arquivos JSON de tradução.
 */
app.use(
  express.static(process.cwd(), {
    extensions: ["html"],
    index: "index.html"
  })
);

/* ============================================================
   3) ROTA PRINCIPAL
============================================================ */

/**
 * Redireciona a raiz para o index.html.
 *
 * O idioma pode ser informado:
 * http://localhost:3000/?lang=en-US
 */
app.get("/", (req, res) => {
  const language = normalizeLanguage(req.query.lang);

  res.redirect(
    `/index.html?lang=${encodeURIComponent(language)}`
  );
});

/* ============================================================
   4) ROTA DE EXPORTAÇÃO
============================================================ */

/**
 * Gera o currículo em PDF.
 *
 * Exemplos:
 * /export-pdf?lang=pt-BR
 * /export-pdf?lang=en-US
 */
app.get("/export-pdf", async (req, res) => {
  const language = normalizeLanguage(req.query.lang);

  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const curriculumUrl =
      `${baseUrl}/index.html?lang=${encodeURIComponent(language)}`;

    const pdfBuffer = await generatePdfBuffer({
      url: curriculumUrl,
      language
    });

    const fileName = getPdfFileName(language);

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    res.setHeader(
      "Content-Length",
      pdfBuffer.length
    );

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);

    res
      .status(500)
      .type("text/plain")
      .send(getErrorMessage(language));
  }
});

/* ============================================================
   5) ROTA DE SAÚDE
============================================================ */

/**
 * Útil para verificar se o servidor está funcionando.
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "curriculum-pdf-server"
  });
});

/* ============================================================
   6) ROTA NÃO ENCONTRADA
============================================================ */

app.use((req, res) => {
  res.status(404).type("text/plain").send("Página não encontrada.");
});

/* ============================================================
   7) INICIALIZAÇÃO DO SERVIDOR
============================================================ */

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📄 Currículo PT-BR: http://localhost:${PORT}/index.html?lang=pt-BR`);
  console.log(`📄 Resume EN-US: http://localhost:${PORT}/index.html?lang=en-US`);
  console.log(`⬇️ Export PDF: http://localhost:${PORT}/export-pdf?lang=pt-BR`);
});