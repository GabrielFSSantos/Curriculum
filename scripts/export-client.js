(function () {
  const btn = document.getElementById("btnExportPdf");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Gerando PDF...";

    try {
      // dispara download chamando o backend
      const resp = await fetch("/export-pdf", { method: "GET" });
      if (!resp.ok) throw new Error("Falha ao gerar PDF");

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "Gabriel_Felipe_Souza_Santos_CV.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Não foi possível exportar o PDF.");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
})();