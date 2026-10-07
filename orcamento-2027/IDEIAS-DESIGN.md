# Ideias de design para o deck do orçamento

Escrito em 07/10/2026, a pedido do Guilherme, a partir da pasta onde ele produz vídeos (capas, thumbnails,
carrosséis, design systems e o processo de revisão que usa lá). Essa pasta é pessoal e vai ser apagada; **o que
serve para o deck ficou aqui**. As imagens de referência não foram copiadas porque mostram pessoas e marcas de
terceiros. Estão descritas em palavras, e a regra é copiar a técnica, nunca a identidade de outra marca.

> **Status: nada aqui foi aprovado.** O padrão dos Megas continua valendo (HANDOFF §6). Toda mudança visual segue o
> mesmo caminho: propor, mostrar o PNG, esperar o "sim" do gestor e só depois mexer no gerador.

## Decisão de 07/10/2026: o visual é de Big Four, não de vídeo

- **Reprovado:** a sub capa "jeito YouTube" (foto em retícula, papel rasgado, girada, traço de caneta, serifa
  itálica). Nas palavras do Guilherme: "não ficou nada corporativo, ficou coisa de documentário; estamos em ambiente
  corporativo, pense nas grandes empresas de auditoria do mundo". Daqui em diante, retícula, rasgo, caneta, carimbo
  e textura de papel **não entram** no deck. As seções 2 a 5 abaixo valem só no que é conteúdo e estrutura (título com
  a conclusão, número protagonista, trilha de navegação, encerramento, infográficos limpos).
- **Aprovado:** sub capa **C1 "relatório claro"**: fundo branco, número da seção grande, título, frase, o número da
  seção (R$, R$/m² ao mês, variação contra o ritmo), foto colorida sem efeito num bloco à direita e a trilha das
  seções no pé. Mais um **Sumário** depois da capa, no mesmo estilo. Número e nome do sumário e da trilha são link para
  a sub capa. Código em `10_Capa.gs` (`gerarSlideSubcapa_`, `gerarSlideSumario_`); fotos, foco e frases em
  `ORC_SUBCAPAS` / `ORC_FOTO_FOCO` (`01_Config.gs`).
- Como chegamos: 3 simulações (A painel, B caixa, C relatório claro) → favorita C → dois analistas fizeram mais 6
  (C1–C3 refinando a C; D1–D3 direções novas). Simulações em `ferramentas/saida/` (fora do git).
- Prévia sem abrir o Slides: `PREVIA=ferramentas/saida node teste/teste_orcamento.js` e
  `python ferramentas/previa_slides.py ferramentas/saida/formas_itajai.json <índices>`.

---

## 1. Princípios que valem para qualquer slide

1. **Uma ideia por slide, e o título diz a conclusão.** A thumb boa não repete o título do vídeo: diz o que ele
   tem de mais forte, em 2 ou 3 palavras. No deck, o equivalente é o título-manchete:
   "Manutenção" → "Manutenção sobe 8%: dois projetos explicam R$ 90 mil".
2. **Um protagonista por slide.** Tem que estar claro onde o olho cai primeiro: um número, uma barra, uma linha da
   tabela. "Se tudo é destaque, nada é": uma palavra ou um número em destaque por tela.
3. **Variar dentro de um sistema.** A melhor referência eram 12 cartazes diferentes que se via na hora serem da
   mesma marca. Fixo: grade, fontes, lugar do rótulo, rodapé. Muda: a imagem, o número e um acento de cor. É o que
   as subcapas precisam (hoje são idênticas, só troca o texto).
4. **Cor com função e com lugar.** No deck: azul é a marca; **verde e vermelho só para variação** (economia e
   aumento); laranja só para pendência. Cor decorativa que conflita com essas leituras está proibida.
   Uma técnica boa: a cor de destaque acompanha o assunto de slide em slide (nas referências, um ponto de cor
   passava de uma imagem para a outra e guiava o olho). Aqui, a conta em foco fica sempre na mesma cor em todos
   os gráficos da seção.
5. **Passar no teste da miniatura.** Capa de vídeo é conferida em 168 × 94 px: o que precisa ser lido tem que
   sobreviver à redução. No deck, a conferência é a grade de miniaturas do Slides, o PDF no celular e o projetor.
   Medido em 07/10: o código tem 27 textos com fonte entre 4 e 6,9 pt e 18 com `fsMin` de 5,x pt. **Proposta:**
   número que sustenta a conclusão com pelo menos 9 pt; abaixo de 6,5 pt, só fonte e rodapé.
6. **O assunto ocupa a tela.** Nas cenas principais, o protagonista ocupa de 60% a 85% da área útil. Espaço vazio
   demais parece inacabado; o respiro fica em volta do herói, não no slide inteiro.
7. **A imagem explica a frase.** Faça o **teste da troca**: troque a foto por qualquer outra do mesmo tipo. Se o
   slide continuar igual, a foto é só decoração. Melhor um detalhe do Mega ligado ao assunto (o telhado na
   manutenção, a portaria na segurança) do que uma foto bonita qualquer.
8. **Não inventar.**
   - Nenhuma imagem gerada por IA que pareça foto real do Mega.
   - Nenhum dado que não venha das fontes (combina com a regra do alerta de pendência).
   - Esquema desenhado leva "esquema, fora de escala".

## 2. Capa e subcapas: propostas

**Capa** (`10_Capa.gs`). Já faz certo: foto do Mega, véu, degradê que deixa o texto legível e os dois números.
- **Um número herói, não dois iguais.** O total do orçamento grande; o R$/m² ao mês menor, embaixo.
- **Título com uma palavra de destaque.** Duas opções das referências:
  - o ano numa caixa de cor ("Orçamento **[2027]**");
  - sans pesada com uma palavra em serifa itálica ("Mega Curitiba *2027*").

**Subcapas** (`gerarSlideSubcapa_`). Hoje são um fundo azul-escuro com "01" e o título, iguais em todas as seções.
- **Foto do próprio Mega ligada à seção**, em P&B com retícula na cor da marca, ocupando a metade direita, com
  borda de papel rasgado ou corte reto. Precisa das fotos (pedir ao gestor).
  - O tratamento sai do `ferramentas/efeitos_imagem.py foto` e a imagem sobe para o Drive.
  - O gerador só insere pelo ID, como já faz com `fotoFundoId`.
- **O capítulo abre com o número dele:** orçamento da seção, variação contra o ritmo e R$/m² ao mês.
  ⚠ O comentário do `10_Capa.gs` diz "só a capa mostra números": é a decisão atual, só muda com o "sim" do gestor.
- **Mini-sumário:** a lista das seções com a atual acesa ("onde estamos").

**Trilha de navegação no rodapé de todo slide.** É o recurso mais útil entre as referências: num vídeo de história,
uma régua do tempo fixa no rodapé mostrava sempre em que ponto da história o espectador estava. No deck:
`Premissas · Resumo · DRE · Manutenção · Segurança · Limpeza · Projetos · m²`, com a seção atual acesa. Para 40
slides, é o que impede o diretor de se perder.
- Implementação: um helper `_orcTrilha_(slide, W, H, secao)` chamado em `_orcPasso_`, que já sabe a seção corrente
  pelo `secao()` do `00_Main.gs`.
- Somar um rótulo de seção no canto do cabeçalho ("04 · MANUTENÇÃO"), como os rótulos de canto dos vídeos.

**Encerramento.** Carrossel bom tem a mesma estrutura: o 1º slide é o gancho, no meio vai um fato por slide e o
último pede a ação. O deck hoje termina no Custo por m², sem fechamento.
- **Proposta:** um slide "O que precisamos decidir", com as decisões pedidas ao diretor, as pendências que continuam
  abertas e os próximos passos.
- Espelha o `25_Slide_Encerramento.gs` dos Megas.

## 3. Infográficos: formatos que funcionaram e onde caberiam

| Formato da referência | Como é | Onde entra no deck |
|---|---|---|
| **Mapa de ideias** | conceito no centro circulado à caneta, ramos com rótulo e ícone | "Para onde vai cada R$ 1": total no centro, grupos da DRE nos ramos com R$ e R$/m² |
| **Lista numerada à mão** | 1 a 6 em círculos, cada item com um mini-desenho | "Pontos de atenção" do Resumo Executivo; pendências |
| **Antes → depois** | seta grande entre dois números ("1M → 0"); divisão diagonal | Ritmo 2026 → Orç 2027 por conta; abertura de seção |
| **Cartões de notificação** | cartões com ícone, título e uma linha, com sombra, sobre fundo de grade | os **achados** (seguro lançado na manutenção, Mega sem verba de CFTV…): um cartão por achado com o valor. Tom corporativo: cartão limpo, sem fita adesiva |
| **Contador em blocos** | um algarismo por cartão (1 · 9 · 0 · 1) | o número herói da capa ou da subcapa |
| **Régua do tempo** | paradas (lugar + ano) numa linha com marcador | o ano mês a mês com os marcos: reajuste de contrato, projetos (o totem em janeiro, a iluminação em fevereiro). Explica os picos do slide Mensal |
| **Planta técnica** | desenho que se traça na ordem do engenheiro, cotas, "FIG. 1" | Custo por m², **só se houver área por galpão** nas fontes |
| **Carimbo que bate** | moldura dupla, letra de máquina, tinta falhada, levemente girado | o selo ⚠ PENDENTE / REVISAR com mais presença. PNG pronto: `efeitos_imagem.py carimbo "PENDENTE"` |
| **Gráfico que se explica sozinho** | título = conclusão, a série principal na cor de acento, o resto em cinza, rótulo direto em vez de legenda | todos os gráficos de barras e linhas |

## 4. Ilustrações

A regra que mais valeu nos vídeos: **o efeito fala a língua do material**. Num deck, isso quer dizer **um estilo de
desenho para o deck inteiro**, com o mesmo traço, a mesma espessura e as mesmas cores. Ícone de um estilo, mapa de
outro e foto de um terceiro parecem três apresentações coladas.

**1. Ícones de conta e de seção: o vocabulário do deck.** Um ícone por grupo da DRE, sempre o mesmo onde o grupo
aparece: trilha de navegação, subcapa, DRE, mapa de "para onde vai cada R$ 1" e cartões de achado.

| Grupo | Ícone sugerido |
|---|---|
| Manutenção | chave inglesa |
| Segurança | escudo ou câmera |
| Limpeza e conservação | vassoura ou gota |
| Utilities | raio + gota |
| IPTU | documento com prédio |
| Seguro | guarda-chuva |
| Projetos | capacete de obra |
| Custo por m² | planta com régua |

Regras dos ícones:
- de traço (contorno), na espessura do texto, em `brandMed`, nunca coloridos um a um;
- tirados de uma biblioteca de licença aberta (Material Symbols, Apache 2.0, ou Lucide, ISC), todos da mesma
  família;
- exportados em PNG e inseridos pelo ID.

**2. O Mega desenhado: a ilustração que só este deck pode ter.** Os longos de mapa e documentos funcionam porque o
lugar da história aparece desenhado, com alfinete e caneta marcando onde as coisas acontecem. No deck: a planta de
implantação do Mega simplificada (galpões, portaria, pátio, bolsão), com alfinetes nos gastos que têm lugar. Exemplos:
o totem na entrada, a iluminação do bolsão, a linha de vida no telhado, o CFTV na portaria.
- **Projetos 2027 no mapa:** cada projeto alfinetado onde acontece, com o valor. O diretor entende o "onde" e o
  "quanto" num olhar.
- **Área do Esteio (24 mil → 53 mil m²):** a planta com os blocos novos destacados explica o aumento melhor que o
  número sozinho.
- ⚠ **Não inventar a forma do Mega.** O desenho sai da planta real, que o gestor precisa mandar. Sem a planta, leva o
  aviso "esquema, fora de escala", como nos vídeos.
- Como fazer: desenhar uma vez em PNG (traço fino na cor da marca, fundo transparente) e o gerador põe os alfinetes
  e valores por cima, em formas do Slides. Assim os números continuam vindo das fontes a cada geração.

**3. Anotação de caneta: uma por slide.** Nas capas de referência, o círculo vermelho feito à mão em volta da palavra
principal, a seta curva e o sublinhado guiam o olho mais do que qualquer cor. No deck, serve para marcar **o** número
que importa numa tabela ou num gráfico: a linha que mais subiu, o item pendente.
- PNG transparente: `python ferramentas/efeitos_imagem.py caneta circulo|seta|sublinhado saida.png`.
- Vermelho só quando é aumento ou problema; azul da marca quando é só "olhe aqui".

**4. Pictograma de quantidade.** Um ícone = uma unidade. Nas referências, uma grade de 220 "chips" mostrava o
tamanho de um número melhor que o próprio número. No deck: a área em blocos de 1 mil m², ou os contratos como uma
grade de cartões (um por contrato) com os que reajustaram acima do índice destacados.

**5. Desenho técnico para obra.** Para projeto de engenharia (linha de vida, telhado, iluminação): esquema em traço
de planta, com cotas e "FIG. 1". Desenha na ordem do engenheiro (contorno → detalhe → cotas → rótulos) e leva
"esquema, fora de escala".

**6. Imagem gerada por IA, se for usar.** Vale o que se aprendeu nas capas:
- gerar a base **sem texto** ("NO text, NO letters, NO numbers, NO logos"); o texto entra depois, na fonte da marca;
- tem que parecer ilustração ("isometric illustration", "clearly a scale model"), **nunca foto do Mega**;
- nada de pessoas reconhecíveis nem marca de terceiros;
- conferir o resultado na miniatura antes de usar.

Uso possível: uma ilustração isométrica de galpão logístico genérico, no estilo da marca, como fundo de subcapa
quando não houver foto boa do Mega.

**O que não usar no deck da diretoria:**
- **Mascote ou personagem.** Nos vídeos, a pesquisa mostrou que mascote sozinho não segura atenção, e no deck
  ainda tira a seriedade.
- **Papel recortado e caderno rabiscado.** São linguagens de vídeo leve.
- **Gravuras antigas.** Não têm relação com o assunto.

## 5. Tipografia

- O par da marca é **Montserrat + Open Sans**: fica.
- **Destaque das referências:** sans pesada com UMA palavra em serifa itálica ("Become *Premium*", "Changed
  *Forever*").
  - Opções: Instrument Serif ou Playfair Display, ambas Google Fonts. O Slides aceita a fonte pelo nome em
    `setFontFamily`.
  - Só em capa e subcapa, nunca em tabela.
  - Ao adotar uma fonte nova, acrescente o fator dela em `_ORC_FATOR_FONTE` (`00_Helpers.gs`). Sem isso, a
    estimativa de largura erra e o teste deixa de pegar texto cortado.
- **Escala fixa**, como nos design systems de vídeo (gigante · xl · l · m · s · corpo · rótulo · canto). Para o deck:
  herói 40 · título de seção 30 · título de slide 19 · corpo 9 a 12 · rodapé 7. Fora da escala, só com motivo.

## 6. O que o Google Slides não faz, e o contorno

| Não faz pelo Apps Script | Contorno |
|---|---|
| Gradiente | faixas de retângulos interpolados (`_orcGradiente_`, já existe) |
| Filtro de imagem (P&B, retícula, grão), borda rasgada | gerar o PNG antes: `ferramentas/efeitos_imagem.py foto … --rasgado` |
| Sombra configurável | sombra dura: retângulo escuro deslocado 3 a 4 pt por trás do cartão. Sombra suave: já embutida no PNG (`com_sombra`) |
| Carimbo, textura de papel | PNG transparente gerado em Python e inserido por cima |
| Rotação | `setRotation` funciona em forma e imagem: cartões e carimbos levemente girados (−2° a −6°) |

## 7. Processo (o que mais rendeu na produção de vídeo)

1. **Estratégia antes da produção.** Ideia nova vira proposta (texto e rascunho) e espera o "sim". Só depois mexe
   no gerador.
2. **Ficha antes de desenhar.** Todo slide novo responde a três perguntas:
   - que pergunta do diretor ele responde;
   - qual é o número protagonista;
   - o que o leitor faz depois (aprova, pergunta, corta).
3. **Olhar antes de dizer que está pronto.**
   - Exportar os PNG: `exportarSlidesCuritiba()` / `…Itajai()` / `…Esteio()`.
   - Montar a folha de contato: `python ferramentas/efeitos_imagem.py folha "<pasta dos PNG>" folha.jpg`.
   - Conferir o deck inteiro de uma vez: hierarquia, consistência entre slides e o slide que destoa.
   - Conferir a miniatura dos slides-chave: `… miniatura slide.png mini.png`.
4. **Crítico independente.** Um agente novo, que não fez os slides, olha os PNG e lista os defeitos com o número do
   slide. A recomendação do crítico fica separada da decisão do gestor; não vale tratar uma como a outra.
5. **Medir o que dá para medir.** O teste já pega texto cortado e forma fora da página. Asserções candidatas:
   - fonte mínima de número;
   - quantidade de destaques por slide;
   - texto claro sobre foto sem véu.
6. **Comparar mudando uma coisa por vez.** Duas versões que diferem em tudo não dizem qual mudança funcionou.
7. **Registrar o veredito** (aprovado ou reprovado, e o porquê) no HANDOFF §6, para não propor de novo o que já
   foi recusado.

## 8. Ordem sugerida (proposta, não aprovada)

| # | O quê | Custo | Depende de |
|---|---|---|---|
| 1 | Trilha de navegação + rótulo de seção no cabeçalho | baixo | sim do gestor |
| 2 | Títulos-manchete (a conclusão no título) | baixo: o texto sai dos relatórios que o gerador já calcula | sim do gestor |
| 3 | Slide de encerramento "O que precisamos decidir" | baixo | gestor dizer o que entra |
| 4 | Subcapas com foto do Mega em retícula + número da seção | médio | fotos de cada Mega por seção |
| 5 | Infográficos novos: para onde vai cada R$ 1; o ano em linha do tempo | médio | sim do gestor |
| 6 | Carimbo de pendência; serifa itálica na capa | baixo | gosto do gestor |
| 7 | Ícones por grupo da DRE (trilha, subcapa, DRE, achados) | baixo | sim do gestor |
| 8 | O Mega desenhado com os projetos alfinetados | médio | planta de implantação de cada Mega |

## 9. Ferramenta: `ferramentas/efeitos_imagem.py`

Trazida da produção de capas e adaptada à paleta Capital Realty. Precisa de `python -m pip install pillow numpy`
(o Deep Freeze apaga a instalação no reinício). Comandos: `foto` (retícula na cor da marca, `--rasgado` com borda
e sombra), `carimbo`, `caneta` (círculo, seta e sublinhado à mão), `folha` (folha de contato) e `miniatura`. Detalhes no cabeçalho do arquivo. Foi testada em
07/10/2026 com a imagem de `design/`.
