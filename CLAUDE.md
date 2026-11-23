# CLAUDE.md

Portfolio de fotografia de Gabriel Buzzi ("Buzzi Photos"), publicado via GitHub Pages em https://rtrgb.github.io (repo `rtrgb/rtrgb.github.io`, branch `main`).

## Stack

Site estático puro: HTML + CSS + JavaScript vanilla. Sem build, sem framework, sem dependências, sem testes.

- `index.html`: página única (fundo aurora, intro, nav, gallery/carrossel, about, gear, contact, lightbox, footer)
- `css/style.css`: todos os estilos, dark theme. Cores em tokens no `:root` (`--bg`, `--text`, `--muted`, `--label`, `--faint`). Breakpoints mobile em `768px` e `480px` perto do fim do arquivo
- `js/aurora.js`: fundo animado em WebGL (port do "Aurora Flow" da componentry.dev), canvas fixo atrás da página
- `js/intro.js`: efeito "flipping word swap" (letras girando). Usado no intro ("Gabriel" → "Buzzi", a cada carregamento) e no logo da nav ("Buzzi" → "Photos" no hover)
- `js/filmstrip.js`: carrossel plano em DOM (foto central em destaque, vizinhas menores e escurecidas, loop infinito, arrastar/trackpad/teclado, clique amplia). Expõe `createFilmstrip()`
- `js/main.js`: carrega `photos.json`, monta o carrossel (legenda, contador, filtros, teclado) e, se ele não carregar, cai para a grade + lightbox antigos
- `js/carousel.js`: antigo carrossel com lente de vidro em WebGL; não é mais carregado pelo `index.html`
- `photos.json`: fonte dos dados da galeria
- `favicon/`: ícones gerados com a fonte Cormorant Garamond
- Fontes: Google Fonts, Cormorant Garamond (títulos) e Inter (texto)

## Rodar localmente

`fetch('photos.json')` não funciona via `file://`, então precisa de um servidor:

```sh
python3 -m http.server 8000
# abrir http://localhost:8000
```

Deploy: push na `main` publica no GitHub Pages.

## Adicionar fotos

As imagens ficam no Cloudinary (`res.cloudinary.com/dtvmwampt/...`), não no repo. Para adicionar uma foto, inclua uma entrada em `photos.json`:

```json
{
  "url": "https://res.cloudinary.com/dtvmwampt/image/upload/.../nome.jpg",
  "alt": "Descrição curta",
  "category": "animals",
  "location": "Cidade, Estado",
  "date": "May 1st, 2026",
  "width": 2400,
  "height": 1600
}
```

- `width`/`height` são as dimensões originais em pixels (evitam salto de layout enquanto a imagem carrega). Opcionais, mas recomendados.
- O JS insere transformações do Cloudinary na URL (`f_auto,q_auto,w_600/1000/1400` na grade, `w_2000` no lightbox), então a `url` deve ser a original, sem transformações.
- A ordem do carrossel é a ordem do `photos.json`; a primeira foto é a que aparece no centro ao abrir o site.

- `category` precisa bater com um `data-filter` dos botões em `index.html`: `animals`, `nature`, `cars`, `sports`. Para uma categoria nova, adicione o botão lá também.
- Botões de filtro sem nenhuma foto são escondidos automaticamente pelo JS.
- `date` é uma string livre exibida como está (formato atual em inglês: "Month Dth, YYYY").

## Convenções

- Conteúdo visível do site em **inglês**. Comentários no código estão em português e podem continuar assim.
- JS em estilo simples: `function () {}` com `const`/`let`, sem módulos nem bundler.
- Seções do CSS separadas por blocos de comentário `/* ==== NOME ==== */`.
- Mensagens de commit curtas, em inglês, minúsculas (ex.: `add mobile responsive styles`).

## Git e autoria

- **Gabriel é o único autor/contribuidor.** Nunca adicionar `Co-Authored-By`, menções ao Claude ou qualquer outra atribuição em commits, PRs ou issues.

## Observações

- `.gitignore` ignora `notes/` e `.DS_Store`, mas `notes/ html-notes.docx` (com espaço no início do nome) já está versionado.
- O HTML dos cards é montado por concatenação de strings em `main.js` sem escape. Tudo bem enquanto `photos.json` for editado só por você.
- O ano do footer (`© 2026`) está fixo no HTML.
- "Reduzir movimento" do sistema desliga o intro, congela a aurora num quadro estático e faz o carrossel trocar de foto sem animação.
- Os ports da componentry.dev vieram do registro público deles (`componentry.dev/r/<nome>.json`); confira a licença antes de considerar definitivo.
