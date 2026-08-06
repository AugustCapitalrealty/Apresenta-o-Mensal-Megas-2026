/**
 * ARQUIVO: Slide_ChamadosClientes.gs
 * SLIDE — CHAMADOS DE CLIENTES (Abertos x Fechados)
 * DESCRIÇÃO: Substitui o slide manual por duas barras 100% empilhadas
 * (Abertos e Fechados, fatiadas por Cliente) mais a lista completa de
 * chamados de cada período — lido das mesmas abas "CHAMADOS ABERTOS
 * MES"/"CHAMADOS FECHADOS MES" da planilha de Histórico Validado usadas
 * pelo slide Chamados por Prioridade (obterDadosChamadosClientes_ em
 * 02_Dados.gs), filtrado pelo Centro de Custos da cidade ativa e sem as
 * linhas do próprio condomínio (só chamados de clientes de verdade).
 *
 * Mesma técnica de barra 100% nativa (só RECTANGLE) do slide de
 * Prioridade — ver o comentário lá pra explicação de por que não é uma
 * pizza de verdade.
 *
 * A lista de chamados mostra o logo do cliente (Google Drive) quando
 * cadastrado em LOGOS_CLIENTES (Slide_LogosClientes.gs); sem logo, cai no
 * nome em texto de sempre — nunca quebra a geração por causa disso.
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

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  criarHeaderPadrao(slide, 'CHAMADOS DE CLIENTES', 'Abertos x Fechados');

  const marginX = 30, topY = 76, gap = 16;
  const areaBottom = H - 16;
  const colW = (W - 2 * marginX - gap) / 2;
  const rowH = (areaBottom - topY - gap) / 2;

  const coresMapa = _clienteCoresMapa_(dados);
  _clientesBarraCard_(slide, marginX,             topY, colW, rowH, 'ABERTOS',  dados.abertos,  CORES.lightBlue, coresMapa);
  _clientesBarraCard_(slide, marginX + colW + gap, topY, colW, rowH, 'FECHADOS', dados.fechados, CORES.darkBlue, coresMapa);

  const y2 = topY + rowH + gap;
  _clientesLista_(slide, marginX,             y2, colW, rowH, 'LISTA DE CHAMADOS ABERTOS',  dados.abertos.lista,  CORES.lightBlue);
  _clientesLista_(slide, marginX + colW + gap, y2, colW, rowH, 'LISTA DE CHAMADOS FECHADOS', dados.fechados.lista, CORES.darkBlue);

  Logger.log('Slide Chamados de Clientes gerado — abertos=' + dados.abertos.total +
             ', fechados=' + dados.fechados.total + '.');
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
  { trecho: 'magazine luiza', apelido: 'Magazine Luiza' },
  { trecho: 'stella',         apelido: 'Stella' },
  { trecho: 'rio branco',     apelido: 'Rio Branco' },
  { trecho: 'domus',          apelido: 'Domus' },
  { trecho: 'mercadolivre',   apelido: 'Mercado Livre' },
  { trecho: 'calamo',         apelido: 'Cálamo' },
  { trecho: 'boticario',      apelido: 'Boticário' },
  { trecho: 'ntn rolamentos', apelido: 'NTN' }
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

// ── Card com a barra 100% empilhada Abertos/Fechados por Cliente ──────────
function _clientesBarraCard_(slide, x, y, w, h, titulo, dadosPeriodo, corTema, coresMapa) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + dadosPeriodo.total + ')', corTema);
  const areaY = contentY + 2, areaH = y + h - areaY - 8;

  if (!dadosPeriodo.fatias.length) {
    _prioridadeSemDado_(slide, x, areaY, w, areaH, 'Nenhum chamado de cliente no período.', CORES.textGray);
    return;
  }

  const barX = x + 16, barW = w - 32, barY = areaY + 8, barH = 28;
  const total = dadosPeriodo.total;

  let cursorX = barX;
  dadosPeriodo.fatias.forEach((f, i) => {
    const ehUltima = i === dadosPeriodo.fatias.length - 1;
    const segW = ehUltima ? (barX + barW - cursorX) : Math.round((f.qtd / total) * barW);
    const cor = coresMapa[f.label] || CORES.textGray;

    const seg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cursorX, barY, Math.max(segW, 1), barH);
    seg.getFill().setSolidFill(cor);
    seg.getBorder().setTransparent();

    if (segW >= 16) {
      _sTxt(slide, cursorX, barY + 6, segW, 16, String(f.qtd), 9.5, true, CORES.white, 'center');
    }
    cursorX += segW;
  });

  // Legenda: bolinha + cliente (truncado) + qtd (%) — altura de linha
  // adaptada à quantidade de fatias, igual ao slide de Prioridade.
  const legendTop = barY + barH + 10;
  const legendBottom = areaY + areaH - 4;
  const rowH = Math.min(20, (legendBottom - legendTop) / dadosPeriodo.fatias.length);
  let legendY = legendTop;
  dadosPeriodo.fatias.forEach(f => {
    const cor = coresMapa[f.label] || CORES.textGray;
    const pct = total > 0 ? (f.qtd / total * 100) : 0;
    const pctTxt = pct.toFixed(1).replace('.', ',') + '%';

    const dot = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, legendY + rowH / 2 - 4, 8, 8);
    dot.getFill().setSolidFill(cor);
    dot.getBorder().setTransparent();

    _sTxt(slide, barX + 13, legendY, 160, rowH, _truncarNome_(_clienteDisplay_(f.label), 30), 8, true, CORES.textDark, 'left');
    _sTxt(slide, barX + 176, legendY, barW - 176, rowH, f.qtd + ' (' + pctTxt + ')', 8, false, CORES.textGray, 'left');
    legendY += rowH;
  });
}

// ── Card com a lista completa de chamados (Abertos ou Fechados) ───────────
function _clientesLista_(slide, x, y, w, h, titulo, itens, corTema) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + itens.length + ')', corTema);
  const listY = contentY + 2, listH = y + h - listY - 8;

  if (!itens.length) {
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Nenhum chamado no período.', CORES.cardGreen);
    return;
  }

  // Mostra TODOS os chamados, sem cortar — e cada um detalhado (id +
  // descrição). Cliente com mais de um chamado no período agrupa embaixo do
  // nome uma vez só (em vez de repetir "Cliente - id - descrição" em cada
  // linha), mas cada chamado do grupo continua com sua própria linha de
  // detalhe — só o nome do cliente é que não se repete. A partir de 6
  // GRUPOS divide em colunas (mesma ideia de _colunaTexto_/
  // Slide02_Preventivas.gs) e o corpo do texto encolhe conforme a
  // quantidade de LINHAS por coluna (não de grupos — um grupo com vários
  // chamados ocupa várias linhas), até um mínimo ainda legível. Em meses
  // muito cheios o texto pode encostar no rodapé do card (aceitável — o
  // que não pode é sumir chamado ou descrição da lista).
  const porCliente = {};
  const ordemClientes = [];
  itens.forEach(it => {
    if (!porCliente[it.cliente]) { porCliente[it.cliente] = []; ordemClientes.push(it.cliente); }
    porCliente[it.cliente].push(it);
  });
  const grupos = ordemClientes.map(cli => porCliente[cli]);

  const cols     = grupos.length > 6 ? 2 : 1;
  const colGap   = 14;
  const colW     = (w - 30 - (cols - 1) * colGap) / cols;
  const porCol   = Math.ceil(grupos.length / cols);
  const LINE_PCT = 118;

  // Linhas de cada grupo: 1 por chamado + 1 de cabeçalho extra só quando o
  // grupo tem mais de 1 chamado (o cabeçalho do grupo de 1 chamado é a
  // própria linha do chamado, não soma linha a mais).
  const linhasGrupo = g => g.length === 1 ? 1 : g.length + 1;
  let maxLinhasColuna = 0;
  for (let c = 0; c < cols; c++) {
    const fatia = grupos.slice(c * porCol, (c + 1) * porCol);
    maxLinhasColuna = Math.max(maxLinhasColuna, fatia.reduce((s, g) => s + linhasGrupo(g), 0));
  }

  let fontSize = Math.min(8, listH / (maxLinhasColuna * (LINE_PCT / 100) * 1.15));
  fontSize = Math.max(6, Math.round(fontSize * 2) / 2);  // arredonda pra 0,5pt, piso de 6pt
  const lineH = fontSize * (LINE_PCT / 100) * 1.15;

  const maxCliente = cols === 1 ? 22 : 16;
  const maxDesc    = cols === 1 ? 42 : 26;
  const LOGO_W = 32, LOGO_GAP = 6;

  // Cada grupo (cliente) vira sua própria caixa de texto, empilhada em Y à
  // medida que avança — não dá pra usar uma caixa só por coluna com texto
  // corrido quando tem logo: o Slides não devolve a posição de cada linha
  // renderizada dentro de uma caixa (não dá pra alinhar imagem com texto
  // que flui sozinho), então a única forma de casar o logo com a linha
  // certa é desenhar cada grupo numa caixa própria, numa posição calculada
  // à mão (mesma matemática de altura de linha usada pra dimensionar a
  // fonte acima). Cliente sem logo cadastrado cai no nome em texto de
  // sempre (_getClienteLogoBlob_, Slide_LogosClientes.gs).
  for (let c = 0; c < cols; c++) {
    const fatia = grupos.slice(c * porCol, (c + 1) * porCol);
    if (!fatia.length) continue;

    const colX = x + 15 + c * (colW + colGap);
    let cursorY = listY;

    fatia.forEach(grupo => {
      const rowH = linhasGrupo(grupo) * lineH;
      let textX = colX, textW = colW;
      // Casa pelo apelido de exibição, não pelo nome cru da planilha — o
      // mapa de logos (Slide_LogosClientes.gs) usa nomes informais tipo
      // "Shopee", que não aparecem como substring na razão social "SHPX
      // LOGÍSTICA LTDA". _clienteDisplay_ já resolve essa distância.
      const logoBlob = _getClienteLogoBlob_(_clienteDisplay_(grupo[0].cliente));
      if (logoBlob) {
        try {
          _insertLogoFit_(slide, logoBlob, colX, cursorY, LOGO_W, lineH);
          textX = colX + LOGO_W + LOGO_GAP;
          textW = colW - LOGO_W - LOGO_GAP;
        } catch (e) {
          Logger.log('Logo do cliente ' + grupo[0].cliente + ' não desenhou: ' + e.message);
        }
      }

      const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, textX, cursorY, textW, rowH);
      const tr = box.getText();
      tr.setText('');

      if (grupo.length === 1) {
        const bullet = tr.appendText('• ');
        bullet.getTextStyle().setForegroundColor(CORES.textGray).setFontSize(fontSize).setBold(true);
        if (!logoBlob) {
          const cliPart = tr.appendText(_truncarNome_(_clienteDisplay_(grupo[0].cliente), maxCliente) + ' - ');
          cliPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(corTema).setFontFamily('Montserrat');
        }
        const idPart = tr.appendText(grupo[0].id + ' - ');
        idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
        const descPart = tr.appendText(_truncarNome_(grupo[0].descricao, maxDesc));
        descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
      } else {
        const bullet = tr.appendText('• ');
        bullet.getTextStyle().setForegroundColor(CORES.textGray).setFontSize(fontSize).setBold(true);
        const rotulo = (logoBlob ? '' : _truncarNome_(_clienteDisplay_(grupo[0].cliente), maxCliente) + ' ') + '(' + grupo.length + ')\n';
        const cliPart = tr.appendText(rotulo);
        cliPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(corTema).setFontFamily('Montserrat');
        grupo.forEach(it => {
          const idPart = tr.appendText('   ' + it.id + ' - ');
          idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
          const descPart = tr.appendText(_truncarNome_(it.descricao, maxDesc) + '\n');
          descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
        });
      }

      tr.getParagraphStyle().setLineSpacing(LINE_PCT);
      box.setContentAlignment(SlidesApp.ContentAlignment.TOP);
      cursorY += rowH;
    });
  }
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
