# Apresentação ao Conselho — Capital Fornecedores

Gera a apresentação do projeto **Capital Fornecedores** (Concurso da Melhor
Ideia 2026) para o Conselho. Sete slides.

Diferente das apresentações mensais, esta **não lê planilha nenhuma**: o
conteúdo é argumento, não indicador de mês. Isso torna o arquivo autônomo —
um `.gs` só, sem dependência de nenhum outro arquivo deste repositório.

## Como rodar

1. Cole `Apresentacao_Conselho.gs` num projeto Apps Script (pode ser avulso:
   script.google.com → Novo projeto).
2. Rode `gerarApresentacaoConselho()`.
3. Com `CONSELHO_DECK_ID` vazio, o script **cria** a apresentação e escreve a
   URL no Logger. Copie o ID para a constante se quiser regerar sempre no
   mesmo arquivo, em vez de criar um novo a cada execução.

Precisa de autorização para Slides e para Drive (o Drive é só para buscar a
logo pelo ID; sem ele os slides saem sem logo e o Logger avisa).

## Os slides

| # | Slide | O que faz |
|---|---|---|
| 1 | Capa | Título e a régua da apresentação: o que funciona separado do que falta |
| 2 | O problema | Quatro achados do acervo real de 45 documentos |
| 3 | O que já funciona | KPIs de engenharia + dois painéis do que é demonstrável |
| 4 | O ciclo que se fecha | As cinco etapas, e por que a nota voltar para quem compra é o ponto |
| 5 | O que ainda será implementado | Quatro itens, todos por fazer, com prazo |
| 6 | Os números que ainda não temos | Os zeros, e a janela de medição que expira |
| 7 | O que peço ao Conselho | Três decisões |

## Regra de conteúdo

**Nenhum número entra sem lastro.** Não é preciosismo: uma auditoria do
próprio sistema encontrou dois números fabricados em telas executivas — um
saving fixo de `11,8%` no código e uma taxa de resposta a convites de `100%`
calculada sobre zero convites. Os dois foram removidos do produto. Se um
número desta apresentação não puder ser apontado num dado real, ele não entra.

Por isso o slide 6 existe e mostra zeros. Uma apresentação que esconde o que
falta não sobrevive à terceira pergunta.

## Convenções seguidas

- **Prefixo `_cn` em todas as helpers.** O `Farol_Guilherme.gs` usa `_g` e as
  mensais usam `CR_DESIGN_SYSTEM`; o prefixo próprio permite colar este
  arquivo em qualquer projeto sem colisão de namespace. Conferido: nenhum nome
  daqui existe em `megas-mensal/` nem em `boletim/`.
- **Todo texto passa por `_cnUmaLinha_` ou `_cnParagrafo_`**, que medem antes
  de desenhar. Ver a lição 1 do `CLAUDE.md` da raiz: a `TEXT_BOX` tem ~7pt de
  recuo interno de cada lado que a API não desliga, e é ele que quebra texto
  curto em caixa estreita.
- **`try/catch` por slide**, com o aviso de falha desenhado na própria página
  usando só `insertShape`. Uma helper faltando não pode produzir slide em
  branco silencioso nem abortar os slides seguintes.
