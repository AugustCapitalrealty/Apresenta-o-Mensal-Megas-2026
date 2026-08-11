# Apresentações Capital Realty

Repositório único dos projetos de Google Apps Script que geram as
apresentações no Google Slides.

## Projetos

| Pasta | O que gera |
|---|---|
| [`megas-mensal/`](megas-mensal/) | Apresentação Mensal dos Megas — Curitiba, Itajaí e Esteio |
| [`boletim/`](boletim/) | Boletim 2026, incluindo os slides de controle de acessos |
| [`gestao-tvs/`](gestao-tvs/) | Gestão à Vista exibida nas TVs |
| [`controle-acessos/`](controle-acessos/) | Ver o README da pasta |

Cada pasta é um **projeto Apps Script independente**, com seu próprio arquivo
de configuração e seus próprios pontos de entrada. A pasta organiza o código
no git; não junta os projetos.

## Antes de mexer

Leia o [`CLAUDE.md`](CLAUDE.md) da raiz. Ele reúne o que vale para os quatro
projetos: a regra do namespace único do Apps Script (e por que as pastas não
podem ser fundidas), o design system compartilhado, e as lições que já
custaram retrabalho — quebra de texto em caixa estreita, conciliação entre
estoque e fluxo, e quando preferir a base bruta à planilha digitada.

## Publicação

Não há `clasp`. O código é copiado à mão para o editor do Apps Script de cada
projeto — **`git push` não publica nada**.
