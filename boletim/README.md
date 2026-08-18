# Boletim 2026

Projeto Apps Script que gera os três boletins (Propriedades & Facilities,
MEGAS Centros Logísticos, Hangar VIP) na mesma apresentação.

## O que rodar

O menu "Selecionar função" do editor só lista função **sem parâmetro** e
esconde as que começam ou terminam com `_` — por isso cada recorte tem a sua
própria entrada.

### Boletim inteiro

| Função | O que faz |
|---|---|
| `gerarTodasApresentacoes()` | Os três boletins em sequência, no mesmo arquivo |
| `gerarApresentacaoCompleta()` | Só o boletim Propriedades & Facilities (17 slides) |
| `gerarApresentacaoFacilities()` | Só o boletim MEGAS (16 slides, tema MEGA) |
| `gerarApresentacaoHangar()` | Só o boletim Hangar VIP (8 slides, tema HANGAR) |

### Um slide só

Para conferir um ajuste sem reprocessar o boletim inteiro. Limpam a
apresentação, aplicam o tema do escopo e restauram o da Capital no fim.

| Slide | Geral | Só Facilities | Só Hangar |
|---|---|---|---|
| Overview Executivo | `verOverview()` | `verOverviewFacilities()` | — |
| Estratificação | `verEstratificacao()` | `verEstratificacaoFacilities()` | — |
| Manutenção Corretiva | `verManutencaoCorretiva()` | `verManutencaoCorretivaFacilities()` | `verManutencaoCorretivaHangar()` |
| Manutenção Preventiva | `verManutencaoPreventiva()` | `verManutencaoPreventivaFacilities()` | `verManutencaoPreventivaHangar()` |
| Corretivas / Empreend. | `verCorretivasEmpreendimento()` | `verCorretivasEmpreendimentoFacilities()` | `verCorretivasEmpreendimentoHangar()` |
| Preventivas / Empreend. | `verPreventivasEmpreendimento()` | `verPreventivasEmpreendimentoFacilities()` | `verPreventivasEmpreendimentoHangar()` |
| Controle de Acesso | `verControleAcesso()` | — | — |
| Sustentabilidade | `verSustentabilidade()` | — | — |

Traço = aquele boletim não tem esse slide. Pedir um que não existe não falha
em silêncio: `_bolVerSlide_` lista os slides que o escopo tem de verdade.

### Diagnóstico

`diagnosticarBoletim()` mostra o dado bruto da BD-CORRETIVAS — cabeçalho
real, quantas linhas casam com o filtro, que valores a coluna de Estado
traz. **Rode antes de discutir número.**

## Arquivos do projeto

Esta é a lista **completa** do que deve existir no editor do Apps Script.
Não há `clasp`: o código é copiado à mão (ver o CLAUDE.md da raiz).

| Arquivo | Papel |
|---|---|
| `Config.gs` | IDs das planilhas, design system e os temas MEGA/HANGAR |
| `Dados.gs` | **Tudo que lê base bruta.** BD-CORRETIVAS: backlog, quadro do slide 05, composição |
| `00_Main.gs` | `BOLETINS` (a sequência de slides de cada escopo) e o motor que a executa |
| `00_capa.gs` | Slide 01 — capa |
| `Capas.gs` | Capas de seção (Manutenções, Controle de Acesso, Sustentabilidade, Final) |
| `03_indice.gs` | Slide 02 — índice |
| `02_overview.gs` | Slide 03 — overview executivo |
| `03_manutencoes.gs` | Slide 04 — estratificação |
| `04_quadro_manutencao.gs` | Slide 05 — manutenção corretiva (geral e Facilities) |
| `05_quadro_manutencao_hangar.gs` | Slide 05 — variante Hangar |
| `06_preventivas.gs` | Slide 06 — manutenção preventiva (geral) |
| `06_preventivas_facilities.gs` | Slide 06 — variante Facilities |
| `06_preventivas_hangar.gs` | Slide 06 — variante Hangar |
| `07_corretivas_empreendimento.gs` | Slide 07 — corretivas por empreendimento |
| `08_preventivas_empreendimento.gs` | Slide 08 — preventivas por empreendimento |
| `09_controle_acesso.gs` | Slide 09 — controle de acesso |
| `10_graficos_acesso.gs` | Slides 10A e 10B — gráficos de acesso |
| `11_sustentabilidade.gs` | Slide 11 — sustentabilidade |
| `12_capa_final.gs` | Encerramento |
| `99_checklist.gs` | Checklist final |

`teste_dados.js` **não vai para o editor** — é um teste de Node, roda com
`node boletim/teste_dados.js`.

## Se o editor não tiver exatamente esses arquivos

**Arquivo a mais quebra tudo.** Apps Script compila o projeto num namespace
global único, então uma versão antiga esquecida no editor derruba o projeto
inteiro com um erro que não diz de onde vem:

```
SyntaxError: Identifier 'CR_DESIGN_SYSTEM' has already been declared
```

Isso é sempre a mesma coisa: **dois arquivos declarando o mesmo nome**. Como
o erro é de sintaxe, ele acontece antes de qualquer código rodar — nenhuma
verificação interna consegue pegá-lo. Confira a lista acima e apague o que
sobrar.

Nomes que já existiram e **não** devem estar no editor:

| Apague | Virou |
|---|---|
| `config.gs`, `config_mega.gs`, `config_hangar.gs` | `Config.gs` |
| `99_main.gs`, `99_main_facilities.gs`, `99_main_hangar.gs`, `99_main_todas.gs` | `00_Main.gs` |

## Por que os mains viraram um só

Os quatro `99_main*` repetiam a mesma estrutura (limpa → aplica tema →
desenha slide por slide → restaura tema) e divergiam só na **lista** de
slides e no tema. Em `00_Main.gs` a lista virou dado (`BOLETINS`) e o motor
virou um só. Além de tirar três arquivos, isso consertou três coisas:

- **um slide que falhava derrubava o boletim inteiro**, porque o `try/catch`
  era um só em volta de tudo. Agora cada passo é isolado — boletim com um
  slide faltando é melhor que boletim que não saiu;
- **o log dizia "gerado com sucesso"** mesmo depois de estourar no meio.
  Agora o relatório diz quantos de quantos saíram e nomeia os que falharam;
- **o tema volta no `finally`**, então erro no meio do Hangar não deixa o
  próximo boletim saindo com a paleta errada.

As antigas `testarSlide05_Hangar`, `testarSlide06_Preventivas_Facilities`,
`testarSlide06_Preventivas_Hangar`, `testarSlide07_Corretivas` e
`testarSlide08_Preventivas` saíram: os atalhos `ver*` fazem a mesma coisa e
passam pelo motor, que aplica o tema. As `testar*` desenhavam **sem tema** —
a prévia do Hangar saía com a cor da Capital e não parecia erro.

## De onde vêm os números

O slide 05 (Manutenção Corretiva) conta da planilha **BASE DE DADOS —
QUADRO REM**, aba `BD-CORRETIVAS`, uma linha por chamado — a mesma fonte da
apresentação mensal dos Megas, da de Propriedades e das TVs. A aba do
boletim continua servindo de **reserva**: se a base não responder, o slide
cai nela e o `Logger` registra a divergência (lição 3 do CLAUDE.md).

Os demais slides ainda saem das abas com o número já somado à mão. Migrá-los
é o resto do plano.

## O que a base não sustenta

- **Corretivas × Melhorias × Projetos** — a `BD-CORRETIVAS` não tem coluna
  que separe os três. `Tipo de reporte` é OPERATOR/CONTACT (quem abriu) e
  `Tipo` é área + sintoma. Por isso o painel de composição do slide 05 passou
  a ser **por disciplina** (coluna `Área`), que a base sustenta, em vez de
  por tipo, que ela não sustenta. Se a divisão por tipo for necessária,
  alguém precisa classificar na origem.
- **Índice de Disponibilidade** e **MTBF** — continuam digitados à mão.
