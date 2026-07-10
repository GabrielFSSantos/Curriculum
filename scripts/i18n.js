/**
 * scripts/i18n.js
 *
 * Responsável por:
 * - detectar o idioma atual;
 * - carregar pt-BR.json ou en-US.json;
 * - aplicar traduções em elementos com data-i18n;
 * - aplicar traduções com HTML em elementos com data-i18n-html;
 * - atualizar título da página e botões;
 * - manter o idioma na URL;
 * - manter o idioma no localStorage;
 * - informar ao exportador/Puppeteer quando a tradução estiver pronta.
 */

(function () {
  "use strict";

  /* ============================================================
     1) CONFIGURAÇÕES GERAIS
  ============================================================ */

  const SUPPORTED_LANGUAGES = ["pt-BR", "en-US"];
  const DEFAULT_LANGUAGE = "pt-BR";
  const STORAGE_KEY = "curriculum-language";

  const languageButton = document.getElementById("btnToggleLanguage");
  const exportButton = document.getElementById("btnExportPdf");

  let currentTranslations = null;
  let currentLanguage = DEFAULT_LANGUAGE;
  let isChangingLanguage = false;

  /* ============================================================
     2) FUNÇÕES AUXILIARES
  ============================================================ */

  /**
   * Busca uma propriedade aninhada dentro de um objeto.
   *
   * Exemplo:
   * getNestedValue(translations, "header.objective")
   */
  function getNestedValue(object, path) {
    return path.split(".").reduce((currentValue, key) => {
      if (
        currentValue === null ||
        currentValue === undefined ||
        typeof currentValue !== "object"
      ) {
        return undefined;
      }

      return currentValue[key];
    }, object);
  }

  /**
   * Verifica se o idioma informado é suportado.
   */
  function isSupportedLanguage(language) {
    return SUPPORTED_LANGUAGES.includes(language);
  }

  /**
   * Normaliza o idioma recebido.
   */
  function normalizeLanguage(language) {
    return isSupportedLanguage(language)
      ? language
      : DEFAULT_LANGUAGE;
  }

  /**
   * Retorna o idioma definido na URL.
   *
   * Exemplo:
   * ?lang=en-US
   */
  function getLanguageFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const language = params.get("lang");

    return isSupportedLanguage(language)
      ? language
      : null;
  }

  /**
   * Retorna o idioma salvo no navegador.
   */
  function getLanguageFromStorage() {
    try {
      const language = localStorage.getItem(STORAGE_KEY);

      return isSupportedLanguage(language)
        ? language
        : null;
    } catch (error) {
      console.warn("Não foi possível acessar o localStorage.", error);
      return null;
    }
  }

  /**
   * Define o idioma inicial.
   *
   * Prioridade:
   * 1. parâmetro da URL;
   * 2. localStorage;
   * 3. idioma padrão.
   */
  function getInitialLanguage() {
    return (
      getLanguageFromUrl() ||
      getLanguageFromStorage() ||
      DEFAULT_LANGUAGE
    );
  }

  /**
   * Atualiza o idioma na URL sem recarregar a página.
   */
  function updateUrlLanguage(language) {
    const url = new URL(window.location.href);

    url.searchParams.set("lang", language);

    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }

  /**
   * Salva o idioma no navegador.
   */
  function saveLanguage(language) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      console.warn("Não foi possível salvar o idioma.", error);
    }
  }

  /**
   * Atualiza atributos básicos do documento.
   */
  function updateDocumentLanguage(language) {
    document.documentElement.lang =
      language === "en-US" ? "en-US" : "pt-BR";

    document.documentElement.dataset.currentLanguage = language;
  }

  /**
   * Define o estado de carregamento das traduções.
   *
   * O Puppeteer aguarda:
   * document.documentElement.dataset.languageReady === "true"
   */
  function setLanguageReady(isReady) {
    document.documentElement.dataset.languageReady =
      isReady ? "true" : "false";
  }

  /**
   * Atualiza o estado visual dos controles enquanto o idioma muda.
   */
  function setControlsLoading(isLoading) {
    if (languageButton) {
      languageButton.disabled = isLoading;
    }

    if (exportButton) {
      exportButton.disabled = isLoading;
    }
  }

  /* ============================================================
     3) CARREGAMENTO DOS ARQUIVOS JSON
  ============================================================ */

  /**
   * Carrega o arquivo JSON correspondente ao idioma.
   *
   * Arquivos esperados:
   * assets/i18n/pt-BR.json
   * assets/i18n/en-US.json
   */
  async function loadTranslations(language) {
    const normalizedLanguage = normalizeLanguage(language);

    const response = await fetch(
      `assets/i18n/${normalizedLanguage}.json`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `Não foi possível carregar o arquivo de tradução: ${normalizedLanguage}.json`
      );
    }

    return response.json();
  }

  /* ============================================================
     4) APLICAÇÃO DAS TRADUÇÕES
  ============================================================ */

  /**
   * Aplica traduções de texto simples.
   *
   * Exemplo:
   * <h2 data-i18n="sections.contact">Contato</h2>
   */
  function applyTextTranslations(translations) {
    const elements = document.querySelectorAll("[data-i18n]");

    elements.forEach((element) => {
      const key = element.dataset.i18n;
      const translatedValue = getNestedValue(translations, key);

      if (typeof translatedValue !== "string") {
        console.warn(`Tradução não encontrada para a chave: ${key}`);
        return;
      }

      element.textContent = translatedValue;
    });
  }

  /**
   * Aplica traduções que contêm HTML.
   *
   * Exemplo:
   * <p data-i18n-html="summary.text">...</p>
   *
   * Use somente com arquivos JSON controlados pelo projeto.
   */
  function applyHtmlTranslations(translations) {
    const elements = document.querySelectorAll("[data-i18n-html]");

    elements.forEach((element) => {
      const key = element.dataset.i18nHtml;
      const translatedValue = getNestedValue(translations, key);

      if (typeof translatedValue !== "string") {
        console.warn(
          `Tradução HTML não encontrada para a chave: ${key}`
        );
        return;
      }

      element.innerHTML = translatedValue;
    });
  }

  /**
   * Atualiza título da página e textos dos botões.
   */
  function applyPageTranslations(translations) {
    const pageTitle = getNestedValue(translations, "page.title");
    const exportButtonText = getNestedValue(
      translations,
      "page.exportButton"
    );
    const languageButtonText = getNestedValue(
      translations,
      "page.languageButton"
    );

    if (typeof pageTitle === "string") {
      document.title = pageTitle;
    }

    if (
      exportButton &&
      typeof exportButtonText === "string"
    ) {
      exportButton.textContent = exportButtonText;
    }

    if (
      languageButton &&
      typeof languageButtonText === "string"
    ) {
      languageButton.textContent = languageButtonText;
    }
  }

  /**
   * Atualiza os atributos de acessibilidade dos botões.
   */
  function updateAccessibility(language) {
    if (languageButton) {
      languageButton.setAttribute(
        "aria-label",
        language === "en-US"
          ? "Switch resume language to Portuguese"
          : "Alternar idioma do currículo para inglês"
      );
    }

    if (exportButton) {
      exportButton.setAttribute(
        "aria-label",
        language === "en-US"
          ? "Export resume as PDF"
          : "Exportar currículo em PDF"
      );
    }

    const curriculum = document.getElementById("cv");

    if (curriculum) {
      curriculum.setAttribute(
        "aria-label",
        language === "en-US"
          ? "Resume of Gabriel Felipe Souza Santos"
          : "Currículo de Gabriel Felipe Souza Santos"
      );
    }
  }

  /**
   * Aplica todas as traduções de uma vez.
   */
  function applyTranslations(translations, language) {
    applyTextTranslations(translations);
    applyHtmlTranslations(translations);
    applyPageTranslations(translations);
    updateAccessibility(language);
  }

  /* ============================================================
     5) TROCA DE IDIOMA
  ============================================================ */

  /**
   * Aguarda dois frames para garantir que o layout terminou
   * de recalcular após a alteração dos textos.
   */
  function waitForLayoutUpdate() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }

  /**
   * Aplica o idioma informado.
   */
  async function applyLanguage(language) {
    if (isChangingLanguage) {
      return;
    }

    const normalizedLanguage = normalizeLanguage(language);

    isChangingLanguage = true;
    setLanguageReady(false);
    setControlsLoading(true);

    try {
      const translations =
        await loadTranslations(normalizedLanguage);

      currentTranslations = translations;
      currentLanguage = normalizedLanguage;

      applyTranslations(
        currentTranslations,
        currentLanguage
      );

      updateDocumentLanguage(currentLanguage);
      updateUrlLanguage(currentLanguage);
      saveLanguage(currentLanguage);

      await waitForLayoutUpdate();

      window.dispatchEvent(
        new CustomEvent("curriculum:language-changed", {
          detail: {
            language: currentLanguage,
            translations: currentTranslations
          }
        })
      );
    } catch (error) {
      console.error(
        "Erro ao carregar ou aplicar o idioma:",
        error
      );

      if (normalizedLanguage !== DEFAULT_LANGUAGE) {
        console.warn(
          "Tentando carregar o idioma padrão."
        );

        try {
          const fallbackTranslations =
            await loadTranslations(DEFAULT_LANGUAGE);

          currentTranslations = fallbackTranslations;
          currentLanguage = DEFAULT_LANGUAGE;

          applyTranslations(
            currentTranslations,
            currentLanguage
          );

          updateDocumentLanguage(currentLanguage);
          updateUrlLanguage(currentLanguage);
          saveLanguage(currentLanguage);

          await waitForLayoutUpdate();
        } catch (fallbackError) {
          console.error(
            "Não foi possível carregar o idioma padrão.",
            fallbackError
          );
        }
      }
    } finally {
      isChangingLanguage = false;
      setControlsLoading(false);
      setLanguageReady(true);

      window.dispatchEvent(
        new CustomEvent("curriculum:language-ready", {
          detail: {
            language: currentLanguage
          }
        })
      );
    }
  }

  /**
   * Alterna entre português e inglês.
   */
  async function toggleLanguage() {
    const nextLanguage =
      currentLanguage === "pt-BR"
        ? "en-US"
        : "pt-BR";

    await applyLanguage(nextLanguage);
  }

  /* ============================================================
     6) EVENTOS
  ============================================================ */

  if (languageButton) {
    languageButton.addEventListener(
      "click",
      toggleLanguage
    );
  }

  /**
   * Suporte ao botão voltar/avançar do navegador.
   */
  window.addEventListener("popstate", () => {
    const languageFromUrl =
      getLanguageFromUrl() || DEFAULT_LANGUAGE;

    if (languageFromUrl !== currentLanguage) {
      applyLanguage(languageFromUrl);
    }
  });

  /* ============================================================
     7) API GLOBAL PARA OUTROS SCRIPTS
  ============================================================ */

  window.curriculumI18n = {
    applyLanguage,

    toggleLanguage,

    getCurrentLanguage() {
      return currentLanguage;
    },

    getTranslations() {
      return currentTranslations;
    },

    isReady() {
      return (
        document.documentElement.dataset.languageReady ===
        "true"
      );
    },

    getTranslation(key) {
      if (!currentTranslations) {
        return undefined;
      }

      return getNestedValue(
        currentTranslations,
        key
      );
    }
  };

  /* ============================================================
     8) INICIALIZAÇÃO
  ============================================================ */

  setLanguageReady(false);

  applyLanguage(getInitialLanguage());
})();