/**
 * ARQUIVO: 17_Slide_BacklogClientes.gs
 * SEÇÃO:   SLIDES — Atendimento e Backlog de Clientes
 * DESCRIÇÃO: Acompanhamento de demandas de clientes (abertos vs fechados),
 *            backlog detalhado por locatário, recortes Facilities/Properties
 *            e repositório de logotipos dos locatários no Google Drive.
 */

// ==========================================
// LOGOS DE CLIENTES NO GOOGLE DRIVE
// ==========================================
/**
 * ARQUIVO: Slide_LogosClientes.gs
 * LOGOS DE CLIENTES — Google Drive
 * DESCRIÇÃO: Mesma técnica e mesmos arquivos já usados no projeto irmão
 * "Controle de Acessos Megas" (apps-script/Config.gs + Helpers.gs) — os
 * logos ficam hospedados no Google Drive da Capital Realty, um PNG por
 * cliente, casados por trecho do nome (normalizado via _histEmpChave_,
 * 02_Dados.gs). Usado nas listas de chamados agrupadas por cliente
 * (Slide_ChamadosClientes.gs, Slide_BacklogClientesDetalhes.gs) — o logo
 * substitui o nome em texto quando disponível, deixando o slide mais
 * parecido com o boletim manual "ATENDIMENTO AO CLIENTE" (que já usava as
 * mesmas logos por linha).
 *
 * Se a conta que roda o script não tiver acesso a algum arquivo do Drive
 * (arquivo pertence ao outro projeto), _getClienteLogoBlob_ captura o erro
 * e devolve null — o chamador cai de volta pro nome em texto, sem quebrar
 * a geração. Se os logos não aparecerem, confira o compartilhamento desses
 * arquivos no Drive.
 */

const LOGOS_CLIENTES = {
  'Shopee':         '1_5vQjNBWGR8j-e5M94tGobglBTBN1ewH',
  'Mercado Livre':  '1rtesWo8XV5-CMeyLgc6lLaHXgQRWtuz9',
  'Sodexo':         '1391EvxTNYW3q9RCArhoc2earckFLGNSt',
  'Suzano':         '1E4laN6uhI3dgzTDnP9d63OQ3PkLlm36S',
  'NTN':            '12Oxh8itF46nWBefjv6bOUEi7_aYnSO5H',
  'Magnum':         '1StAJIlbMM2S523iuIZlAjuo3oGnPdEqF',
  'Boticario':      '1VLZirUEmMoBsI5fX3wFDiSMoPdms_4La',
  'Calamo':         '1VLZirUEmMoBsI5fX3wFDiSMoPdms_4La',
  'Ativa':          '10-uTna_fhwqozMi8dvn-tzEJ6BhnfUo2',
  'Tornado':        '1Jxwe1oSRlDIR4-Qw0g5fOM_6zo1KHwUZ',
  'Bosch':          '1lh7-yq4HOFHWu6BI_we35khXldFATHg3',
  'HP':             '1LB8AfjJnZFHTKIWGfk0sDoMmZ-Fz_7SI',
  'Damasio':        '1bDprE9vS940Pf04bGqb9OMqhJIypNveU',
  'Magalu':         '1R1NXo3r04uQQgKnEQUZoZZlBHh9HuiOU',
  'Magazine Luiza': '1R1NXo3r04uQQgKnEQUZoZZlBHh9HuiOU',
  'Rio Branco':     '1PXQvjnPymFWJhMGFY8JjLOoZaPRYVNxp',
  'Triunfante':     '1UxXcR0T39OMrRzpyaPq7ca-OSWUSTrzD',
  'Daybrasil':      '1W2EKA5TFa-I9pWudmwarSpAFqsNf-Yod',
  'Day Brasil':     '1W2EKA5TFa-I9pWudmwarSpAFqsNf-Yod',
  'JBT':            '1ZoUcwT6-Iv9BknWqoGKgJsyjSq4G1uLc',
  'Domazzi':        '1lq-ALGuWn793yd613WIyG35Nh-ejIfTt',
  'Flexmodal':      '1lq-ALGuWn793yd613WIyG35Nh-ejIfTt',
  'Stella':         '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'Orizon':         '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'STH':            '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'Vm Vinhos':      '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'Wine':           '1aoj0mr1Jcut4oXk0tvD5TaZiaK79dF-D',
  'Sigma':          '1eqv7IxU-utU7TkYjOzlM4hQ5QDtoQacu',
  'Pacific':        '1l7G3-cq9viXEMJi8bc0lBUejPJoU6W7i',
  'Domus':          '1VhxvlmFQ27aYiIjdsOJd2VU0s-A6Mg-C',
  'Veloz':          '1-i3nKyGyVWQIFbCO96Ih-5fiV9ZgtDZ2',
  'Demercado':      '168kVyD9dXiZctYNl27f_-Ic9S1W3wm-T',
  'DHL':            '1MtKYh79eDwOXw52reQ4WLDEXLGv-cm9z'
  // TornadoLog e outros apelidos sem logo cadastrado aqui caem no fallback
  // de texto (_getClienteLogoBlob_ retorna null) — não fabricamos ID de
  // arquivo pra cliente que não estava no mapa de origem.
};

// Cache do blob de cada logo (evita baixar o mesmo arquivo do Drive várias
// vezes na mesma execução — chave é o ID do arquivo, não o nome do cliente,
// então clientes diferentes que casam no mesmo logo reaproveitam o download).
const _clienteLogoCache_ = {};

// O próprio Mega aparece como "cliente" em várias listas (linhas de área
// comum/condomínio: "MEGA Curitiba - ÁREA COMUM", "CONDOMÍNIO MEGA
// CURITIBA"). Nesses casos o logo certo é o do empreendimento ATIVO
// (unitLogoId em 01_Config.gs) — não existe um "logo do Mega" genérico, cada
// cidade tem o seu, e a apresentação sempre roda com uma cidade ativa.
// `_histEmpChave_` devolve MAIÚSCULO sem acento, daí a comparação em caixa
// alta; e o casamento é por PALAVRA inteira (\bMEGA\b) pra não pegar razão
// social que só contenha as letras (ex.: "OMEGA ...").
function _logoDoMegaId_(nomeCliente) {
  if (!/\bMEGA\b/.test(_histEmpChave_(nomeCliente))) return null;
  try {
    return getProjetoAtivo().unitLogoId || null;
  } catch (e) {
    return null;
  }
}

function _getClienteLogoBlob_(nomeCliente) {
  const alvo = _histEmpChave_(nomeCliente);
  let idAchado = _logoDoMegaId_(nomeCliente);
  if (!idAchado) {
    const chaves = Object.keys(LOGOS_CLIENTES);
    for (let k = 0; k < chaves.length; k++) {
      if (alvo.indexOf(_histEmpChave_(chaves[k])) >= 0) { idAchado = LOGOS_CLIENTES[chaves[k]]; break; }
    }
  }
  if (!idAchado) return null;

  if (!(idAchado in _clienteLogoCache_)) {
    try {
      _clienteLogoCache_[idAchado] = DriveApp.getFileById(idAchado).getBlob();
    } catch (e) {
      Logger.log('Logo do cliente "' + nomeCliente + '" (arquivo ' + idAchado + ') não carregou: ' + e.message);
      _clienteLogoCache_[idAchado] = null;
    }
  }
  return _clienteLogoCache_[idAchado];
}

// ── Legenda embaixo do logo (marcas que dividem o mesmo arquivo) ─────────
// Alguns clientes aparecem sob o logo de OUTRA marca porque compartilham o
// mesmo arquivo no mapa acima — herança do projeto "Controle de Acessos
// Megas", que já mostra a logo do Boticário para o Cálamo. Sem nada escrito
// embaixo, o slide exibe duas empresas diferentes com exatamente a mesma
// imagem e ninguém sabe qual é qual. Nesses casos (e só nesses) o nome curto
// da empresa vai numa legenda logo abaixo do logo.
//
// O casamento é por TRECHO normalizado, igual ao de LOGOS_CLIENTES: o nome
// que chega aqui pode ser o apelido ("Cálamo") ou a razão social inteira
// ("ORIZON COMERCIO DE ALIMENTOS LTDA"), e a legenda tem que mostrar sempre
// o nome curto.
const _LOGOS_LEGENDA_ = [
  { trecho: 'boticario', rotulo: 'Boticário' },   // BPB / O Boticário — ícone
  { trecho: 'calamo',    rotulo: 'Cálamo'    }    // genérico, sem texto próprio: precisa da legenda
  // Domazzi/Flexmodal e Stella/Orizon/STH/Vm Vinhos dividem arquivo (ver
  // LOGOS_CLIENTES acima), mas a pedido do usuário NÃO ganham legenda: os
  // logos de Stella e Domazzi têm o nome escrito na própria imagem (ao
  // contrário do ícone genérico do Boticário), então a legenda embaixo era
  // redundante. Fica registrado aqui que Orizon/STH/Vm Vinhos e Flexmodal
  // continuam mostrando a logo (real) de Stella/Domazzi sem nenhuma marca —
  // se algum desses aparecer num slide, o logo exibido será o da OUTRA
  // empresa, sem aviso.
];

const _LOGO_LEGENDA_H_        = 9;    // faixa reservada pra legenda (pt)
const _LOGO_LEGENDA_FS_       = 6;    // fonte da legenda (pt)
const _LOGO_LEGENDA_FOLGA_    = 10;   // folga lateral da caixa de texto (ver abaixo)
const _LOGO_LEGENDA_MIN_BOX_  = 22;   // altura mínima pra caber logo + legenda

// Devolve o nome curto da marca quando o logo é ambíguo, senão null.
function _logoLegendaRotulo_(nomeCliente) {
  const alvo = _histEmpChave_(nomeCliente);
  for (let i = 0; i < _LOGOS_LEGENDA_.length; i++) {
    if (alvo.indexOf(_histEmpChave_(_LOGOS_LEGENDA_[i].trecho)) >= 0) return _LOGOS_LEGENDA_[i].rotulo;
  }
  return null;
}

// Escreve a legenda centralizada na faixa x,y,w,h.
//
// A caixa de texto é criada MAIS LARGA que a faixa (_LOGO_LEGENDA_FOLGA_ de
// cada lado): toda TEXT_BOX do Slides tem um recuo interno de ~7pt que não dá
// pra desligar pela API, e numa coluna estreita esse recuo faz um nome curto
// como "Flexmodal" quebrar em duas linhas mesmo sobrando espaço visível.
// Como o texto é centralizado e a folga é simétrica, a largura extra sobra
// igual dos dois lados e não muda nada na aparência — a caixa não tem fundo
// nem borda própria.
function _logoLegendaTexto_(slide, x, y, w, h, rotulo) {
  const caixaW = w + _LOGO_LEGENDA_FOLGA_ * 2;
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x - _LOGO_LEGENDA_FOLGA_, y, caixaW, h);
  const txt = box.getText();
  txt.setText(_truncarNome_(rotulo, _charsQueCabem_(caixaW, _LOGO_LEGENDA_FS_)))
    .getTextStyle().setFontSize(_LOGO_LEGENDA_FS_).setBold(true)
    .setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
  txt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
}

// Igual a _insertLogoPadrao_, mas escreve o nome curto embaixo quando o logo
// é compartilhado por mais de uma marca. Devolve a imagem inserida, ou null
// quando a caixa é baixa demais pra comportar logo + legenda legíveis — aí o
// chamador cai no fallback de texto, que diferencia melhor do que um logo
// minúsculo com uma legenda ilegível embaixo.
//
// Ponto único de entrada dos logos de cliente: todos os slides passam por
// aqui, então a altura padrão (e a homogeneidade) vale pro deck inteiro.
function _insertLogoFitLegenda_(slide, blob, nomeCliente, x, y, boxW, boxH, altura) {
  const rotulo = _logoLegendaRotulo_(nomeCliente);
  if (!rotulo) return _insertLogoPadrao_(slide, blob, x, y, boxW, boxH, altura);
  if (boxH < _LOGO_LEGENDA_MIN_BOX_) return null;

  const img = _insertLogoPadrao_(slide, blob, x, y, boxW, boxH - _LOGO_LEGENDA_H_, altura);
  _logoLegendaTexto_(slide, x, y + boxH - _LOGO_LEGENDA_H_, boxW, _LOGO_LEGENDA_H_, rotulo);
  return img;
}

// ── TAMANHO PADRÃO DO LOGO (homogeneidade entre slides) ───────────────────
// _insertLogoFit_ faz "contain": a imagem cresce até esbarrar na LARGURA ou
// na ALTURA da caixa, o que vier primeiro. O efeito colateral é justamente a
// falta de homogeneidade que o usuário apontou: numa mesma tabela, um logo
// largo (Mercado Livre, ~4:1) esbarra na largura e sai baixinho, enquanto um
// logo mais quadrado (NTN, HP) esbarra na altura e sai no tamanho cheio —
// duas marcas lado a lado com alturas visivelmente diferentes.
//
// _insertLogoPadrao_ inverte a regra: fixa a ALTURA e deixa a largura variar
// com a proporção de cada marca. Assim todo logo do deck tem exatamente a
// mesma altura visual, independente do formato do arquivo e de qual slide
// está desenhando — que é o que faz a tabela de DOCUMENTAÇÃO LEGAL (a
// referência que o usuário considerou correta) parecer alinhada.
//
// Pra isso funcionar a coluna precisa ser larga o bastante pro logo mais
// largo do acervo caber na altura padrão:
//     larguraDaColuna >= LOGO_ALT_PADRAO * LOGO_RATIO_MAX
// Abaixo disso o logo largo volta a ser limitado pela largura (e sai menor
// que os demais) — por isso as colunas de logo dos slides estão
// dimensionadas a partir de LOGO_LARG_PADRAO.
// Altura ÚNICA pro deck inteiro (tabelas e cards-resumo): a pedido do
// usuário, a mesma marca tem que ter o mesmo tamanho em qualquer página —
// nada de logo maior no resumo e menor na tabela. Uma altura só também
// evita o problema de a faixa de destaque precisar de uma coluna mais larga
// do que o tile comporta (aí o logo largo encolheria e a homogeneidade se
// perderia justamente onde ela é mais visível).
const LOGO_ALT_PADRAO   = 18;   // altura de TODO logo de cliente do deck
const LOGO_RATIO_MAX    = 5;    // logo mais largo do acervo (~5:1)
const LOGO_LARG_PADRAO  = LOGO_ALT_PADRAO * LOGO_RATIO_MAX;   // 90pt

// Insere o logo com ALTURA FIXA (`altura`, default LOGO_ALT_PADRAO),
// centralizado na caixa x,y,boxW,boxH. Só reduz abaixo da altura padrão
// quando a caixa é baixa demais ou quando o logo é largo demais pra coluna
// — os dois casos ficam registrados no Logger, porque são exatamente os que
// quebram a homogeneidade e valem ajuste de layout.
function _insertLogoPadrao_(slide, blob, x, y, boxW, boxH, altura) {
  const img = slide.insertImage(blob);
  const ratio = img.getWidth() / img.getHeight();

  let h = Math.min(altura || LOGO_ALT_PADRAO, boxH);
  let w = h * ratio;
  if (w > boxW) {
    w = boxW;
    h = boxW / ratio;
    Logger.log('Logo mais largo que a coluna (' + ratio.toFixed(1) + ':1 em ' + Math.round(boxW) +
               'pt): saiu com ' + Math.round(h) + 'pt de altura em vez de ' + Math.round(altura || LOGO_ALT_PADRAO) + 'pt.');
  }

  img.setWidth(Math.round(w)).setHeight(Math.round(h))
     .setLeft(x + (boxW - w) / 2)
     .setTop(y + (boxH - h) / 2);
  return img;
}

// Insere uma imagem centralizada dentro de uma caixa x,y,boxW,boxH, ocupando
// o máximo de área possível sem distorcer a proporção original ("contain").
// Usada onde a caixa É o tamanho desejado (ícones quadrados das capas de
// seção); pros logos de cliente use _insertLogoPadrao_, que fixa a altura e
// mantém todas as marcas do mesmo tamanho.
function _insertLogoFit_(slide, blob, x, y, boxW, boxH) {
  const img = slide.insertImage(blob);
  const ratio = img.getWidth() / img.getHeight();
  const wByH = boxH * ratio;
  const fit = wByH <= boxW ? { w: wByH, h: boxH } : { w: boxW, h: boxW / ratio };
  img.setWidth(Math.round(fit.w)).setHeight(Math.round(fit.h))
     .setLeft(x + (boxW - fit.w) / 2)
     .setTop(y + (boxH - fit.h) / 2);
  return img;
}

// ==========================================
// CHAMADOS DE CLIENTES (FLUXO DO MÊS)
// ==========================================
/**
 * ARQUIVO: Slide_ChamadosClientes.gs
 * SLIDE — CHAMADOS DE CLIENTES (Abertos x Fechados)
 * DESCRIÇÃO: Substitui o slide manual por um resumo por Cliente (logo +
 * quantidade — sem gráfico; com só 1-5 clientes por período um gráfico não
 * ajuda, e o boletim manual já usava logo por cliente) mais a lista
 * completa de chamados de cada período — lido das mesmas abas "CHAMADOS
 * ABERTOS MES"/"CHAMADOS FECHADOS MES" da planilha de Histórico Validado
 * usadas pelo slide Chamados por Prioridade (obterDadosChamadosClientes_
 * em 02_Dados.gs), filtrado pelo Centro de Custos da cidade ativa e sem as
 * linhas do próprio condomínio (só chamados de clientes de verdade).
 *
 * O resumo de cima e a lista de baixo reaproveitam a mesma identidade
 * visual do cliente (logo do Google Drive quando cadastrado em
 * LOGOS_CLIENTES, Slide_LogosClientes.gs; nome colorido em texto quando
 * não — nunca quebra a geração por causa disso).
 *
 * UM PERÍODO POR SLIDE: Abertos e Fechados têm cada um sua própria
 * sequência de slides, de largura CHEIA (antes dividiam a mesma página, meia
 * a meia). Foi pedido do usuário — com a página inteira a coluna de
 * descrição mais que dobra e os chamados deixam de sair truncados em três
 * letras ("Após...", "Cons...").
 *
 * Mês cheio: em vez de encolher a fonte da lista até ficar minúscula (e
 * ainda assim estourar o rodapé do card), divide os clientes em quantas
 * PÁGINAS/slides forem necessárias — mesma ideia de _paginarGruposBacklog_
 * (Slide_BacklogClientesDetalhes.gs), adaptada pro layout em colunas desta
 * lista (ver _paginarGruposClientes_); o resumo (logo+qtd) se repete em
 * toda página. Quando a página sobra espaço vertical, cada chamado ganha 2
 * LINHAS de descrição em vez de 1 (_linhasPorChamadoQueCabem_) — a fonte
 * segue fixa, o que varia é só quanto texto cabe.
 *
 * Sem as duas abas preenchidas (ou sem nenhuma linha da cidade ativa): cai
 * no slide manual de espaço reservado (gerarSlideReservaGraficos), sem
 * quebrar a geração.
 */

function gerarSlideChamadosClientes() {
  const dados = obterDadosChamadosClientes_() || {
    abertos: { total: 0, fatias: [], lista: [] },
    fechados: { total: 0, fatias: [], lista: [] }
  };

  // Um período por SLIDE (não mais os dois lado a lado em meia página cada):
  // a pedido do usuário, "2 slides, 1 das aberturas e 1 dos fechados, assim
  // vai ter mais espaço para ficar detalhado melhor e couber tudo". Com a
  // largura cheia da página, a coluna de descrição mais que dobra e os
  // chamados deixam de ser truncados em "Após...", "Cons...".
  const coresMapa = _clienteCoresMapa_(dados);
  const pgAbertos  = _chamadosClientesPeriodo_('ABERTOS',  dados.abertos,  CORES.lightBlue, coresMapa);
  const pgFechados = _chamadosClientesPeriodo_('FECHADOS', dados.fechados, CORES.darkBlue,  coresMapa);

  Logger.log('Slides Chamados de Clientes gerados — abertos=' + dados.abertos.total +
             ' (' + pgAbertos + ' página(s)), fechados=' + dados.fechados.total +
             ' (' + pgFechados + ' página(s)).');
}

// Gera a sequência de slides de UM período (Abertos ou Fechados), ocupando a
// largura inteira da página: card-resumo (logo + qtd por cliente) em cima e a
// lista detalhada embaixo, paginando quantas vezes for preciso. Devolve o
// número de páginas geradas.
function _chamadosClientesPeriodo_(rotulo, dadosPeriodo, corTema, coresMapa) {
  const deck = getDeckAtivo();
  const W = deck.getPageWidth();
  const H = deck.getPageHeight();

  const marginX = 30, topY = 76, gap = 16;
  const areaBottom = H - 16;
  const cardW = W - 2 * marginX;          // largura CHEIA — antes era meia página
  // O resumo é um TOP N fixo (no máx. 5 tiles, ver MAX_FATIAS em
  // obterDadosChamadosClientes_) e agora tem a largura toda pra espalhar os
  // tiles, então precisa de menos altura que antes — o que sobra vai pra
  // lista, que é quem carrega o detalhe. O piso de 112pt é o mínimo pro
  // conteúdo do resumo não cortar (título do card + logo + qtd + %).
  const totalH  = areaBottom - topY - gap;
  const resumoH = Math.max(112, totalH * 0.26);
  const listaH  = totalH - resumoH;

  // Agrupa por cliente preservando a ordem de chegada. Com a página inteira
  // à disposição, uma coluna só já dá uma descrição bem larga — só passa a
  // duas colunas quando há muitos clientes, pra não explodir o número de
  // páginas.
  const porCliente = {}, ordem = [];
  dadosPeriodo.lista.forEach(it => {
    if (!porCliente[it.cliente]) { porCliente[it.cliente] = []; ordem.push(it.cliente); }
    porCliente[it.cliente].push(it);
  });
  const grupos = ordem.map(cli => porCliente[cli]);
  const cols = grupos.length > 8 ? 2 : 1;

  const paginas = _paginarGruposClientes_(grupos, listaH, cols);

  paginas.forEach((paginaColunas, p) => {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(CORES.bgSlide);

    const ref = obterMesReferencia_();
    const sub = 'Chamados ' + rotulo.toLowerCase() + ' no mês (' + ref.siglaAno + ')' +
                (paginas.length > 1 ? ' — página ' + (p + 1) + ' de ' + paginas.length : '');
    criarHeaderPadrao(slide, 'CHAMADOS DE CLIENTES — ' + rotulo, sub);

    // O resumo se repete em toda página: é um TOP N fixo, então o tamanho
    // dele não muda com o volume — repetir não custa espaço nem polui.
    _clientesResumoLogos_(slide, marginX, topY, cardW, resumoH, rotulo, dadosPeriodo, corTema, coresMapa);
    _clientesLista_(slide, marginX, topY + resumoH + gap, cardW, listaH,
      'LISTA DE CHAMADOS ' + rotulo, dadosPeriodo.lista.length, paginaColunas, cols, corTema);
  });

  return paginas.length;
}

// Divide os grupos (clientes) da lista em PÁGINAS de até `cols` colunas cada,
// nunca partindo um cliente no meio — mesma ideia de _paginarGruposBacklog_
// (Slide_BacklogClientesDetalhes.gs), adaptada pro layout em colunas desta
// lista (lá é 1 coluna de largura cheia; aqui pode ser 1 ou 2 lado a lado).
// Cada coluna é preenchida greedily até estourar o orçamento vertical; ao
// fechar a última coluna disponível da página, abre a próxima página.
// Retorna um array de páginas, cada página um array de até `cols` colunas,
// cada coluna um array de grupos — pronto pra passar direto pra
// _clientesLista_ desenhar, sem repetir a lógica de corte.
function _paginarGruposClientes_(grupos, listaH, cols) {
  if (!grupos.length) return [[]];

  // Reserva 1 linha por chamado — é o PISO que garante que a página cabe.
  // Se sobrar folga, _clientesLista_ gasta essa sobra dando 2 linhas de
  // descrição a cada chamado naquela página (ver _linhasPorChamadoQueCabem_);
  // a fonte, essa sim, é fixa no deck inteiro.
  // Mesmos offsets de _clientesLista_: criarCardPainel devolve y+32 (título
  // do card), listY = contentY+2, listH = h-listY-8, e o cabeçalho interno
  // "CLIENTE | DESCRIÇÃO" consome mais HEADER_H+HEADER_GAP.
  const CARD_HEADER = 32, LIST_TOP_PAD = 2, LIST_BOTTOM_PAD = 8;
  const budgetPorColuna = listaH - CARD_HEADER - LIST_TOP_PAD - LIST_BOTTOM_PAD - HEADER_H_LISTA - HEADER_GAP_LISTA;

  const lineHFloor = FLOOR_FONT_LISTA * (LINE_PCT_LISTA / 100) * 1.15;
  const alturaGrupo = g => Math.max(g.length * lineHFloor, MIN_ROW_H_LISTA + (g.length > 1 ? CAPTION_H_LISTA : 0));

  const paginas = [];
  let coluna = [], alturaColuna = 0, colunasNaPagina = [];
  grupos.forEach(g => {
    const alturaG = alturaGrupo(g);
    if (coluna.length && alturaColuna + alturaG > budgetPorColuna) {
      colunasNaPagina.push(coluna);
      coluna = []; alturaColuna = 0;
      if (colunasNaPagina.length === cols) {
        paginas.push(colunasNaPagina);
        colunasNaPagina = [];
      }
    }
    coluna.push(g);
    alturaColuna += alturaG;
  });
  if (coluna.length) colunasNaPagina.push(coluna);
  if (colunasNaPagina.length) paginas.push(colunasNaPagina);
  return paginas;
}

// Paleta cíclica pros clientes nomeados (a ordem de atribuição segue o
// ranking combinado abertos+fechados, ver _clienteCoresMapa_, pra um
// mesmo cliente manter a mesma cor nos dois cards). "Outros" é sempre cinza.
const _CLIENTE_PALETA_ = ['#1E3A8A', '#0EA5E9', '#F59E0B', '#10B981', '#9333EA', '#D97706'];
const _CLIENTE_COR_OUTROS_ = '#94A3B8';

// Apelido curto pros clientes mais conhecidos, em vez da razão social crua
// da planilha (comprida, sempre com LTDA/S.A. etc., quebra em 2-3 linhas
// no card). Casa por trecho do nome já normalizado (minúsculo, sem acento
// — ver _histNorm_ em 02_Dados.gs), então variações como "SHPX Logística
// Ltda" ou "SHPX LTDA" caem no mesmo apelido. Sem apelido cadastrado, usa
// o nome cru mesmo (o chamador trunca se for muito longo). A cor e o
// agrupamento continuam pelo nome CRU (obterDadosChamadosClientes_) — o
// apelido é só de exibição, não mexe na contagem.
const _CLIENTE_APELIDOS_ = [
  { trecho: 'shpx',           apelido: 'Shopee' },
  { trecho: 'tornado',        apelido: 'TornadoLog' },
  { trecho: 'dhl',            apelido: 'DHL' },
  { trecho: 'suzano',         apelido: 'Suzano' },
  { trecho: 'bosch',          apelido: 'Bosch' },
  { trecho: 'sodexo',         apelido: 'Sodexo' },
  { trecho: 'veloz',          apelido: 'Veloz' },
  // 'magazine' (não 'magazine luiza'): a aba DOCUMENTOS INQUILINOS de Itajaí
  // grava a empresa só como "Magazine" (célula mesclada, sem o "Luiza") —
  // com o trecho completo isso não casava com nada e a logo não aparecia.
  { trecho: 'magazine',       apelido: 'Magazine Luiza' },
  { trecho: 'stella',         apelido: 'Stella' },
  { trecho: 'rio branco',     apelido: 'Rio Branco' },
  { trecho: 'domus',          apelido: 'Domus' },
  { trecho: 'mercadolivre',   apelido: 'Mercado Livre' },
  { trecho: 'calamo',         apelido: 'Cálamo' },
  { trecho: 'boticario',      apelido: 'Boticário' },
  { trecho: 'ntn rolamentos', apelido: 'NTN' },
  { trecho: 'h p comercio',   apelido: 'HP' },
  { trecho: 'bpb',            apelido: 'Boticário' }
];

function _clienteDisplay_(clienteCru) {
  const norm = _histNorm_(clienteCru);
  const achado = _CLIENTE_APELIDOS_.find(a => norm.indexOf(a.trecho) >= 0);
  return achado ? achado.apelido : clienteCru;
}

function _clienteCoresMapa_(dados) {
  const soma = {};
  ['abertos', 'fechados'].forEach(periodo => {
    dados[periodo].fatias.forEach(f => {
      if (f.label === 'Outros') return;
      soma[f.label] = (soma[f.label] || 0) + f.qtd;
    });
  });
  const ranked = Object.keys(soma).sort((a, b) => soma[b] - soma[a]);
  const mapa = { 'Outros': _CLIENTE_COR_OUTROS_ };
  ranked.forEach((cliente, i) => { mapa[cliente] = _CLIENTE_PALETA_[i % _CLIENTE_PALETA_.length]; });
  return mapa;
}

// Nome de cliente cru da planilha costuma ser a razão social inteira — corta
// pra caber na legenda/lista sem estourar a largura do card.
function _truncarNome_(txt, max) {
  const t = String(txt || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const ultimoEspaco = corte.lastIndexOf(' ');
  return (ultimoEspaco > max * 0.6 ? corte.slice(0, ultimoEspaco) : corte) + '…';
}

// Margem interna que o Google Slides aplica por padrão dentro de QUALQUER
// caixa de texto (0,05" ≈ 3,6pt de cada lado). Não existe API pra zerar,
// então os cálculos de largura descontam essa folga e o logo ao lado é
// deslocado pelo mesmo tanto, pra casar opticamente com a 1ª linha do texto.
const TEXTBOX_INSET_PT = 4;

// Quantos caracteres cabem numa linha de largura `w` (pt) na fonte
// `fontSize` — usado pelas listas de chamados dos slides de Clientes e de
// Backlog de Clientes.
//
// POR QUE ISSO EXISTE: o Apps Script não mede texto renderizado e o Slides
// não devolve a posição de cada linha dentro de uma caixa. Como as listas
// precisam alinhar o LOGO do cliente com o bloco de chamados dele, a
// posição de cada bloco é calculada à mão assumindo 1 chamado = 1 linha.
// Se uma descrição quebrar em duas linhas, todo o resto do card desce e os
// logos ficam desalinhados. Por isso o fator abaixo é DELIBERADAMENTE
// PESSIMISTA (0,62 em/caractere, acima da largura média real da Montserrat):
// é melhor truncar a descrição um pouco antes do que arriscar uma quebra
// que desalinha a coluna inteira.
function _charsQueCabem_(w, fontSize) {
  return Math.max(8, Math.floor((w - TEXTBOX_INSET_PT * 2) / (fontSize * 0.62)));
}

// Cor das linhas divisórias da "tabela" de clientes (cinza claro — divide
// sem competir visualmente com texto/logo) — usada pelas listas de
// Chamados de Clientes e Backlog de Clientes (_linhaTabela_, mesmo arquivo).
const _TABELA_LINHA_COR_ = '#E2E8F0';

// Geometria COMPARTILHADA entre _paginarGruposClientes_ (que decide onde
// cortar as páginas) e _clientesLista_ (que desenha): as duas precisam usar
// exatamente os mesmos números, senão a página cortada não bate com a
// desenhada e o conteúdo estoura o card. Ficam aqui em cima, num lugar só,
// justamente pra não haver duas cópias divergindo com o tempo.
const FLOOR_FONT_LISTA = 7;    // fonte fixa da lista (ver _clientesLista_)
const LINE_PCT_LISTA   = 118;  // entrelinha
const MIN_ROW_H_LISTA  = 30;   // altura mínima da linha (a célula do logo)
const CAPTION_H_LISTA  = 10;   // faixa da legenda "(N)" nos grupos com 2+ chamados
const HEADER_H_LISTA   = 14;   // cabeçalho interno "CLIENTE | DESCRIÇÃO"
const HEADER_GAP_LISTA = 6;

// Quantas LINHAS de descrição cada chamado pode ocupar nesta página: 2 se a
// página inteira ainda couber no card com o dobro de altura por chamado, 1
// caso contrário. A paginação sempre reserva 1 linha (piso que garante o
// encaixe); esta função só decide se dá pra gastar a folga que sobrou —
// aquele espaço vazio no rodapé do card que o usuário apontou ("tem mais
// espaço que não está sendo utilizado").
//
// Compartilhada pelas tabelas de detalhe do deck (Chamados de Clientes,
// Backlog de Clientes — Detalhe/Facilities/Properties, Backlog Emergencial —
// Detalhe): `paginaColunas` é sempre um array de COLUNAS (tabela de coluna
// única passa `[grupos]`), e `budget` é a altura útil já descontados o
// cabeçalho interno e os paddings de quem chama — cada tabela tem a sua
// geometria, então quem sabe descontar é ela.
function _linhasPorChamadoQueCabem_(paginaColunas, budget, lineH, minRowH, captionH, rowGap) {
  const alturaDaColunaMaisAlta = n => {
    let pior = 0;
    paginaColunas.forEach(col => {
      const soma = col.reduce((s, g) =>
        s + Math.max(g.length * lineH * n, minRowH + (g.length > 1 ? captionH : 0)) + (rowGap || 0), 0);
      if (soma > pior) pior = soma;
    });
    return pior;
  };
  return alturaDaColunaMaisAlta(2) <= budget ? 2 : 1;
}

// ── Card-resumo por Cliente: logo (ou nome) + quantidade, sem gráfico ─────
// Com só 1-5 clientes por período (MAX_FATIAS em obterDadosChamadosClientes_)
// uma barra/pizza não ajuda a leitura — um "tile" por cliente com o logo
// (mesma técnica de _getClienteLogoBlob_/_insertLogoFit_ usada na lista de
// baixo) e o número grande comunica mais rápido.
function _clientesResumoLogos_(slide, x, y, w, h, titulo, dadosPeriodo, corTema, coresMapa) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + dadosPeriodo.total + ')', corTema);
  const areaY = contentY + 6, areaH = y + h - areaY - 8;

  if (!dadosPeriodo.fatias.length) {
    _prioridadeSemDado_(slide, x, areaY, w, areaH, 'Nenhum chamado de cliente no período.', CORES.textGray);
    return;
  }

  const total = dadosPeriodo.total;
  const n = dadosPeriodo.fatias.length;
  const tileGap = 10;
  const tileW = (w - 24 - (n - 1) * tileGap) / n;

  // Card-resumo usa a MESMA altura de logo das tabelas (padrão único do
  // deck) — o número grande embaixo é que carrega o destaque. A caixa é a
  // mesma em qualquer período (2 clientes ou 5): só sobra mais respiro
  // lateral quando há poucos clientes.
  const logoW = Math.min(tileW, LOGO_LARG_PADRAO);
  const logoH = Math.min(LOGO_ALT_PADRAO + 8, areaH * 0.45);
  const qtyY  = areaY + logoH + 8;

  dadosPeriodo.fatias.forEach((f, i) => {
    const tileX = x + 12 + i * (tileW + tileGap);
    const logoX = tileX + (tileW - logoW) / 2;   // logo centralizado no tile
    const cor = (coresMapa && coresMapa[f.label]) || corTema;

    const nomeTile = _clienteDisplay_(f.label);
    const logoBlob = f.label === 'Outros' ? null : _getClienteLogoBlob_(nomeTile);
    let logoOk = false;
    if (logoBlob) {
      try { logoOk = !!_insertLogoFitLegenda_(slide, logoBlob, nomeTile, logoX, areaY, logoW, logoH); }
      catch (e) { Logger.log('Logo do cliente ' + f.label + ' não desenhou: ' + e.message); }
    }
    if (!logoOk) {
      _sTxt(slide, tileX, areaY, tileW, logoH, _truncarNome_(nomeTile, 16), 9, true, cor, 'center');
    }

    const pct = total > 0 ? (f.qtd / total * 100) : 0;
    _sTxt(slide, tileX, qtyY, tileW, 22, String(f.qtd), 16, true, cor, 'center');
    _sTxt(slide, tileX, qtyY + 20, tileW, 12, pct.toFixed(1).replace('.', ',') + '%', 7.5, false, CORES.textGray, 'center');
  });
}

// ── Card com a lista completa de chamados, em formato de TABELA ──────────
// Cabeçalho interno "CLIENTE | CHAMADOS", coluna do logo com largura fixa
// separada por uma linha vertical, e uma linha horizontal fina fechando
// cada linha da tabela — pedido do usuário depois de comparar com uma
// referência real de tabela (colunas visíveis, logo "no quadrado dele").
// Como o cliente agora tem sua própria coluna, cada chamado vira uma
// linha simples "id - descrição" (sem repetir nome/contagem no meio do
// texto) — o agrupamento visual passa a ser puramente a linha/coluna do
// logo, não mais um prefixo de texto.
// `paginaColunas` já vem PRÉ-DIVIDIDA em página e coluna por
// _paginarGruposClientes_ (em gerarSlideChamadosClientes) — esta função só
// desenha; `totalCount` é o total do PERÍODO INTEIRO (todas as páginas), não
// só desta, e é o que aparece no título do card.
function _clientesLista_(slide, x, y, w, h, titulo, totalCount, paginaColunas, cols, corTema) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + totalCount + ')', corTema);
  const listY = contentY + 2, listH = y + h - listY - 8;

  if (!totalCount) {
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Nenhum chamado no período.', CORES.cardGreen);
    return;
  }
  const grupos = paginaColunas.reduce((s, col) => s.concat(col), []);
  if (!grupos.length) {
    // Guarda defensiva: com cada período em seus PRÓPRIOS slides, uma
    // página sem grupos não deveria mais acontecer (antes acontecia quando
    // Abertos e Fechados dividiam o slide e um lado precisava de mais
    // páginas que o outro). Se acontecer, avisa em vez de desenhar um card
    // vazio que pareceria dizer que não há chamados no período inteiro.
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Lista completa nas páginas anteriores.', CORES.textGray);
    return;
  }

  // Mostra TODOS os chamados desta página, sem cortar — cada um detalhado
  // (id + descrição), agrupados por Cliente na mesma linha/coluna de logo.
  const colGap   = 14;
  const colW     = (w - 30 - (cols - 1) * colGap) / cols;
  const LINE_PCT = LINE_PCT_LISTA;

  // Cabeçalho "CLIENTE | CHAMADOS" repetido em cada coluna — como cada
  // coluna vira sua própria mini-tabela lado a lado, repetir o cabeçalho é
  // o mesmo padrão de tabelas com múltiplas colunas de continuação.
  const HEADER_H = HEADER_H_LISTA, HEADER_GAP = HEADER_GAP_LISTA;
  const linhasY = listY + HEADER_H + HEADER_GAP;

  const linhasGrupo = g => g.length;

  // Fonte FIXA em 7pt, igual às tabelas de backlog — a pedido do usuário,
  // nenhuma tabela do deck muda de corpo conforme a página fica mais cheia
  // ou mais vazia. _paginarGruposClientes_ já garante que a página cabe
  // nesse corpo, então não há risco de estourar o card.
  const fontSize = FLOOR_FONT_LISTA;
  const lineH = fontSize * (LINE_PCT / 100) * 1.15;

  // Quantas LINHAS cada chamado pode ocupar nesta página. A paginação
  // reserva 1 linha por chamado (o piso que garante que tudo cabe); quando
  // a página fica com folga vertical — o caso que o usuário apontou, "tem
  // mais espaço que não está sendo utilizado" — cada chamado passa a ter 2
  // linhas de descrição, aproveitando a sobra em vez de truncar cedo.
  // Diferente da FONTE (que é fixa no deck inteiro), isso o usuário
  // liberou explicitamente pra variar por página: "dependendo da pagina
  // pode usar 2 linhas pro chamado que nao vai ter problema".
  const linhasPorChamado = _linhasPorChamadoQueCabem_(
    paginaColunas, listH - HEADER_H - HEADER_GAP, lineH, MIN_ROW_H_LISTA, CAPTION_H_LISTA, 0);
  const alturaLinhaChamado = lineH * linhasPorChamado;

  const maxCliente = 16;
  // Coluna do logo dimensionada pelo padrão único do deck
  // (Slide_LogosClientes.gs), igual às demais tabelas — aqui são DUAS
  // colunas de lista lado a lado, então usa a largura padrão só quando ela
  // couber sem espremer a descrição; senão fica com o que a coluna permite
  // (e os logos mais largos saem menores, o que o Logger registra).
  const LOGO_COL_W = Math.min(LOGO_LARG_PADRAO, Math.round(colW * 0.34));
  const LOGO_GAP = 12, LOGO_CELL_H = LOGO_ALT_PADRAO + 6;
  const MIN_ROW_H = MIN_ROW_H_LISTA, CAPTION_H = CAPTION_H_LISTA;

  for (let c = 0; c < cols; c++) {
    const fatia = paginaColunas[c] || [];
    if (!fatia.length) continue;

    const colX = x + 15 + c * (colW + colGap);
    const dividerX = colX + LOGO_COL_W + LOGO_GAP / 2;

    // Cabeçalho da mini-tabela: faixa clara na cor do tema + rótulos, com
    // uma linha mais forte separando do corpo (mesmo tom da linha
    // vertical, só que horizontal).
    const headerBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, colX, listY, colW, HEADER_H);
    headerBg.getFill().setSolidFill(corTema, 0.10);
    headerBg.getBorder().setTransparent();
    _sTxt(slide, colX, listY, LOGO_COL_W, HEADER_H, 'CLIENTE', 6.5, true, corTema, 'center');
    _sTxt(slide, colX + LOGO_COL_W + LOGO_GAP, listY, colW - LOGO_COL_W - LOGO_GAP, HEADER_H, 'DESCRIÇÃO', 6.5, true, corTema, 'left');
    _linhaTabela_(slide, colX, listY + HEADER_H, colW, corTema, 1);

    let cursorY = linhasY;

    fatia.forEach(grupo => {
      // Legenda "(N)" só aparece com mais de 1 chamado — sem reservar essa
      // altura extra no piso da linha, ela invadia a linha do próximo
      // cliente (overlap com o divisor). CAPTION_H cobre respiro + legenda.
      const rowH = Math.max(linhasGrupo(grupo) * alturaLinhaChamado, MIN_ROW_H + (grupo.length > 1 ? CAPTION_H : 0));

      // Casa pelo apelido de exibição, não pelo nome cru da planilha — o
      // mapa de logos (Slide_LogosClientes.gs) usa nomes informais tipo
      // "Shopee", que não aparecem como substring na razão social "SHPX
      // LOGÍSTICA LTDA". _clienteDisplay_ já resolve essa distância.
      const nomeDisplay = _clienteDisplay_(grupo[0].cliente);
      const logoBlob = _getClienteLogoBlob_(nomeDisplay);
      const logoY = cursorY + (rowH - LOGO_CELL_H - (grupo.length > 1 ? CAPTION_H : 0)) / 2;
      let logoOk = false;
      if (logoBlob) {
        try { logoOk = !!_insertLogoFitLegenda_(slide, logoBlob, nomeDisplay, colX, logoY, LOGO_COL_W, LOGO_CELL_H); }
        catch (e) { Logger.log('Logo do cliente ' + grupo[0].cliente + ' não desenhou: ' + e.message); }
      }
      if (!logoOk) {
        _sTxt(slide, colX, logoY, LOGO_COL_W, LOGO_CELL_H, _truncarNome_(nomeDisplay, maxCliente), 7.5, true, corTema, 'center');
      }
      if (grupo.length > 1) {
        _sTxt(slide, colX, logoY + LOGO_CELL_H + 1, LOGO_COL_W, CAPTION_H - 1, '(' + grupo.length + ')', 6.5, false, CORES.textGray, 'center');
      }

      const textX = colX + LOGO_COL_W + LOGO_GAP, textW = colW - LOGO_COL_W - LOGO_GAP;
      // Orçamento de caracteres do chamado: a capacidade de UMA linha vezes
      // quantas linhas ele pode ocupar nesta página (1 ou 2, ver
      // _linhasPorChamadoQueCabem_), descontando o prefixo (bullet + id +
      // separador). A altura da linha já foi reservada com o mesmo número,
      // então a quebra em 2 linhas é esperada e não empurra o resto da
      // coluna — ver o comentário de _charsQueCabem_.
      const capacidadeLinha = _charsQueCabem_(textW, fontSize) * linhasPorChamado;

      const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, textX, cursorY, textW, rowH);
      const tr = box.getText();
      tr.setText('');
      grupo.forEach((it, i) => {
        const idPart = tr.appendText((i > 0 ? '\n' : '') + '• ' + it.id + ' - ');
        idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
        // Piso baixo (4, não 12): numa coluna bem estreita (2 colunas + célula
        // de logo fixa) capacidadeLinha pode ficar pequena — um piso alto
        // forçaria mais texto do que cabe de verdade, quebrando a linha e
        // desalinhando o resto da coluna (ver _charsQueCabem_).
        const maxDesc = Math.max(4, capacidadeLinha - 3 - it.id.length - 3);
        const descPart = tr.appendText(_truncarNome_(it.descricao, maxDesc));
        descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
      });

      tr.getParagraphStyle().setLineSpacing(LINE_PCT);
      box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      cursorY += rowH;
      _linhaTabela_(slide, colX, cursorY, colW, _TABELA_LINHA_COR_, 0.75);
    });

    // Linha vertical separando a coluna do logo da coluna dos chamados,
    // atravessando cabeçalho + todas as linhas da coluna.
    const divisor = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, dividerX, listY, 0.75, cursorY - listY);
    divisor.getFill().setSolidFill(_TABELA_LINHA_COR_);
    divisor.getBorder().setTransparent();
  }
}

// Linha horizontal fina — separa o cabeçalho do corpo ou uma linha da
// próxima na "tabela" de clientes (Chamados de Clientes / Backlog de
// Clientes — Detalhe).
function _linhaTabela_(slide, x, y, w, cor, altura) {
  const linha = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, altura);
  linha.getFill().setSolidFill(cor);
  linha.getBorder().setTransparent();
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
// Barras Abertos/Fechados por Cliente + lista completa de chamados de cada
// período, mesmas abas do Chamados por Prioridade, mas agrupado por Cliente
// e sem as linhas do próprio condomínio. Sem as abas preenchidas, cai no
// slide manual de espaço reservado.
function gerarSoChamadosClientesCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideChamadosClientes(); }
function gerarSoChamadosClientesItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideChamadosClientes(); }
function gerarSoChamadosClientesEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideChamadosClientes(); }

// ==========================================
// BACKLOG DE CLIENTES — DETALHAMENTO
// ==========================================
/**
 * ARQUIVO: Slide_BacklogClientesDetalhes.gs
 * SLIDE — BACKLOG DE CLIENTES — DETALHE (chamados de responsabilidade do locatário)
 * DESCRIÇÃO: Lista as pendências do backlog que são de responsabilidade do
 * locatário (não da operação), agrupadas por Cliente, lidas da aba
 * "BACKLOG - CLIENTES - DETALHES" da planilha de Histórico Validado
 * (obterDadosBacklogClientesDetalhes_ em 02_Dados.gs), filtradas por Centro
 * de Custos = MEGA <EMPREENDIMENTO> e sem as linhas do próprio condomínio.
 * Mesma regra de janela de mês de referência do slide de Backlog
 * Emergencial — Detalhe: só entra o chamado que AINDA estava aberto no fim
 * do mês de referência — aberto e fechado dentro do mesmo mês não é backlog
 * daquele mês (ver comentário em 02_Dados.gs, _histAbertoNoMes_).
 *
 * O foco do slide é a LISTA de pendências — sem gráfico de resumo (o card
 * de barra por cliente foi removido a pedido: o que importa aqui é o
 * detalhe de cada chamado, não a proporção entre clientes). Layout de
 * TABELA: uma linha de largura cheia por cliente (logo grande à esquerda,
 * chamados detalhados à direita) — nada de colunas estreitas, que
 * desperdiçavam a largura do card nos meses com poucos clientes. Cliente
 * com mais de um chamado agrupa o nome uma vez só, mas cada chamado
 * continua com sua própria linha (id + data + dias em aberto + descrição)
 * — nunca corta nenhum item.
 *
 * Mês cheio: em vez de encolher a fonte até ficar ilegível, divide os
 * clientes (nunca um cliente no meio) em quantas PÁGINAS/slides forem
 * necessárias pra caber tudo com fonte legível (_paginarGruposBacklog_) —
 * a pedido do usuário, gerar mais de um slide não é problema.
 *
 * Sem chamados no mês de referência pro empreendimento ativo: cai no slide
 * manual de espaço reservado (gerarSlideReservaGraficos), sem quebrar a
 * geração.
 */

function gerarSlideBacklogClientesDetalhes() {
  const dados = obterDadosBacklogClientesDetalhes_();
  if (!dados) {
    gerarSlideReservaGraficos('BACKLOG DE CLIENTES — DETALHE', 'Chamados pendentes de responsabilidade do locatário',
      [{ titulo: 'PENDÊNCIAS EM ABERTO' }]);
    return;
  }

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const marginX = 30, topY = 76;
  const listaH = (H - 16) - topY;

  const porCliente = {};
  const ordemClientes = [];
  dados.lista.forEach(it => {
    if (!porCliente[it.cliente]) { porCliente[it.cliente] = []; ordemClientes.push(it.cliente); }
    porCliente[it.cliente].push(it);
  });
  const grupos = ordemClientes.map(cli => porCliente[cli]);

  const coresMapa = _backlogClientesCoresMapa_(dados);
  // Mês cheio: em vez de encolher a fonte até ficar ilegível pra caber tudo
  // num card só, divide os CLIENTES (nunca um cliente no meio) em quantas
  // páginas forem necessárias — a pedido do usuário, não tem problema virar
  // mais de um slide contanto que nada fique de fora.
  const paginas = _paginarGruposBacklog_(grupos, listaH);

  paginas.forEach((grupoDaPagina, i) => {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(CORES.bgSlide);

    const ref = obterMesReferencia_();
    const subtitulo = 'Chamados pendentes de responsabilidade do locatário · Mês: ' + ref.siglaAno +
      (paginas.length > 1 ? ' — página ' + (i + 1) + ' de ' + paginas.length : '');
    criarHeaderPadrao(slide, 'BACKLOG DE CLIENTES — DETALHE', subtitulo);

    _backlogClientesTabela_(slide, marginX, topY, W - 2 * marginX, listaH, 'PENDÊNCIAS EM ABERTO', dados.total, grupoDaPagina, CORES.lightBlue, coresMapa);
    _backlogClientesBadge_(slide, marginX, topY, W - 2 * marginX, 'RESPONSABILIDADE DO LOCATÁRIO', CORES.themeCorr);
  });

  Logger.log('Slide Backlog de Clientes — Detalhe gerado — total=' + dados.total + ' em ' + paginas.length + ' página(s).');
}

// Divide os grupos (clientes) em páginas sem nunca partir um cliente no
// meio — cada página tem que caber no card com a fonte FIXA da tabela
// (FLOOR_FONT, que agora é a MESMA em toda página — ver _backlogClientesTabela_);
// se um cliente sozinho já estourar isso (caso raro de dezenas de chamados
// pro mesmo cliente), ele fica sozinho na própria página mesmo assim (ver
// comentário de _charsQueCabem_ pra o porquê do projeto tolerar esse tipo
// de estouro extremo em vez de esconder dado).
function _paginarGruposBacklog_(grupos, listaH) {
  if (!grupos.length) return [[]];

  const FLOOR_FONT = 7, LINE_PCT = 130;
  const MIN_ROW_H = 40, CAPTION_H = 12, ROW_GAP = 6;
  const HEADER_H = 16, HEADER_GAP = 6;
  // Mesmas constantes de layout de _backlogClientesTabela_: criarCardPainel
  // devolve y+32 (título do card), listY = contentY+4, listH = h-listY-8.
  const CARD_HEADER = 32, LIST_TOP_PAD = 4, LIST_BOTTOM_PAD = 8;
  const pageBudgetPt = listaH - CARD_HEADER - LIST_TOP_PAD - LIST_BOTTOM_PAD - HEADER_H - HEADER_GAP;

  const lineHFloor = FLOOR_FONT * (LINE_PCT / 100) * 1.15;
  const alturaGrupo = g => Math.max(g.length * lineHFloor, MIN_ROW_H + (g.length > 1 ? CAPTION_H : 0)) + ROW_GAP;

  const paginas = [];
  let atual = [], alturaAtual = 0;
  grupos.forEach(g => {
    const alturaG = alturaGrupo(g);
    if (atual.length && alturaAtual + alturaG > pageBudgetPt) {
      paginas.push(atual);
      atual = []; alturaAtual = 0;
    }
    atual.push(g);
    alturaAtual += alturaG;
  });
  if (atual.length) paginas.push(atual);
  return paginas;
}

// Chip no canto do card avisando de quem é a responsabilidade do backlog
// (locatário ou operação) — precisa ficar óbvio batendo o olho, não só no
// subtítulo pequeno do cabeçalho. Reaproveitado por
// Slide_BacklogClientesFacilities.gs/Slide_BacklogClientesProperties.gs
// (mesmo padrão visual, texto/cor mudam).
function _backlogClientesBadge_(slide, x, y, w, texto, cor) {
  const chipW = 220, chipH = 16, chipX = x + w - chipW - 14, chipY = y + 9;
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, chipX, chipY, chipW, chipH);
  bg.getFill().setSolidFill(cor, 0.15);
  bg.getBorder().setTransparent();
  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, chipX, chipY, chipW, chipH);
  txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  txt.getText().setText(texto).getTextStyle()
    .setFontSize(7).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
  txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}

// Mapa de cor por cliente — mesma paleta cíclica de Slide_ChamadosClientes.gs
// (_CLIENTE_PALETA_/_CLIENTE_COR_OUTROS_), atribuída pela ordem das fatias
// (já vem rankeada por qtd decrescente de obterDadosBacklogClientesDetalhes_).
function _backlogClientesCoresMapa_(dados) {
  const mapa = { 'Outros': _CLIENTE_COR_OUTROS_ };
  let i = 0;
  dados.fatias.forEach(f => {
    if (f.label === 'Outros') return;
    mapa[f.label] = _CLIENTE_PALETA_[i % _CLIENTE_PALETA_.length];
    i++;
  });
  return mapa;
}

// ── Card com a lista de pendências DE UMA PÁGINA, em formato de TABELA ───
// Cabeçalho interno "CLIENTE | DESCRIÇÃO | DATA | DIAS", coluna do logo com
// largura fixa separada por uma linha vertical, e uma linha horizontal fina
// fechando cada cliente — mesmo padrão de _clientesLista_ em
// Slide_ChamadosClientes.gs (ver o comentário lá pro raciocínio completo).
//
// Data e dias em aberto viraram COLUNAS próprias (a pedido do usuário) em
// vez de texto embutido na descrição. Por isso cada CHAMADO — não cada
// cliente — precisa da sua própria caixa de texto por coluna: se as 3
// colunas de um chamado morassem juntas numa caixa de texto corrida com
// várias linhas (como a descrição fazia antes), não haveria garantia de
// que a linha N da coluna DATA caía exatamente ao lado da linha N da
// coluna DESCRIÇÃO — o Slides não expõe a posição de cada linha dentro de
// uma caixa (mesmo problema de fundo do logo x texto, ver o comentário de
// _charsQueCabem_). Desenhando uma linha (Y) por chamado, cada trinca
// DESCRIÇÃO/DATA/DIAS nasce alinhada por construção.
//
// `grupos` já vem pré-dividido em página por _paginarGruposBacklog_ (em
// gerarSlideBacklogClientesDetalhes) — esta função só desenha; `totalCount`
// é o total do PERÍODO INTEIRO (todas as páginas), não só desta.
function _backlogClientesTabela_(slide, x, y, w, h, titulo, totalCount, grupos, corTema, coresMapa) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + totalCount + ')', corTema);
  const listY = contentY + 4, listH = y + h - listY - 8;

  if (!grupos.length) {
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Nenhum chamado no período.', CORES.cardGreen);
    return;
  }

  const LINE_PCT = 130;   // mais espaçado que as listas em coluna — preenche melhor a altura do card
  const ROW_GAP  = 6;     // respiro entre um cliente e o próximo, além da linha divisória

  const HEADER_H = 16, HEADER_GAP = 6;
  const linhasY = listY + HEADER_H + HEADER_GAP;

  const linhasGrupo = g => g.length;

  // Fonte FIXA em 7pt (não mais adaptativa entre 8 e 11) — a pedido do
  // usuário, padronizada nas três tabelas que compartilham esta função
  // (Backlog de Clientes — Detalhe/Facilities/Properties): antes o tamanho
  // mudava de página pra página conforme o volume de chamados (mais cheia
  // ficava em 8pt, mais vazia esticava até 11pt), o que deixava páginas do
  // mesmo relatório com aparência inconsistente e truncava a descrição cedo
  // demais nas páginas cheias. Com fonte menor e fixa, cabe mais texto por
  // linha (ver _charsQueCabem_) e todo página fica igual. Como
  // _paginarGruposBacklog_ já garante que cada página cabe com essa mesma
  // fonte, não há risco de estourar o card.
  const fontSize = 7;
  const lineH = fontSize * (LINE_PCT / 100) * 1.15;

  // Quantas LINHAS de descrição cada chamado ganha nesta página (1 ou 2).
  // _paginarGruposBacklog_ reserva 1 — o piso que garante o encaixe; quando
  // a página sobra altura (o vazio no rodapé do card que o usuário
  // apontou), cada chamado passa a ter 2 linhas em vez de truncar a
  // descrição no meio. A FONTE segue fixa; o que varia é só quanto texto
  // cabe, que o usuário liberou explicitamente por página.
  const MIN_ROW_H_PAG = 40, CAPTION_H_PAG = 12;
  const linhasPorChamado = _linhasPorChamadoQueCabem_(
    [grupos], listH - HEADER_H - HEADER_GAP, lineH, MIN_ROW_H_PAG, CAPTION_H_PAG, ROW_GAP);
  const alturaChamado = lineH * linhasPorChamado;

  const maxCliente = 26;
  // Coluna do logo dimensionada a partir do padrão único do deck
  // (Slide_LogosClientes.gs): LOGO_LARG_PADRAO é a largura mínima pra que
  // até o logo mais largo do acervo saia na altura padrão — abaixo dela as
  // marcas largas encolhem e a tabela volta a ficar com logos de tamanhos
  // diferentes, que foi exatamente a reclamação do usuário aqui.
  const LOGO_COL_W = LOGO_LARG_PADRAO, LOGO_GAP = 16, LOGO_CELL_H = LOGO_ALT_PADRAO + 6, MIN_ROW_H = 40;
  // Legenda "(N chamados)" só aparece em grupo com mais de 1 chamado — sem
  // reservar essa altura extra no piso da linha, ela invadia a linha do
  // próximo cliente (overlap com o divisor). CAPTION_H cobre o respiro +
  // o texto da legenda.
  const CAPTION_H = 12;
  // DATA_W/DIAS_W com folga pro pior caso (fonte no teto de 11pt): uma
  // data "dd/mm/aa" tem sempre 8 caracteres — com DATA_W = 60 e fonte
  // 10,5pt (fontSize-0.5), a capacidade real (_charsQueCabem_) cai pra 7 e
  // a data quebra em 2 linhas ("04/02/2" / "6"). Alargar pra 68/52 garante
  // margem mesmo no teto de fonte, tanto pra data (8 chars) quanto pra
  // dias em aberto de chamados bem antigos (3+ dígitos, ex. "372d").
  const DATA_W = 68, DIAS_W = 52, COL_GAP2 = 10, COL_GAP3 = 6;

  const descX  = x + 15 + LOGO_COL_W + LOGO_GAP;
  const descW  = (w - 30) - LOGO_COL_W - LOGO_GAP - DATA_W - COL_GAP2 - DIAS_W - COL_GAP3;
  const dataX  = descX + descW + COL_GAP2;
  const diasX  = dataX + DATA_W + COL_GAP3;

  const headerBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 15, listY, w - 30, HEADER_H);
  headerBg.getFill().setSolidFill(corTema, 0.10);
  headerBg.getBorder().setTransparent();
  _sTxt(slide, x + 15, listY, LOGO_COL_W, HEADER_H, 'CLIENTE', 7, true, corTema, 'center');
  _sTxt(slide, descX, listY, descW, HEADER_H, 'DESCRIÇÃO', 7, true, corTema, 'left');
  _sTxt(slide, dataX, listY, DATA_W, HEADER_H, 'DATA ABERTURA', 6, true, corTema, 'center');
  _sTxt(slide, diasX, listY, DIAS_W, HEADER_H, 'TEMPO ABERTO', 6, true, corTema, 'center');
  _linhaTabela_(slide, x + 15, listY + HEADER_H, w - 30, corTema, 1);
  [descX - COL_GAP2 / 2, dataX - COL_GAP3 / 2].forEach(lx => {
    const l = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, lx, listY, 0.75, HEADER_H);
    l.getFill().setSolidFill(_TABELA_LINHA_COR_); l.getBorder().setTransparent();
  });

  let cursorY = linhasY;
  grupos.forEach(grupo => {
    const cor = (coresMapa && coresMapa[grupo[0].cliente]) || corTema;
    const rowH = Math.max(linhasGrupo(grupo) * alturaChamado, MIN_ROW_H + (grupo.length > 1 ? CAPTION_H : 0));

    // Casa pelo apelido de exibição, não pelo nome cru — ver comentário
    // equivalente em Slide_ChamadosClientes.gs.
    const nomeDisplay = _clienteDisplay_(grupo[0].cliente);
    const logoBlob = _getClienteLogoBlob_(nomeDisplay);
    const logoY = cursorY + (rowH - LOGO_CELL_H - (grupo.length > 1 ? CAPTION_H : 0)) / 2;
    let logoOk = false;
    if (logoBlob) {
      try { logoOk = !!_insertLogoFitLegenda_(slide, logoBlob, nomeDisplay, x + 15, logoY, LOGO_COL_W, LOGO_CELL_H); }
      catch (e) { Logger.log('Logo do cliente ' + grupo[0].cliente + ' não desenhou: ' + e.message); }
    }
    if (!logoOk) {
      _sTxt(slide, x + 15, logoY, LOGO_COL_W, LOGO_CELL_H, _truncarNome_(nomeDisplay, maxCliente), 8.5, true, cor, 'center');
    }
    if (grupo.length > 1) {
      _sTxt(slide, x + 15, logoY + LOGO_CELL_H + 1, LOGO_COL_W, CAPTION_H - 1, '(' + grupo.length + ' chamados)', 7, false, CORES.textGray, 'center');
    }

    // Orçamento de caracteres do chamado: capacidade de UMA linha vezes
    // quantas linhas ele pode ocupar nesta página. A altura da linha já foi
    // reservada com o mesmo número, então a quebra é esperada e não
    // desalinha os logos/colunas seguintes (ver o comentário de
    // _charsQueCabem_ em Slide_ChamadosClientes.gs).
    const capacidadeLinha = _charsQueCabem_(descW, fontSize) * linhasPorChamado;

    let ticketY = cursorY + (rowH - grupo.length * alturaChamado) / 2;  // centraliza o bloco de linhas na altura do grupo
    grupo.forEach(it => {
      const descBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, descX, ticketY, descW, alturaChamado);
      const tr = descBox.getText();
      tr.setText('');
      // ID em cinza neutro — nunca na cor do cliente, senão ID e cliente
      // ficam indistinguíveis quando o cliente cai na mesma cor do tema.
      const idPart = tr.appendText('• ' + it.id + ' - ');
      idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
      // Piso baixo (4, não 12) — ver comentário equivalente em
      // Slide_ChamadosClientes.gs.
      const maxDesc = Math.max(4, capacidadeLinha - 3 - it.id.length - 3);
      const descPart = tr.appendText(_truncarNome_(it.descricao, maxDesc));
      descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
      tr.getParagraphStyle().setLineSpacing(LINE_PCT);
      descBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

      // DATA/DIAS na MESMA altura da caixa de descrição — as três são
      // centralizadas verticalmente, então com 2 linhas de descrição a data
      // e os dias ficam no meio dela, alinhados por construção.
      _sTxt(slide, dataX, ticketY, DATA_W, alturaChamado, it.dataReporte || '—', Math.max(6, fontSize - 0.5), false, CORES.textGray, 'center');
      const diasTxt = (it.diasAberto === null || it.diasAberto === undefined) ? '—' : it.diasAberto + 'd';
      _sTxt(slide, diasX, ticketY, DIAS_W, alturaChamado, diasTxt, fontSize, true, cor, 'center');

      ticketY += alturaChamado;
    });

    cursorY += rowH + ROW_GAP;
    _linhaTabela_(slide, x + 15, cursorY - ROW_GAP / 2, w - 30, _TABELA_LINHA_COR_, 0.75);
  });

  // Linhas verticais separando logo | descrição | data | dias, atravessando
  // cabeçalho + todas as linhas.
  const alturaTabela = cursorY - ROW_GAP - listY;
  [x + 15 + LOGO_COL_W + LOGO_GAP / 2, descX - COL_GAP2 / 2, dataX - COL_GAP3 / 2].forEach(lx => {
    const divisor = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, lx, listY, 0.75, alturaTabela);
    divisor.getFill().setSolidFill(_TABELA_LINHA_COR_);
    divisor.getBorder().setTransparent();
  });
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
// Chamados do backlog de responsabilidade do locatário que estavam em
// aberto durante o mês de referência no empreendimento ativo, agrupados
// por Cliente (mesma regra de janela de mês do Backlog Emergencial —
// Detalhe), busca automática na aba "BACKLOG - CLIENTES - DETALHES" da
// planilha de Histórico Validado. Sem a aba preenchida, cai no slide
// manual de espaço reservado.
function gerarSoBacklogClientesDetalhesCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogClientesDetalhes(); }
function gerarSoBacklogClientesDetalhesItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogClientesDetalhes(); }
function gerarSoBacklogClientesDetalhesEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogClientesDetalhes(); }

// ==========================================
// BACKLOG DE CLIENTES — FACILITIES
// ==========================================
/**
 * ARQUIVO: Slide_BacklogClientesFacilities.gs
 * SLIDE — BACKLOG DE CLIENTES — FACILITIES (chamados de responsabilidade da equipe Facilities)
 * DESCRIÇÃO: Um dos dois slides que dividem o backlog de chamados de
 * cliente que são responsabilidade DA OPERAÇÃO (o par com
 * Slide_BacklogClientesProperties.gs) — juntos, complementares ao Backlog
 * de Clientes — Detalhe (Slide_BacklogClientesDetalhes.gs, que é só
 * responsabilidade do LOCATÁRIO).
 *
 * Fonte: aba "BD-CORRETIVAS" da planilha BASE DE DADOS — QUADRO REM
 * (BD_CORRETIVAS_ID, histórico bruto desde 2021, multi-empreendimento),
 * filtrada por Centro de Custos = MEGA <EMPREENDIMENTO>, sem as linhas do
 * próprio condomínio, sem os chamados marcados como responsabilidade do
 * locatário, e aqui só os cuja equipe resolvida
 * (_resolverEquipeResponsaveis_, 02_Dados.gs) é FACILITIES — chamado de
 * equipe OPERAÇÃO ou não reconhecida entra aqui também (ver
 * obterDadosBacklogClientesFacilities_). Mesma janela de mês de
 * referência dos outros slides de backlog (_histAbertoNoMes_).
 *
 * Reaproveita 100% o desenho de tabela + paginação de
 * Slide_BacklogClientesDetalhes.gs (_backlogClientesTabela_,
 * _paginarGruposBacklog_, _backlogClientesCoresMapa_, _backlogClientesBadge_).
 *
 * Sem chamados de Facilities em aberto no mês de referência pro
 * empreendimento ativo: cai no slide manual de espaço reservado
 * (gerarSlideReservaGraficos), sem quebrar a geração.
 */

function gerarSlideBacklogClientesFacilities() {
  const dados = obterDadosBacklogClientesFacilities_();
  if (!dados) {
    gerarSlideReservaGraficos('BACKLOG DE CLIENTES — FACILITIES', 'Chamados de clientes pendentes de responsabilidade da equipe Facilities',
      [{ titulo: 'PENDÊNCIAS EM ABERTO' }]);
    return;
  }

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const marginX = 30, topY = 76;
  const listaH = (H - 16) - topY;

  const porCliente = {};
  const ordemClientes = [];
  dados.lista.forEach(it => {
    if (!porCliente[it.cliente]) { porCliente[it.cliente] = []; ordemClientes.push(it.cliente); }
    porCliente[it.cliente].push(it);
  });
  const grupos = ordemClientes.map(cli => porCliente[cli]);

  const coresMapa = _backlogClientesCoresMapa_(dados);
  const paginas = _paginarGruposBacklog_(grupos, listaH);

  paginas.forEach((grupoDaPagina, i) => {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(CORES.bgSlide);

    const ref = obterMesReferencia_();
    const subtitulo = 'Chamados de clientes pendentes de responsabilidade da equipe Facilities · Mês: ' + ref.siglaAno +
      (paginas.length > 1 ? ' — página ' + (i + 1) + ' de ' + paginas.length : '');
    criarHeaderPadrao(slide, 'BACKLOG DE CLIENTES — FACILITIES', subtitulo);

    _backlogClientesTabela_(slide, marginX, topY, W - 2 * marginX, listaH, 'PENDÊNCIAS EM ABERTO', dados.total, grupoDaPagina, CORES.lightBlue, coresMapa);
    _backlogClientesBadge_(slide, marginX, topY, W - 2 * marginX, 'RESPONSABILIDADE FACILITIES', CORES.lightBlue);
  });

  Logger.log('Slide Backlog de Clientes — Facilities gerado — total=' + dados.total + ' em ' + paginas.length + ' página(s).');
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
function gerarSoBacklogClientesFacilitiesCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogClientesFacilities(); }
function gerarSoBacklogClientesFacilitiesItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogClientesFacilities(); }
function gerarSoBacklogClientesFacilitiesEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogClientesFacilities(); }

// ==========================================
// BACKLOG DE CLIENTES — PROPERTIES
// ==========================================
/**
 * ARQUIVO: Slide_BacklogClientesProperties.gs
 * SLIDE — BACKLOG DE CLIENTES — PROPERTIES (chamados de responsabilidade da equipe Property)
 * DESCRIÇÃO: Um dos dois slides que dividem o backlog de chamados de
 * cliente que são responsabilidade DA OPERAÇÃO (o par com
 * Slide_BacklogClientesFacilities.gs) — juntos, complementares ao Backlog
 * de Clientes — Detalhe (Slide_BacklogClientesDetalhes.gs, que é só
 * responsabilidade do LOCATÁRIO).
 *
 * Fonte: aba "BD-CORRETIVAS" da planilha BASE DE DADOS — QUADRO REM
 * (BD_CORRETIVAS_ID, histórico bruto desde 2021, multi-empreendimento),
 * filtrada por Centro de Custos = MEGA <EMPREENDIMENTO>, sem as linhas do
 * próprio condomínio, sem os chamados marcados como responsabilidade do
 * locatário, e aqui só os cuja equipe resolvida
 * (_resolverEquipeResponsaveis_, 02_Dados.gs) é PROPERTY — PROPERTY
 * prevalece sobre as outras equipes quando o chamado tem mais de um
 * responsável de equipes diferentes. Mesma janela de mês de referência
 * dos outros slides de backlog (_histAbertoNoMes_).
 *
 * Reaproveita 100% o desenho de tabela + paginação de
 * Slide_BacklogClientesDetalhes.gs (_backlogClientesTabela_,
 * _paginarGruposBacklog_, _backlogClientesCoresMapa_, _backlogClientesBadge_).
 * Tema em âmbar (CORES.themeCorr) — mesma cor que _equipeCor_
 * (Slide_BacklogEmergencialDetalhe.gs) já usa pra identificar PROPERTY.
 *
 * Sem chamados de Property em aberto no mês de referência pro
 * empreendimento ativo: cai no slide manual de espaço reservado
 * (gerarSlideReservaGraficos), sem quebrar a geração.
 */

function gerarSlideBacklogClientesProperties() {
  const dados = obterDadosBacklogClientesProperties_();
  if (!dados) {
    gerarSlideReservaGraficos('BACKLOG DE CLIENTES — PROPERTIES', 'Chamados de clientes pendentes de responsabilidade da equipe Property',
      [{ titulo: 'PENDÊNCIAS EM ABERTO' }]);
    return;
  }

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const marginX = 30, topY = 76;
  const listaH = (H - 16) - topY;

  const porCliente = {};
  const ordemClientes = [];
  dados.lista.forEach(it => {
    if (!porCliente[it.cliente]) { porCliente[it.cliente] = []; ordemClientes.push(it.cliente); }
    porCliente[it.cliente].push(it);
  });
  const grupos = ordemClientes.map(cli => porCliente[cli]);

  const coresMapa = _backlogClientesCoresMapa_(dados);
  const paginas = _paginarGruposBacklog_(grupos, listaH);

  paginas.forEach((grupoDaPagina, i) => {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(CORES.bgSlide);

    const ref = obterMesReferencia_();
    const subtitulo = 'Chamados de clientes pendentes de responsabilidade da equipe Property · Mês: ' + ref.siglaAno +
      (paginas.length > 1 ? ' — página ' + (i + 1) + ' de ' + paginas.length : '');
    criarHeaderPadrao(slide, 'BACKLOG DE CLIENTES — PROPERTIES', subtitulo);

    _backlogClientesTabela_(slide, marginX, topY, W - 2 * marginX, listaH, 'PENDÊNCIAS EM ABERTO', dados.total, grupoDaPagina, CORES.themeCorr, coresMapa);
    _backlogClientesBadge_(slide, marginX, topY, W - 2 * marginX, 'RESPONSABILIDADE PROPERTIES', CORES.themeCorr);
  });

  Logger.log('Slide Backlog de Clientes — Properties gerado — total=' + dados.total + ' em ' + paginas.length + ' página(s).');
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
function gerarSoBacklogClientesPropertiesCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogClientesProperties(); }
function gerarSoBacklogClientesPropertiesItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogClientesProperties(); }
function gerarSoBacklogClientesPropertiesEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogClientesProperties(); }
