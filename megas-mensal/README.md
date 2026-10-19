# Apresentação Mensal — Megas 2026

Automação em **Google Apps Script** que gera a apresentação mensal de resultados
operacionais dos empreendimentos **Mega Curitiba**, **Mega Itajaí** e **Mega Esteio**
(August Capital Realty). Os dados são lidos das planilhas Google de cada cidade e os
slides são gerados diretamente na apresentação Google Slides correspondente.

> **Publicação: esta pasta sobe com `clasp push`** (projeto
> [`1Mj5tx6a…`](https://script.google.com/home/projects/1Mj5tx6av7GyERqjn8JixbSUeqOCHIJj-XNHFib1yp0VMERQ3nUz5j4NW/edit)).
> Não edite no editor do Apps Script: o próximo push apaga. Se editar, `clasp pull`
> antes. Desde 06/10/2026 os arquivos seguem o padrão da `propriedades-mensal`
> (`00`–`05` infraestrutura, `10`–`25` slides na ordem do deck); as tabelas de
> "Estrutura do projeto" abaixo ainda citam os nomes antigos (`SlideNN_*`).

## Como usar

No editor do Apps Script, rode uma das funções de `00_Main.gs`:

| Função | O que faz |
|---|---|
| `gerarCuritiba()` / `gerarItajai()` / `gerarEsteio()` | Gera a apresentação de uma cidade (acrescenta slides) |
| `regerarCuritiba()` / `regerarItajai()` / `regerarEsteio()` | Limpa os slides (mantém a capa) e gera de novo |
| `gerarTodas()` / `regerarTodas()` | O mesmo, para as três cidades de uma vez |
| `gerarSoEnergiaSolar()` | Gera apenas o slide de Energia Solar (Curitiba) |
| `marcarFinalCuritiba()` / `...Itajai()` / `...Esteio()` | Salva uma cópia "VERSÃO FINAL" da apresentação (em `Suporte_Historico.gs`) |

Os IDs das planilhas e apresentações de cada cidade ficam em `01_Config.gs` (`PROJETOS`).

## Estrutura do projeto

Os arquivos são organizados em três seções. A numeração dos arquivos `SlideNN_*`
segue a **ordem real de geração** definida em `00_Main.gs`.

### Núcleo (`00`–`02`)

| Arquivo | Responsabilidade |
|---|---|
| `00_Main.gs` | Orquestrador — pontos de entrada e ordem dos slides |
| `01_Config.gs` | Projetos por cidade (IDs), paleta de cores, header padrão dos slides |
| `02_Dados.gs` | Camada de dados — leitura das abas da planilha da cidade ativa |

### Slides (ordem da apresentação)

A ordem completa do deck (com capas de seção e slides de fotos intercalados)
está no array `passos` do `00_Main.gs`. Arquivos:

| Arquivo | Conteúdo | Fonte de dados (aba) |
|---|---|---|
| `Slide00_Capa.gs` | Capa de abertura (mês de referência automático) | — |
| `Slide00_Destaques.gs` | Destaques do Período — 4 painéis editáveis | texto do apresentador |
| `Slide01_Dashboard.gs` | Dashboard geral | `DADOS` |
| `Slide02_Preventivas.gs` | Manutenções preventivas | `PREVENTIVAS` |
| `Slide03_Corretivas.gs` | Manutenções corretivas | `CORRETIVAS` |
| `Slide04_AcessoSeguranca.gs` | Acesso e segurança | `TEMPO/SEGURANÇA` |
| `Slide05_FinanceiroMensal.gs` | Resultado operacional mensal | `FINANCEIRO` |
| `Slide06_FinanceiroBridge.gs` | Bridge de variação (tabela + gráfico) | `FINANCEIRO BRIDGE` |
| `Slide08_FinanceiroAnual.gs` | Resultado operacional anual acumulado | `FINANCEIRO ANUAL` |
| `Slide09_CustoM2.gs` | Custo do m² | `CUSTO M2` |
| `Slide10_EnergiaSolar.gs` | Energia solar (só Curitiba) | `ENERGIA SOLAR` (planilha própria) |
| `17_Slide_Solicitacoes.gs` | Kanban de Solicitações em andamento (os três Megas) — ver abaixo | API `kanban-megas` do Portal de Solicitações |
| `24_Slide_MapaChuvas.gs` | Mapa de Chuvas (os três Megas) — ver abaixo | Open-Meteo + BD-CORRETIVAS |
| `Slide11_Documentos.gs` | Documentação legal dos inquilinos (paginado) | `DOCUMENTOS INQUILINOS` |
| `Slide12_Encerramento.gs` | Capa final / contatos por cidade | `contatos` em `01_Config.gs` |
| `Slide_CapaSecao.gs` | Componente: capa de seção (chamado 6× pelo Main) | — |
| `Slide_RegistroFotos.gs` | Componente: fotos + descrição do serviço (chamado 3×) | fotos do apresentador |

### Suporte

| Arquivo | Responsabilidade |
|---|---|
| `Suporte_RegistroDados.gs` | Grava os indicadores de cada geração na aba `HISTORICO` (histórico consultável) |
| `Suporte_Historico.gs` | Versionamento visual no Drive + cópias "VERSÃO FINAL" sob demanda |
| `Suporte_SetupPlanilha.gs` | Setup inicial (uso único): duplica abas-modelo por cidade |

### Mapa de Chuvas (`24_Slide_MapaChuvas.gs`, desde 16/10/2026)

Um slide por Mega, depois do Monitoramento Pluviométrico: KPIs do mês, anel
dia × turno (manhã 6–12h, tarde 12–18h, noite 18–6h) na cor da maior
intensidade horária, previsão de 14 dias e os 12 últimos meses contra a média
dos 10 anos anteriores.

- **Fonte:** Open-Meteo, sem chave (arquivo histórico ERA5 + previsão). O
  ponto de cada Mega é `coordenadas` em `PROJETOS`. **O Mega Curitiba fica
  em Campina Grande do Sul**, e é lá que ele consulta.
- **✕ no anel:** chamado da BD-CORRETIVAS do mês cuja descrição tem
  chuva/infiltração/goteira/alagamento/calha… (`CHUVA_TERMOS_IMPACTO`).
- **Esteio:** o slide não usa o pluviômetro de campo (que não tem hora nem
  turno), mas registra no Logger a diferença entre os dois.
- Usa `UrlFetchApp`: na primeira execução depois do push o Apps Script pede
  autorização nova.
- Logo depois vem **Chamados Ligados à Chuva**: a lista por trás dos ✕ (quando, chuva no turno, nº, descrição, termo que pôs na lista, local/cliente, prioridade, situação), 9 por slide. Sem chamado no mês, não gera slide.
- Slides avulsos: `gerarSoMapaChuvasCuritiba()` / `...Itajai()` / `...Esteio()` e `gerarSoChamadosChuvaCuritiba()` / `...Itajai()` / `...Esteio()`.
- Teste: `node megas-mensal/teste_mapa_chuvas.js`. Com `PREVIA=<pasta>` ele grava uma prévia em SVG
  do slide.

### Kanban de Solicitações (`17_Slide_Solicitacoes.gs`, desde 19/10/2026)

Um slide por Mega, logo depois do Backlog Facilities: as solicitações de
**Facilities** em andamento no Portal de Solicitações (app Lovable, repo
`AugustCapitalrealty/megas-adc1ba20`), separadas por com quem estão paradas:
**Com o solicitante** (correção/informação) · **Com o backoffice** (análise,
lançamento, aprovação) · **Emitidas** (OC emitida, falta liberar) ·
**Liberadas** (com o fornecedor até a NF).

- **Fonte:** função `kanban-megas` do portal
  (`PORTAL_KANBAN_URL` em `01_Config.gs`), que já devolve os cards separados
  por coluna com a regra das telas do portal. O slide não reclassifica nada.
  Propriedades também abre solicitação para os Megas e **não** entra.
- **Chave:** nas Propriedades do script como `PORTAL_API_KEY` (a mesma do
  secret `RELATORIOS_API_KEY` no portal). Nunca no código nem no git. Depois
  de reiniciar o computador nada muda: a propriedade fica no Apps Script.
- É uma **foto do momento** da geração (o subtítulo diz a posição), não um
  recorte do mês.
- Cada card: protocolo, selo de dias na etapa atual (verde/laranja/vermelho
  pela mesma régua do portal — com prazo de 5 dias em análise e 3 no
  lançamento; sem prazo, até 3 dias ok e até 5 atenção), descrição, quem age
  ou o fornecedor, valor. `EMERG.` = emergencial; `Contrato ·` = precisa de
  instrumento jurídico além da OC.
- Cabem 6 cards por coluna; as mais paradas aparecem e o pé diz quantas mais
  recentes ficaram de fora.
- Falhou a leitura (sem chave, chave recusada, função fora do ar)? O slide sai
  com o aviso do motivo, não vazio. `diagnosticarSolicitacoes()` mostra o
  detalhe dos três Megas sem gerar slide.
- Slides avulsos: `gerarSoSolicitacoesCuritiba()` / `...Itajai()` / `...Esteio()`.
- Teste: `node megas-mensal/teste_solicitacoes.js`. Com `PREVIA=<pasta>` grava
  uma prévia SVG; com `REAL=<arquivo.json>` a prévia usa uma resposta de
  verdade da API — salve esse JSON **fora do repositório** (tem nome de gente).

## Design system

O visual segue o **design system Capital Realty** portado do Boletim Propriedades &
Facilities (repo `Boletim-2026`). A fonte única de verdade é o objeto
`CR_DESIGN_SYSTEM` em `01_Config.gs`:

- **Cores:** azuis institucionais (`brandDark #151E49`, `brandMed #003D7B`,
  `brandLight #065CA9`), fundo claro `#F8FAFC`, cards brancos com borda `#E2E8F0`
  e acentos semânticos (verde/laranja/vermelho) para status.
- **Tipografia:** Montserrat para títulos, Open Sans para corpo.
- **Cabeçalho padrão (`criarHeaderPadrao`):** estilo "aberto" — título escuro sobre
  fundo claro com barra de destaque, subtítulo, logo Capital Realty à direita,
  linha separadora com segmento de accent e elipse decorativa suave ao fundo.
- O objeto legado `CORES` foi mantido por compatibilidade: as chaves antigas agora
  derivam dos tokens do `CR_DESIGN_SYSTEM`, então todos os slides herdam o tema
  automaticamente.

## Convenções

- Cada arquivo `SlideNN_*.gs` expõe uma função `gerarSlideXxx()` chamada pelo
  orquestrador; helpers internos usam prefixo `_` ou sufixo `_`.
- Os dados dos slides 01–05 ficam centralizados em `02_Dados.gs`; slides mais novos
  (Bridge, Financeiro Anual) carregam seus próprios `obterDados...` no mesmo arquivo.
- As abas das planilhas são localizadas **por nome** (nunca por GID), pois cada cidade
  usa uma cópia da planilha-modelo.
- A numeração antiga dos arquivos (Slide04, Slide26, Slide14…) era herança do deck
  original e foi substituída pela ordem real de geração em julho/2026.
