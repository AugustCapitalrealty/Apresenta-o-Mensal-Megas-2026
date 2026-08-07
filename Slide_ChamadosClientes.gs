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

// Altura-alvo do logo nas listas de chamados de cliente (Chamados de
// Clientes e Backlog de Clientes) — ~15pt ≈ 0,53cm, calibrada no ajuste
// manual que o usuário fez direto no Slides em vários logos (Bosch,
// Shopee, Suzano, Sodexo, Veloz — todos entre 0,42cm e 0,6cm de altura).
//
// POR QUE A ALTURA É O EIXO FIXO (não a largura): os logos dos clientes
// têm formatos bem diferentes — uns são "em linha" (marca larga e baixa,
// tipo Sodexo) e outros "quadrados" (ícone empilhado sobre o texto, tipo
// Veloz). Travar a LARGURA e deixar a altura livre (como a 1ª versão desta
// correção fazia) dá altura diferente pra cada formato — os quadrados
// saem mais altos que os em linha e desalinham com a linha de texto ao
// lado. Travando a ALTURA em vez disso, todo logo ocupa exatamente essa
// faixa vertical não importa o formato — só a largura varia (logo em
// linha sai largo e curto, logo quadrado sai mais estreito), que é
// justamente o que _insertLogoFit_ já faz ao receber uma caixa mais larga
// que alta: a altura vira o fator limitante do "contain fit".
const LOGO_H_ALVO_PT = 15;

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

  // Teto fixo pro logo: _insertLogoFit_ preenche o máximo da caixa que
  // receber, então sem limite um período com 2 clientes daria a cada um
  // metade do card e os logos sairiam gigantes (e desproporcionais aos de
  // um período com 5). Com o teto, a caixa do logo é a MESMA em todos os
  // períodos — só sobra mais respiro lateral quando há poucos clientes.
  const LOGO_MAX_W = 92, LOGO_MAX_H = 38;
  const logoW = Math.min(tileW, LOGO_MAX_W);
  const logoH = Math.min(LOGO_MAX_H, areaH * 0.45);
  const qtyY  = areaY + logoH + 8;

  dadosPeriodo.fatias.forEach((f, i) => {
    const tileX = x + 12 + i * (tileW + tileGap);
    const logoX = tileX + (tileW - logoW) / 2;   // logo centralizado no tile
    const cor = (coresMapa && coresMapa[f.label]) || corTema;

    const logoBlob = f.label === 'Outros' ? null : _getClienteLogoBlob_(_clienteDisplay_(f.label));
    let logoOk = false;
    if (logoBlob) {
      try { _insertLogoFit_(slide, logoBlob, logoX, areaY, logoW, logoH); logoOk = true; }
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
  // LOGO_W é só o teto de largura pro "contain fit" (ver LOGO_H_ALVO_PT) —
  // não a largura real de todo logo. Um logo bem largo/baixo pode chegar
  // perto desse teto; um quadrado fica bem mais estreito.
  const LOGO_W = 55, LOGO_GAP = 8;

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
      // Casa pelo apelido de exibição, não pelo nome cru da planilha — o
      // mapa de logos (Slide_LogosClientes.gs) usa nomes informais tipo
      // "Shopee", que não aparecem como substring na razão social "SHPX
      // LOGÍSTICA LTDA". _clienteDisplay_ já resolve essa distância.
      const logoBlob = _getClienteLogoBlob_(_clienteDisplay_(grupo[0].cliente));
      // Grupo com logo precisa de no mínimo LOGO_H_ALVO_PT de altura pra
      // caber o logo sem estourar pro bloco seguinte — num grupo de 1
      // chamado só (rowH = 1 linha), o texto sozinho não precisaria de
      // tanto espaço, mas o logo precisa.
      const rowH = Math.max(linhasGrupo(grupo) * lineH, logoBlob ? LOGO_H_ALVO_PT + TEXTBOX_INSET_PT : 0);
      let textX = colX, textW = colW;
      if (logoBlob) {
        try {
          // Altura travada em LOGO_H_ALVO_PT (não em rowH) — ver
          // LOGO_H_ALVO_PT pro porquê da altura ser o eixo fixo em vez da
          // largura. O deslocamento de TEXTBOX_INSET_PT compensa a margem
          // interna da caixa de texto ao lado, pra casar com a 1ª linha.
          _insertLogoFit_(slide, logoBlob, colX, cursorY + TEXTBOX_INSET_PT, LOGO_W, LOGO_H_ALVO_PT);
          textX = colX + LOGO_W + LOGO_GAP;
          textW = colW - LOGO_W - LOGO_GAP;
        } catch (e) {
          Logger.log('Logo do cliente ' + grupo[0].cliente + ' não desenhou: ' + e.message);
        }
      }
      // Orçamento de caracteres por LINHA, descontando o prefixo de cada
      // uma (bullet/indentação + id + separador). Cada chamado tem que
      // caber numa linha só, senão a quebra desalinha os logos seguintes —
      // ver o comentário de _charsQueCabem_.
      const capacidadeLinha = _charsQueCabem_(textW, fontSize);

      const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, textX, cursorY, textW, rowH);
      const tr = box.getText();
      tr.setText('');

      if (grupo.length === 1) {
        const bullet = tr.appendText('• ');
        bullet.getTextStyle().setForegroundColor(CORES.textGray).setFontSize(fontSize).setBold(true);
        const nomeTxt = logoBlob ? '' : _truncarNome_(_clienteDisplay_(grupo[0].cliente), maxCliente) + ' - ';
        if (nomeTxt) {
          const cliPart = tr.appendText(nomeTxt);
          cliPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(corTema).setFontFamily('Montserrat');
        }
        const idPart = tr.appendText(grupo[0].id + ' - ');
        idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
        const maxDesc = Math.max(12, capacidadeLinha - 2 - nomeTxt.length - grupo[0].id.length - 3);
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
          const maxDesc = Math.max(12, capacidadeLinha - 3 - it.id.length - 3);
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
