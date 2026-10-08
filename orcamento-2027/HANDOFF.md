# Orçamento 2027 — contexto para uma nova sessão do Claude

Leia isto antes de mexer em `orcamento-2027/`. Foi escrito em 07/10/2026 para
uma sessão que **só tem o computador**: sem conector do Google Drive, sem as
memórias da sessão anterior (o C: tem Deep Freeze e apaga tudo a cada
reinício). O que importa sobre o projeto está aqui, no
[`README.md`](README.md) (referência técnica completa) e no
[`PASSO-A-PASSO.md`](PASSO-A-PASSO.md) (o que o usuário roda no editor).

## 1. O que é

Projeto Apps Script que gera, no Google Slides, a apresentação do
**Orçamento 2027** de três condomínios logísticos: **Mega Curitiba, Mega
Itajaí e Mega Esteio**. Uma apresentação por Mega, recriada inteira a cada
geração (`gerarCuritiba()`, `gerarItajai()`, `gerarEsteio()`).

- Usuário: Guilherme (Business Analysis, Capital Realty). Escreve em
  português, muitas vezes em maiúsculas e sem pontuação; responda em
  português.
- Quem lê o deck: o **gestor** (revisa, marca dúvidas) e o **diretor** (lê
  tudo em dinheiro **e** em R$/m² ao mês).
- Repositório: `G:\Drives compartilhados\08.000 - Business Analysis\APRESENTAÇÃO ORÇAMENTO\Apresenta-o-Mensal-Megas-2026`
  (GitHub, branch `main`, commit direto na `main`). A pasta deste projeto é
  `orcamento-2027/`. As outras pastas são outros projetos — não mexa.
- Apps Script: scriptId `13j2b0mdjYO2wbag2d5qOQwyBMDEKrIhd-_H7ZQqHUoEBEVfYJLx7Cup3`,
  publicado com `clasp push --force` de dentro de `orcamento-2027/`. O git é
  a fonte; o editor espelha a `main`. **Nunca edite no editor** — o próximo
  push sobrescreve.

## 2. Estado em 07/10/2026

- As três apresentações geram completas: zero slides com falha, zero textos
  cortados, nenhum "Não detalhado" (todos os contratos casam com a
  METRAGEM). Teste: `node teste/teste_orcamento.js` → **4057/4057**.
- Código publicado (`clasp push`) e no GitHub. A **V1** está pronta para o
  usuário gerar (roteiro em `PASSO-A-PASSO.md`).
- Contratos: **os três Megas leem o cadastro mestre** `MESTRA - CONTRATOS
  2027 - TODOS OS MEGAS` (`contratosDoCadastro: true`, `ORC_CONTRATOS_ANO_IDS`
  em `02_Dados.gs`). Curitiba deixou as planilhas individuais "MEGA CURITIBA -
  CONTRATOS 2027 - <CONTA>" em 07/10/2026 (pedido do usuário: padronizar os
  três nas planilhas mestras). Os totais batiam centavo por centavo; agora
  Curitiba também traz os contratos das outras contas (informática, telefone,
  energia), como Itajaí e Esteio.
- Alerta de pendências ligado (`_orcPendencias_`, `19_Revisar.gs`): Itajaí e
  Esteio saem com o slide "Revisar antes da versão final" e o selo
  ⚠ PENDENTE na manutenção, porque o modelo 090 tem itens que a METRAGEM
  não tem (Itajaí R$ 29.313; Esteio R$ 15.268).
- Planilhas de comparação item a item 2026 × 2027 (manutenção) montadas para
  os três Megas; o gestor ainda vai marcar SIM/NÃO.

### Fim do dia 07/10/2026 (v2)

- **Deck único de Facilities** criado (ID `1w_diCsSIpuuryXliPRBcW4YWoMmM8RyuT7O7307DsqQ`, 74 slides): gerar por
  parte, cada uma numa execução — `gerarFacilitiesAbertura`, `gerarFacilitiesCuritiba`, `gerarFacilitiesItajai`,
  `gerarFacilitiesEsteio` (`25_Facilities.gs`). Os decks por Mega continuam (`gerarCuritiba` etc.).
- **Curitiba é Demercado** (verde #00594F, ouro #AF9800, títulos em EB Garamond, logo Demercado); Itajaí e Esteio são
  Capital Realty (`ORC_MARCAS`, `cid.marca`).
- **Motor de imagens** (README, "Molduras em imagem" e "Formas pelo motor"): moldura (`MOLDURA - <hash>.png`) no
  fundo + formas do conteúdo (`GRAFICO - <hash>.png`) logo acima + só textos no slide. Log de cada parte: "molduras:
  …" e "formas pelo motor: N slides em imagem, M em formas". M > 0 = número mudou: `python
  ferramentas/graficos_imagem.py` (lê o manifesto do teste e `GRAFICOS PENDENTES.json` da pasta), esperar o Drive
  subir (`python ferramentas/conta_drive.py --esperar 15` conta pela API) e gerar de novo.
- **Gráficos v2** aprovados e publicados (tabela em `IDEIAS-DESIGN.md`, "Aprovado e feito em 07/10/2026").
- **Ritmo 2026 fechado até setembro** (`ORC_RITMO_ULTIMO_MES_FECHADO = 9`, `01_Config.gs`) — suposição; o Guilherme
  não confirmou. Atualizar a cada fechamento.
- Teste: **4815/4815**. Último commit do dia na `main`; editor = `main`.
- **Próximo:** os 9 erros e as melhorias da analista 4 (`IDEIAS-DESIGN.md`, "Avaliação da analista 4"); o Guilherme
  aprovou corrigir os erros e ver rascunhos de "área × custo" e "por que sobe" de Segurança e Limpeza.

## 3. Sem acesso ao Drive: o que dá e o que não dá

| Precisa de | Como fazer |
|---|---|
| Ler uma planilha ou apresentação Google | **Não dá direto.** Os `.gsheet`/`.gslides` no G: são atalhos (ler dá "Função incorreta"). Peça ao usuário para rodar `exportarFixtures()` no editor: os JSON aparecem em `G:\…\APRESENTAÇÃO ORÇAMENTO\_fixtures\`, com o mesmo nome dos arquivos de `teste/` — copie por cima e rode o teste |
| Ver os slides gerados | Peça `exportarSlidesCuritiba()` / `exportarSlidesItajai()` / `exportarSlidesEsteio()`; os PNG aparecem em `G:\…\APRESENTAÇÃO ORÇAMENTO\_slides-gerados - MEGA <X>\` — abra com a ferramenta de leitura de imagem |
| Criar uma planilha nova | Gere um `.xlsx` (Python + openpyxl, ver `ferramentas/`) e copie para a pasta no G:. Sobe como .xlsx e abre no Planilhas. Fórmulas com intervalo fechado (`D6:D1000`); intervalo aberto deu `#NAME?` |
| Mover ou renomear arquivo do Drive | `Move-Item` / `Rename-Item` no G: (o ID não muda, o gerador continua achando) |
| Excluir arquivo do Drive | Não exclua. Renomeie com o prefixo `PODE EXCLUIR - ` e avise o usuário |
| Publicar o código | `clasp login` (o usuário autoriza no navegador; a credencial some no reinício) e `clasp push --force` em `orcamento-2027/` |
| Saber se o Drive já subiu as imagens | `python ferramentas/conta_drive.py [--esperar MIN]`: conta os `GRAFICO - *.png` no Drive pela API (só metadados), com o token do clasp |
| Ver um slide sem o Slides | `PREVIA=ferramentas/saida node teste/teste_orcamento.js` e `python ferramentas/previa_slides.py ferramentas/saida/formas_<cidade>.json <índices>` — desde 07/10/2026 desenha linhas inclinadas, tracejado, bordas e alinhamento do texto como o Slides |

`exportarFixtures()` e `exportarSlides*()` foram ampliadas em 07/10/2026 e
**ainda não foram rodadas** nessa versão: na primeira vez, confira o log
("Pronto: N de M arquivos") antes de confiar nos JSON.

## 4. Como trabalhar

1. Começo de sessão (Deep Freeze): `git pull`; `node teste/teste_orcamento.js`
   tem que dar tudo ok. Se for rodar `ferramentas/*.py`: `pip install openpyxl`.
2. Edite os `.gs` (Read/Edit). Cuidado com quebras de linha: há arquivos em
   LF e em CRLF; um `git stash` converte. Script Python de edição: normalize
   `\r\n` → `\n` antes de procurar o trecho.
3. `node teste/teste_orcamento.js` — o teste roda os `.gs` num vm com
   dublês de Slides/Sheets e as planilhas reais em `teste/fixture_*.json`.
   Ele acusa: slide com falha, forma fora da página, texto cortado com "…",
   divergência entre relatórios. Toda mudança de comportamento ganha
   asserção.
4. `git commit` direto na `main`, mensagem em português terminando com
   `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`;
   `git push`.
5. `clasp push --force` (de `orcamento-2027/`). O `.claspignore` só sobe
   `*.gs` e `appsscript.json`.
6. Diga ao usuário o que rodar no editor (normalmente: gerar a cidade →
   `aplicarPropostasTextos()` → gerar de novo).

**Fim de toda sessão: commit + push.** O que não foi para o GitHub ou para o
G: se perde.

## 5. Fontes de dados (nomes padronizados em 07/10/2026)

Pasta no Drive: `08.000 - Business Analysis/APRESENTAÇÃO ORÇAMENTO`
(id `13PO9xDvPG3wmoVLfv41fZZo0I3rvl_gw`). Padrão: `MEGA <X> - <o que é> <ano>`,
`MESTRA - …` nas consolidadas, `PODE EXCLUIR - …` no que já não serve.

| Pasta | Conteúdo |
|---|---|
| `00 - PLANILHAS MESTRAS` | `MESTRA - ORÇAMENTO 2026 ITEM A ITEM` (`1X39Bz…`), `MESTRA - CONTRATOS 2026` (`11bcQ0…`, `ORC_CONTRATOS_ANO_ANTERIOR_ID`), `MESTRA - CONTRATOS 2027` (`1cwbW249…`, `ORC_CONTRATOS_ANO_IDS[0]`), `MESTRA - TOTAIS 2026 POR CONTA` |
| `01 - CONTROLE DA APRESENTAÇÃO` | `ORÇAMENTO 2027 - TEXTOS DAS TABELAS` (`ORC_TEXTOS_ID`), `ORÇAMENTO 2027 - COMPARAÇÃO DE ITENS 2026 x 2027 - MEGA <X>` (três; Curitiba é Google Planilha, Itajaí e Esteio são .xlsx) |
| `02 - MEGA CURITIBA`, `03 - MEGA ITAJAÍ`, `04 - MEGA ESTEIO` | apresentação, `METRAGEM-COND 2027`, `DESPESAS MENSAL 2026 x 2027`, `090 DESPESAS GERAIS 2027`, `070 SERVIÇOS DE TERCEIROS 2027`, `BASE DO ORÇAMENTO 2027.xlsx` (Curitiba ainda tem `CONTRATOS 2027 - <CONTA>`, que o gerador não lê mais) |

Todos os IDs que o gerador usa estão em `ORC_CIDADES` (`01_Config.gs`), com
o nome do arquivo em comentário. O mapa fonte → slide está no README
("Planilhas lidas").

## 6. Decisões já tomadas (não reabrir sem o usuário pedir)

- **Curitiba, IPTU e Seguro:** vale a METRAGEM, por orientação da
  contabilidade (06/10/2026) — `relatorios.valeMetragem`.
- **DRE, Ofensores e Defensores** iguais à DRE da apresentação mensal dos
  Megas: mesmos grupos e ordem, IPTU e Seguro em Utilities, **todas** as
  contas (sem "Demais contas"), conta com "–" em todas as colunas some.
- **R$ e R$/m² ao mês em todo slide de valores** (área implícita = total ÷
  R$/m² ÷ 12, da METRAGEM).
- Ponte sem a explicação "já roda em 2026".
- Manutenção: "Projetos" (não "investimento"); "Custo para manter o Mega
  rodando" com legenda de cada grupo; itens menores em página (1/2), (2/2).
- **Alerta de pendência sempre ligado:** dado faltando nas fontes vira item
  em `_orcPendencias_` (slide de revisão + selo), nunca só log.
- Esteio: a área implícita sobe de ~24 mil para ~53 mil m² — está certo, o
  Mega cresce.
- Premissas: o gestor escreve no slide; depois o texto vai para
  `premissas` em `01_Config.gs` (senão a geração seguinte apaga).
- Comparação item a item: só os pares marcados **SIM** pelo gestor entram
  no slide.
- Texto curto de tabela: o gestor escolhe na coluna C da planilha de
  textos; o código só propõe (`07_PropostasTextos.gs`).

- **Como o Guilherme gosta de trabalhar** (07/10/2026): quando ele diz "vai anotando", só anote; nada de código
  até "pode rodar". Visual novo: rascunho em PNG **aberto na tela dele** (`Start-Process`) antes de codar; ele
  costuma pedir "rode um analista" (um agente avalia e dá nota) antes de aprovar. Sempre dizer **em qual arquivo**
  está a função que ele tem que rodar. Ao entregar, um passo a passo curto do que rodar.
- **Tudo pelo motor:** gráfico ou elemento visual novo usa `_orcRet_`/`_orcLinha_`/`_orcBolinha_` (viram imagem) e
  `_orcUmaLinha_`/`_orcParagrafo_` (texto); nunca `slide.insertShape` solto num slide com cabeçalho.
- **Comparação honesta** (analista, 07/10/2026): não tirar conclusão só de um recorte de meses; out–dez do ritmo é
  projeção e tem que dizer; quando a área muda, separar efeito área de efeito custo.

## 7. Próximos passos

1. **V1** — o usuário gera e confere (`PASSO-A-PASSO.md`). Se ele relatar
   problema num slide, peça o PNG (`exportarSlides…`) em vez de adivinhar.
2. **Slide de comparação item a item** (manutenção, Orç 2026 × Orç 2027).
   ⚠ **A base 2026 vai mudar (07/10/2026):** a comparação usou o ORÇADO 2026; o
   Guilherme vai trocar pelo RITMO 2026. Tudo o que existia antes da troca
   (planilhas preenchidas pelo gestor, base, decisões) e o roteiro do que
   conferir com a base nova: [`APRENDIZADOS-COMPARACAO-2026.md`](APRENDIZADOS-COMPARACAO-2026.md).
   **O gestor preencheu as três planilhas em 07/10/2026** (SIM/NÃO na coluna
   K e comentário na L). O que ele disse, além dos pares:
   - **Obras de 2026 que ficaram para 2027** ("não foi realizado, apenas
     deslocamos"): Itajaí 7 itens, R$ 611 mil no Orç 2027 (~62% da alta da
     manutenção: docas, torniquetes, impermeabilizações, iluminação do bolsão e
     do AMZ 4/5, quadro da portaria); Curitiba 2 itens, R$ 233 mil (~48%:
     guard-rail, 4º torniquete). A pendência de R$ 29.313 de Itajaí são itens
     reais de 2027 (iluminações adiadas; totem é estrutura, a lona foi em 2026).
   - **Provisões por disciplina de 2026 viraram a provisão de 3%** de
     manutenções não previstas em 2027 (Curitiba R$ 39 mil, Esteio R$ 20,8 mil;
     **Itajaí não tem a linha** — pergunta em aberto). Explica "Esteio sem
     acesso/CFTV".
   - **Mudou de conta:** tratores e bombas → Manutenção de Bens Móveis;
     paisagismo de Curitiba → LPU na Conservação; potabilidade e limpeza de
     caixa d'água viraram contrato.
   - **Contratos com o ano cheio em 2027** (PMOC, Equilíbrio em Curitiba) e
     **Esteio cresce com os Armazéns B1 e B2** (subestação, gerador,
     elevatórias semestrais, 5 linhas de vida, juntas).
   - Par certo em Itajaí: Orbital (PPCI, rescindido) → Firecam; FM Security é
     contrato novo.
   - Pedido dele: **comparar também por disciplina** ("em 2026 gastamos X com
     pintura, em 2027 projetamos X").
   Perguntas em aberto estão em `ORC_PENDENCIAS_GESTOR` (01_Config.gs) e saem
   no slide de revisão. As decisões dele viram código por
   `ferramentas/decisoes_gestor.py` → `23_DecisoesGestor.gs`.
   **Feito (07/10/2026):** slide "Por que a manutenção sobe"
   (`24_PorQueSobe.gs`, abre a seção Manutenção de Curitiba e Itajaí): ponte
   Ritmo → obras adiadas de 2026 → demais variações → Orç, em R$ e R$/m², e a
   tabela das obras (valor de 2027 vindo do modelo 090 pelo nome). Itajaí:
   +77,1% → +29,4% sem as adiadas. **Falta:** comparação por disciplina e a
   item a item só com os pares SIM (os pares já estão em `ORC_DECISOES_GESTOR`). As planilhas são do
   Drive: peça ao usuário para baixá-las como .xlsx para uma pasta do G: (ou
   rodar uma exportação). As linhas de origem estão em
   `ferramentas/comparacao_linhas_<cidade>.json` (gerado por
   `ferramentas/curadoria.js`); a decisão do gestor vem da coluna K
   (COMPARA?). **Desde 07/10/2026 a base de 2026 é o ritmo**
   (`ferramentas/saida/ritmo_linhas_<cidade>.json` e as planilhas "… RITMO 2026
   x ORÇ 2027 - MEGA <X>"; ver APRENDIZADOS-COMPARACAO-2026.md, seção 6). Siga o visual do slide `21_ContratosComparados.gs` (cards +
   tabela com R$ e R$/m²), entre na seção Manutenção.
3. Pendências com a controladoria (aparecem sozinhas no slide de revisão):
   Itajaí R$ 29.313 (totem, iluminação do AMZ 4/5 e do bolsão — todos com par
   em 2026, provavelmente já feitos); Esteio R$ 15.268 (linhas de vida).
4. Achados para o gestor (estão nas planilhas de comparação): a linha
   "SEGURO MEGA ESTEIO - ÁRMAZEM A" (R$ 13.376,81, nov) na manutenção de
   Itajaí do Orç 2026 item a item foi **erro de digitação** (confirmado pelo
   Guilherme em 07/10/2026) — fica fora da comparação; o seguro do próprio
   Itajaí na manutenção (R$ 66.780) segue como "Não compara"; Esteio sem
   verba de acesso/CFTV em 2027 e tratores do Esteio fora da manutenção — os
   dois explicados pelo gestor (3% e Bens Móveis, item 2); Orç 2026 item a
   item do Esteio R$ 4.500 acima da METRAGEM.
5. **Melhorias visuais (capas, subcapas, infográficos):** propostas em
   [`IDEIAS-DESIGN.md`](IDEIAS-DESIGN.md), com o que foi aprendido na produção
   de capas de vídeo do Guilherme (07/10/2026). **Nada aprovado ainda**:
   propor, mostrar o PNG e esperar o "sim" do gestor antes de mexer.

## 8. Armadilhas já encontradas

- **Cabeçalho de mês dos cadastros:** "jan./27" vindo de CSV vira, no
  Sheets, a data 27/01/<ano corrente> — o ano está no **dia**. Pode vir
  também como texto "jan./27". `_orcDataCabecalho_` trata os dois.
- **Chave de conta:** `_orcChaveConta_` tira acento, conectivos ("de", "e",
  "em"…) e plural, para "Assistência em informática" (METRAGEM) casar com
  "ASSISTÊNCIA INFORMÁTICA" (cadastro).
- **Texto cortado:** a tabela usa uma fonte só e corta com "…". O teste
  falha. Corrija com uma proposta em `07_PropostasTextos.gs` — o mesmo texto
  pode precisar de linha nas abas `Composição`, `Ofensores`, `Categorias` e
  `Maiores itens`.
- **Pareamento de contratos** (`21_…` e `22_…`): só item de contrato casa;
  número conta ("ARMAZÉM 01" ≠ "ARMAZÉM 02"); palavras genéricas
  ("preventiva", "corretiva", "das") não identificam fornecedor.
- **Limite de 6 min do Apps Script:** gere uma cidade por vez;
  `gerarTodas()` chega perto do limite.
- **Nunca reconstrua arquivo a partir de texto colado no chat** (ver o
  `CLAUDE.md` da raiz): pegue da fonte.
- Heredoc de Bash com Python quebra com aspas e `\b`; escreva o script com a
  ferramenta de escrita e rode o arquivo. (Voltou a quebrar em 07/10/2026 com
  heredocs grandes: "unexpected EOF while looking for matching `''".)
- **Caixa de texto do Slides quebra antes do que a estimativa acha**
  (`_orcLarguraTexto_` subestima): número curto em caixa estreita ("4,50" em
  24 pt com folga 0) e nome no fim de linha ("Ritmo 2026" em 40 pt) quebraram
  em duas linhas. Dê folga (a caixa não tem fundo, esticar não aparece).
- **Motor e camadas:** a imagem das formas vai com `sendToBack` e a moldura
  fecha depois (fica mais atrás). Sem a imagem, as formas são recriadas e
  mandadas para trás na ordem inversa — ficam atrás de todos os textos.
  Capa, sumário e sub capas não têm cabeçalho e não entram no motor (lá há
  forma por cima de foto e áreas de link).
- **Assinatura igual no teste e no Apps Script:** a especificação é JSON com
  uma casa decimal; o teste usa as mesmas planilhas (fixtures), por isso as
  imagens desenhadas a partir do teste servem para a geração real. Se a
  planilha real mudar, a assinatura muda e cai em "formas" + pendentes.
