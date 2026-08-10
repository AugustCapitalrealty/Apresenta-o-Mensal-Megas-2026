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
  const dados = obterDadosChamadosClientes_();
  if (!dados) {
    gerarSlideReservaGraficos('CHAMADOS DE CLIENTES', 'Abertos x Fechados',
      [{ titulo: 'ABERTOS' }, { titulo: 'FECHADOS' }]);
    return;
  }

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

    const sub = 'Chamados ' + rotulo.toLowerCase() + ' no mês' +
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
