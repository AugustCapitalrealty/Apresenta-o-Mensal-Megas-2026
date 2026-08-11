# Boletim de Controle de Acessos

Projeto Apps Script que gera o boletim de controle de acessos dos Megas.

Veio de `AugustCapitalrealty/Controle-de-Acessos-Megas`, da branch
`claude/sweet-ptolemy-qjjewd` — o `main` daquele repositório estava vazio (só
um `.gitkeep`), todo o código vivia na branch. Os arquivos estavam sob
`apps-script/`; aqui ficam na raiz da pasta, como nos outros três projetos.

`README-original.md` guarda o README que veio junto.

## Arquivos

| Arquivo | Papel |
|---|---|
| `Main.gs` | Pontos de entrada |
| `Config.gs` | Configuração e design system |
| `Helpers.gs` | Utilitários |
| `SpreadsheetReader.gs` | Leitura da planilha |
| `SpreadsheetSetup.gs` | Preparo da planilha |
| `MockData.gs` | Dados de teste |
| `SlideBuilders.gs`, `ChartBuilders.gs` | Componentes de slide e gráfico |
| `Slides_Abertura.gs`, `Slides_CenarioGeral.gs`, `Slides_Empreendimento.gs`, `Slides_HorarioPico.gs`, `Slides_EmailBanner.gs` | Os slides |

## Cuidado com nomes

Este projeto compartilha três nomes globais com os outros do repositório:

- `FOTOS_SECAO` e `LOGOS_CLIENTES` — também em `megas-mensal/`
- `gerarApresentacao` — também em `gestao-tvs/`

Não é problema enquanto forem projetos Apps Script separados (e são). Vira
problema na hora de copiar código de uma pasta para outra — confira o nome no
destino antes. Ver o `CLAUDE.md` da raiz.

## Relação com os outros projetos

O tema aparece em mais dois lugares, com código próprio:

- `../boletim/09_controle_acesso.gs` e `../boletim/10_graficos_acesso.gs`
- `../megas-mensal/Slide04_AcessoSeguranca.gs`, que lê a planilha dedicada
  (`ACESSOS_SPREADSHEET_ID` em `../megas-mensal/01_Config.gs`)

Vale conferir se os três leem a mesma planilha e chegam aos mesmos números —
é o tipo de divergência que já apareceu no backlog dos Megas.
