# Programas usados no computador — explicação para a TI

Computador: CAP-NOTE-00939 · Usuário: Guilherme (Business Analysis)
Uso: geração automática das apresentações mensais e do Orçamento 2027 dos
Megas (Curitiba, Itajaí, Esteio) no Google Slides, a partir das planilhas do
Drive compartilhado `08.000 - Business Analysis`.

O computador tem Deep Freeze: tudo que está no C: é apagado a cada reinício,
então estes programas precisam ser reinstalados depois de cada reinício (ou
liberados em definitivo pela TI na imagem da máquina).

| Programa | Versão | Origem | Para que serve | O que faz na máquina |
|---|---|---|---|---|
| **Git** | 2.56.0 | git-scm.com (instalador oficial) | Controle de versão do código das apresentações; guarda o histórico no GitHub (repositório `Apresenta-o-Mensal-Megas-2026`) | Lê/grava arquivos na pasta do projeto no G:; conecta em github.com |
| **Visual Studio Code** | 1.141.0 | code.visualstudio.com | Editor de código onde o projeto é aberto | Editor local; extensões abaixo |
| **Claude Code** (extensão do VS Code, Anthropic) | — | Marketplace do VS Code | Assistente de IA que edita o código, roda os testes e prepara as planilhas de apoio | Roda comandos PowerShell/Python/Node na pasta do projeto; conecta em api.anthropic.com |
| **Python** | 3.12.10 | python.org, via `winget` (instalação só do usuário) | Scripts do projeto (`orcamento-2027/ferramentas/*.py`): ler planilhas Excel (.xlsx), gerar as imagens dos gráficos dos slides, montar planilhas de comparação | Lê/grava .xlsx/.png/.json na pasta do projeto no G: |
| └ biblioteca **openpyxl** | 3.1.5 | pypi.org (`pip install --user`) | Ler e criar arquivos .xlsx a partir do Python | — |
| └ biblioteca **Pillow** | 12.3.0 | pypi.org (`pip install --user`) | Desenhar as imagens PNG dos gráficos dos slides (`ferramentas/graficos_imagem.py`) | Grava PNG na pasta `IMAGENS - SLIDES` do Drive |
| **Node.js** | 24.20.0 LTS | nodejs.org, via `winget` | Rodar o teste automático das apresentações (`node teste/teste_orcamento.js`), que confere números e layout antes de publicar | Só processamento local |
| **clasp** (Google) | — | npm (`@google/clasp`) | Publicar o código no Google Apps Script do projeto do orçamento | Conecta em script.google.com com login Google do usuário (autorizado no navegador) |

## Comportamentos que podem parecer suspeitos (e são normais neste uso)

- Scripts PowerShell, Python e Node executados em sequência pelo Claude Code.
- `winget` / `pip` instalando programas depois de cada reinício (Deep Freeze).
- Leitura dos logs de eventos do Windows em 08/10/2026 (~14:40–15:00), feita
  a pedido do usuário para entender uma queda de rede — só leitura.
- Acesso à API do Google Drive (só leitura de metadados) para conferir se as
  imagens dos gráficos já subiram.

## Pedido à TI

Liberar (ou orientar a forma correta de usar) os programas acima para esse
fluxo de trabalho, de preferência sem precisar reinstalar a cada reinício.
