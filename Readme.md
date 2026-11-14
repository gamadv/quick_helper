# My personal test Lab 🧪

Um playground para testar Node, HTML puro e React: você digita o código no navegador e vê o resultado ao lado. Funciona de dois jeitos:

- **Local** (`npm run dev`): os arquivos ficam no disco, o Node é de verdade e o React tem Fast Refresh.
- **No navegador** (publicado no Netlify): tudo roda no navegador de quem abre o site, sem servidor.

```bash
npm install
npm run dev   # abre o lab em http://localhost:5555
```

## Como usar

- **Criar arquivo:** clique no **+** de uma seção (Node, HTML puro ou React) e digite o nome. Sem extensão, usa `.ts`, `.html` ou `.tsx`; `pasta/nome` cria uma subpasta. O arquivo já nasce com um exemplo.
- **Renomear ou mover:** clique no nome do arquivo no topo do editor. Dá para trocar de pasta ou de seção digitando o caminho (`react/componentes/Botao.tsx`); Enter confirma, Esc cancela.
- **Layout:** arraste as divisórias entre barra lateral, editor e resultado (e a borda de cima do console) para redimensionar; duplo clique restaura. Os tamanhos ficam salvos.
- **Editar:** o editor é o Monaco (o mesmo do VS Code), com autocomplete e checagem de tipos de React, Node e dos seus próprios arquivos. Salva sozinho enquanto você digita (desligue em "Auto-salvar" e use ⌘S / Ctrl+S).
- **Resultado:** aparece à direita e atualiza a cada salvamento:

| Pasta    | O que roda                           | Resultado                                 |
| -------- | ------------------------------------ | ----------------------------------------- |
| `node/`  | qualquer `.ts` / `.js`               | saída e erros no painel                   |
| `pure/`  | qualquer `.html` (com seus CSS/JS)   | página num iframe + console da página     |
| `react/` | qualquer `.tsx` com `export default` | componente num iframe + console da página |

Ao abrir um arquivo que não roda sozinho (um `.css`, um hook ou componente auxiliar), o painel continua mostrando a última página/sandbox daquela seção.

## Local × navegador

|                        | Local (`npm run dev`)                                                                                 | Navegador (Netlify)                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onde ficam os arquivos | nas pastas do projeto (dá para editar no VS Code ao mesmo tempo; botão **VS Code** abre o arquivo lá) | no navegador (IndexedDB), separados por navegador/dispositivo; **Exportar .zip** faz backup                                                                     |
| `node/`                | Node de verdade                                                                                       | um Web Worker com `console`, `process`, timers e `node:path`, `assert`, `util`, `events`, `timers/promises`, `url`, `crypto`; sem `fs`, `http`, `child_process` |
| Pacotes npm            | os instalados no projeto                                                                              | `import x from 'pacote'` baixa do [esm.sh](https://esm.sh) (precisa de internet)                                                                                |
| React                  | Fast Refresh, `StrictMode` de dev (cada render aparece duas vezes no console)                         | recarrega a prévia ao salvar                                                                                                                                    |

Na primeira visita, o lab publicado começa com os arquivos do repositório. Depois disso, um deploy novo não mexe no que você editou no navegador; **Restaurar exemplos** (na barra lateral) traz de volta os arquivos do repositório.

## Publicar no Netlify

O `netlify.toml` já configura tudo: o Netlify roda `npm run build` (Node 24) e publica a pasta `dist/`. Basta conectar o repositório. Para testar o build localmente:

```bash
npm run build
npm run preview
```

## Outros comandos

```bash
npm run node        # roda node/index.ts no terminal, em modo watch
npm test            # Vitest (arquivos *.test.ts em node/, react/ ou lab/)
npm run typecheck   # tsc
npm run format      # Prettier
```

## Observações

- O Node roda TypeScript nativamente (Node ≥ 22.18), sem compilar: erros de tipo aparecem no editor, mas não impedem a execução. Nos arquivos de `node/`, imports relativos precisam da extensão (`import { x } from './util.ts'`) e não dá para usar `enum`/`namespace`.
- No modo local, os scripts de `node/` rodam com a raiz do projeto como diretório atual.
