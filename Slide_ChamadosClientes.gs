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
  _clientesResumoLogos_(slide, marginX,             topY, colW, rowH, 'ABERTOS',  dados.abertos,  CORES.lightBlue, coresMapa);
  _clientesResumoLogos_(slide, marginX + colW + gap, topY, colW, rowH, 'FECHADOS', dados.fechados, CORES.darkBlue, coresMapa);

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
  const logoH = Math.min(46, areaH * 0.5);
  const qtyY  = areaY + logoH + 6;

  dadosPeriodo.fatias.forEach((f, i) => {
    const tileX = x + 12 + i * (tileW + tileGap);
    const cor = (coresMapa && coresMapa[f.label]) || corTema;

    const logoBlob = f.label === 'Outros' ? null : _getClienteLogoBlob_(_clienteDisplay_(f.label));
    let logoOk = false;
    if (logoBlob) {
      try { _insertLogoFit_(slide, logoBlob, tileX, areaY, tileW, logoH); logoOk = true; }
      catch (e) { Logger.log('Logo do cliente ' + f.label + ' não desenhou: ' + e.message); }
    }
    if (!logoOk) {
      _sTxt(slide, tileX, areaY, tileW, logoH, _truncarNome_(_clienteDisplay_(f.label), 16), 9, true, cor, 'center');
    }

    const pct = total > 0 ? (f.qtd / total * 100) : 0;
    _sTxt(slide, tileX, qtyY, tileW, 22, String(f.qtd), 16, true, cor, 'center');
    _sTxt(slide, tileX, qtyY + 20, tileW, 12, pct.toFixed(1).replace('.', ',') + '%', 7.5, false, CORES.textGray, 'center');
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
  const LOGO_W = 44, LOGO_GAP = 8;
  // Orçamento de caracteres da descrição calculado pela largura REAL
  // disponível (não uma tabela fixa por nº de colunas) — cada coluna usa o
  // espaço que sobra depois do logo, então uma coluna larga com poucos
  // clientes aproveita bem mais linha do que a tabela fixa antiga permitia.
  const CHAR_W = fontSize * 0.52;

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
          // Logo ocupa a altura da linha inteira do grupo (não só a 1ª
          // linha) — _insertLogoFit_ centraliza dentro da caixa, então num
          // grupo de vários chamados o logo fica centralizado no bloco
          // inteiro, não colado no topo.
          _insertLogoFit_(slide, logoBlob, colX, cursorY, LOGO_W, rowH);
          textX = colX + LOGO_W + LOGO_GAP;
          textW = colW - LOGO_W - LOGO_GAP;
        } catch (e) {
          Logger.log('Logo do cliente ' + grupo[0].cliente + ' não desenhou: ' + e.message);
        }
      }
      const maxDesc = Math.max(20, Math.floor((textW - 70) / CHAR_W));

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
