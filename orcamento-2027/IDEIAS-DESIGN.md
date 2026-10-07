# Ideias de design para o deck do orçamento

Escrito em 07/10/2026, a pedido do Guilherme, a partir da pasta onde ele produz vídeos (capas, thumbnails,
carrosséis, design systems e o processo de revisão que usa lá). Essa pasta é pessoal e vai ser apagada; **o que
serve para o deck ficou aqui**. As imagens de referência não foram copiadas porque mostram pessoas e marcas de
terceiros. Estão descritas em palavras, e a regra é copiar a técnica, nunca a identidade de outra marca.

> **Status: nada aqui foi aprovado.** O padrão dos Megas continua valendo (HANDOFF §6). Toda mudança visual segue o
> mesmo caminho: propor, mostrar o PNG, esperar o "sim" do gestor e só depois mexer no gerador.

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

## 4. Tipografia

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

## 5. O que o Google Slides não faz, e o contorno

| Não faz pelo Apps Script | Contorno |
|---|---|
| Gradiente | faixas de retângulos interpolados (`_orcGradiente_`, já existe) |
| Filtro de imagem (P&B, retícula, grão), borda rasgada | gerar o PNG antes: `ferramentas/efeitos_imagem.py foto … --rasgado` |
| Sombra configurável | sombra dura: retângulo escuro deslocado 3 a 4 pt por trás do cartão. Sombra suave: já embutida no PNG (`com_sombra`) |
| Carimbo, textura de papel | PNG transparente gerado em Python e inserido por cima |
| Rotação | `setRotation` funciona em forma e imagem: cartões e carimbos levemente girados (−2° a −6°) |

## 6. Processo (o que mais rendeu na produção de vídeo)

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

## 7. Ordem sugerida (proposta, não aprovada)

| # | O quê | Custo | Depende de |
|---|---|---|---|
| 1 | Trilha de navegação + rótulo de seção no cabeçalho | baixo | sim do gestor |
| 2 | Títulos-manchete (a conclusão no título) | baixo: o texto sai dos relatórios que o gerador já calcula | sim do gestor |
| 3 | Slide de encerramento "O que precisamos decidir" | baixo | gestor dizer o que entra |
| 4 | Subcapas com foto do Mega em retícula + número da seção | médio | fotos de cada Mega por seção |
| 5 | Infográficos novos: para onde vai cada R$ 1; o ano em linha do tempo | médio | sim do gestor |
| 6 | Carimbo de pendência; serifa itálica na capa | baixo | gosto do gestor |

## 8. Ferramenta: `ferramentas/efeitos_imagem.py`

Trazida da produção de capas e adaptada à paleta Capital Realty. Precisa de `python -m pip install pillow numpy`
(o Deep Freeze apaga a instalação no reinício). Comandos: `foto` (retícula na cor da marca, `--rasgado` com borda
e sombra), `carimbo`, `folha` (folha de contato) e `miniatura`. Detalhes no cabeçalho do arquivo. Foi testada em
07/10/2026 com a imagem de `design/`.
