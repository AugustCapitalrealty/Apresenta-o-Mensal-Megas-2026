# Meta 2026 — Melhoria do Processo de Reembolsos (Capital Realty)

> Documento de contexto para retomar o projeto em qualquer ferramenta (Claude Code, Cowork, etc).
> **Última atualização: 08/10/2026** — entrevista com o financeiro feita; Fase 1 com todas as
> entrevistas concluídas, faltando só confirmar 6 pontos com a entrevistada e consolidar a ata
> de diagnóstico.
>
> Esta pasta não tem relação com os geradores de slides do resto do repositório. Está aqui porque
> o computador de trabalho tem Deep Freeze: só sobrevive o que vai para o GitHub.

---

## 1. Contexto da meta

- **Empresa:** Capital Realty
- **Objetivo:** Implementar um projeto de melhoria na **solicitação, prestação de contas e controle de reembolsos**, entregando manual e procedimentos revisados.
- **Pontuação:** 20 pontos
- **Prazo:** 30/11/2026
- **Gestor da meta:** Jonatas
- **Critério de sucesso:** diagnosticar o processo atual, identificar as dores, e entregar uma solução que melhore de verdade a experiência tanto de quem viaja quanto do time financeiro.

**Documento base (referência):** *Procedimento Gestão de Viagens* (2022, ~28 páginas), cobrindo:
- 6.1 Compra de passagens aéreas
- 6.2 Reserva de hotel
- 6.3 Locação de veículos
- 6.4 Reembolso de despesas de viagem (via Fluig, adiantamento até R$200)
- 6.6 Reembolso de refeições (regra de jantar + exceções de café da manhã)
- 6.7 Reembolso de KM rodado (R$0,97/km)

⚠️ **O PDF do procedimento ainda não está nesta pasta** e não foi achado no Google Drive
(busca por "Gestão de Viagens", "Procedimento", "Reembolso"). É necessário a partir da Fase 3.

**Nota metodológica importante:** Jonatas é ao mesmo tempo gestor da meta e um dos entrevistados. A resposta dele foi captada como **usuário/viajante**, não como gestor, para preservar a isenção do diagnóstico.

---

## 2. Roadmap — 6 fases

| Fase | Descrição | Status |
|---|---|---|
| **1. Diagnóstico** | Mapear o processo, ouvir colaboradores e financeiro, revisar a política vigente | 🟡 Entrevistas concluídas (4 colaboradores + financeiro em 08/10). Falta confirmar 6 pontos e consolidar a ata de diagnóstico |
| **2. Benchmarking e Soluções** | Pesquisar ferramentas/opções, avaliar custo x benefício, propor solução ao gestor | ⬜ Não iniciada |
| **3. Redesenho do Processo** | Desenhar novo fluxo, regras, prazos e itens elegíveis; validar com financeiro e usuários | ⬜ Não iniciada |
| **4. Manual e Procedimento** | Redigir procedimento revisado + manual do usuário simples e visual | ⬜ Não iniciada |
| **5. Implementação e Treinamento** | Implantar, treinar responsáveis e usuários, operação assistida | ⬜ Não iniciada |
| **6. Fechamento e Evidências** | Consolidar evidências e apresentar formalmente ao gestor até 30/11 | ⬜ Não iniciada |

---

## 3. Estado atual do diagnóstico (Fase 1)

**Entrevistas concluídas (5):** Wilson, Cadu, Jonatas, Ricardo (colaboradores) e a gerente do
financeiro (08/10/2026, ~33 min — ver [`Ata_Entrevista_Financeiro.md`](Ata_Entrevista_Financeiro.md)).

### Perfis dos colaboradores entrevistados

| Nome | Frequência de viagem | Nota de facilidade (1–5) | Acesso ao procedimento |
|---|---|---|---|
| Wilson | Quinzenal | 3 | Nunca teve acesso |
| Cadu | A cada 15 dias | 3 | Já leu, não sabe onde fica |
| Jonatas (gestor da meta) | Semanal | 2 | Já leu, consegue acessar |
| Ricardo | 2x/mês | 2 | Já leu, não sabe onde fica |

### Números do financeiro

| Indicador | Valor |
|---|---|
| Volume | 30–40 solicitações por mês |
| Chegam com erro | ~3 de cada 10 (≈ 10 por mês com retrabalho) |
| Solicitação → pagamento | 10 dias (colaboradores: 3–5 dias **depois de aprovado**) |
| Corte do mês | dia 25 |
| Controle de orçamento por área/colaborador | não existe |

---

## 4. Dores consolidadas (15 dores)

### 🔴 Prioridade ALTA

1. **Não existe lista clara do que é reembolsável** — *4/4 colaboradores + financeiro.*
   Regras "por item" e não "por conceito": chocolate não, sonho sim; "cueca virada" é doce ou não?; água só em certo horário; energético não; torta de manhã sim, à noite não.
   **Financeiro:** item não reembolsável é o 2º erro mais comum. A regra de refeição foi redefinida pelo Thiago e não está no procedimento. Para o financeiro **sonho não pode** — Jonatas entendia que podia. É a prova da dor: a regra que o colaborador conhece não é a que o financeiro aplica.

2. **Consulta informal — de mão dupla** — *4/4 colaboradores + financeiro.*
   Os colaboradores consultam alguém antes de lançar, por insegurança (Ricardo escalou até a diretoria). E a **maior dor do financeiro** é o inverso: ter que perguntar ao colaborador o que está na NF.

3. **Falta de mobilidade — só funciona no computador, com VPN** — *forte no perfil viajante (explícita em Jonatas, ecoa nos demais).*
   Não dá para solicitar pelo celular. Solução desejada: tirar foto da nota na hora e já lançar. Ganhou peso com a dor #12: lançar na hora é o que evita perder a competência.

4. **Burocracia faz o colaborador desistir de solicitar** — *confirmada 1/4 (Jonatas), alto impacto.*
   Custo invisível: o atrito faz o colaborador abdicar de um direito. Argumento-chave para justificar a meta.

5. **Procedimento desatualizado e de difícil acesso** — *Guilherme + 4/4 + financeiro.*
   Documento de 2022. **Financeiro confirmou que as regras vivas estão fora dele:** KM reajustado todo ano por e-mail (gasolina + IPVA), limites de passagem/hotel revistos todo ano, refeição revisada pelo Thiago, CNPJ não escrito. Discoverability: Wilson nunca teve acesso; Cadu e Ricardo não acham.

12. **Lançamento fora da competência** — *financeiro: o erro mais comum.* 🆕
    O registro contábil é por competência (inegociável). Corte no dia 25; a OC é gerada no dia em que o processo termina. Quem abre no dia 26, ou abre dentro do prazo e leva reprovações e ajustes, cai no mês seguinte e perde a OC. Exemplo: viagem em 02/09, reembolso aberto em 26/09.

### 🟠 Prioridade MÉDIA

6. **Documento fiscal inválido (cupom / NF / CNPJ)** — *2/4 + financeiro.*
   Cupom que não vale como NF, ou sistema do fornecedor que falha. **Regra esclarecida pelo financeiro:** CNPJ obrigatório para estacionamento e combustível; jantar é exceção. Falta escrever.

7. **Prazo rígido penaliza quem viaja** — *2/4 (Cadu, Ricardo; reforço de Jonatas).*
   **Reenquadrada pela entrevista com o financeiro:** o prazo vem da competência contábil e não é negociável. A melhoria não é afrouxar o prazo, é ajudar a cumpri-lo (ver #12).

8. **Digitalização manual de notas é trabalhosa** — *2/4 (Wilson, Jonatas).*
   Escanear → PC → anexar, nota por nota.

9. **Quilometragem: planilha externa e trechos com erro** — *2/4 + financeiro.*
   KM calculado fora do Fluig. **Financeiro:** a data do formulário de KM diverge da data no corpo do Fluig — erro recorrente.

10. **Erro em uma linha trava o pacote inteiro** — *1/4 + financeiro.*
    Financeiro confirmou: não dá para aprovar parcialmente.

13. **Descrição não diz o que foi comprado** — *financeiro: sua maior dor.* 🆕
    O financeiro precisa perguntar o que está na NF. A data da viagem também costuma faltar.

14. **Retrabalho alto** — *financeiro.* 🆕
    ~3 de cada 10 solicitações chegam com erro. Cada reprovação consome dias do prazo e alimenta a #12.

### ⚪ Prioridade BAIXA / escopo

11. **Controle e visibilidade gerencial** — *confirmada em parte pelo financeiro.*
    Status visível no Fluig: sim. **Controle de orçamento de viagens por área ou colaborador: não existe.** Indicadores de volume e erro existem só de cabeça (30–40/mês, 3 em 10).

15. **O processo cobre mais que viagens** — *financeiro.* 🆕
    O mesmo fluxo de reembolso é usado para despesas que não são de viagem (ex.: eventos do marketing), mas o procedimento só trata de viagens.

---

## 5. Matriz Dor x Entrevistado

| Dor | Wilson | Cadu | Jonatas | Ricardo | Financeiro | Total |
|---|---|---|---|---|---|---|
| Lista do que é reembolsável | ✔ | ✔ | ✔ | ✔ | ✔ | 5/5 |
| Consulta informal | ✔ | ✔ | ✔ | ✔ | ✔ (inverso) | 5/5 |
| Falta de mobilidade (só PC/VPN) | ~ | — | ✔ | ~ | — | 1 forte + 2 eco |
| Desistiu de solicitar por burocracia | — | — | ✔ | — | — | 1/4 |
| Procedimento desatualizado / difícil acesso | ✔ | ✔ | ✔ | ✔ | ✔ | 5/5 |
| Documento fiscal inválido / CNPJ | — | ✔ | ~ | ✔ | ✔ | 3/5 +1 |
| Prazo rígido / fora da competência | — | ✔ | ~ | ✔ | ✔ | 3/5 +1 |
| Digitalização manual de notas | ✔ | — | ✔ | — | — | 2/5 |
| Quilometragem (planilha/erros) | — | — | ✔ | ✔ | ✔ | 3/5 |
| Erro em 1 linha trava o pacote | — | — | ✔ | — | ✔ | 2/5 |
| Descrição não diz o que foi comprado | — | — | — | — | ✔ | 1/5 |
| Controle de orçamento | — | — | — | — | ✔ (não existe) | — |
| Desistiu de solicitar? | Não | Não | **Sim** | Não | — | 1 sim |
| Prefere manter Fluig? | Sim | Sim | Sim | **App separado** | Sim | **4 Fluig / 1 app** |

---

## 6. O que já funciona — preservar no redesenho

- **Prazo de pagamento:** após aprovação, atende os quatro (3–5 dias). Elogio recorrente. O financeiro mede 10 dias desde a solicitação — a diferença é o tempo de aprovação.
- **Visibilidade no Fluig:** solicitante e financeiro conseguem ver o status.
- **Notificações por e-mail:** aviso de aprovado/recusado funciona bem.
- **Plataforma Fluig — decidido:** 4 de 5 preferem o Fluig, o financeiro não tem restrição e nenhuma outra ferramenta foi avaliada. **Direção: evoluir o Fluig.**

---

## 7. Restrições do redesenho (inegociáveis — financeiro)

- **Registro por competência** (norma contábil), não por caixa. Despesa fora da competência não entra.
- **Adiantamento sem NF** não é aceito.
- Adiantamento de **R$ 200** continua vigente.
- **Valores que mudam todo ano** (R$/km, limites de passagem e hotel): o procedimento novo deve dizer onde está o valor vigente, em vez de fixar o número no texto.

---

## 8. Ideias de solução levantadas (insumo para Fase 2 — ainda não priorizadas)

| Ideia | Descrição | Origem |
|---|---|---|
| FAQ / painel de regras no Fluig | Painel fixo com valores vigentes, regra da data, pode/não pode e dúvidas frequentes; um "visualizador" das regras | Financeiro |
| Informações de suporte no formulário | Explicação e exemplos dentro do próprio formulário do Fluig | Financeiro |
| Lembrete de viagem / de prazo | Aviso para lançar antes do dia 25 e não perder a competência | Financeiro |
| Lista clara "pode / não pode" | Tabela objetiva por conceito (não item a item), incluindo regras de horário e refeição | Todos |
| Regras mais amplas (menos microgerenciamento) | Definir por conceito amplo em vez de item; diferenciar quem viaja muito de quem fica no escritório | Jonatas |
| App com foto da nota na hora | Fotografar o comprovante no momento da despesa e lançar minimamente pelo celular, sem VPN | Jonatas (eco em Wilson) |
| Mobilidade sem VPN | Acesso simples pelo celular, dentro do Fluig | Jonatas |
| KM integrado (sem planilha externa) | Cálculo de quilometragem dentro da ferramenta, trechos padronizados, mesma data do Fluig | Jonatas, Ricardo, Financeiro |
| Aprovação parcial | Aprovar as linhas certas e devolver só a errada | Jonatas, Financeiro |
| Cartão pré-pago corporativo | Saldo por viagem, sem adiantar do próprio bolso; sistema lança a nota automaticamente | Wilson |
| Adiantamento / verba fixa por viagem | Valor fixo pelos dias de viagem; ⚠️ esbarra em "adiantamento sem NF não é negociável" | Cadu, Ricardo |
| Convênio com postos de combustível | Abastecer em rede conveniada e cobrar direto da Capital Realty | Wilson |

---

## 9. Roteiros de entrevista

- [`Roteiro_Entrevista_Colaboradores.md`](Roteiro_Entrevista_Colaboradores.md) — aplicado (4).
- [`Roteiro_Entrevista_Financeiro.md`](Roteiro_Entrevista_Financeiro.md) — aplicado em 08/10/2026.
- [`roteiro-financeiro.html`](roteiro-financeiro.html) — versão interativa usada na entrevista (anotação por pergunta, cronômetro, "copiar ata"). Publicada em https://claude.ai/artifact/96cJN62Fk1d7mwwygSefQM

---

## 10. Próximos passos

1. **Confirmar 6 pontos com a entrevistada do financeiro** (lista no fim da [ata](Ata_Entrevista_Financeiro.md)): nome, regra exata do dia 25, documento do Thiago sobre refeição, "ticket" e "pessoas assumindo o risco", quem mais consultar, e-mails com os valores vigentes.
2. **Conseguir o PDF do Procedimento Gestão de Viagens (2022)** e colocar nesta pasta.
3. **Consolidar a ata de diagnóstico** (Fase 1) como evidência formal da meta.
4. **Fase 2 — soluções dentro do Fluig:** mobilidade sem VPN, FAQ/painel de regras, lembrete de prazo, KM integrado, aprovação parcial. Levantar com o TI o que o Fluig permite.
5. **Fase 3 — redesenhar regras:** tabela pode/não pode por conceito (partindo da definição do Thiago); regra de documento fiscal/CNPJ; regra de competência e do dia 25 explicada com exemplo; incluir despesas que não são de viagem.
6. **Fase 4 — manual do usuário + procedimento revisado.**

---

## 11. Arquivos desta pasta

- `README.md` — este documento.
- `Diagnostico_Reembolsos_CapitalRealty.xlsx` — planilha com as abas: Visão Geral, Dores Consolidadas, Matriz Dor x Pessoa, entrevistas individuais (Wilson, Cadu, Jonatas, Ricardo, Financeiro), Preservar, Ideias de Solução, Próximos Passos.
- `Ata_Entrevista_Financeiro.md` — respostas como anotadas + leitura para o diagnóstico.
- `Roteiro_Entrevista_Colaboradores.md`, `Roteiro_Entrevista_Financeiro.md`, `roteiro-financeiro.html`.
- *Falta:* Procedimento Gestão de Viagens (2022) — documento base original, ainda vigente.
