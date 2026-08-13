# Template — Base para Novos Relatórios

Cópia **independente** do gerador de pendências, pronta para virar um novo
relatório (outra planilha + outra apresentação) preenchendo só o bloco
`CONFIG` no topo do arquivo — sem precisar reescrever o visual.

## Arquivo

| Arquivo | O que faz |
|---|---|
| `gerador-slides-template.gs` | Clone configurável: banner, tabela, badges, rodapé com KPIs e menu já prontos; só o bloco `CONFIG` muda de um projeto para outro. |

## Como usar

1. Abrir a **nova** apresentação do Google Slides.
2. Extensões → Apps Script → colar este código.
3. Preencher o bloco `► CONFIG` (IDs da planilha/apresentação, aba, colunas).
4. Salvar, recarregar a apresentação (F5) e usar o menu
   **⚙️ Relatório** → **🔄 Atualizar**.
