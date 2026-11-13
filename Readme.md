# My personal test Lab 🧪

Um playground local para testar Node, HTML puro e React: você digita o código no navegador e vê o resultado ao lado.

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

| Pasta    | O que roda                           | Resultado                                                  |
| -------- | ------------------------------------ | ---------------------------------------------------------- |
| `node/`  | qualquer `.ts` / `.js`               | processo Node de verdade; saída e erros no painel          |
| `pure/`  | qualquer `.html` (com seus CSS/JS)   | página num iframe + console da página                      |
| `react/` | qualquer `.tsx` com `export default` | componente num iframe com Fast Refresh + console da página |

Ao abrir um arquivo que não roda sozinho (um `.css`, um hook ou componente auxiliar), o painel continua mostrando a última página/sandbox daquela seção.

Os arquivos ficam salvos de verdade nas pastas, então dá para editar no VS Code ao mesmo tempo: o lab recarrega o que mudou no disco (botão **VS Code** abre o arquivo lá).

## Outros comandos

```bash
npm run node        # roda node/index.ts no terminal, em modo watch
npm test            # Vitest (arquivos *.test.ts em node/ ou react/)
npm run typecheck   # tsc
npm run format      # Prettier
```

## Observações

- O Node roda TypeScript nativamente (Node ≥ 22.18), sem compilar: erros de tipo aparecem no editor, mas não impedem a execução. Nos arquivos de `node/`, imports relativos precisam da extensão (`import { x } from './util.ts'`) e não dá para usar `enum`/`namespace`.
- Os scripts de `node/` rodam com a raiz do projeto como diretório atual.
- Os sandboxes React rodam em `StrictMode`, então em dev cada render aparece duas vezes no console.
