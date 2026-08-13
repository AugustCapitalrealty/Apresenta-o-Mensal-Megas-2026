# Apresentações Capital Realty — repositório único

Projetos de Google Apps Script que geram apresentações no Google Slides.
Cada um vive numa pasta e **continua sendo um projeto Apps Script
separado** — a pasta organiza o código no git, não junta os projetos.

| Pasta | Projeto | Arquivos |
|---|---|---|
| `megas-mensal/` | Apresentação Mensal dos Megas (Curitiba, Itajaí, Esteio) | 43 `.gs` |
| `boletim/` | Boletim 2026 | 24 `.gs` |
| `controle-acessos/` | Boletim de Controle de Acessos | 13 `.gs` |
| `gestao-tvs/` | Gestão à Vista — TVs | 9 `.gs` |
| `propriedades-mensal/` | Apresentação Mensal de Propriedades — **em construção** | 2 `.gs` |
| `tabelas/` | Apresentações semanais — **5 subprojetos**, um por apresentação (ver [`tabelas/README.md`](tabelas/README.md)) | 6 `.gs` |

`tabelas/` é diferente das outras: a pasta em si não é um projeto, é um
agrupamento de cinco (`mega-curitiba/`, `mega-itajai/`, `previsao-tempo/`,
`propriedades-semanal/`, `template/`), cada subpasta o seu próprio projeto
Apps Script — assim já vinha organizado no repositório de origem
(`tabelas-Mega-Itajai`), e a estrutura foi trazida como estava. A regra do
namespace único vale por subpasta, não pela pasta `tabelas/` inteira.

## A regra que não dá para esquecer

**Apps Script compila todos os arquivos de um projeto num único namespace
global.** Não existe `import`, não existe módulo: uma `function` ou `const`
declarada em qualquer arquivo enxerga e colide com as dos outros.

Consequência prática: **as pastas deste repositório não podem ser juntadas
num projeto Apps Script só.** Hoje existem 9 nomes duplicados entre elas:

```
CR_DESIGN_SYSTEM       megas, boletim, tvs, propriedades
FOTOS_SECAO            megas, acessos
LOGOS_CLIENTES         megas, acessos
METAS_COLS             megas, tvs
METAS_COLS_FULL        megas, tvs
gerarApresentacao      tvs, acessos
gerarSlideCapa         megas, tvs
gerarSlideCorretivas   megas, tvs
gerarSlidePreventivas  megas, tvs
```

Compartilhar código entre os projetos é **copiar**, não importar. Ao copiar
uma função de uma pasta para outra, confira antes se o nome já existe no
destino.

## Como isso vai pro ar

Não há `clasp` nem `.clasp.json`. O código é copiado à mão para o editor do
Apps Script de cada projeto. **`git push` não publica nada** — se o
comportamento não mudou depois de um commit, a primeira coisa a verificar é
se os arquivos foram copiados para o editor.

## Design system

`CR_DESIGN_SYSTEM` existe em nove projetos — os quatro de fora de `tabelas/`
mais os cinco subprojetos de `tabelas/` — com os mesmos valores de marca
(`brandDark #151E49`, `brandMed #003D7B`, `brandLight #065CA9`,
`bgSlide #F8FAFC`). É o mesmo sistema replicado por cópia — `gestao-tvs` está
uma cor atrás (não tem `brandSoft`; os cinco de `tabelas/` têm). Ao mexer na
paleta de um, verifique os outros.

## Lições que valem para todos os projetos

### 1. Texto em caixa estreita quebra sozinho

Toda `TEXT_BOX` do Slides tem ~7pt de recuo interno de cada lado que a API
não deixa desligar. Em caixa estreita ele "come" a largura e o Slides quebra
a linha mesmo sobrando espaço visual — `R$ 6,46` vira duas linhas, `MC` vira
`M`/`C`, `✓ Entrevistado` fica cortado.

A skill `.claude/skills/slides-caixa-texto-sem-quebra/` tem a técnica. O
padrão maduro está em `megas-mensal/Farol_Guilherme.gs`: as helpers
`_gUmaLinha_` (mede e encolhe a fonte até caber numa linha) e `_gParagrafo_`
(encolhe até o bloco caber na altura) medem o texto **antes** de desenhar,
então nenhuma caixa estoura quando o conteúdo muda.

Corolário: `setLineSpacing` abaixo de 100 lança `Invalid argument: spacing`.

### 2. Estoque e fluxo têm que sair da mesma fonte

Quando um slide mostra um **estoque** (backlog: quantos estão abertos no fim
do mês) e outro mostra o **fluxo** (quantos entraram e saíram no mês), vale a
identidade:

```
backlog(fim) = backlog(início) + criados − fechados
```

Se as duas grandezas vierem de planilhas diferentes — ainda mais se alguma
for digitada à mão —, elas divergem e a apresentação fica com um mês que não
fecha. Aconteceu: JUL/26 saiu com 29 criados, 29 fechados (variação zero) e o
backlog subindo de 206 para 220.

A correção foi contar as duas na mesma base bruta (BD-CORRETIVAS, uma linha
por chamado). Ver `obterFluxoCorretivasBD_` e `obterDadosBacklogPorMesBD_` em
`megas-mensal/02_Dados.gs`.

### 3. Prefira a base bruta à aba digitada

Sempre que existir uma base com uma linha por registro **e** uma aba com o
número já somado à mão, use a base e trate o valor digitado como reserva.
Registre a divergência no `Logger` em vez de escolher em silêncio — é assim
que o erro de digitação aparece antes da reunião, não durante.

Duas armadilhas ao fazer isso:

- **Zero falso.** Se a leitura não exige a coluna de data, uma coluna
  renomeada passa batido, produz datas nulas e zera o slide sem erro nenhum.
  Havendo linhas mas nenhuma data legível, devolva `null` e caia na reserva.
- **Definições que divergem.** O backlog considerava fechado quem tem
  `Estado == "Fechado"` **e** data de fechamento; a contagem de fluxo olhava
  só a data. Um chamado com data mas outro estado contava como fechado e
  nunca saía do backlog. Centralize a regra numa função só
  (`_bdChamadoFechado_`).

### 4. Conferir é mais barato que descobrir apresentando

`megas-mensal/Slide_CheckConsistencia.gs` gera um slide descartável que
confere se os números repetidos em vários slides batem entre si. O padrão
vale para os outros projetos: todo número que aparece em dois lugares merece
um check.

`diagnosticarBacklog()` (em `megas-mensal/00_Main.gs`) é o modelo de
ferramenta de diagnóstico: antes de qualquer conta, ela verifica se o código
novo está mesmo carregado no projeto, depois mostra o dado bruto (quantas
linhas casam com o filtro, que valores a coluna de estado tem de verdade) e
só então a conciliação. Responde "por que não bate?" em 10 segundos, sem
abrir planilha.

## Testes

Não há framework. O padrão é um script Node no diretório de scratch que lê o
`.gs` como texto, extrai a função com `extractFrom`, dubla `SpreadsheetApp` /
`SlidesApp` / `Logger` e roda asserções. Serve porque as funções de dados são
puras o bastante depois que a planilha vira matriz.

Ao dublar `SlidesApp`, vale registrar cada shape inserida e conferir a
geometria depois — foi assim que as quebras de caixa do Farol apareceram sem
precisar abrir a apresentação.

Um detalhe recorrente: `eval` cria binding local, então funções que chamam
outras por nome precisam das dependências também em `global`.

## Convenções de código

- Comentários e nomes em português, como o resto do código.
- Sufixo `_` em função interna (`_histNorm_`), sem sufixo no ponto de entrada
  que aparece no menu do editor (`gerarCuritiba`).
- Ponto de entrada por cidade sem argumento — o menu do Apps Script só lista
  funções sem parâmetro.
- Comentário explicando **por que**, principalmente quando o código parece
  estranho de propósito (formato contábil, sinal invertido, folga na caixa de
  texto).
