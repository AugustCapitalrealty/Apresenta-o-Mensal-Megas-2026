# Comparação de manutenção 2026 × 2027: o que aprendemos com a base do orçado

Escrito em 07/10/2026. A comparação item a item da manutenção (planilhas "ORÇAMENTO 2027 - COMPARAÇÃO DE ITENS
2026 x 2027 - MEGA <X>") usou como lado 2026 o **orçado 2026** ("MESTRA - ORÇAMENTO 2026 ITEM A ITEM"). O
Guilherme vai trocar por uma base de **ritmo 2026** (o que está sendo gasto de fato). Este arquivo guarda o que
saiu da base do orçado e da leitura do gestor, para comparar com a base nova e ver as diferenças.

**Tudo o que existia em 07/10/2026 está em `ferramentas/base2026_orcado_2026-10-07/`:**
- as três planilhas como o gestor preencheu: SIM/NÃO na coluna K, comentário na L. A de Curitiba foi baixada da
  Planilha Google;
- `base2026_orcado_item_a_item.json`: a base 2026 usada, a cópia do `teste/fixture_modelos2026_megas.json`;
- `comparacao_linhas_<cidade>.json`: os pares e a leitura da análise, de `ferramentas/curadoria.js`;
- `decisoes_gestor_2026-10-07.js.txt`: o que o gerador usava (`23_DecisoesGestor.gs` naquele dia).

## 1. Os números da base do orçado

| | Curitiba | Itajaí | Esteio |
|---|---|---|---|
| Linhas da comparação | 70 | 80 | 68 |
| Orç 2026 (soma da planilha) | R$ 1.266.241 | R$ 1.790.938 | R$ 716.495 |
| Ritmo 2026 (METRAGEM) | R$ 1.270.981 | R$ 1.279.157 | R$ 628.319 |
| Orç 2027 (soma da planilha) | R$ 1.760.408 | R$ 2.294.654 | R$ 863.047 |
| Pares SIM / NÃO marcados pelo gestor | 18 / 11 | 21 / 26 | 29 / 11 |
| Linhas com comentário do gestor | 14 | 25 | 23 |

- O Orç 2026 da planilha bate com o Orç 2026 da METRAGEM. A exceção é o Esteio, R$ 4.500 acima, já anotado no
  HANDOFF.
- **Em Itajaí, o orçado 2026 está R$ 512 mil acima do ritmo.** As obras que o gestor disse não terem sido feitas
  somam R$ 333 mil no orçado 2026 (item 2). Com a base de ritmo, essas obras devem aparecer com gasto zero ou quase
  zero em 2026.

## 2. O que o gestor disse (comentários na coluna L)

**Obras de 2026 que não foram feitas e passaram para 2027** ("não foi realizado, apenas deslocamos de 2026 para
2027" / "realocado de 2026 para 2027"). São as "obras adiadas" do slide "Por que a manutenção sobe".
| Mega | Obra (como estava no Orç 2026) | Orç 2026 | Orç 2027 |
|---|---|---|---|
| Itajaí | Reparo recalque docas funcionais | 75.335 | 210.601 (nivelamento AMZ 4/5 + elevação módulos 12/13) |
| Itajaí | 02 torniquetes Digicon (ampliação da portaria) | 146.800 | 206.700 (3 torniquetes, parcelado) |
| Itajaí | Impermeabilização subestações | 44.751 | 131.770 (subestações 1 e 2) |
| Itajaí | Impermeabilização casa de bombas | 27.375 | 39.426 |
| Itajaí | Iluminação bolsão externo | 20.384 | 5.938 |
| Itajaí | Iluminação rua armazém 4/5 | 13.589 | 11.875 |
| Itajaí | Organização quadro elétrico portaria | 4.890 | 4.290 |
| **Itajaí** | **total (7)** | **333.123** | **610.600** |
| Curitiba | Guard-rail fase 2 | 138.700 | 146.030 (defensas platô 1-2 e 2-3) |
| Curitiba | Torniquete 4 (instalação, corte vidro, periféricos) | 55.833 | 86.550 |
| **Curitiba** | **total (2)** | **194.533** | **232.580** |
| Esteio | (nenhuma) | | |

Efeito no deck: a manutenção de Itajaí sobe **+77,1%** contra o ritmo, e **+29,4% sem as obras adiadas**.

**Provisões por disciplina de 2026 viraram a provisão de 3% de 2027** ("tudo que estava como provisão por
disciplina agora entra na conta dos 3% de manutenções não previstas"):
- Curitiba: 4 provisões, R$ 91 mil em 2026. A linha de 3% em 2027 é de R$ 39 mil.
- Esteio: 9 linhas, R$ 107 mil em 2026, entre elas acesso, CFTV, bombas, PPCI, cercas, paisagismo e comunicação
  visual. A linha de 3% em 2027 é de R$ 20,8 mil, mais R$ 4,3 mil na de Bens Móveis.
- Itajaí: 4 provisões, R$ 149 mil em 2026. **Não existe linha de 3% no 090 de 2027** (pergunta em aberto,
  `ORC_PENDENCIAS_GESTOR`).

**Mudou de conta em 2027:**
- Manutenção de Bens Móveis: tratores e bombas.
  - Curitiba: preventiva trator, R$ 8.763.
  - Itajaí: trator, R$ 8.763, e bombas de drenagem, R$ 1.800.
  - Esteio: preventiva, corretiva e bomba de tratores, mais a bomba SPK, R$ 36.777.
- O paisagismo de Curitiba tem LPU na conta de Conservação.
- Viraram contrato: a potabilidade (Curitiba) e a limpeza de caixa d'água (Itajaí).

**Outros motivos de alta, segundo o gestor:**
- Contratos com o ano cheio em 2027: PMOC e Equilíbrio em Curitiba, PMOC em Itajaí ("melhoria no contrato").
- Esteio cresce com os Armazéns B1 e B2:
  - subestação (15 → 67 mil) e gerador (10 → 28 mil);
  - elevatórias unificadas e semestrais (15 → 44 mil);
  - 5 linhas de vida (6,5 → 32,5 mil);
  - juntas (a base de 2026 era só o Armazém A).
- Itajaí: o Orbital (PPCI) foi rescindido e entrou a Firecam (SDAI); a FM Security é contrato novo de segurança
  eletrônica.

**Pares que o gestor corrigiu ou qualificou:**
- Itajaí #6/#7: o par certo é Orbital → Firecam, e não Orbital → FM Security. A NFPA "tem todo o ano".
- Itajaí #3: o reservatório "não é o mesmo, mas compara"; #4: "em 2026 é parcial"; #8: "outra área".
- Itajaí #12: totem são coisas diferentes (2026 trocou a lona; 2027 é a estrutura). #19: escopo diferente
  (2026 lavagem, 2027 pintura).
- Esteio #1: a base de 2026 é só do Armazém A; #6: "compara, mas são áreas diferentes"; #24 e #27 foram pontuais.
- Curitiba #21 e #23: "podemos comparar **por disciplina**" (pintura, lavagem de estruturas metálicas).

**Perguntas em aberto** (no slide "Revisar antes da versão final", `ORC_PENDENCIAS_GESTOR` em `01_Config.gs`):
- Itajaí: a linha de 3% falta?
- Itajaí: Orbital → Firecam, e a NFPA de 2026 se compara com quê?
- Itajaí: o recalque paver de R$ 14.000 foi feito em 2026?
- Curitiba: a linha 4 vale SIM ou entra nos 3%?

## 3. O que conferir quando chegar a base de ritmo 2026

1. **Obras adiadas.** Cada uma das 9 obras do item 2 deve ter gasto zero ou quase zero no ritmo 2026. Se alguma
   tiver gasto relevante, ela não foi adiada inteira: avisar o gestor e rever o slide "Por que a manutenção sobe".
2. **Diferença orçado × ritmo por Mega.** Em Itajaí são R$ 512 mil, e os adiados explicam R$ 333 mil. Ver o que
   explica o resto: provisões não usadas? obras canceladas?
3. **Pares SIM.** Com o ritmo, o lado 2026 de cada par muda de valor. Refazer a variação de cada par e conferir se
   o comentário do gestor ainda vale (por exemplo, "em 2026 é parcial").
4. **Provisões → 3%.** Quanto das provisões de 2026 foi gasto de fato. É esse número que se compara com a linha
   de 3% de 2027.
5. **Linhas "Só 2026"** que somem no ritmo: eram só orçamento, nunca viraram gasto.
6. **Comparação por disciplina** (pedido do gestor). Com o ritmo ela fica mais justa: o que se gastou em 2026 com
   pintura, lavagem, PPCI etc. contra o que se projeta em 2027.

**Como refazer:**
- Exportar a base nova: um `exportarFixtures()` ou a planilha em .xlsx.
- Gerar as planilhas de comparação de novo: `ferramentas/parear.js`, `curadoria.js` e `planilha_comparacao.py`.
- **Levar a coluna K e a coluna L do gestor para as planilhas novas, pelo item.** Os arquivos desta pasta são a
  referência.
- Rodar `ferramentas/decisoes_gestor.py` e comparar o resultado com `decisoes_gestor_2026-10-07.js.txt`.

## 4. Cadastro de contratos 2026 (exportado em 07/10/2026)

O primeiro arquivo que chegou como "ritmo 2026" era o **cadastro de contratos de 2026**:
`ferramentas/bases_2026/CONTRATOS 2026 - CADASTRO - exportado 2026-10-07.csv` (ver o LEIA-ME da pasta). Ele não
serve de base de ritmo item a item, porque só tem contratos. Mas confirma comentários do gestor:
- **Itajaí:**
  - não há Orbital em 2026, e a **Firecam começa em 07/2026** (R$ 60 mil no ano). Bate com "Orbital foi rescindido
    e entrou a Firecam";
  - o contrato de **coberturas foi renovado em 09/2026** com valor maior: R$ 37 mil até agosto e R$ 61 mil de
    setembro a dezembro;
  - a manutenção em contratos dá R$ 221 mil no ano, contra R$ 430 mil na MESTRA - CONTRATOS 2026.
- **Curitiba:** Miriad (cobertura, 03/2026), LCW (gerador, 04/2026), Equilíbrio (03/2026) e Firecam (02/2026 e
  SDAI em 08/2026) renovaram em 2026 com valor novo. É o "contrato cheio em 2027" do gestor: em 2026 só parte do
  ano já está no valor novo.
- **Esteio:**
  - ADS, Subestação, Gerador (Tecmax) e ARC (SDAI) seguem até 2029;
  - a ARC aparece inteira em 2026, R$ 71 mil;
  - em 2027 o orçamento traz "alteração do contrato SDAI (rescisão ARC)".

**Uso possível (opção A, ainda não feita):** trocar o lado 2026 dos pares de **contrato** da comparação pelo valor
deste cadastro, mantendo o orçado 2026 nas obras e provisões, com a marcação "orçado".
**Falta para o ritmo item a item:** o realizado de 2026 das obras e compras (lançamentos ou notas da conta de
manutenção de cada Mega). O Guilherme foi procurar o "módulo ritmo 2026".

## 5. Ritmo 2026 item a item (exportado em 07/10/2026)

Chegaram `ferramentas/bases_2026/RITMO 2026 - 090 DESPESAS GERAIS …xlsx` e `… 070 SERVICOS DE TERCEIROS …xlsx`. Têm
o mesmo formato dos modelos 090/070, com os **itens avulsos** do ritmo 2026. Os contratos ficam no cadastro da
seção 4. Primeira conferência das obras adiadas (seção 3, item 1):

**Confirmado (não houve gasto em 2026):**
- **Itajaí:** recalque das docas, torniquetes, impermeabilização das subestações e da casa de bombas.
- **Curitiba:** guard-rail e 4º torniquete.
- Esses itens somam a maior parte dos adiados: Itajaí R$ 559 mil dos R$ 611 mil do Orç 2027; Curitiba os R$ 233 mil.

**Têm gasto no ritmo 2026: rever com o gestor.**
| Obra (gestor disse adiada) | Ritmo 2026 | Orç 2027 |
|---|---|---|
| Itajaí: iluminação rua armazém 4/5 | R$ 17.250 em dez ("Iluminação rua armazém 1/4/5") | R$ 11.875 |
| Itajaí: iluminação bolsão externo | R$ 1.800 em dez | R$ 5.938 |
| Itajaí: organização quadro elétrico portaria | R$ 5.900 em dez | R$ 4.290 |

Se forem feitas em dezembro de 2026, o Orç 2027 delas pode estar duplicado. Se o ritmo de dezembro for só
projeção, elas continuam adiadas.

**Conferido em 07/10/2026: as três estão no ritmo (dez/2026) e no Orç 2027 (quadro em jan; as duas iluminações em
fev), e o totem também (ritmo dez/2026 R$ 17.400; Orç 2027 jan R$ 11.500).** Regra combinada com o Guilherme: o que
está só no ritmo é ritmo; o que está no ritmo e no Orç 2027 é pergunta ao gestor. As quatro foram para
`ORC_PENDENCIAS_GESTOR` ("Parcelado ou em dobro?" — o Guilherme acha que é parcelamento). Indício: o slide de revisão já mostrava "Modelos acima da
METRAGEM: JAN R$ 11.500 · FEV R$ 17.813", exatamente o totem e as duas iluminações, que a METRAGEM 2027 não tem.
Retiradas das pendências: recalque paver e Orbital → Firecam/NFPA (respondidas abaixo).

**Responde perguntas em aberto:**
- Itajaí, recalque paver de incêndio: **feito em 2026**, R$ 11.896 em agosto ("Preventivo/recalque paver
  preventivo de incêndio"). Confirma o gestor.
- Itajaí, NFPA: "NFPA 25 casa de bombas", R$ 8.890 em outubro de 2026. A NFPA foi feita em 2026; o 090 de 2027 não
  tem linha de NFPA, e a Firecam (preventiva do sistema de incêndio, R$ 10.000/mês de 07/2026 a 12/2029) cobre
  2027 inteiro. Bate com o gestor ("a NFPA tem todo o ano"): Orbital → Firecam é o par; a NFPA de 2026 é "Só 2026".
- Itajaí, totem: "Recuperação e manutenção do totem do bolsão externo", R$ 17.400 em dezembro de 2026. Conferir
  se é o mesmo totem da "manutenção e pintura do totem Mega" de 2027 (R$ 11.500).
