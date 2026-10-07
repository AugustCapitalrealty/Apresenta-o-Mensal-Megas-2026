# Orçamento 2027 — passo a passo da primeira checagem (V1)

Roteiro para gerar e conferir as três apresentações (Curitiba, Itajaí e
Esteio). Tudo roda no **editor do Apps Script**; nada aqui precisa do
terminal. O código já está publicado (commit de 07/10/2026).

Editor: <https://script.google.com/home/projects/13j2b0mdjYO2wbag2d5qOQwyBMDEKrIhd-_H7ZQqHUoEBEVfYJLx7Cup3/edit>

Para rodar uma função: escolha o nome dela na lista do topo do editor
(ao lado de "Depurar") e clique em **Executar**. O resultado aparece no
**Registro de execução**, embaixo.

---

## 1. Conferir que o editor está com o código novo

Na lista de arquivos à esquerda têm que aparecer, entre outros,
`19_Revisar.gs`, `21_ContratosComparados.gs` e `22_ContratosTodos.gs`.
Em `01_Config.gs`, ITAJAI e ESTEIO têm a linha `contratosDoCadastro: true`.

Se não estiver assim, o código não subiu: peça ao Claude para rodar
`clasp push` (depois de um `clasp login`, por causa do Deep Freeze).

## 2. Primeira geração das três cidades

Uma de cada vez (as três juntas passam dos 6 minutos do Apps Script):

| Ordem | Função | Tempo | O log termina com |
|---|---|---|---|
| 1 | `gerarCuritiba` | 1–2 min | `Pronto: Mega Curitiba, 38 slides — <link>` |
| 2 | `gerarItajai` | 1–2 min | `Pronto: Mega Itajaí, 40 slides — <link>` |
| 3 | `gerarEsteio` | 1–2 min | `Pronto: Mega Esteio, 40 slides — <link>` |

Cada geração escreve na planilha `ORÇAMENTO 2027 - TEXTOS DAS TABELAS` as
descrições longas que ainda não têm texto curto.

## 3. Aplicar os textos curtos

| Ordem | Função | O log mostra |
|---|---|---|
| 4 | `aplicarPropostasTextos` | quantas propostas foram aplicadas |

Isso preenche a coluna C (texto curto) da planilha de textos com as
propostas do código. Se alguém já escreveu um texto na coluna C, ele é
mantido.

## 4. Segunda geração (agora com os textos curtos)

| Ordem | Função |
|---|---|
| 5 | `gerarCuritiba` |
| 6 | `gerarItajai` |
| 7 | `gerarEsteio` |

Esta é a **V1**. Os slides antigos são apagados só no fim de cada geração:
se der erro no meio, a versão anterior continua lá.

## 5. O que conferir em cada apresentação

**Em todas:**

- [ ] Nenhum slide com o título **"Falha ao gerar"** (se houver, o texto do
      slide diz o que faltou).
- [ ] Capa com a foto do Mega, o total em R$ e o R$/m².
- [ ] DRE: o total bate com a METRAGEM-COND do Mega.
- [ ] Nenhum texto terminando em "…" nas tabelas (se houver, o texto curto
      se escreve na coluna C da planilha de textos e gera de novo).
- [ ] Slide **Premissas** está vazio de propósito: o gestor escreve. **Depois
      que ele escrever, o texto tem que ir para o código** (`premissas` em
      `01_Config.gs`), senão a próxima geração apaga.

**Curitiba (38 slides):**

- [ ] Não tem o slide "Revisar antes da versão final".

**Itajaí (40 slides) e Esteio (40 slides):**

- [ ] O slide 2 é **"Revisar antes da versão final"**. Ele **não vai para a
      reunião**: mostra o que falta resolver e some sozinho quando a fonte
      for corrigida. Hoje ele traz uma pendência em cada Mega:
  - **Itajaí:** o modelo 090 tem R$ 29.313 que a METRAGEM não tem (totem
    em jan; iluminação do AMZ 4/5 e do bolsão em fev).
  - **Esteio:** o modelo 090 tem R$ 15.268 que a METRAGEM não tem (duas
    linhas de vida em out).
- [ ] Os slides de Manutenção de imóveis têm o selo laranja **⚠ PENDENTE**
      por causa disso. Segurança e Limpeza não têm selo.
- [ ] Segurança e Limpeza sem a linha "Não detalhado nos modelos" (os
      contratos vêm da `MESTRA - CONTRATOS 2027`).

## 6. Pendências para resolver antes da versão final

| Quem | O quê | Onde |
|---|---|---|
| Controladoria | Itajaí R$ 29.313 e Esteio R$ 15.268: o item fica no 090 (e a METRAGEM sobe) ou sai do 090? | slide "Revisar" de cada Mega |
| Gestor | Marcar SIM/NÃO nas dúvidas da comparação de itens (Curitiba 9, Itajaí 15, Esteio 8) | `01 - CONTROLE DA APRESENTAÇÃO` → `ORÇAMENTO 2027 - COMPARAÇÃO DE ITENS 2026 x 2027 - MEGA <X>` |
| Gestor | Texto das Premissas | slide Premissas → depois passar para `01_Config.gs` |
| Gestor / controladoria | Itajaí: seguro lançado na manutenção em 2026, inclusive R$ 13.377 do Esteio | comparação de Itajaí |
| Gestor | Esteio: em 2027 não há verba de acesso/CFTV, e os tratores saíram da manutenção | comparação do Esteio |

Com a comparação marcada, o próximo passo é o slide de comparação item a
item (só com os pares SIM) — ver `HANDOFF.md`.

## 7. Se precisar de ajuda do Claude numa sessão sem acesso ao Drive

O Claude no computador não abre as apresentações nem as planilhas do
Google. Para ele enxergar:

| Para ele ver | Rode no editor | Aparece em |
|---|---|---|
| os slides gerados | `exportarSlidesCuritiba`, `exportarSlidesItajai` ou `exportarSlidesEsteio` | `G:\…\APRESENTAÇÃO ORÇAMENTO\_slides-gerados - MEGA <X>` (PNG) |
| os dados atuais das planilhas | `exportarFixtures` | `G:\…\APRESENTAÇÃO ORÇAMENTO\_fixtures` (JSON) |

Depois é só dizer a ele que rodou e onde está.

## Lembretes

- **Toda geração recria o deck.** Edição feita à mão no Slides se perde na
  próxima geração; correção vai no código ou nas planilhas.
- Texto curto de tabela: coluna C da planilha `ORÇAMENTO 2027 - TEXTOS DAS
  TABELAS`.
- Mudar arquivo de pasta ou renomear no Drive não quebra nada: o gerador usa
  o ID.
