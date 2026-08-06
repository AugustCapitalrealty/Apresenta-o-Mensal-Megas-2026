/**
 * ARQUIVO: Slide_BacklogClientesDetalhes.gs
 * SLIDE — BACKLOG DE CLIENTES — DETALHE (chamados de responsabilidade do locatário)
 * DESCRIÇÃO: Lista as pendências do backlog que são de responsabilidade do
 * locatário (não da operação), agrupadas por Cliente, lidas da aba
 * "BACKLOG - CLIENTES - DETALHES" da planilha de Histórico Validado
 * (obterDadosBacklogClientesDetalhes_ em 02_Dados.gs), filtradas por Centro
 * de Custos = MEGA <EMPREENDIMENTO> e sem as linhas do próprio condomínio.
 * Mesma regra de janela de mês de referência do slide de Backlog
 * Emergencial — Detalhe: um chamado que hoje já aparece "Fechado" ainda
 * entra se esteve aberto em algum momento do mês de referência (ver
 * comentário em 02_Dados.gs, _histAbertoNoMes_).
 *
 * O foco do slide é a LISTA de pendências — sem gráfico de resumo (o card
 * de barra por cliente foi removido a pedido: o que importa aqui é o
 * detalhe de cada chamado, não a proporção entre clientes). Cliente com
 * mais de um chamado agrupa o nome uma vez só, mas cada chamado continua
 * com sua própria linha (id + data + dias em aberto + descrição) — nunca
 * corta nenhum item.
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
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  criarHeaderPadrao(slide, 'BACKLOG DE CLIENTES — DETALHE', 'Chamados pendentes de responsabilidade do locatário');

  const marginX = 30, topY = 76;
  const areaBottom = H - 16;
  const listaH = areaBottom - topY;

  const coresMapa = _backlogClientesCoresMapa_(dados);
  _backlogClientesLista_(slide, marginX, topY, W - 2 * marginX, listaH, 'PENDÊNCIAS EM ABERTO', dados.lista, CORES.lightBlue, coresMapa);
  _backlogClientesBadgeLocatario_(slide, marginX, topY, W - 2 * marginX);

  Logger.log('Slide Backlog de Clientes — Detalhe gerado — total=' + dados.total + '.');
}

// Chip "RESPONSABILIDADE DO LOCATÁRIO" no canto do card — o assunto do
// slide (backlog que depende do cliente agir, não da operação) precisa
// ficar óbvio batendo o olho, não só no subtítulo pequeno do cabeçalho.
function _backlogClientesBadgeLocatario_(slide, x, y, w) {
  const chipW = 220, chipH = 16, chipX = x + w - chipW - 14, chipY = y + 9;
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, chipX, chipY, chipW, chipH);
  bg.getFill().setSolidFill(CORES.themeCorr, 0.15);
  bg.getBorder().setTransparent();
  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, chipX, chipY, chipW, chipH);
  txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  txt.getText().setText('RESPONSABILIDADE DO LOCATÁRIO').getTextStyle()
    .setFontSize(7).setBold(true).setForegroundColor(CORES.themeCorr).setFontFamily('Montserrat');
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

// ── Card com a lista completa de pendências, agrupada por Cliente ─────────
// Mesma técnica de _clientesLista_ (Slide_ChamadosClientes.gs): o nome do
// cliente aparece uma vez só quando ele tem mais de um chamado (evita
// repetir o nome em cada linha), mas cada chamado continua com sua própria
// linha de detalhe — nunca corta nenhum item, nem esconde descrição atrás
// de "+N outros". Aqui cada linha também mostra a data do chamado e há
// quantos dias está em aberto (_backlogMetaTexto_, em
// Slide_BacklogEmergencialDetalhe.gs) — informação que o slide de Chamados
// de Clientes não tem.
function _backlogClientesLista_(slide, x, y, w, h, titulo, itens, corTema, coresMapa) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + itens.length + ')', corTema);
  const listY = contentY + 2, listH = y + h - listY - 8;

  if (!itens.length) {
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Nenhum chamado no período.', CORES.cardGreen);
    return;
  }

  const porCliente = {};
  const ordemClientes = [];
  itens.forEach(it => {
    if (!porCliente[it.cliente]) { porCliente[it.cliente] = []; ordemClientes.push(it.cliente); }
    porCliente[it.cliente].push(it);
  });
  const grupos = ordemClientes.map(cli => porCliente[cli]);

  const cols     = grupos.length > 6 ? (grupos.length > 16 ? 3 : 2) : 1;
  const colGap   = 14;
  const colW     = (w - 30 - (cols - 1) * colGap) / cols;
  const porCol   = Math.ceil(grupos.length / cols);
  const LINE_PCT = 118;

  // Linhas de cada grupo: 1 por chamado + 1 de cabeçalho extra só quando o
  // grupo tem mais de 1 chamado (grupo de 1 chamado é uma linha só).
  const linhasGrupo = g => g.length === 1 ? 1 : g.length + 1;
  let maxLinhasColuna = 0;
  for (let c = 0; c < cols; c++) {
    const fatia = grupos.slice(c * porCol, (c + 1) * porCol);
    maxLinhasColuna = Math.max(maxLinhasColuna, fatia.reduce((s, g) => s + linhasGrupo(g), 0));
  }

  let fontSize = Math.min(8, listH / (maxLinhasColuna * (LINE_PCT / 100) * 1.15));
  fontSize = Math.max(6, Math.round(fontSize * 2) / 2);  // arredonda pra 0,5pt, piso de 6pt
  const lineH = fontSize * (LINE_PCT / 100) * 1.15;

  const maxCliente = cols === 1 ? 20 : (cols === 2 ? 14 : 10);
  const maxDesc    = cols === 1 ? 58 : (cols === 2 ? 30 : 18);
  const LOGO_W = 32, LOGO_GAP = 6;

  // Cada grupo (cliente) vira sua própria caixa de texto, empilhada em Y à
  // medida que avança — mesma técnica de Slide_ChamadosClientes.gs (ver
  // comentário lá): não dá pra alinhar logo com uma linha específica dentro
  // de uma caixa de texto corrido, então cada grupo ganha posição própria.
  for (let c = 0; c < cols; c++) {
    const fatia = grupos.slice(c * porCol, (c + 1) * porCol);
    if (!fatia.length) continue;

    const colX = x + 15 + c * (colW + colGap);
    let cursorY = listY;

    fatia.forEach(grupo => {
      const cor = (coresMapa && coresMapa[grupo[0].cliente]) || corTema;
      const rowH = linhasGrupo(grupo) * lineH;

      let textX = colX, textW = colW;
      // Casa pelo apelido de exibição, não pelo nome cru — ver comentário
      // equivalente em Slide_ChamadosClientes.gs.
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
          cliPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
        }
        // ID em cinza neutro — nunca na cor do cliente, senão ID e cliente
        // ficam indistinguíveis quando o cliente cai na mesma cor do tema.
        const idPart = tr.appendText(grupo[0].id + ' ');
        idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
        const meta = _backlogMetaTexto_(grupo[0]);
        if (meta) {
          const metaPart = tr.appendText('(' + meta + ') ');
          metaPart.getTextStyle().setFontSize(Math.max(6, fontSize - 0.5)).setItalic(true).setBold(false).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
        }
        const descPart = tr.appendText('- ' + _truncarNome_(grupo[0].descricao, maxDesc));
        descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
      } else {
        const bullet = tr.appendText('• ');
        bullet.getTextStyle().setForegroundColor(CORES.textGray).setFontSize(fontSize).setBold(true);
        const rotulo = (logoBlob ? '' : _truncarNome_(_clienteDisplay_(grupo[0].cliente), maxCliente) + ' ') + '(' + grupo.length + ')\n';
        const cliPart = tr.appendText(rotulo);
        cliPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
        grupo.forEach(it => {
          const idPart = tr.appendText('   ' + it.id + ' ');
          idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
          const meta = _backlogMetaTexto_(it);
          if (meta) {
            const metaPart = tr.appendText('(' + meta + ') ');
            metaPart.getTextStyle().setFontSize(Math.max(6, fontSize - 0.5)).setItalic(true).setBold(false).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
          }
          const descPart = tr.appendText('- ' + _truncarNome_(it.descricao, maxDesc) + '\n');
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
// Chamados do backlog de responsabilidade do locatário que estavam em
// aberto durante o mês de referência no empreendimento ativo, agrupados
// por Cliente (mesma regra de janela de mês do Backlog Emergencial —
// Detalhe), busca automática na aba "BACKLOG - CLIENTES - DETALHES" da
// planilha de Histórico Validado. Sem a aba preenchida, cai no slide
// manual de espaço reservado.
function gerarSoBacklogClientesDetalhesCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogClientesDetalhes(); }
function gerarSoBacklogClientesDetalhesItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogClientesDetalhes(); }
function gerarSoBacklogClientesDetalhesEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogClientesDetalhes(); }
