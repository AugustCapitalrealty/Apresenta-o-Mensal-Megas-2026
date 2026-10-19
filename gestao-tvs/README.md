# Gestão à Vista — TVs

Projeto Apps Script que atualiza os três decks de TV (Mega Curitiba, Mega
Itajaí, Mega Esteio).

## O que rodar

O menu "Selecionar função" do editor só lista função **sem parâmetro** e
esconde as que começam ou terminam com `_` — por isso cada recorte tem a sua
própria entrada.

| Função | O que faz |
|---|---|
| `gerarApresentacao()` | Atualiza as **três** TVs (é o que o acionador chama, via `INICIAR_AQUI`) |
| `gerarCuritiba()` / `gerarItajai()` / `gerarEsteio()` | Atualiza **uma** TV só |
| `ATUALIZAR_METAS()` | Redesenha só os slides de Metas das três |
| `ATUALIZAR_METAS_CURITIBA()` / `_ITAJAI()` / `_ESTEIO()` | Só as Metas de uma |
| `ATUALIZAR_MONITORAMENTO_CHEIAS()` | Só o slide de cheias (Esteio) |
| `ATUALIZAR_PREVISAO_TEMPO()` | Só o slide do tempo |
| `ATUALIZAR_SOLICITACOES()` / `_CURITIBA()` / `_ITAJAI()` / `_ESTEIO()` | Só o kanban de solicitações |
| `ATUALIZAR_WEBDOX()` / `_CURITIBA()` / `_ITAJAI()` / `_ESTEIO()` | Só os contratos no Webdox |
| `ATUALIZAR_CHUVA_MES()` / `_CURITIBA()` / `_ITAJAI()` / `_ESTEIO()` | Só a chuva do mês |
| `CRIAR_GATILHO_CHUVA()` | Rode 1 vez: acionador da chuva do mês a cada 3 horas |
| `diagnosticarBasesBrutas()` | Mostra o dado bruto das bases — rode antes de discutir número |
| `diagnosticarSolicitacoes()` | Confere a chave e chama o portal para as três TVs, sem mexer em slide |
| `gerarArquivosPainelTV()` | Grava no Drive um `Painel_<Unidade>.txt` por TV, com o link de cada slide, para mandar à TI |

Prefira a entrada de **uma** unidade ao conferir um ajuste: são ~30s por TV,
e mexer nas três multiplica o risco de deixar as outras num estado
intermediário se algo falhar no meio.

## Arquivos do projeto

Esta é a lista **completa** do que deve existir no editor do Apps Script.
A pasta não tem `.clasp.json`: o código é copiado à mão (ver o CLAUDE.md da
raiz) ou publicado com `clasp` a partir de uma pasta **temporária**.

ID do script (o projeto é vinculado à planilha, então `clasp list-scripts`
não o mostra): `1EEDv2jAfRHO8HVeLnNydXcA2cKuLhGYMjM3WhYfmzV5oT-PIeTMdH-L5`.

Para publicar sem colar à mão (foi assim em 19/10/2026):

1. `clasp clone <ID>` numa pasta temporária — é o que está no editor.
2. Compare cada `.js` dela com o `.gs` daqui (`sed 's/\r$//'` nos dois
   lados; o editor não guarda a quebra de linha final). Diferença de código
   = alguém mexeu no editor: junte antes de seguir.
3. Copie os `.gs` alterados para a pasta temporária como `.js` e rode
   `clasp push --force` **de lá**. Não rode push desta pasta: os testes de
   Node (`teste_*.js`) iriam para o editor junto.
4. Clone de novo e confira que ficou igual ao git.

Última publicação: 19/10/2026 15:45 — rebrand dos 11 slides + Webdox (14
arquivos, conferidos com `clasp clone` depois do push).

| Arquivo | Papel |
|---|---|
| `Config.gs` | IDs das planilhas, `UNITS` (uma entrada por TV) e o design system |
| `Dados.gs` | **Tudo que lê planilha.** Parte 1: bases brutas dos slides 1–4. Parte 2: valores automáticos das Metas |
| `00_Main.gs` | Orquestrador, cabeçalho padrão dos slides, `MESES_POR_EXTENSO` |
| `01_Slide_Corretivas.gs` | Slide 1 — Visão Geral Corretiva |
| `02_Slide_Corretivas_Acao.gs` | Slide 2 — Backlog Corretivo |
| `03_Slide_Preventivas.gs` | Slide 3 — Visão Geral Preventiva |
| `04_Slide_Preventivas_Acao.gs` | Slide 4 — Backlog Preventivo |
| `05_Slide_Capa.gs` | Slide 0 — capa |
| `06_Slide_Tempo.gs` | Slide 5 — previsão do tempo (acionador próprio) |
| `07_Slide_Metas.gs` | Slides 6+ — um por papel em `unit.metas` |
| `08_Slide_Cheias.gs` | Depois das Metas, só Mega Esteio (acionador próprio) |
| `09_Slide_Solicitacoes.gs` | Kanban do Portal de Solicitações |
| `10_Slide_Webdox.gs` | Contratos no Webdox |
| `11_Slide_Chuva.gs` | Chuva do mês — o anel da apresentação mensal (acionador próprio) |
| `Visual.gs` | Marcas, medição de texto, cartões, foto da capa |

`teste_bases.js` **não vai para o editor** — é um teste de Node, roda com
`node gestao-tvs/teste_bases.js`. O mesmo vale para
`teste_metas_igual_megas.js`, `teste_solicitacoes.js` e `teste_rebrand.js`.

### Ordem dos slides de cada TV

| Posição | Slide |
|---|---|
| 1 | Capa |
| 2–5 | Visão Geral Corretiva · Backlog Corretivo · Visão Geral Preventiva · Backlog Preventivo |
| 6 | Previsão do Tempo |
| 7… | Metas, um por papel em `unit.metas` (Curitiba e Itajaí: Supervisor e Analista; Esteio: Supervisor) |
| depois | Monitoramento de Cheias — só Esteio |
| depois | Kanban de Solicitações |
| depois | Contratos no Webdox |
| último | Chuva do mês |

**Slide novo entra sempre no fim do deck.** Tempo, Metas e Cheias são achados
pela posição; um slide no meio empurraria todos eles e o conteúdo de um iria
parar no outro. A ordem em que a TV **mostra** é outra: é a do
`Painel_<Unidade>.txt`, e lá a Chuva do mês vem logo depois da Previsão do
tempo (`gerarArquivosPainelTV` reordena).

### Capa com a foto do Mega (desde 19/10/2026)

Como a capa do Orçamento 2027: a foto real do Mega numa faixa em cima, com a
cor escura da marca sumindo da esquerda para a direita, os logos em chips
brancos e, embaixo, o nome do Mega, a sincronização e a trilha do que a TV
mostra. A foto é a **mesma** da capa da apresentação mensal e do Orçamento
(`UNITS[].fotoCapaId`; `fotoFoco` = onde fica o ponto de interesse, em fração
da largura). Vai a miniatura de 1600 px do Drive, não o original de vários MB.
Sem acesso à foto, a faixa sai lisa na cor da marca.

### Chuva do mês (`11_Slide_Chuva.gs`, desde 19/10/2026)

O anel do slide "Mapa de chuvas" da apresentação mensal, para o mês
**corrente**: um ponto por dia × turno (manhã 6–12h, tarde 12–18h, noite
18–6h) na cor da maior intensidade da hora, ✕ vermelho onde abriu chamado
ligado à chuva (descrição com chuva, infiltração, goteira, alagamento… — a
mesma lista do mensal), turnos que ainda não chegaram vazados. Ao lado:
chuva no mês × média de 10 anos **no mesmo período** (dia 1 até hoje), dias
com ≥ 1 mm, pico de intensidade e a lista dos chamados, em aberto primeiro.

- **Fonte:** Open-Meteo. Anel, total e pico saem da API de previsão com
  `past_days` (hora a hora até agora — o arquivo ERA5 do slide mensal chega
  com ~5 dias de atraso); só a média de 10 anos vem do arquivo histórico.
  Chamados: BD-CORRETIVAS (número em "Id chamado").
- **Atualização:** `ATUALIZAR_CHUVA_MES()` (e as por unidade), num acionador
  próprio — `CRIAR_GATILHO_CHUVA()` cria um a cada 3 horas. O
  `gerarApresentacao()` só preenche quando o slide está vazio (o anel tem
  ~150 formas; redesenhar as três TVs ali encostaria no limite de 6 min).
- **Open-Meteo fora:** o slide atual fica na TV.

### Kanban de Solicitações (`09_Slide_Solicitacoes.gs`, desde 19/10/2026)

As solicitações de **Facilities** em andamento no Portal de Solicitações (app
Lovable, repo `AugustCapitalrealty/megas-adc1ba20`), por com quem estão
paradas: **Com o solicitante** (correção/informação) · **Com o backoffice**
(análise, lançamento, aprovação) · **Emitidas** (OC emitida, falta liberar)
· **Liberadas** (com o fornecedor até a NF).

- **Fonte:** função `kanban-megas` do portal (`PORTAL_KANBAN_URL` em
  `Config.gs`; o Mega em `UNITS[].portalEmpreendimento`). O portal decide a
  coluna com a regra das telas dele; o slide só desenha.
- **Chave:** nas Propriedades do script como `PORTAL_API_KEY` (a mesma do
  secret `RELATORIOS_API_KEY` no portal). Nunca no código nem no git.
- Cada card: protocolo, selo de dias na etapa (verde/laranja/vermelho pela
  régua do portal: 5 dias em análise, 3 no lançamento; sem prazo, até 3 ok e
  até 5 atenção), descrição, quem age ou o fornecedor, valor. `EMERG.` =
  emergencial; `Contrato ·` = precisa de instrumento jurídico além da OC.
  O fornecedor tem linha própria em todas as colunas, junto com o valor
  ("Fornecedor a definir" quando ainda não há).
  Cabem 4 por coluna — as mais paradas; o pé diz quantas mais recentes
  ficaram de fora.
- **Portal fora do ar:** o slide atual fica na TV (mesma regra das Metas). Só
  na primeira vez, com o slide vazio, aparece o aviso do motivo.
- Redesenhado em todo `gerarApresentacao()`; `ATUALIZAR_SOLICITACOES()` serve
  para um acionador próprio, mais frequente.

### Contratos no Webdox (`10_Slide_Webdox.gs`, desde 19/10/2026)

Faixa de KPIs (em andamento · aguardando os Megas · atrasados no passo ·
tempo médio em aberto) e os contratos por área com o passo atual nas mãos:
**Jurídico · Facilities · Backoffice · Outra parte**. Fonte: função
`webdox-megas` do portal (`PORTAL_WEBDOX_URL`), mesma chave do kanban; o
portal decide a área com a regra dele (`src/lib/webdox-areas.ts`).

**O Webdox não é ao vivo**: o portal importa uma planilha exportada dele. O
canto do cabeçalho diz de quando é a importação. `ATUALIZAR_WEBDOX()` (e as
por unidade) redesenha só este slide; `diagnosticarSolicitacoes()` confere
os dois.

### Visual (rebrand de 19/10/2026)

O padrão é o do Orçamento 2027 (`orcamento-2027/IDEIAS-DESIGN.md`), sem as
imagens em Python. Tudo em `Visual.gs`: as duas marcas (`TV_MARCAS` —
**Curitiba é Demercado**, `UNITS[].marca`), cartão de KPI, painel, rodapé e a
medição de texto com a largura real de cada letra (tabela gerada por
`ferramentas/medir_fontes.html`). O cabeçalho novo
(`applyBrandHeaderAndBackground`) vale para todos os slides, e todos estão no
visual novo: faixa de KPIs com o principal no cartão cheio, painéis brancos,
rodapé com a fonte do dado. **Metas é a exceção de propósito**: só o cabeçalho e
as cores da marca mudaram; colunas, fontes e tamanhos seguem iguais aos da
apresentação mensal (`teste_metas_igual_megas.js`).

Prévia sem abrir o Slides:
`KANBAN=<json> WEBDOX=<json> PREVIA=<pasta> node gestao-tvs/teste_rebrand.js` e
`node ferramentas/previa_slides.js <pasta>/formas_tv.json <pasta>` (PNG com as
fontes reais, pelo Chrome). Os JSON reais têm nome de gente: fora do repositório.

### Links das TVs (arquivo da TI)

Cada TV roda um painel que abre os slides **um a um pelo ID**
(`…/present?slide=id.<ID>`), configurado num `Painel_<Unidade>.txt` que vai
para a TI. **Slide que não está no arquivo não aparece na TV** — em 19/10/2026
faltavam as Metas do Analista (Itajaí) e as Cheias (Esteio).

Depois de mudar a quantidade de slides: rode `gerarApresentacao()` (para o
slide novo existir e ter ID), depois `gerarArquivosPainelTV()`. Ele grava os
três arquivos na raiz do Drive, substituindo os anteriores, e lista no
Logger cada slide com o nome. Capa 20 s, demais 30 s, como os arquivos
antigos; páginas que não são slide (a planilha publicada do Esteio) ficam em
`UNITS[].painelExtras` e entram no fim.

### O slide de Metas é cópia do da Apresentação Mensal

O desenho da tabela de Metas (`renderSlideMetas`) é o mesmo de
`megas-mensal/13_Slide_Metas.gs`: mesmas colunas, fontes, cores, a linha
composta do Supervisor (Custo M² + % das manutenções planejadas) em duas
sublinhas e o selo ▲/▼ com uma cor por parte. A única diferença é o
cabeçalho: o da TV é mais alto, então a tabela começa em y=84 (na mensal,
y=66) e as linhas ficam um pouco mais baixas.

Mexeu no Metas de um? Leve para o outro e rode
`node gestao-tvs/teste_metas_igual_megas.js`: ele desenha a mesma tabela com
os dois códigos e reprova se qualquer forma divergir (texto, fonte, tamanho,
cor, x, largura).

## Se o editor não tiver exatamente esses arquivos

**Arquivo a mais quebra tudo.** Apps Script compila o projeto num namespace
global único, então uma versão antiga esquecida no editor derruba o projeto
inteiro com um erro que não diz de onde vem:

```
SyntaxError: Identifier 'BD_CORRETIVAS_ID' has already been declared
```

Isso é sempre a mesma coisa: **dois arquivos declarando o mesmo nome**. Como
o erro é de sintaxe, ele acontece antes de qualquer código rodar — nenhuma
verificação interna consegue pegá-lo. Confira a lista acima e apague o que
sobrar.

Nomes que já existiram e **não** devem estar no editor:
`08_Dados_MetasAuto.gs`, `09_Dados_BasesBrutas.gs`, `09_Metas_Auto.gs`,
`10_Dados_BasesBrutas.gs` (os dois últimos viraram `Dados.gs`).

**Arquivo a menos** é pego: `gerarApresentacao()` chama `_tvConferirProjeto_()`
na primeira linha, que confere a assinatura das funções que mudaram e nomeia
o arquivo a recopiar.

## De onde vêm os números

Os quatro slides operacionais contam da planilha **BASE DE DADOS — QUADRO
REM** (abas `BD-CORRETIVAS` e `BD-PREVENTIVAS`), uma linha por registro — a
mesma fonte da apresentação mensal dos Megas e da de Propriedades. A planilha
da TV (`ID_PLANILHA`) ficou só com a aba `METAS` e com a data de
sincronização do cabeçalho.

`diagnosticarBasesBrutas()` mostra o cabeçalho real das bases, quantas linhas
cada Mega tem e que valores as colunas de Estado e SLA trazem de verdade.
Rode antes de discutir número.

## O que ainda é digitado à mão

- **Metas** (aba `METAS` da planilha da TV) — exceto os indicadores que o
  `Dados.gs` sobrescreve com valor calculado.
- **Índice de Disponibilidade** — lido da aba `CHAMADOS` da planilha da
  cidade, onde é digitado.
- **`cheiasCotas`** em `Config.gs` — só a cota de Campo Bom (7,20 m) veio da
  planilha; as de São Leopoldo e Porto Alegre são referência da Defesa Civil
  e precisam de confirmação.

## Os dois slides de corretivas mostram o MESMO backlog

O slide 1 (**Visão Geral Corretiva**) e o slide 2 (**Backlog Corretivo**) são
duas fatias da mesma fila: o 1 recorta por equipe (Facilities x Property), o
2 por prioridade e disciplina. **Os totais têm que bater** — e batem por
construção, porque os dois usam `_tvAbertoEm_` em vez de duas definições
paralelas de "aberto". `teste_bases.js` trava isso.

Já quebrou: o slide 1 chegou a ser implementado como FLUXO (chamados criados
na semana) e mostrava `2` enquanto a fila real era outra ordem de grandeza.
Num painel de parede o número grande é a fila que existe agora, não quantos
entraram ontem.

## Decisões que valem revisar

- **`TV_PREV_ESTADOS_FILA`** (`Dados.gs`) — quais Estados contam como fila no
  Backlog Preventivo: `atrasada`, `em aberto`, `em curso`. É a lista que o
  código original usava; trocá-la por "tudo que não está fechado" fez a TV
  mostrar 197 rotinas em aberto, porque a base tem estados que não são fila
  (canceladas, planejadas, sem estado...). O `Logger` lista a cada execução os
  estados que ficaram de fora, com a contagem — se algum for fila de verdade,
  acrescente ali **com essa evidência na mão**.
- **`TV_BACKLOG_PREV_MESES = 12`** (`Dados.gs`) — rotina preventiva agendada
  há mais de 12 meses e nunca fechada fica FORA do backlog. Sem esse corte a
  TV mostrava 595 itens em aberto, com um de 1337 dias (2022): resíduo de
  base, não trabalho pendente. O `Logger` diz quantas ficaram de fora a cada
  execução. Se o time preferir outra janela, muda só esse número.
- **`TV_BACKLOG_DIAS_COMPARACAO = 7`** — o passo do gráfico de evolução E o
  período da seta
  ▲/▼ dos backlogs. O gráfico da Visão Geral Corretiva são 5 fotos espaçadas
  desse tanto, terminando HOJE — então a última barra É o cartão grande e a
  penúltima É o comparativo da seta. O backlog de cada foto é CALCULADO na
  base (item aberto até lá e ainda não fechado), não um retrato guardado
  entre execuções.

## Como a equipe é decidida

Depende da base, porque as duas trazem informação diferente:

- **Corretivas** — coluna `Responsáveis` (lista de nomes). O mapa
  nome → equipe está em `Dados.gs` (`_RESPONSAVEL_EQUIPE_`); Property
  prevalece quando há gente das duas no mesmo chamado. Nome desconhecido cai
  em Facilities, mesma regra da apresentação mensal.
- **Preventivas** — pelo **nome da rotina**: se tem "propriedades", é de
  Propriedades; o resto é Facilities. A `BD-PREVENTIVAS` não tem coluna de
  Responsáveis nem de Equipe, e numa rotina ainda aberta o "Fechado por" está
  vazio por definição — o nome é a única informação disponível. A palavra é
  procurada na descrição BRUTA, porque costuma estar no prefixo do checklist
  (`CHECKLIST - PROPRIEDADES | ...`) que a limpeza remove antes da tela.
