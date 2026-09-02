# Apresentações Capital Realty — repositório único

Seis projetos de Google Apps Script que geram apresentações no Google
Slides. Cada um vive numa pasta e **continua sendo um projeto Apps Script
separado** — a pasta organiza o código no git, não junta os projetos.

| Pasta | Projeto | Arquivos |
|---|---|---|
| `megas-mensal/` | Apresentação Mensal dos Megas (Curitiba, Itajaí, Esteio) | 44 `.gs` |
| `boletim/` | Boletim 2026 | 18 `.gs` |
| `propriedades-mensal/` | Apresentação Mensal de Propriedades | 16 `.gs` |
| `financeiro-mensal/` | Apresentação Mensal — Financeiro | 14 `.gs` |
| `controle-acessos/` | Boletim de Controle de Acessos | 13 `.gs` |
| `gestao-tvs/` | Gestão à Vista — TVs | 11 `.gs` |

Além desses seis, há mais duas pastas na raiz que **não** são projetos Apps
Script mensais e não entram nas regras de namespace abaixo do mesmo jeito:

| Pasta | O que é |
|---|---|
| `tabelas/` | Cinco geradores das apresentações **semanais**, cada um vinculado à sua própria apresentação (`mega-curitiba`, `mega-itajai`, `previsao-tempo`, `propriedades-semanal`, `template`). Tem [`README`](tabelas/README.md) próprio |
| `design/` | Peça de design (texto, script Python, PDF/PNG). Nada a ver com os geradores de slides |

## Este repositório é a fonte única

Alguns destes projetos nasceram em repositórios próprios (o `gestao-tvs`
veio de `AugustCapitalrealty/Gest-o-a-vistas-TV`). **Esses repositórios de
origem não são mais usados.** Toda alteração acontece aqui; não abra PR lá,
não sincronize de volta.

### A `main` do repo de origem quase nunca é o código que roda

Isso já aconteceu **duas vezes**, com projetos diferentes, pelo mesmo motivo:

| Pasta | Importada de | O que estava mesmo rodando |
|---|---|---|
| `gestao-tvs` | `Gest-o-a-vistas-TV`, `main` | uma branch **35 commits à frente** |
| `boletim` | `Boletim-2026`, `main` | `claude/bulletin-design-system-xP63m`, **21 commits à frente** |

No `gestao-tvs`, dois arquivos inteiros (`08_Slide_Cheias.gs`,
`09_Metas_Auto.gs`) nunca tinham sido commitados em lugar nenhum, existindo só
dentro do editor do Apps Script. Trabalhar na cópia velha produziu código que
duplicava função existente, reintroduzia bug já corrigido e configurava
`ppcId` em cidades que não têm PPC.

No `boletim` foi pior, porque o estrago era **invisível**: a aba de KPIs de
acesso tinha sido renomeada de `Cópia de PAINEL INDICADORES` para `BOLETIM`, e
a cópia velha continuava procurando o nome antigo — a tabela do slide 09 vinha
vazia. E a tabela EQUIPE do QUADRO COMPARATIVO tinha ganhado uma linha,
movendo o TOTAL de `C40` para `C41`: ler `C40` mostrava o número dos
locatários no cartão de Backlog Total. Nenhum dos dois dá erro na tela.

**Antes de importar ou de comparar com a origem, liste as branches por data.**
Um `git clone` traz só a `main`, e `--unshallow` não traz as outras:

```sh
git fetch origin '+refs/heads/*:refs/remotes/origin/*'
git for-each-ref --sort=-committerdate \
  --format='%(committerdate:short)  %(refname:short)' refs/remotes/origin
```

Ao trazer código de uma branch para cá, o merge de três vias com a `main` como
base preserva o que já foi feito no monorepo:
`git merge-file -p <nossa> <base-main> <branch>`. **Normalize CRLF antes** — o
`boletim` tem uns arquivos em LF e outros em CRLF, e sem `sed 's/\r$//'` nos
três lados todo merge vira conflito de arquivo inteiro e parece que nada é
reaproveitável.

### As outras duas regras


1. **Antes de mexer numa pasta, confirme que ela reflete o editor.** O
   editor é onde o código roda; o git só o acompanha se alguém colar de
   volta. Um arquivo que existe no editor e não aqui é invisível — e
   decisões tomadas sem ele saem erradas.
2. **Nunca reconstrua um arquivo a partir de texto colado no chat.** Fazer
   isso corrompeu silenciosamente 4 linhas de `09_Metas_Auto.gs`: a classe
   de caracteres escrita como `\u0300-\u036f` (os acentos combinantes, usada
   para tirar acento de texto) virou os caracteres literais que ela
   representa, e espaços não-quebráveis viraram espaços comuns. Nenhum dos
   dois aparece na tela. Pegue o arquivo da fonte, não do chat.

## A regra que não dá para esquecer

**Apps Script compila todos os arquivos de um projeto num único namespace
global.** Não existe `import`, não existe módulo: uma `function` ou `const`
declarada em qualquer arquivo enxerga e colide com as dos outros.

Consequência prática: **as pastas deste repositório não podem ser juntadas
num projeto Apps Script só.** Hoje há 93 nomes repetidos entre elas — os que
mais aparecem:

```
CR_DESIGN_SYSTEM        boletim, financeiro, megas, propriedades, tvs
BD_CORRETIVAS_ID        boletim, megas, propriedades, tvs
_bdChamadoFechado_      boletim, megas, propriedades, tvs
_histNorm_              boletim, megas, propriedades, tvs
_slaClasse_             boletim, megas, propriedades, tvs
gerarSlideCapa          financeiro, megas, propriedades, tvs
HISTORICO_VALIDADO_ID   megas, propriedades, tvs
formatarNumeroBR        megas, propriedades, tvs
gerarSlideCorretivas    megas, propriedades, tvs
gerarSlidePreventivas   megas, propriedades, tvs
obterMesReferencia_     financeiro, megas, propriedades
gerarApresentacao       acessos, tvs
```

Boa parte é **repetição de propósito**: helpers como `_histNorm_`,
`_bdChamadoFechado_` e `_slaClasse_` têm o mesmo nome nas quatro pastas
justamente para que copiar uma função de uma para outra funcione sem
reescrever as chamadas internas. Como são projetos Apps Script separados,
não colidem em execução.

O que importa é a colisão DENTRO de uma pasta. Para conferir antes de
acrescentar um nome:

```sh
grep -hoE "^(function|const|let) [A-Za-z_0-9]+" gestao-tvs/*.gs \
  | awk '{print $2}' | sort | uniq -c | awk '$1>1'
```

Saída vazia = sem colisão. Cuidado com o underscore final, que NÃO é
decoração: `_histNorm` e `_histNorm_` são nomes diferentes e o `grep` acima
não acusa nada. O `gestao-tvs` chegou a ter os dois, em arquivos separados —
a mesma função escrita duas vezes, sem que nada reclamasse. Ao juntar os
arquivos num `Dados.gs` a duplicata apareceu; foi o que motivou juntar.

## Como isso vai pro ar

Não há `clasp` nem `.clasp.json`. O código é copiado à mão para o editor do
Apps Script de cada projeto. **`git push` não publica nada** — se o
comportamento não mudou depois de um commit, a primeira coisa a verificar é
se os arquivos foram copiados para o editor.

## Design system

`CR_DESIGN_SYSTEM` existe em cinco das seis pastas (falta só em
`controle-acessos`), com os mesmos valores de marca (`brandDark #151E49`,
`brandMed #003D7B`, `brandLight #065CA9`, `bgSlide #F8FAFC`). É o mesmo
sistema replicado por cópia — `gestao-tvs` está uma cor atrás (não tem
`brandSoft`). Ao mexer na paleta de um, verifique os outros.

O `boletim` é o caso especial: além da paleta de marca, ele define paletas
próprias por seção (laranja, amarelo, cinza) que também usam as chaves
`brandDark`/`brandMed`/`brandLight`. Um `grep` por essas chaves lá devolve
mais de um valor de propósito — não é divergência.

## Lições que valem para os seis projetos

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

### 5. Função com `_` no fim não aparece no menu do editor

O menu "Selecionar função" do editor do Apps Script **esconde** qualquer
função cujo nome comece ou termine com `_`. Isso casa com a convenção de
sufixo `_` para função interna (ver Convenções), mas morde quando o nome é
de um ponto de entrada: uma ferramenta de diagnóstico chamada
`diagnosticarEstadosPausa_` simplesmente não existe para quem vai rodá-la, e
o sintoma é "salvei o arquivo e a função não aparece" — que parece problema
de sincronização e não é.

Diagnóstico é ponto de entrada: **nomeie sem o sufixo** (`diagnosticarBacklog`,
`diagnosticarBasesBrutas`, `diagnosticarMotivoPausa`).

### 6. Assinatura que muda quebra em outro arquivo

Como o código é colado à mão arquivo por arquivo, é normal o editor ficar com
metade de uma versão e metade de outra. Quando a assinatura de uma função
muda junto, o erro não aponta para lugar nenhum: `00_Main` passa 3
argumentos, o arquivo velho declara 5, `unit` chega `undefined` e o Apps
Script diz só `Cannot read properties of undefined (reading 'rows')`.

`fn.length` devolve quantos parâmetros a função DECLARA, o que permite
detectar o descompasso antes de rodar e nomear o arquivo a recopiar. Ver
`_tvConferirProjeto_` em `gestao-tvs/00_Main.gs`, chamada na primeira linha
de `gerarApresentacao()`, e `diagnosticarBacklogClientes()` em
`propriedades-mensal/Diagnostico_BacklogClientes.gs`, que confere as 28
dependências de um slide só e diz qual arquivo recopiar.

**O sintoma engana: parece falta de dado, é helper faltando.** Quando a
exceção cai no meio do desenho, o que já foi desenhado FICA. Um slide cujo
card pintou com o título e a contagem certos — "PENDÊNCIAS EM ABERTO (56)" —
e está vazio por dentro não tem problema de dado nenhum: a contagem só existe
porque a leitura funcionou. É o desenho que quebrou depois de `criarCardPainel`
e antes da primeira célula, e a causa quase sempre é uma helper de outro
arquivo (`_sTxt`, `LOGO_LARG_PADRAO`) que não foi colada no editor.

Vale envolver o desenho de cada página num `try/catch` que escreve a falha NO
slide — trocar o vazio silencioso por um aviso que ninguém leva para a reunião
sem ver. Ver `_backlogClientesFalha_` em
`propriedades-mensal/Slide_BacklogClientesProperties.gs`. **O aviso não pode
usar as helpers que podem estar faltando** (nada de `_sTxt`): se dependesse
delas, quebraria junto e o slide voltaria a ficar vazio. Só `insertShape` e
`CR_DESIGN_SYSTEM`. De brinde, o `catch` por página impede que a primeira
falha aborte as outras.

## Testes

Não há framework. O padrão é um script Node que lê os `.gs` como texto, dubla
`SpreadsheetApp` / `SlidesApp` / `Logger` e roda asserções. Serve porque as
funções de dados são puras o bastante depois que a planilha vira matriz.

Quatro suítes hoje, 277 asserções ao todo, cada uma rodando com `node <arquivo>`:

| Arquivo | Asserções |
|---|---|
| `boletim/teste_dados.js` | 92 |
| `gestao-tvs/teste_bases.js` | 79 |
| `boletim/teste_slides.js` | 71 |
| `propriedades-mensal/teste_dashboard.js` | 35 |

`gestao-tvs/teste_bases.js` é o exemplo a copiar. O que vale levar dele:

- **Ancore as datas nas janelas que o próprio código calcula**, em vez de
  escrever datas fixas. Assim o teste não quebra amanhã só porque virou a
  semana ou o mês.
- **Limpe o cache entre cenários.** Trocar o dublê sem limpar não tem efeito
  nenhum e o teste falha por motivo errado.
- **Teste o zero falso**: base com linhas mas sem coluna de data legível tem
  que devolver `null`, não 0 (ver lição 3).

Ao dublar `SlidesApp`, vale registrar cada shape inserida e conferir a
geometria depois — foi assim que as quebras de caixa do Farol apareceram sem
precisar abrir a apresentação.

Dois detalhes recorrentes do `eval`:

- Em `eval` indireto, `function` de topo vai para o `globalThis`, mas
  `const`/`let` de topo **não** — ficam presos no escopo do próprio `eval` e
  somem. O jeito prático é trocar as declarações da coluna 0 antes de
  avaliar: `fonte.replace(/^(const|let) /gm, 'var ')`.
- Funções que chamam outras pelo nome precisam das dependências também no
  escopo global.

## Convenções de código

- Comentários e nomes em português, como o resto do código.
- Sufixo `_` em função interna (`_histNorm_`), sem sufixo no ponto de entrada
  que aparece no menu do editor (`gerarCuritiba`).
- Ponto de entrada por cidade sem argumento — o menu do Apps Script só lista
  funções sem parâmetro.
- Comentário explicando **por que**, principalmente quando o código parece
  estranho de propósito (formato contábil, sinal invertido, folga na caixa de
  texto).
