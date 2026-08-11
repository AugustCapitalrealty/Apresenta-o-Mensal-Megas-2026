# Controle de Acessos — Megas (Capital Realty)

Automação do relatório mensal de controle de acessos dos empreendimentos
**Mega Curitiba**, **Mega Itajaí** e **Mega Esteio**, substituindo o processo
manual feito no Canva por uma geração automática no **Google Slides** via
**Google Apps Script**.

## Status do projeto

- [x] **Fase 1 — Template com dados mockados** (esta versão)
- [ ] Fase 2 — Planilha Google Sheets para alimentação manual dos dados
- [ ] Fase 3 — Script lê a planilha e gera o relatório com 1 clique

## Estrutura do relatório gerado (~24 slides)

1. **Capa** — Controle de acesso + mês/ano
2. **Índice**
3. **Resumo executivo** — texto montado automaticamente com os números do mês
4. **Cenário geral** — fluxo de pessoas (13 meses), colaboradores fixos,
   tempo médio, uso de celular, tipo de acesso, perfil de solicitações
5. **Por empreendimento (3x)** — destaques do mês (KPIs), contribuição dos
   clientes para o tempo médio, % de agendamento por cliente, cards por cliente

## Como usar (Fase 1)

1. Acesse [script.google.com](https://script.google.com) e crie um **Novo projeto**
2. Crie um arquivo para cada `.gs` da pasta [`apps-script/`](apps-script/) e cole o conteúdo:
   - `Config.gs` — cores e constantes da identidade Capital Realty
   - `MockData.gs` — dados de exemplo (baseados no relatório de ABRIL/26)
   - `Helpers.gs` — utilitários de texto/formas
   - `ChartBuilders.gs` — gráficos desenhados com formas (estilo Canva)
   - `SlideBuilders.gs` — construtores de cada tipo de slide
   - `Main.gs` — ponto de entrada
3. Selecione a função **`gerarApresentacao`** e clique em **Executar**
4. Autorize o acesso na primeira execução
5. O link da apresentação gerada aparece no **log de execução**
   (menu Ver > Logs) — ela também fica no seu Google Drive

## Identidade visual

- Fundo azul marinho `#062B5B` com detalhes em azul claro `#5BA7E8`
- Fonte **Montserrat**
- Gráficos no estilo do relatório original: colunas mensais, barras
  horizontais de ranking e colunas empilhadas

> **Nota:** o logo da Capital Realty está como texto provisório.
> Na Fase 2 será substituído pela imagem oficial hospedada no Drive.
