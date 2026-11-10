# HANDOFF — Meta 2026 · Reembolsos

> Para retomar o projeto em outra sessão. Leia este arquivo primeiro, depois o
> [`README.md`](README.md) (contexto completo) e a [`Ata_Entrevista_Financeiro.md`](Ata_Entrevista_Financeiro.md).
>
> **Registrado em:** 08/10/2026 (entrevista com o financeiro) · compilado em 10/11/2026.
> **Prazo da meta: 30/11/2026.** Do que estava registrado em 08/10 em diante, nada foi
> anotado aqui: se algo andou nesse mês, conte à nova sessão antes de começar.

---

## Onde está

- **GitHub:** repositório `AugustCapitalrealty/Apresenta-o-Mensal-Megas-2026`, branch
  `claude/focused-mayer-6ofaa8`, pasta `reembolso/`. Ainda **não** está na `main`.
- **Pacote:** `reembolso.zip` com tudo desta pasta (enviado na conversa de 10/11).
- **Roteiro interativo usado na entrevista:** https://claude.ai/artifact/96cJN62Fk1d7mwwygSefQM

## Estado em uma frase

Fase 1 (diagnóstico) com todas as 5 entrevistas feitas (4 colaboradores + gerente do financeiro);
faltam confirmar 6 pontos com o financeiro, conseguir o PDF do procedimento de 2022 e escrever a
ata de diagnóstico. Fases 2 a 6 não começaram.

## O que já está decidido

| Decisão | Por quê |
|---|---|
| **Plataforma: evoluir o Fluig** | 4 de 5 entrevistados preferem; financeiro sem restrição; nenhuma outra ferramenta avaliada |
| **Prazo do mês não muda** | Registro por competência é norma contábil e o financeiro declarou inegociável. Corte no dia 25 |
| **Adiantamento sem NF não entra** | Inegociável para o financeiro. Derruba a ideia de "verba fixa por viagem" |
| **Valores que mudam todo ano ficam fora do texto** | R$/km e limites de hotel/passagem são revistos todo ano por e-mail; o procedimento novo aponta onde está o valor vigente |
| **Regras por conceito, não por item** | Dor unânime (5/5). Partir da definição de refeição do Thiago |

## As dores que mais pesam (15 no total, detalhe no README)

1. **Não existe lista clara do que é reembolsável** — 5/5. Prova: para o financeiro "sonho não pode", o Jonatas achava que podia.
2. **Consulta informal de mão dupla** — colaborador pergunta antes de lançar; financeiro pergunta o que está na NF (sua maior dor).
3. **Procedimento de 2022 desatualizado** — as regras vivas estão em e-mails e com o Thiago.
4. **Lançamento fora da competência** — o erro mais comum. Quem abre dia 26 ou leva reprovações perde a OC do mês.
5. **~3 de cada 10 pedidos com erro** (30–40 por mês).
6. Falta de mobilidade (só PC + VPN); KM em planilha externa; erro numa linha trava o pacote; sem controle de orçamento.

## Pendências, em ordem

1. **Confirmar com a gerente do financeiro** (lista no fim da ata):
   nome dela · regra exata do dia 25 ("se viajar depois, lançar no primeiro dia" — de qual mês?) ·
   documento do Thiago sobre refeição · o que é "ticket" e "pessoas assumindo o risco" ·
   quem mais consultar · e-mails com valor do km e limites vigentes.
2. **Conseguir o PDF do Procedimento Gestão de Viagens (2022)** — não foi achado no Drive.
3. **Ata de diagnóstico** (fecha a Fase 1, evidência da meta).
4. **Fase 2:** levantar com o TI o que o Fluig permite — celular sem VPN, FAQ/painel de regras,
   lembrete de prazo, KM integrado, aprovação parcial.
5. **Fase 3:** tabela pode/não pode por conceito; regra de documento fiscal/CNPJ; regra do dia 25
   com exemplo; incluir despesas que não são de viagem (eventos do marketing).
6. **Fase 4:** manual do usuário (simples, visual) + procedimento revisado.
7. **Fase 6:** apresentar ao Jonatas até 30/11.

> Com 20 dias até o prazo, as Fases 2–5 não cabem inteiras. Vale combinar com o Jonatas o que
> entra como entregue (ex.: diagnóstico + regras redesenhadas + manual) e o que vira plano de
> implementação.

## Arquivos

| Arquivo | O que é |
|---|---|
| `HANDOFF.md` | Este resumo |
| `README.md` | Contexto completo: meta, roadmap, 15 dores, matriz, restrições, ideias, próximos passos |
| `Diagnostico_Reembolsos_CapitalRealty.xlsx` | Planilha com 11 abas (inclui a aba Financeiro) |
| `Ata_Entrevista_Financeiro.md` | Respostas como anotadas + leitura para o diagnóstico + 6 pontos a confirmar |
| `Roteiro_Entrevista_Colaboradores.md` | Roteiro aplicado nos 4 colaboradores |
| `Roteiro_Entrevista_Financeiro.md` | Roteiro aplicado no financeiro |
| `roteiro-financeiro.html` | Versão interativa do roteiro (a do link acima) |
| `scripts/atualizar_planilha_financeiro.py` | Script que incorporou a entrevista à planilha (já rodado; não rodar de novo) |

## Para colar na nova sessão

```
Vou continuar o projeto da minha meta 2026 de melhoria do processo de reembolsos
da Capital Realty (prazo 30/11/2026). Anexei o reembolso.zip. Leia primeiro o
HANDOFF.md, depois o README.md e a Ata_Entrevista_Financeiro.md.
Desde 08/10 aconteceu o seguinte: <conte aqui o que andou, ou "nada">.
Quero começar por: <ex.: escrever a ata de diagnóstico da Fase 1>.
```

Se a nova sessão for neste mesmo repositório, em vez do zip basta dizer:
"leia `reembolso/HANDOFF.md` da branch `claude/focused-mayer-6ofaa8`".
