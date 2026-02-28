const express = require("express");
const path = require("path");
const { generatePdfBuffer } = require("./generate-pdf");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve arquivos estáticos da raiz (index.html, styles.css, foto.png, etc.)
app.use(express.static(process.cwd(), { extensions: ["html"] }));

// Rota que gera e devolve o PDF
app.get("/export-pdf", async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const pdfBuffer = await generatePdfBuffer({
      url: `${baseUrl}/index.html`,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Gabriel_Felipe_Souza_Santos_CV.pdf"'
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao gerar PDF.");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`➡️ Export PDF: http://localhost:${PORT}/export-pdf`);
});