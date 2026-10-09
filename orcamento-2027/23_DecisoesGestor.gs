/**
 * ARQUIVO: 23_DecisoesGestor.gs — GERADO por ferramentas/decisoes_gestor.py em 09/10/2026. Não edite à mão:
 * o gestor muda a planilha de comparação, rode o script de novo.
 * Decisões do gestor nas planilhas "ORÇAMENTO 2027 - COMPARAÇÃO DE ITENS 2026 x 2027 - MEGA <X>",
 * por Mega: obras de 2026 adiadas para 2027, os pares que ele marcou SIM e os gastos do ritmo 2026 sem par.
 */
const ORC_DECISOES_GESTOR = {
 "Mega Curitiba": {
  "arquivo": "ORÇAMENTO 2027 - COMPARAÇÃO DE ITENS RITMO 2026 x ORÇ 2027 - MEGA CURITIBA.xlsx",
  "adiados": [
   {
    "linha": 13,
    "de2026": "Guard-rail fase 2 #14839525",
    "orc2026": 138700.0,
    "ritmo2026": 0.0,
    "itens2027": [
     "DEFENSAS METÁLICAS PLATO 1 E 2 #14839525",
     "DEFENSAS METÁLICAS PLATO 2 E 3 #14839525"
    ],
    "orc2027": 146030.29,
    "comentario": "Realocado de 2026 para 2027"
   },
   {
    "linha": 14,
    "de2026": "Torniquete 4 (instalação, corte vidro, periféricos) #14651948",
    "orc2026": 55832.6,
    "ritmo2026": 0.0,
    "itens2027": [
     "MÃO DE OBRA PARA ADEQUAÇÃO, INSTALAÇÃO E ATIVAÇÃO DO 4º TORNIQUETE",
     "COMPRA DE TORNQUETE DIGICON INOX TX1500"
    ],
    "orc2027": 86550.0,
    "comentario": "Realocado de 2026 para 2027"
   }
  ],
  "pares": [
   {
    "linha": 1,
    "de2026": "Comunicação Horizontal - Demarcações e Tachinhas ##14839535",
    "orc2026": 28565.0,
    "ritmo2026": 55503.11,
    "itens2027": [
     "MANUTENÇÃO PREVENTIVA ANUAL FRENTE DE ARMAZÉNS 1 A 7 (R$ 39/M2 X 539,5)",
     "MANUTENÇÃO DE TACHINHAS REFLETIVAS (R$ 55 UND)",
     "MANUTENÇÃO PREVENTIVA DA DEMARCAÇÃO BOLSÃO DE PESADOS (R$ 39M2 X 300M2)",
     "MANUTENÇÃO PREVENTIVA ÁREA DE ACESSOS (122,36 M2)",
     "MANUTENÇÃO PREVENTIVA DE DEMARCAÇÃO SEMESTRAL DESCIDA (113,65 M2)",
     "MANUTENÇÃO PREVENTIVA ROTATÓRIA (33,96 M2)",
     "MANUTENÇÃO PREVENTIVA DA DEMARCAÇÃO DAS LOMBADAS SEMESTRALMENTE (27,6M2)",
     "MANUTENÇÃO PREVENTIVA RUA LATERAL AMZ 1 E 2 (27,40 M2)",
     "MANUTENÇÃO PREVENTIVA ÁREA DE EMBARQUE E DESEMBARQUE (15M2)"
    ],
    "orc2027": 75758.16,
    "comentario": ""
   },
   {
    "linha": 2,
    "de2026": "Provisão reparo sistemas de acesso",
    "orc2026": 18795.21,
    "ritmo2026": 4826.4,
    "itens2027": [
     "MANUTENÇÃO PREVENTIVA E CORRETIVA DE SEGURANÇA ELETRÔNICA - FM SECURITY"
    ],
    "orc2027": 63694.8,
    "comentario": "Tudo que estava como \"Provisao\" por disciplina, agora entra na conta dos 3% de manutençoes não previstas"
   },
   {
    "linha": 3,
    "de2026": "Provisão Plantação paisagismo 200 m² ##14839557",
    "orc2026": 15654.1,
    "ritmo2026": 31469.8,
    "itens2027": [
     "PLANTIO DE GRAMA EM 2.492,81 M2 (FRENTE MELI AMZ 6) - R$ 9,80",
     "PLANTIO DE GRAMA EM 1.013,87 M2 (FUNDOS RESTAURANTE) - R$ 9,80/M2",
     "PLANTIO DE GRAMA EM 857,40 M2 (FRENTE BOSCH) - R$ 9,80"
    ],
    "orc2027": 42767.99,
    "comentario": ""
   },
   {
    "linha": 4,
    "de2026": "Provisão manutenções emergências",
    "orc2026": 64800.0,
    "ritmo2026": 39245.95,
    "itens2027": [
     "PROVISÃO PARA MANUTENÇÃO NÃO PREVISTA (3% DO PACOTE DE MANUTENÇÃO)"
    ],
    "orc2027": 39000.0,
    "comentario": ""
   },
   {
    "linha": 5,
    "de2026": "Preventiva bombas de incêndio",
    "orc2026": 16345.82,
    "ritmo2026": 1842.0,
    "itens2027": [
     "IMPLEMENTAÇÃO DE MANUTENÇÃO PREVENTIVA DA BOMBA DE INCÊNDIO - MECÂNICA"
    ],
    "orc2027": 11052.0,
    "comentario": ""
   },
   {
    "linha": 17,
    "de2026": "Provisão gastos CFTV",
    "orc2026": 16221.54,
    "ritmo2026": 3964.06,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Tudo que estava como \"Provisao\" por disciplina, agora entra na conta dos 3% de manutençoes não previstas"
   },
   {
    "linha": 18,
    "de2026": "Preventiva condicionadores de ar",
    "orc2026": 4731.92,
    "ritmo2026": 4000.0,
    "itens2027": [
     "CONTRATO DE MANUTENÇÃO DE AR CONDICIONADO CONFORME PMOC"
    ],
    "orc2027": 11280.0,
    "comentario": "2027 o contrato é cheio (full)"
   },
   {
    "linha": 19,
    "de2026": "CONTRATO — FIRECAM",
    "orc2026": 149987.63,
    "ritmo2026": 147887.68,
    "itens2027": [
     "CONTRATO — FIRECAM",
     "AMPLIAÇÃO CONTRATO MANUTENÇÃO SDAI FIRECAM 7A E 7B"
    ],
    "orc2027": 149196.0,
    "comentario": ""
   },
   {
    "linha": 20,
    "de2026": "CONTRATO — MIRIAD SERVICOS INDUSTRIAIS E COMERCIO",
    "orc2026": 130215.72,
    "ritmo2026": 106759.21,
    "itens2027": [
     "CONTRATO — MIRIAD SERVIÇOS INDUSTRIAIS E COMERCIO",
     "AMPLIAÇÃO CONTRATO MANUTENÇÃO COBERTURA MIRIAD 6, 7A E 7B"
    ],
    "orc2027": 138650.28,
    "comentario": ""
   },
   {
    "linha": 21,
    "de2026": "Provisão manutenção preventiva em VGAs",
    "orc2026": 38910.28,
    "ritmo2026": 38910.28,
    "itens2027": [
     "REVISÃO E MANUTENÇÃO PREVENTIVA DAS VGAS (LIMPEZA E LUBRIFICAÇÃO DE 20 VGAS)"
    ],
    "orc2027": 47421.56,
    "comentario": ""
   },
   {
    "linha": 22,
    "de2026": "CONTRATO — LEANDRO CARVALHO WEISS -LCW",
    "orc2026": 41208.69,
    "ritmo2026": 41369.43,
    "itens2027": [
     "CONTRATO — LEANDRO CARVALHO WEISS - LCW"
    ],
    "orc2027": 41784.72,
    "comentario": ""
   },
   {
    "linha": 23,
    "de2026": "CONTRATO — FILTROIL",
    "orc2026": 34666.5,
    "ritmo2026": 34667.5,
    "itens2027": [
     "CONTRATO — FILTROIL"
    ],
    "orc2027": 36245.96,
    "comentario": ""
   },
   {
    "linha": 24,
    "de2026": "CONTRATO — EQUILIBRIO SOLUÇÕES AMBIENTAIS",
    "orc2026": 15639.0,
    "ritmo2026": 18786.16,
    "itens2027": [
     "CONTRATO — EQUILIBRIO SOLUÇÕES AMBIENTAIS"
    ],
    "orc2027": 22526.4,
    "comentario": "2027 o contrato é cheio (full)"
   },
   {
    "linha": 25,
    "de2026": "Preventiva/PAE Brigada/extintores",
    "orc2026": 4923.6,
    "ritmo2026": 4923.6,
    "itens2027": [
     "BRIGADA DE INCÊNDIO - NR 23",
     "REFERENTE A RECARGA DE EXTINTORES E TESTE HIDROSTÁTICO DE MANGUEIRAS  ANUALMENTE",
     "RENOVAÇÃO DO PLANO DE AÇÃO E EMERGÊNCIA"
    ],
    "orc2027": 10451.0,
    "comentario": ""
   },
   {
    "linha": 26,
    "de2026": "Preventiva sistema de PPCI com teste NFPA",
    "orc2026": 7200.0,
    "ritmo2026": 8474.2,
    "itens2027": [
     "INSPEÇÃO ANUAL PREVENTIVA CONFORME NFPA 25 - RIEPING"
    ],
    "orc2027": 4024.0,
    "comentario": ""
   },
   {
    "linha": 36,
    "de2026": "Provisão gastos com comunicação visual",
    "orc2026": 14798.19,
    "ritmo2026": 7730.73,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Tem a Sinalização Viária... Pode comparar"
   },
   {
    "linha": 38,
    "de2026": "Preventiva trator/tratorito",
    "orc2026": 8762.5,
    "ritmo2026": 11334.05,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Está na linha de Manutenção de Bens Móveis"
   },
   {
    "linha": 42,
    "de2026": "Análise completa da potabilidade da água do poço artesiano portaria GMS  N°888",
    "orc2026": 6843.6,
    "ritmo2026": 7183.6,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Está em contrato agora"
   }
  ],
  "semPar": [
   {
    "linha": 6,
    "de2026": "Reforma do reservatório Potável 138m3",
    "ritmo2026": 70000.0
   },
   {
    "linha": 7,
    "de2026": "Abrandador (Aquapro)",
    "ritmo2026": 30957.18
   },
   {
    "linha": 8,
    "de2026": "Barreiras Viárias (New Jersey - FFM)",
    "ritmo2026": 29800.0
   },
   {
    "linha": 9,
    "de2026": "Demolição ETE 3 (Monopólio)",
    "ritmo2026": 22700.0
   },
   {
    "linha": 10,
    "de2026": "Revitalização Campo Futebol (Norte Sul)",
    "ritmo2026": 21300.0
   },
   {
    "linha": 11,
    "de2026": "Projeto As Built do sistema de abastecimento de água",
    "ritmo2026": 20600.0
   },
   {
    "linha": 12,
    "de2026": "Projeto Novos Reservatórios de Agua (Fundação + Hidr.)",
    "ritmo2026": 10300.0
   },
   {
    "linha": 15,
    "de2026": "Provisão para iluminação da área comum/manutenções elétricas",
    "ritmo2026": 21906.0
   },
   {
    "linha": 16,
    "de2026": "Provisão serralheria",
    "ritmo2026": 4750.0
   },
   {
    "linha": 27,
    "de2026": "Limpeza de cobertura armazéns 3 e 4 Boticário #10233727",
    "ritmo2026": 114058.25
   },
   {
    "linha": 28,
    "de2026": "Pintura da fachada cinza do Armazém 3, 4 (Fundos Sub3)  #14650845",
    "ritmo2026": 30000.0
   },
   {
    "linha": 29,
    "de2026": "Compra de duas cancelas (Cancela 1 e 5) #14839467",
    "ritmo2026": 62344.58
   },
   {
    "linha": 30,
    "de2026": "Lavação em fechamentos metálico fase 01 #14839538",
    "ritmo2026": 50000.0
   },
   {
    "linha": 31,
    "de2026": "Compra de totem de autoatendimento. #14651878",
    "ritmo2026": 13930.0
   },
   {
    "linha": 33,
    "de2026": "Reforma dos totens das cancelas #4022057",
    "ritmo2026": 5000.0
   },
   {
    "linha": 34,
    "de2026": "Remanejamento de caixa hermética fase 01 #4152350",
    "ritmo2026": 31740.18
   },
   {
    "linha": 35,
    "de2026": "Conjunto de Câmera Dome - Fundos Armazém 5 #14651899",
    "ritmo2026": 17246.45
   },
   {
    "linha": 37,
    "de2026": "Provisão gastos PPCI",
    "ritmo2026": 7091.19
   },
   {
    "linha": 39,
    "de2026": "Provisão reparo cercas/portões",
    "ritmo2026": 10344.0
   },
   {
    "linha": 40,
    "de2026": "Infraestrutura pátio externo comunicação fibra optica #6551915",
    "ritmo2026": 8100.0
   },
   {
    "linha": 41,
    "de2026": "Poda de árvores perimetro (Em atendimento ao diagnóstico Moked)",
    "ritmo2026": 8004.0
   },
   {
    "linha": 43,
    "de2026": "Manutenção no reboco da placa pré-moldada (Armazém 3 e 4) #12772998",
    "ritmo2026": 5750.0
   },
   {
    "linha": 44,
    "de2026": "Reforma Dilaceradores",
    "ritmo2026": 5000.0
   },
   {
    "linha": 45,
    "de2026": "Compra de Equipamento para Instalação de WI-FI na casa de Bombas",
    "ritmo2026": 4765.55
   },
   {
    "linha": 46,
    "de2026": "Referente a aquisição de sistema de monitoramento de equipamentos na casa de bombas (CAS)",
    "ritmo2026": 4607.7
   },
   {
    "linha": 47,
    "de2026": "Referente a contratação de projeto técnico para regularização do sistema fotovoltaico",
    "ritmo2026": 4000.0
   },
   {
    "linha": 48,
    "de2026": "Referente a instalação dos dispositivos de monitoramento na casa bombas (infra elétrica e lóigica)",
    "ritmo2026": 3000.0
   },
   {
    "linha": 49,
    "de2026": "Preventiva bombas esgoto",
    "ritmo2026": 2450.0
   }
  ]
 },
 "Mega Esteio": {
  "arquivo": "ORÇAMENTO 2027 - COMPARAÇÃO DE ITENS RITMO 2026 x ORÇ 2027 - MEGA ESTEIO.xlsx",
  "adiados": [],
  "pares": [
   {
    "linha": 1,
    "de2026": "Juntas das placas nas paredes na fase 03 (fundos módulos 07 ao 11)#13890191 #13890216",
    "orc2026": 10330.75,
    "ritmo2026": 22413.0,
    "itens2027": [
     "MANUTENÇÃO DE JUNTA DE DILATAÇÃO ENTRE PLACAS DE FECHAMENTO (LATERAL M12)"
    ],
    "orc2027": 9000.0,
    "comentario": "Compara, mas são áreas diferentes."
   },
   {
    "linha": 2,
    "de2026": "Substituir lona totem #14592624",
    "orc2026": 18000.0,
    "ritmo2026": 0.0,
    "itens2027": [
     "SUBSTITUIÇÃO POR VIDA ÚTIL DA LONA DO MEGA (POSTO)"
    ],
    "orc2027": 15000.0,
    "comentario": ""
   },
   {
    "linha": 3,
    "de2026": "Preventiva bombas de drenagem",
    "orc2026": 6300.0,
    "ritmo2026": 11640.0,
    "itens2027": [
     "MANUTENÇÃO PREVENTIVA ANUAL DA COMPORTA AMZ A",
     "MANUTENÇÃO PREVENTIVA ANUAL DA COMPORTA AMZ B"
    ],
    "orc2027": 8838.0,
    "comentario": ""
   },
   {
    "linha": 4,
    "de2026": "CONTRATO — Subestação Energia",
    "orc2026": 15102.87,
    "ritmo2026": 21306.24,
    "itens2027": [
     "CONTRATO — Subestação Energia"
    ],
    "orc2027": 66821.04,
    "comentario": "Em 2027 entra o Armazém B1 e B2"
   },
   {
    "linha": 5,
    "de2026": "Preventiva/Limpeza das elevatórias",
    "orc2026": 14666.67,
    "ritmo2026": 21460.48,
    "itens2027": [
     "SUCCÇÃO E LIMPEZA SEMESTRAL DAS ELEVATÓRIAS (ARMAZÉM A E B)"
    ],
    "orc2027": 43792.84,
    "comentario": "Considerar unificação dos Armazéns... Entra B1 e B2 e deixa de ser anual e passa a ser semestral"
   },
   {
    "linha": 6,
    "de2026": "Provisão manutenções emergências",
    "orc2026": 31200.0,
    "ritmo2026": 19862.51,
    "itens2027": [
     "PROVISÃO DE 3% SOBRE A MANUTENÇÃO PARA ITENS NÃO PREVISTOS"
    ],
    "orc2027": 20803.32,
    "comentario": ""
   },
   {
    "linha": 7,
    "de2026": "Preventiva Limpeza fossas",
    "orc2026": 15900.0,
    "ritmo2026": 7950.0,
    "itens2027": [
     "SUCÇÃO E LIMPEZA DO STE (SEMESTRAL) - FOSSA E FILTRO - ARMAZÉM A",
     "SUCÇÃO E LIMPEZA DO STE (SEMESTRAL) - FOSSA E FILTRO - ARMAZÉM B"
    ],
    "orc2027": 24014.31,
    "comentario": ""
   },
   {
    "linha": 8,
    "de2026": "Provisão para iluminação da área comum/manutenções elétricas",
    "orc2026": 21832.26,
    "ritmo2026": 2500.0,
    "itens2027": [
     "VERBA PARA SUBSTITUIÇÃO DE LÂMPADAS NO CONDOMÍNIO"
    ],
    "orc2027": 6000.0,
    "comentario": ""
   },
   {
    "linha": 9,
    "de2026": "Preventiva PPCI/bomba SPK",
    "orc2026": 2650.0,
    "ritmo2026": 11656.84,
    "itens2027": [
     "REVISÃO ANUAL DA BOMBA DE SPK - ARMAZÉM A - RETIRADO DO ORÇAMENTO",
     "REVISÃO ANUAL DA BOMBA DE SPK - ARMAZÉM B1 E B2 - RETIRADO DO ORÇAMENTO"
    ],
    "orc2027": 2.0,
    "comentario": "Compara, mas está em linha separada... Entra em Manutençoes de Bens Móveis"
   },
   {
    "linha": 13,
    "de2026": "Manutenção nas juntas de dilatação contenção #14813862",
    "orc2026": 12964.0,
    "ritmo2026": 13700.34,
    "itens2027": [
     "MANUTENÇÃO DE JUNTA DILATAÇAÕ TERRAE AMRMAZÉM A (T1, T3 E T7)",
     "MANUTENÇÃO DE JUNTA DILATAÇÃO TERRAE ARMAZÉM B (T5 E T6)"
    ],
    "orc2027": 23827.2,
    "comentario": "Importante que base que usou para comparar é somente do A em 2026"
   },
   {
    "linha": 15,
    "de2026": "Provisão reparo sistemas de acesso",
    "orc2026": 16481.84,
    "ritmo2026": 9187.19,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Ficou fora... Mas a base de compraração será a linha de manutenções não previstas de 3%"
   },
   {
    "linha": 18,
    "de2026": "CONTRATO — ADS MANUTENÇÃO PREDIAL",
    "orc2026": 45496.21,
    "ritmo2026": 45458.37,
    "itens2027": [
     "CONTRATO — ADS MANUTENÇÃO PREDIAL",
     "ADITIVO CONTRATO MANUTENÇÃO COBERTURA NO B1"
    ],
    "orc2027": 124271.82,
    "comentario": ""
   },
   {
    "linha": 19,
    "de2026": "CONTRATO — ARC SOLUÇÕES NO COMBATE A INCENDIO",
    "orc2026": 74184.53,
    "ritmo2026": 71223.0,
    "itens2027": [
     "ALTERAÇÃO DO CONTRATO SDAI (RESCISÃO ARC) - ARMAZÉM A E B"
    ],
    "orc2027": 90743.52,
    "comentario": ""
   },
   {
    "linha": 20,
    "de2026": "Laudo linha de vida",
    "orc2026": 6500.0,
    "ritmo2026": 6500.0,
    "itens2027": [
     "LAUDO DE LINHA DE VIDA ARMAZÉM A - ALPENDRE",
     "LAUDO DE LINHA DE VIDA ARMAZÉM A - COBERTURA",
     "LAUDO DE LINHA DE VIDA ARMAZÉM B2 - ALPENDRE",
     "LAUDO DE LINHA DE VIDA ARMAZÉM B2 - COBERTURA DO DOCAS - 125M2",
     "LAUDO DE LINHA DE VIDA ARMAZÉM B2 - COBERTURA ARMAZÉM 400M2"
    ],
    "orc2027": 32500.0,
    "comentario": "Correto. São 5 lihas de vida a serem laudadas"
   },
   {
    "linha": 21,
    "de2026": "CONTRATO — MANUTENÇÃO GERADOR",
    "orc2026": 10266.24,
    "ritmo2026": 9058.46,
    "itens2027": [
     "CONTRATO — MANUTENÇÃO GERADOR"
    ],
    "orc2027": 28252.56,
    "comentario": "Em 2027 entra o Armazém B1 e B2"
   },
   {
    "linha": 22,
    "de2026": "Preventiva/PAE Brigada/ extintores",
    "orc2026": 6000.0,
    "ritmo2026": 6075.0,
    "itens2027": [
     "TREINAMENTO ANUAL DE BRIGADA DE INCÊNDIO DO ARMAZÉM A",
     "RENOVAÇÃO DO PLANO DE EMERGÊNCIA DO ARMAZÉM A COM ART",
     "RENOVAÇÃO DO PLANO DE EMERGÊNCIA DO ARMAZÉM B COM ART",
     "RENOVAÇÃO DE CARGA DE EXTINTORES E LAUDO HIDROSTÁTICO DE MANGUEIRAS"
    ],
    "orc2027": 14110.0,
    "comentario": ""
   },
   {
    "linha": 23,
    "de2026": "Preventiva condicionadores de ar",
    "orc2026": 3200.0,
    "ritmo2026": 3200.0,
    "itens2027": [
     "REVISÃO E MANUTENÇÃO DOS ARES CONDICIONADOS CONFORME PMOC"
    ],
    "orc2027": 7700.0,
    "comentario": "Adequação do contrato para premissa do PMOC (aumento de inspeções e manutenções)"
   },
   {
    "linha": 24,
    "de2026": "Provisão para demarcação de pátio",
    "orc2026": 5000.0,
    "ritmo2026": 411.5,
    "itens2027": [
     "RENOVAÇÃO DE DEMARCAÇÃO SEMESTRAL ENTRADA (PORTARIA A E B) - SOMENTE MATERIAL",
     "RENOVAÇÃO DE DEMERCAÇÃO ANUAL FRENTE DE DOCAS (FAIXAS) - SOMENTE MATERIAL"
    ],
    "orc2027": 7668.63,
    "comentario": ""
   },
   {
    "linha": 25,
    "de2026": "Renovação SPDA",
    "orc2026": 2968.0,
    "ritmo2026": 2700.0,
    "itens2027": [
     "MEDIÇÕES, AFERIÇÕES E LAUDO DO SPDA (ARMAZÉM A E B)"
    ],
    "orc2027": 5400.0,
    "comentario": ""
   },
   {
    "linha": 31,
    "de2026": "Preventiva tratores",
    "orc2026": 13993.59,
    "ritmo2026": 13993.59,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Compara, mas está em linha separada... Entra em Manutençoes de Bens Móveis"
   },
   {
    "linha": 32,
    "de2026": "Provisão Manutenção corretiva tratores",
    "orc2026": 10133.76,
    "ritmo2026": 0.0,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Compara, mas está em linha separada... Entra em Manutençoes de Bens Móveis"
   },
   {
    "linha": 33,
    "de2026": "Manutenção/revisão bomba tratores",
    "orc2026": 10000.0,
    "ritmo2026": 6000.0,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Compara, mas está em linha separada... Entra em Manutençoes de Bens Móveis"
   },
   {
    "linha": 38,
    "de2026": "Provisão de Manutenção corretivas bombas de drenagem",
    "orc2026": 29232.69,
    "ritmo2026": 3000.0,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Comprar com os 3% de manutenções não previstas em 2027"
   },
   {
    "linha": 39,
    "de2026": "Provisão cercas perimetrais e elétricas",
    "orc2026": 12400.0,
    "ritmo2026": 2677.5,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Comprar com os 3% de manutenções não previstas em 2027"
   },
   {
    "linha": 40,
    "de2026": "Preventiva sistema de PPCI com teste NFPA",
    "orc2026": 8260.05,
    "ritmo2026": 9427.0,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Comprar com os 3% de manutenções não previstas em 2027"
   },
   {
    "linha": 54,
    "de2026": "Provisão gastos PPCI",
    "orc2026": 14311.92,
    "ritmo2026": 0.0,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Comprar com os 3% de manutenções não previstas em 2027"
   },
   {
    "linha": 55,
    "de2026": "Provisão Paisagismo",
    "orc2026": 6618.66,
    "ritmo2026": 0.0,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Comprar com os 3% de manutenções não previstas em 2027"
   },
   {
    "linha": 56,
    "de2026": "Provisão gastos com comunicação visual",
    "orc2026": 4515.27,
    "ritmo2026": 0.0,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Comprar com os 3% de manutenções não previstas em 2027"
   },
   {
    "linha": 57,
    "de2026": "Preventiva Limpeza caixa de água/com laudo",
    "orc2026": 4000.0,
    "ritmo2026": 0.0,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Comprar com os 3% de manutenções não previstas em 2027"
   }
  ],
  "semPar": [
   {
    "linha": 10,
    "de2026": "Fabricação e fornecimento de nova bomba para acoplamento do trator 4",
    "ritmo2026": 24999.96
   },
   {
    "linha": 11,
    "de2026": "Manutenção corretiva  e periódica em motor Scania do gerador",
    "ritmo2026": 12300.0
   },
   {
    "linha": 12,
    "de2026": "Comunicação visual horizontal e letreiro do armazém",
    "ritmo2026": 10168.0
   },
   {
    "linha": 14,
    "de2026": "Pacote serralheira *10917019 *12943732",
    "ritmo2026": 11666.65
   },
   {
    "linha": 16,
    "de2026": "Provisão gastos CFTV",
    "ritmo2026": 2100.0
   },
   {
    "linha": 17,
    "de2026": "Peças para painéis elétricos (substituir disjuntores e contatoras do sinistro)",
    "ritmo2026": 3548.41
   },
   {
    "linha": 26,
    "de2026": "Rota de Fuga",
    "ritmo2026": 119434.1
   },
   {
    "linha": 27,
    "de2026": "Reservatório 02: Prever tratamento e pintura interno e externo #14527327",
    "ritmo2026": 88000.0
   },
   {
    "linha": 28,
    "de2026": "Cabeçote, juntas e pistões/ trator 2 #14745887 (parcelamento em 8x)",
    "ritmo2026": 53745.96
   },
   {
    "linha": 29,
    "de2026": "Manutenção chicote trator 01",
    "ritmo2026": 16366.38
   },
   {
    "linha": 37,
    "de2026": "Compra de ar condicionado #14596535",
    "ritmo2026": 2500.0
   },
   {
    "linha": 41,
    "de2026": "Sinistro calhas e rufos",
    "ritmo2026": 8920.0
   },
   {
    "linha": 42,
    "de2026": "Manutenção geral dos dilaceradores",
    "ritmo2026": 8392.14
   },
   {
    "linha": 43,
    "de2026": "Manutenção corretiva na bomba jockey do sistema SPK",
    "ritmo2026": 7865.0
   },
   {
    "linha": 44,
    "de2026": "Fechamento perimetral Avenida Standard",
    "ritmo2026": 7000.0
   },
   {
    "linha": 45,
    "de2026": "Reparo em tubos de drenagem usados pelo trator",
    "ritmo2026": 4370.0
   },
   {
    "linha": 46,
    "de2026": "Totem MEGA: Manutenção emergencial nas hastes das luminárias #17941853",
    "ritmo2026": 3800.0
   },
   {
    "linha": 47,
    "de2026": "Manutenção emergencial no sistema de arrefecimento no motor MWM",
    "ritmo2026": 3471.55
   },
   {
    "linha": 48,
    "de2026": "Adequação da área externa conforme projeto PPCI (compra de extinotores e placas)",
    "ritmo2026": 2152.2
   },
   {
    "linha": 49,
    "de2026": "Extintores ABC área comum",
    "ritmo2026": 1988.8
   },
   {
    "linha": 50,
    "de2026": "Transporte tratores do Mega para a Sotrima",
    "ritmo2026": 1600.0
   },
   {
    "linha": 51,
    "de2026": "Estravasores fase 01",
    "ritmo2026": 1500.0
   },
   {
    "linha": 52,
    "de2026": "Análise de água potável",
    "ritmo2026": 853.0
   },
   {
    "linha": 53,
    "de2026": "Detectores de fumaça",
    "ritmo2026": 659.0
   }
  ]
 },
 "Mega Itajaí": {
  "arquivo": "ORÇAMENTO 2027 - COMPARAÇÃO DE ITENS RITMO 2026 x ORÇ 2027 - MEGA ITAJAÍ.xlsx",
  "adiados": [
   {
    "linha": 2,
    "de2026": "Iluminação bolsão externo * 12182452",
    "orc2026": 20383.5,
    "ritmo2026": 1800.0,
    "itens2027": [
     "INSTALAÇÃO DE ILUMINAÇÃO PARA O BOLSÃO DE VEÍCULOS LEVES (ESTACIONAMENTO)"
    ],
    "orc2027": 5937.74,
    "comentario": "Não compara, pois não foi realizado, apenas deslocamos de 2026 para 2027"
   },
   {
    "linha": 3,
    "de2026": "Iluminação rua armazém 4/5 * 6011694",
    "orc2026": 13589.0,
    "ritmo2026": 17250.0,
    "itens2027": [
     "INSTALAÇÃO DE ILUMINAÇÃO ADICIONAL NA LATERAL DO AMZ 4 E 5 (PERÍMETRO)"
    ],
    "orc2027": 11875.48,
    "comentario": "Não compara, pois não foi realizado, apenas deslocamos de 2026 para 2027"
   },
   {
    "linha": 4,
    "de2026": "Organização quadro elétrico portaria * 2791575",
    "orc2026": 4890.0,
    "ritmo2026": 5900.0,
    "itens2027": [
     "ORGANIZAÇÃO, IDENTIFICAÇÃO E DESATIVAÇÃO DE CIRCUITOS INOPERANTES QUADRO PORTARIA"
    ],
    "orc2027": 4290.0,
    "comentario": "Não compara, pois não foi realizado, apenas deslocamos de 2026 para 2027"
   },
   {
    "linha": 22,
    "de2026": "Reparo recalque docas funcionais * 14752188",
    "orc2026": 75334.66,
    "ritmo2026": 0.0,
    "itens2027": [
     "NIVELAMENTO DAS DOCAS DO ARMAZÉM 4 E 5 (R$ 188,88/M2 X 800m2)",
     "ELEVAÇÃO DE PAVIMENTO NA DOCA DOS MÓDULOS 12 E 13 (R$ 188,88/m2 x 315m2)"
    ],
    "orc2027": 210601.2,
    "comentario": "Não compara, pois não foi realizado, apenas deslocamos de 2026 para 2027"
   },
   {
    "linha": 23,
    "de2026": "02 torniquetes digcon par ampliação da portaria * 14752402",
    "orc2026": 146800.0,
    "ritmo2026": 0.0,
    "itens2027": [
     "COMPRA DE 3 TORNIQUETES TX1500 DIGICON INOX (PARCELADO 3X)"
    ],
    "orc2027": 206700.0,
    "comentario": "Não compara, pois não foi realizado, apenas deslocamos de 2026 para 2027"
   },
   {
    "linha": 25,
    "de2026": "Impermeabilização subestações * 3886349",
    "orc2026": 44750.69,
    "ritmo2026": 0.0,
    "itens2027": [
     "IMPERMEANILIZAÇÃO DA LAJE DA SUBESTAÇÃO 1 - A CADA 5 ANOS",
     "IMPERMEABILIZAÇÃO DA LAJE DA SUBESTAÇÃO 2 - A CADA 5 ANOS"
    ],
    "orc2027": 131769.55,
    "comentario": "Não compara, pois não foi realizado, apenas deslocamos de 2026 para 2027"
   },
   {
    "linha": 27,
    "de2026": "Impermeabilização casa de bombas * 12494396",
    "orc2026": 27375.36,
    "ritmo2026": 0.0,
    "itens2027": [
     "IMPERMEABILIZAÇÃO DA LAJE DA CASA DE BOMBAS - A CADA 5 ANOS"
    ],
    "orc2027": 39426.11,
    "comentario": "Não compara, pois não foi realizado, apenas deslocamos de 2026 para 2027"
   }
  ],
  "pares": [
   {
    "linha": 1,
    "de2026": "Pintura alvenaria fase 01 e 02 *  14752305",
    "orc2026": 113942.0,
    "ritmo2026": 0.0,
    "itens2027": [
     "PINTURA DA ALVENARIA DAS FACES EXTERNAS DO ARMAZÉM 1, 2 E 3"
    ],
    "orc2027": 171000.0,
    "comentario": "Em 2026 é parcial"
   },
   {
    "linha": 5,
    "de2026": "CONTRATO — PREVENTIVA E CORRETIVA DAS COBERTURAS",
    "orc2026": 237168.0,
    "ritmo2026": 97920.0,
    "itens2027": [
     "CONTRATO — PREVENTIVA E CORRETIVA DAS COBERTURAS"
    ],
    "orc2027": 132723.16,
    "comentario": ""
   },
   {
    "linha": 6,
    "de2026": "CONTRATO — ORBITAL ENGENHARIA E SISTEMAS DE SEGURANCA",
    "orc2026": 125196.6,
    "ritmo2026": 60000.0,
    "itens2027": [
     "CONTRATO — FIRECAM"
    ],
    "orc2027": 120000.0,
    "comentario": "[o par mudou; na versão anterior, linha 6] Orbital é PPCI e FM é Segurança Eletrônica... Orbital foi rescindido e entrou a Firecam para SDAI (PPCI). FM é contrato novo"
   },
   {
    "linha": 7,
    "de2026": "Preventiva Limpeza fossas",
    "orc2026": 0.0,
    "ritmo2026": 69390.0,
    "itens2027": [
     "SERVIÇO DE LIMPEZA E SUCÇÃO ANUAL DAS FOSSAS (R$ 80 M3 X 450M3)"
    ],
    "orc2027": 36000.0,
    "comentario": ""
   },
   {
    "linha": 8,
    "de2026": "Preventiva/PAE Brigada/ extintores",
    "orc2026": 15619.55,
    "ritmo2026": 29609.55,
    "itens2027": [
     "PLANO DE EMERGÊNCIA E CURSO DE BRIGADA DE INCÊNDIO NR 23 ANUAL",
     "SERVIÇO DE RECARGA DE EXTINTORES E TESTE HIDROSTÁTICO DE MANGUEIRAS"
    ],
    "orc2027": 14560.0,
    "comentario": ""
   },
   {
    "linha": 9,
    "de2026": "Material de construção",
    "orc2026": 0.0,
    "ritmo2026": 3981.57,
    "itens2027": [
     "MATERIAL DE CONSTRUÇÃO PARA USO PELO ZELADOR PARA PEQUENOS REPAROS"
    ],
    "orc2027": 18000.0,
    "comentario": ""
   },
   {
    "linha": 10,
    "de2026": "Contrato Rentbrella * 6995759",
    "orc2026": 14400.0,
    "ritmo2026": 7200.0,
    "itens2027": [
     "MAQUINA DE GUARDA-CHUVA RENTBRELLA"
    ],
    "orc2027": 14400.0,
    "comentario": ""
   },
   {
    "linha": 20,
    "de2026": "Provisão gastos com comunicação visual * 3311473 /  6014375",
    "orc2026": 9640.14,
    "ritmo2026": 9640.14,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": ""
   },
   {
    "linha": 24,
    "de2026": "Reforma reservatórios de água *6143163",
    "orc2026": 85000.0,
    "ritmo2026": 74000.0,
    "itens2027": [
     "LIMPEZA, TRATAMENTO E PINTURA DO RESERVATÓRIO SPK"
    ],
    "orc2027": 179543.16,
    "comentario": "Não é o mesmo reservatório, mas compara"
   },
   {
    "linha": 26,
    "de2026": "Limpeza vertical fase 3 * 8295809",
    "orc2026": 84798.35,
    "ritmo2026": 90000.0,
    "itens2027": [
     "LIMPEZA DAS ESTRUTURAS METÁLICAS DO ARMAZÉM 1, 2 E 3"
    ],
    "orc2027": 90000.0,
    "comentario": "Outra área"
   },
   {
    "linha": 29,
    "de2026": "Provisão reparo sistemas de acesso",
    "orc2026": 24801.52,
    "ritmo2026": 0.0,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": ""
   },
   {
    "linha": 30,
    "de2026": "Preventiva condicionadores de ar",
    "orc2026": 4750.0,
    "ritmo2026": 3040.0,
    "itens2027": [
     "CONTRATO DE MANUTENÇÃO DE APARELHOS DE AR CONDICIONADO CONFORME PMOC"
    ],
    "orc2027": 9840.0,
    "comentario": "Melhoria no contrato"
   },
   {
    "linha": 31,
    "de2026": "CONTRATO — RODRIGO ROHDE",
    "orc2026": 36386.7,
    "ritmo2026": 38458.32,
    "itens2027": [
     "CONTRATO — RODRIGO ROHDE"
    ],
    "orc2027": 45144.0,
    "comentario": ""
   },
   {
    "linha": 32,
    "de2026": "CONTRATO — MG GERADORES EIRELI",
    "orc2026": 31303.37,
    "ritmo2026": 24999.98,
    "itens2027": [
     "CONTRATO — MG GERADORES"
    ],
    "orc2027": 26719.92,
    "comentario": ""
   },
   {
    "linha": 34,
    "de2026": "Preventiva analise de efluentes",
    "orc2026": 15012.88,
    "ritmo2026": 17268.24,
    "itens2027": [
     "SERVIÇO DE ANÁLISE LABORATORIAL SEMESTRAL DOS 20 STE (ENTRADA E SAÍDA)"
    ],
    "orc2027": 21693.32,
    "comentario": ""
   },
   {
    "linha": 44,
    "de2026": "Provisão manutenções emergências",
    "orc2026": 54000.0,
    "ritmo2026": 40500.0,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Entra na provisão dos 3%"
   },
   {
    "linha": 45,
    "de2026": "Provisão para iluminação da área comum/manutenções elétricas",
    "orc2026": 24170.92,
    "ritmo2026": 12085.46,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Entra na provisão dos 3%"
   },
   {
    "linha": 46,
    "de2026": "Preventivo/recalque paver preventivo de incêndio * 4168847",
    "orc2026": 14000.0,
    "ritmo2026": 11895.66,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Teve esse serviço em 2026. Favor reconferir"
   },
   {
    "linha": 48,
    "de2026": "Preventiva trator/tratorito",
    "orc2026": 8762.5,
    "ritmo2026": 2036.5,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Entra em outra linha... Mautenção de Bens Móveis"
   },
   {
    "linha": 51,
    "de2026": "Preventiva Limpeza caixa de água/com laudo",
    "orc2026": 5708.0,
    "ritmo2026": 6895.63,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Virou contrato"
   },
   {
    "linha": 63,
    "de2026": "Preventiva bombas de drenagem",
    "orc2026": 1800.0,
    "ritmo2026": 1925.0,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Entra em outra linha... Mautenção de Bens Móveis"
   },
   {
    "linha": 81,
    "de2026": "Reparo recalque área de docas fase  3 * 6551917 / 6551928",
    "orc2026": 51352.56,
    "ritmo2026": 0.0,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Lina 1 da planilha"
   },
   {
    "linha": 82,
    "de2026": "Provisão gastos PPCI",
    "orc2026": 15562.23,
    "ritmo2026": 0.0,
    "itens2027": [],
    "orc2027": 0.0,
    "comentario": "Entra na provisão dos 3%"
   }
  ],
  "semPar": [
   {
    "linha": 11,
    "de2026": "Escadas marinheiro e subestação 02",
    "ritmo2026": 59180.0
   },
   {
    "linha": 12,
    "de2026": "Robo tubulação",
    "ritmo2026": 55190.0
   },
   {
    "linha": 13,
    "de2026": "Esgoto Restaurante",
    "ritmo2026": 48750.0
   },
   {
    "linha": 14,
    "de2026": "Cancela 03",
    "ritmo2026": 30000.0
   },
   {
    "linha": 15,
    "de2026": "Iluminação externa armazéns 02 e 03",
    "ritmo2026": 22500.0
   },
   {
    "linha": 16,
    "de2026": "Recuperação e manutenção do totem do bolsão externo",
    "ritmo2026": 17400.0
   },
   {
    "linha": 17,
    "de2026": "Vidros blindados da portaria",
    "ritmo2026": 15984.97
   },
   {
    "linha": 18,
    "de2026": "Abertura do pavimento interno da frente do restaurante",
    "ritmo2026": 15500.0
   },
   {
    "linha": 19,
    "de2026": "Redutores de velocidade armazéns (Cones E New Jersey)",
    "ritmo2026": 15000.0
   },
   {
    "linha": 21,
    "de2026": "SEGURO MEGA ESTEIO - ÁRMAZEM A",
    "ritmo2026": 7900.0
   },
   {
    "linha": 28,
    "de2026": "Troca lona totem *14795504",
    "ritmo2026": 31290.4
   },
   {
    "linha": 33,
    "de2026": "Limpeza pórtico prédio apoio/pórtico *10229601",
    "ritmo2026": 28728.2
   },
   {
    "linha": 35,
    "de2026": "Obra cancelas 2/2 *  2594805 (Equipamentos eletronicos)",
    "ritmo2026": 124200.0
   },
   {
    "linha": 39,
    "de2026": "Botão Pânico clientes * 14753033",
    "ritmo2026": 24311.5
   },
   {
    "linha": 40,
    "de2026": "Bicicletario externo * 14512183",
    "ritmo2026": 11500.0
   },
   {
    "linha": 43,
    "de2026": "NFPA 25 casa de bombas",
    "ritmo2026": 8890.0
   },
   {
    "linha": 47,
    "de2026": "PPCI prédio de apoio *2803230",
    "ritmo2026": 11733.32
   },
   {
    "linha": 49,
    "de2026": "Projeto executifo infra eletrica e logica cancelas",
    "ritmo2026": 8075.0
   },
   {
    "linha": 50,
    "de2026": "Tubulação de hidrante Magazine Luiza módulo 09",
    "ritmo2026": 7500.0
   },
   {
    "linha": 52,
    "de2026": "Manutenção eixo trator",
    "ritmo2026": 5649.4
   },
   {
    "linha": 53,
    "de2026": "Registro bomba de recalque caixa dágua",
    "ritmo2026": 4750.0
   },
   {
    "linha": 54,
    "de2026": "Bebedouro externo industrial 100L",
    "ritmo2026": 3898.0
   },
   {
    "linha": 55,
    "de2026": "Video Porteiro porta blindada",
    "ritmo2026": 3813.0
   },
   {
    "linha": 56,
    "de2026": "Esgotamento subsolo restaurante",
    "ritmo2026": 3500.0
   },
   {
    "linha": 57,
    "de2026": "Limpeza da gordura do restaurante (Subsolso Restaurante)",
    "ritmo2026": 3500.0
   },
   {
    "linha": 58,
    "de2026": "Manutenção emergencial rede hidraulica convivencia",
    "ritmo2026": 2500.0
   },
   {
    "linha": 59,
    "de2026": "Goteiras Rio Branco",
    "ritmo2026": 2400.0
   },
   {
    "linha": 60,
    "de2026": "Goteiras Magnum",
    "ritmo2026": 2400.0
   },
   {
    "linha": 61,
    "de2026": "Registros de hidrante Stella módulo 15",
    "ritmo2026": 2300.0
   },
   {
    "linha": 62,
    "de2026": "Motor do dilacerador 02",
    "ritmo2026": 1940.9
   },
   {
    "linha": 64,
    "de2026": "Baterias centrais arm. 04 e 05 e casa de bombas",
    "ritmo2026": 1598.52
   },
   {
    "linha": 65,
    "de2026": "Extintores e Mangueiras",
    "ritmo2026": 1260.0
   },
   {
    "linha": 66,
    "de2026": "Gaiola para carregar lixo no trator",
    "ritmo2026": 980.0
   },
   {
    "linha": 67,
    "de2026": "Preventiva tobata",
    "ritmo2026": 971.0
   },
   {
    "linha": 68,
    "de2026": "Solda motor cancela 04",
    "ritmo2026": 950.0
   },
   {
    "linha": 69,
    "de2026": "LED Catraca 03",
    "ritmo2026": 949.0
   },
   {
    "linha": 70,
    "de2026": "Lâmpadas led",
    "ritmo2026": 925.75
   },
   {
    "linha": 71,
    "de2026": "Manuatenção Corretiva Cerca elétrica fase 04",
    "ritmo2026": 924.7
   },
   {
    "linha": 72,
    "de2026": "Manutenção máquinas de alta pressão (Zelador e ASG)",
    "ritmo2026": 917.0
   },
   {
    "linha": 73,
    "de2026": "Reposiçã das Luminárias das palmeiras",
    "ritmo2026": 813.44
   },
   {
    "linha": 74,
    "de2026": "Resistencia bomba diesel",
    "ritmo2026": 551.0
   },
   {
    "linha": 75,
    "de2026": "Tubulação PVC Subsolo restaurante",
    "ritmo2026": 550.0
   },
   {
    "linha": 76,
    "de2026": "Baterias e acionador Tecnohold",
    "ritmo2026": 535.48
   },
   {
    "linha": 77,
    "de2026": "Caçamba de entulho",
    "ritmo2026": 450.0
   },
   {
    "linha": 78,
    "de2026": "Tomada estação de guarda-chuva",
    "ritmo2026": 450.0
   },
   {
    "linha": 79,
    "de2026": "Pino eixo tratorito",
    "ritmo2026": 196.0
   }
  ]
 }
};
