# Conferência: v4 apresentada (13/10/2026) × geração de hoje (22/10/2026)

Fonte: `FACILITIES - APRESENTAÇÃO ORÇAMENTO 2027 v4.pptx` (180 slides), baixado pelo Guilherme em 22/10/2026.
O texto de cada slide (na ordem, com anotações e nº de imagens) está em `v4_apresentada_13-10-2026.json`,
extraído com `node ferramentas/ler_pptx.js <arquivo.pptx> <saida.json>` (sem Python).

Comparado com a geração de hoje (planilhas de 22/10, dados de teste): títulos e textos, números trocados por `#`
(o financeiro muda na V2 e não conta como perda).

## Perdas encontradas e corrigidas
1. **Premissas de cada Mega.** Na v4 o gestor escreveu premissas próprias por Mega; a geração punha as 4 gerais de
   Facilities nos três. Agora em `ORC_PREMISSAS_MEGA` (10_Capa.gs), com o texto da v4 (só erros de português
   corrigidos). Facilities continua com `ORC_PREMISSAS_ITENS`.
2. **Os 2 slides "DRONE AUTÔNOMO (XDRONE)" do Curitiba** (v4 132–133) não têm a marca "[REGISTRO FOTOGRÁFICO · …]"
   nas anotações, então contavam como gerados e não eram copiados. Agora entram por `ORC_GESTOR_SEM_MARCA`
   (31_VersaoFinal.gs). Outro slide do gestor sem marca: acrescentar o começo do título lá.

## Diferenças que não são perda
- **Sem o slide "Resumo executivo"** nos Megas: a v4 apresentada já não tinha (a geração tirou em 22/10).
- **Capas e sub capas** aparecem na v4 como imagem com os números; no teste local saem em formas (sem as imagens).
- **Rótulos curtos** (Ofensores/Defensores, Distribuição mensal, "ORÇ. RC", "HISTÓRICO"…): vêm da planilha de
  textos e das fontes que o gestor digitou nos slides, que a geração guarda antes de regerar e põe de volta.
- **Itajaí sem as categorias Estrutura Metálica, Pavimentação e Sinalização Viária**: as obras saíram na V2.
- **Novos na V2**: expediente (Facilities), impacto V1 → V2, "o que saiu e o que entrou", m² com IPTU por Mega.
- **Slides do gestor** (Moked, A Sense, fotos de obras…): todos com âncora existente na geração de hoje — voltam
  no mesmo lugar ao gerar o Mega completo.
