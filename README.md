# Currículo em HTML + CSS (A4) + Exportação para PDF (Texto + Links)

Este projeto é um currículo no formato **HTML + CSS**, com layout fixo no estilo **A4** (largura fixa) e **altura livre** (cresce conforme o conteúdo), pensado para ficar com “cara de PDF”.

A exportação para PDF é feita **no backend (Node.js + Puppeteer)** para garantir um PDF **íntegro**

---

## Estrutura do projeto

Arquivos principais:

- `index.html` — conteúdo do currículo (edite aqui)
- `styles.css` — estilos do currículo (tema, layout, tipografia)
- `export-client.js` — JS do botão “Exportar PDF” (frontend)
- `assets/`
  - `foto.png` — sua foto
  - `fonts/` — **fontes embutidas** (recomendado) para o PDF ficar idêntico à tela
    - `Inter-Regular.woff2`
    - `Inter-SemiBold.woff2`
    - `Inter-Bold.woff2`

Backend (exportação):
- `scripts/server.js` — servidor HTTP (serve o site + rota `/export-pdf`)
- `scripts/generate-pdf.js` — geração do PDF via Puppeteer
---

## Como editar

### Conteúdo (HTML)
Edite o `index.html`:

- **Nome / título / contato**: ficam na coluna esquerda (`.sidebar`)
- **Resumo / experiência / formação / cursos**: ficam na coluna direita (`.main`)
- Para adicionar uma nova experiência/curso:
  - Duplique um bloco (`<article class="job">` ou `<article class="edu">`) e ajuste os textos.

### Estilos (CSS)
Edite o `styles.css`:

- Cor tema:
  - `--accent` e `--accent-rgb`
- Largura A4 e colunas:
  - `--page-w`, `--sidebar-w`, `--main-w`
- Espaçamentos principais:
  - `--pad-y`, `--pad-left`, `--pad-right`

### Fonte (para padronizar 100% tela x PDF)
Para evitar qualquer diferença de fonte entre navegador e exportação, use fontes embutidas:

1. Coloque os arquivos `.woff2` em `assets/fonts/`
2. O `styles.css` usa `@font-face` (ex.: família **Inter**) para padronizar tudo

---

## Rodando o projeto (obrigatório para exportar PDF)

A exportação depende do backend (Puppeteer). Então rode o servidor do projeto.

### 1) Instalar dependências
```bash
npm i
```

### 2) Subir o servidor
```bash
npm run serve
```

Abra no navegador:
- `http://localhost:3000`

---

## Exportar PDF

1. Abra `http://localhost:3000`
2. Clique no botão **Exportar PDF**
3. O download vai chamar a rota:
   - `http://localhost:3000/export-pdf`

O PDF sai com:
- texto copiável
- links clicáveis
- 1 página alta (sem paginação)

---

## Dicas rápidas

- Se a foto não aparecer no PDF:
  - confirme o caminho no HTML, ex.: `assets/foto.png`
- Se você mudar bastante o conteúdo e o PDF “cortar” no final:
  - o script mede a altura automaticamente, mas você pode aumentar a “folga” no `generate-pdf.js` (o `+ 20` no cálculo de altura).
- Se quiser gerar **paginado A4** (tradicional), dá pra adaptar o `generate-pdf.js` facilmente (em vez de height customizado, usar `format: 'A4'`).

---
