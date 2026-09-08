# Apresentação ao Conselho — Capital Fornecedores

> **O código não mora aqui.** Ele vive no repositório do próprio sistema:
>
> **`AugustCapitalrealty/Melhor-Ideia-2026` → `app/Apresentacao_Conselho.gs`**

Gera a apresentação do projeto **Capital Fornecedores** (Concurso da Melhor
Ideia 2026) para o Conselho. Sete slides.

## Por que ele está lá e não aqui

O projeto Apps Script do Capital Fornecedores usa **`clasp`**, então tudo que
está em `app/` sobe para o editor sozinho a cada `npm run push`. Manter uma
segunda cópia aqui criaria a única coisa pior que não ter versionamento: duas
versões que divergem sem ninguém perceber qual está rodando.

É o mesmo risco que o [`CLAUDE.md`](../CLAUDE.md) da raiz descreve para os
projetos deste repositório — com a diferença de que lá o código é colado à
mão e aqui existe sincronização automática. Onde há `clasp`, o `clasp` ganha.

## O que este gerador tem de diferente das apresentações mensais

**Não lê planilha nenhuma.** O conteúdo é argumento, não indicador de mês.
Por isso o arquivo é autônomo: traz o próprio design system e as próprias
helpers de texto, com prefixo `_cn` para não colidir com o `_g` do
`Farol_Guilherme.gs` nem com o `CR_DESIGN_SYSTEM` das mensais.

Conferido na entrada: nenhum dos 30 nomes dele colide com `megas-mensal/`,
com `boletim/` nem com os 24 arquivos do Capital Fornecedores.

## Como rodar

Rode `gerarApresentacaoConselho()` no projeto Apps Script do Capital
Fornecedores — o arquivo já está lá, sincronizado pelo `clasp`.

Com `CONSELHO_DECK_ID` vazio, o script **cria** a apresentação e escreve a URL
no Logger. Copie o ID para a constante se quiser regerar sempre no mesmo
arquivo em vez de criar um novo a cada execução.

O escopo `presentations` já estava no manifesto daquele projeto, então não há
reautorização a pedir aos usuários do web app.

## Os slides

| # | Slide | O que faz |
|---|---|---|
| 1 | Capa | Título e a régua: o que funciona separado do que falta |
| 2 | O problema | Quatro achados do acervo real de 45 documentos |
| 3 | O que já funciona | KPIs de engenharia + o que é demonstrável ao vivo |
| 4 | O ciclo que se fecha | As cinco etapas, e por que a nota voltar para quem compra é o ponto |
| 5 | O que ainda será implementado | Quatro itens, todos por fazer, com prazo |
| 6 | Os números que ainda não temos | Os zeros, e a janela de medição que expira |
| 7 | O que peço ao Conselho | Três decisões |

## A regra de conteúdo, que vale registrar

**Nenhum número entra sem lastro.** Não é preciosismo: uma auditoria do
próprio sistema encontrou dois números fabricados em telas executivas — um
saving fixo de `11,8%` escrito no código e uma taxa de resposta a convites de
`100%` calculada sobre zero convites. Os dois foram removidos do produto.

Por isso o slide 6 existe e mostra zeros em vermelho. Uma apresentação que
esconde o que falta não sobrevive à terceira pergunta.

## Lições do repositório que este gerador segue

- Todo texto passa por `_cnUmaLinha_` ou `_cnParagrafo_`, que **medem antes de
  desenhar**. A `TEXT_BOX` tem ~7pt de recuo interno de cada lado que a API não
  desliga, e é ele que quebra texto curto em caixa estreita.
- **`try/catch` por slide**, com o aviso de falha desenhado na própria página
  usando só `insertShape` — nada de helper, que é justamente o que costuma
  faltar quando algo quebra. Slide em branco silencioso é o pior resultado:
  vai para a reunião sem ninguém ter visto falhar.
