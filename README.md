# Apresentação Mensal — Megas 2026

Automação em **Google Apps Script** que gera a apresentação mensal de resultados
operacionais dos empreendimentos **Mega Curitiba**, **Mega Itajaí** e **Mega Esteio**
(August Capital Realty). Os dados são lidos das planilhas Google de cada cidade e os
slides são gerados diretamente na apresentação Google Slides correspondente.

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
