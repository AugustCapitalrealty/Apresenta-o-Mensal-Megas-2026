# Apresentações Capital Realty — repositório único

Cinco projetos de Google Apps Script que geram apresentações no Google
Slides. Cada um vive numa pasta e **continua sendo um projeto Apps Script
separado** — a pasta organiza o código no git, não junta os projetos.

| Pasta | Projeto | Arquivos |
|---|---|---|
| `megas-mensal/` | Apresentação Mensal dos Megas (Curitiba, Itajaí, Esteio) | 43 `.gs` |
| `boletim/` | Boletim 2026 | 24 `.gs` |
| `controle-acessos/` | Boletim de Controle de Acessos | 13 `.gs` |
| `propriedades-mensal/` | Apresentação Mensal de Propriedades | 13 `.gs` |
| `gestao-tvs/` | Gestão à Vista — TVs | 11 `.gs` |

## Este repositório é a fonte única

Alguns destes projetos nasceram em repositórios próprios (o `gestao-tvs`
veio de `AugustCapitalrealty/Gest-o-a-vistas-TV`). **Esses repositórios de
origem não são mais usados.** Toda alteração acontece aqui; não abra PR lá,
não sincronize de volta.

O motivo é concreto. O `gestao-tvs` foi importado da branch `main` do repo
de origem, mas o código que estava de fato rodando vivia numa branch 35
commits à frente — e dois arquivos inteiros (`08_Slide_Cheias.gs`,
`09_Metas_Auto.gs`) nunca tinham sido commitados em lugar nenhum, existindo
só dentro do editor do Apps Script. Trabalhar em cima da cópia velha
produziu código que duplicava função existente, reintroduzia bug já
corrigido e configurava `ppcId` em cidades que não têm PPC.

Duas regras que saem daí:

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
num projeto Apps Script só.** Hoje há 37 nomes repetidos entre elas — os que
mais aparecem:

```
CR_DESIGN_SYSTEM        boletim, megas, propriedades, tvs
BD_CORRETIVAS_ID        megas, propriedades, tvs
HISTORICO_VALIDADO_ID   megas, propriedades, tvs
_histNorm_              megas, propriedades, tvs
_bdChamadoFechado_      megas, propriedades, tvs
formatarNumeroBR        megas, propriedades, tvs
gerarSlideCapa          megas, propriedades, tvs
gerarSlideCorretivas    megas, propriedades, tvs
gerarSlidePreventivas   megas, propriedades, tvs
gerarApresentacao       acessos, tvs
```

Boa parte é **repetição de propósito**: helpers como `_histNorm_`,
`_bdChamadoFechado_` e `_slaClasse_` têm o mesmo nome nas três pastas
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

`CR_DESIGN_SYSTEM` existe em quatro das cinco pastas, com os mesmos valores de marca
(`brandDark #151E49`, `brandMed #003D7B`, `brandLight #065CA9`,
`bgSlide #F8FAFC`). É o mesmo sistema replicado por cópia — `gestao-tvs` está
uma cor atrás (não tem `brandSoft`). Ao mexer na paleta de um, verifique os
outros.

## Lições que valem para os cinco projetos

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
de `gerarApresentacao()`.

## Testes

Não há framework. O padrão é um script Node que lê os `.gs` como texto, dubla
`SpreadsheetApp` / `SlidesApp` / `Logger` e roda asserções. Serve porque as
funções de dados são puras o bastante depois que a planilha vira matriz.

`gestao-tvs/teste_bases.js` é o exemplo vivo (50 asserções, roda com
`node gestao-tvs/teste_bases.js`). O que vale copiar dele:

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
