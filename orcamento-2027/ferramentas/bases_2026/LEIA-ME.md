# Bases de 2026 exportadas do sistema

| Arquivo | O que é | Não é |
|---|---|---|
| `CONTRATOS 2026 - CADASTRO - exportado 2026-10-07.csv` | Cadastro de contratos de 2026 (Origem = Obrigação: prestação de serviço; Recebível: locação), um contrato por linha, com início/fim, conta (Valorização), reajuste e o valor de Jan/26 a Dez/26. CSV com `;`, decimal com vírgula, **latin-1**; códigos no formato `="..."`. Exportado pelo Guilherme em 07/10/2026 (chegou como "Ritmo-2026.csv"). | O ritmo 2026 item a item: não tem obras, compras nem provisões. Manutenção de imóveis aqui: Curitiba R$ 349 mil, Itajaí R$ 221 mil, Esteio R$ 147 mil, contra o ritmo total da METRAGEM de R$ 1,27 mi, R$ 1,28 mi e R$ 628 mil. |

Mais recente que a `MESTRA - CONTRATOS 2026` do Drive (que dá R$ 430 mil de manutenção em Itajaí): traz as
renovações de 2026 com valor novo. O que ele já confirmou está em `../../APRENDIZADOS-COMPARACAO-2026.md`, seção 4.
| `RITMO 2026 - 090 DESPESAS GERAIS - exportado 2026-10-07.xlsx` | Ritmo 2026 item a item da 090 (manutenção de imóveis e o resto das despesas gerais), todas as unidades, aba "Valores do Modelo", mesmo formato do modelo 090 de 2027 (Mês 1…12, valores negativos). Só **itens avulsos**: obras, compras, serviços. | Os contratos (estão no cadastro acima). Manutenção aqui: Curitiba R$ 839 mil, Itajaí R$ 998 mil, Esteio R$ 572 mil; somando os contratos do cadastro: R$ 1,19 mi, R$ 1,22 mi e R$ 719 mil, contra o ritmo da METRAGEM de R$ 1,27 mi, R$ 1,28 mi e R$ 628 mil. |
| `RITMO 2026 - 070 SERVICOS DE TERCEIROS - exportado 2026-10-07.xlsx` | Ritmo 2026 item a item da 070 (segurança, limpeza e outros serviços de terceiros), mesmo formato. | Os contratos de segurança (no cadastro). Segurança aqui é pequena: Curitiba R$ 212 mil, Itajaí R$ 91 mil, Esteio zero. |

Para a comparação item a item, `python ferramentas/ritmo2026_fixtures.py` converte o 090 e o cadastro em
`teste/fixture_ritmo2026_090.json` e `teste/fixture_contratos_2026_cadastro.json` (lidos por
`ferramentas/comparacao_base.js`). Chegou base nova: salve aqui com a data no nome e rode de novo.
