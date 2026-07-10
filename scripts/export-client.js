(function () {
  "use strict";

  const btn = document.getElementById("btnExportPdf");

  if (!btn) {
    console.warn('Botão com id="btnExportPdf" não encontrado.');
    return;
  }

  /**
   * Retorna o idioma atualmente aplicado ao currículo.
   *
   * Prioridade:
   * 1. API exposta pelo i18n.js;
   * 2. atributo data-current-language no elemento <html>;
   * 3. parâmetro lang da URL;
   * 4. português como padrão.
   */
  function getCurrentLanguage() {
    const languageFromI18n =
      window.curriculumI18n?.getCurrentLanguage?.();

    if (
      languageFromI18n === "pt-BR" ||
      languageFromI18n === "en-US"
    ) {
      return languageFromI18n;
    }

    const languageFromDocument =
      document.documentElement.dataset.currentLanguage;

    if (
      languageFromDocument === "pt-BR" ||
      languageFromDocument === "en-US"
    ) {
      return languageFromDocument;
    }

    const languageFromUrl =
      new URLSearchParams(window.location.search).get("lang");

    if (
      languageFromUrl === "pt-BR" ||
      languageFromUrl === "en-US"
    ) {
      return languageFromUrl;
    }

    return "pt-BR";
  }

  /**
   * Aguarda o sistema de idioma terminar de carregar.
   */
  async function waitForLanguageReady() {
    if (window.curriculumI18n?.isReady?.()) {
      return;
    }

    if (
      document.documentElement.dataset.languageReady ===
      "true"
    ) {
      return;
    }

    await new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => {
        window.removeEventListener(
          "curriculum:language-ready",
          handleLanguageReady
        );

        resolve();
      }, 5000);

      function handleLanguageReady() {
        window.clearTimeout(timeoutId);

        window.removeEventListener(
          "curriculum:language-ready",
          handleLanguageReady
        );

        resolve();
      }

      window.addEventListener(
        "curriculum:language-ready",
        handleLanguageReady,
        {
          once: true
        }
      );
    });
  }

  /**
   * Retorna o texto de carregamento conforme o idioma.
   */
  function getLoadingText(language) {
    return language === "en-US"
      ? "Generating PDF..."
      : "Gerando PDF...";
  }

  /**
   * Retorna a mensagem de erro conforme o idioma.
   */
  function getErrorMessage(language) {
    return language === "en-US"
      ? "The PDF could not be exported."
      : "Não foi possível exportar o PDF.";
  }

  /**
   * Retorna o nome padrão do arquivo conforme o idioma.
   */
  function getDefaultFileName(language) {
    return language === "en-US"
      ? "Gabriel_Felipe_Souza_Santos_Resume.pdf"
      : "Gabriel_Felipe_Souza_Santos_Curriculo.pdf";
  }

  /**
   * Tenta obter o nome do arquivo enviado pelo servidor.
   */
  function getFileNameFromResponse(
    response,
    fallbackFileName
  ) {
    const contentDisposition =
      response.headers.get("Content-Disposition");

    if (!contentDisposition) {
      return fallbackFileName;
    }

    const utf8Match = contentDisposition.match(
      /filename\*=UTF-8''([^;]+)/
    );

    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const regularMatch = contentDisposition.match(
      /filename="?([^";]+)"?/
    );

    return regularMatch?.[1] || fallbackFileName;
  }

  /**
   * Realiza o download do PDF recebido.
   */
  function downloadPdf(blob, fileName) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = fileName;
    link.style.display = "none";

    document.body.appendChild(link);

    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);
  }

  btn.addEventListener("click", async () => {
    await waitForLanguageReady();

    const language = getCurrentLanguage();
    const originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = getLoadingText(language);

    try {
      /*
       * Envia o idioma atual para o backend.
       *
       * Exemplos:
       * /export-pdf?lang=pt-BR
       * /export-pdf?lang=en-US
       */
      const endpoint =
        `/export-pdf?lang=${encodeURIComponent(language)}`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/pdf"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        const serverMessage = await response
          .text()
          .catch(() => "");

        throw new Error(
          serverMessage ||
          `Falha ao gerar PDF. HTTP ${response.status}`
        );
      }

      const blob = await response.blob();

      const defaultFileName =
        getDefaultFileName(language);

      const fileName =
        getFileNameFromResponse(
          response,
          defaultFileName
        );

      downloadPdf(blob, fileName);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);

      window.alert(
        getErrorMessage(language)
      );
    } finally {
      btn.disabled = false;

      /*
       * Recupera o texto traduzido do botão após a exportação.
       */
      const translatedButtonText =
        window.curriculumI18n?.getTranslation?.(
          "page.exportButton"
        );

      btn.textContent =
        translatedButtonText ||
        originalText ||
        (
          language === "en-US"
            ? "Export PDF"
            : "Exportar PDF"
        );
    }
  });
})();