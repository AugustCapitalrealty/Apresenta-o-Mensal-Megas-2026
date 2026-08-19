/**
 * ARQUIVO: Slide02_DREEmpresa.gs
 * SLIDE — PAINEL EXECUTIVO (DRE de uma empresa)
 *
 * Uma função genérica, `gerarSlideDREEmpresa_(chave)`, desenha o DRE completo
 * de qualquer empresa da aba "Quadro DRE Apresentação" (Capital Realty,
 * Demercado, Garoto, Hangar Vip, Postos, BMFD, DCL...): a cascata de linhas
 * numeradas (1 - FATURAMENTO BRUTO ... 13 - LUCRO LÍQUIDO, com sub-itens como
 * 10.1/10.2 indentados) e a Margem EBITDA/ROL em destaque no rodapé.
 *
 * `DRE_EMPRESAS` (abaixo) mapeia a CHAVE de busca (como o nome aparece na
 * planilha, ex.: 'DEMERCADO') para o TÍTULO de exibição no slide ('Demercado')
 * — não dá para deduzir um do outro com segurança porque tem sigla no meio
 * (BMFD, DCL, CR Estacionamentos), então o mapa é explícito.
 *
 * Reaproveita as helpers de medição/desenho de Slide01_ResumoResultado.gs
 * (_rrCelula_, _rrUmaLinha_, _rrBloco_, _rrMesAno_...) — mesmo projeto Apps
 * Script, mesmo namespace, sem necessidade de copiar nada.
 */

const DRE_EMPRESAS = {
  'DEMERCADO'      : 'Demercado',
  'CAPITAL REALTY' : 'Capital Realty',
  'GAROTO'         : 'Garoto',
  'HANGAR VIP'     : 'Hangar Vip',
  'POSTO ESTEIO'   : 'Posto Esteio',
  'POSTO CURITIBA' : 'Posto Curitiba',
  'BMFD'           : 'BMFD',
  'DCL'            : 'DCL'
};

// Pontos de entrada por empresa — aparecem sozinhos no menu do editor
// (a função genérica abaixo não aparece porque tem parâmetro).
function gerarSlideDREDemercado() { gerarSlideDREEmpresa_('DEMERCADO'); }

function gerarSlideDREEmpresa_(chave) {
  const titulo = DRE_EMPRESAS[chave] || chave;
  const dre = obterDREEmpresa_(chave);
  const c = _dsNovoSlideClaro_({
    entidade: titulo,
    topico: 'Painel Executivo – ' + _rrMesAno_(dre.mes, dre.ano),
    aviso: _rrAvisoMesFonteTexto_(dre.mes, dre.ano),
    conteudoY: .16
  });
  const slide = c.slide, W = c.W, H = c.H;
  const mX = W * 0.022;

  // ── Tabela do DRE ──
  const topoTabela = H * CR_DESIGN_SYSTEM.layout.light.contentTop;
  _rrTabelaDRE_(slide, W, mX, topoTabela,
    H * CR_DESIGN_SYSTEM.layout.light.tableBottom - topoTabela, dre);

  Logger.log('Slide DRE — ' + titulo + ' gerado → ' + dre.mes + '/' + dre.ano +
    (dre.nota ? ' (' + dre.nota + ')' : ''));
}


// ==========================================
// TABELA — DRE (cascata de linhas numeradas)
// ==========================================
// Mesmo cabeçalho em duas faixas do Resumo do Resultado (banda dos 3 grupos +
// os 15 rótulos de coluna). O corpo é diferente: em vez de uma linha por
// empresa, é a cascata de linhas do DRE — a linha "7 - EBITDA" ganha um
// realce (fundo cinza) porque é o número mais citado na reunião, e a Margem
// EBITDA/ROL fecha a tabela como faixa de destaque, igual ao TOTAL do outro
// slide.
function _rrTabelaDRE_(slide, W, mX, topo, altura, dre) {
  const DS = CR_DESIGN_SYSTEM;
  const larguraTotal = W - mX * 2;
  const nCols = dre.headers.length || 15;
  const colunasComparativas = dre.headers.map(_rrEhCabecalhoComparativo_);
  // A coluna de rótulo aqui precisa ser mais larga que a do Resumo do
  // Resultado: "10 - OUTRAS RECEITAS E DESPESAS" e os sub-itens indentados
  // ("10.1 - RECEITAS FINANCEIRAS") são mais longos que o maior nome de
  // empresa daquele slide.
  const labelW = larguraTotal * 0.245;
  const fsHeader = W * DS.typography.scale.tableHeader;
  const valWs = _rrLargurasCabecalhoTemporal_(
    dre.headers, larguraTotal - labelW, fsHeader);

  const hBanda = altura * 0.052;
  const hSub   = altura * 0.135;
  const restante = altura - hBanda - hSub;

  const nLinhas = dre.linhas.length;
  const pesoNormal = 1, pesoSub = 0.82, pesoEbitda = 1.2, pesoMargem = 1.35;
  const pesoDe = l => l.margem ? pesoMargem : l.ebitda ? pesoEbitda : l.indentado ? pesoSub : pesoNormal;
  const somaPesos = dre.linhas.reduce((s, l) => s + pesoDe(l), 0);
  const unidade = restante / Math.max(1, somaPesos);

  const fsBanda  = W * DS.typography.scale.tableGroup;
  const fsValor  = W * DS.typography.scale.tableBodyCompact;
  const fsSub    = fsValor;
  if (unidade * pesoSub <= fsSub * 1.18) {
    throw new Error('DRE sem altura para aplicar uma única fonte ao corpo.');
  }

  let y = topo;

  // ── Faixa 1: rótulo (mescla as duas faixas) + 3 grupos ──
  _rrCelula_(slide, mX, y, labelW, hBanda + hSub, DS.colors.tableGroup);
  _rrBloco_(slide, mX, y, labelW, hBanda + hSub, 'DRE\n(Em R$/Mil)',
    { fs: fsBanda, fsMin: fsBanda, bold: true, cor: '#FFFFFF',
      fonte: DS.typography.tables });

  const grupos = [dre.mes, dre.acumuladoLabel, dre.ritmoLabel];
  const colsPorGrupo = Math.round(nCols / grupos.length);
  let x = mX + labelW, primeiraColunaGrupo = 0;
  grupos.forEach((titulo, i) => {
    const cols = (i === grupos.length - 1) ? (nCols - colsPorGrupo * (grupos.length - 1)) : colsPorGrupo;
    const gw = valWs.slice(primeiraColunaGrupo, primeiraColunaGrupo + cols)
      .reduce((s, largura) => s + largura, 0);
    _rrCelula_(slide, x, y, gw, hBanda, DS.colors.tableGroup);
    _rrUmaLinha_(slide, x, y, gw, hBanda, titulo,
      { fs: fsBanda, fsMin: fsBanda, bold: true, cor: '#FFFFFF',
        fonte: DS.typography.tables });
    x += gw;
    primeiraColunaGrupo += cols;
  });
  y += hBanda;

  // ── Faixa 2: os rótulos de coluna ──
  x = mX + labelW;
  dre.headers.forEach((h, i) => {
    const cw = valWs[i];
    _rrCelula_(slide, x, y, cw, hSub, DS.colors.tableHeader);
    _rrBloco_(slide, x, y, cw, hSub, _rrFormatarCabecalhoTabela_(h),
      { fs: fsHeader, fsMin: fsHeader, bold: true, cor: '#FFFFFF',
        fonte: DS.typography.tables, folga: _RR_RECUO_TEXTBOX / 2 });
    x += cw;
  });
  y += hSub;

  // ── Linhas do DRE ──
  dre.linhas.forEach(linha => {
    const h = unidade * pesoDe(linha);

    if (linha.margem) {
      _rrLinhaDRE_(slide, mX, y, labelW, valWs, h, linha.rotulo, linha.valores,
        DS.colors.brandMed, '#FFFFFF', fsValor, true, false, colunasComparativas);
    } else if (linha.ebitda) {
      _rrLinhaDRE_(slide, mX, y, labelW, valWs, h, linha.rotulo, linha.valores,
        DS.colors.tableStripe, DS.colors.brandDark, fsValor, true, false, colunasComparativas);
    } else if (linha.indentado) {
      _rrLinhaDRE_(slide, mX, y, labelW, valWs, h, linha.rotulo, linha.valores,
        null, DS.colors.textBody, fsSub, false, true, colunasComparativas);
    } else {
      _rrLinhaDRE_(slide, mX, y, labelW, valWs, h, linha.rotulo, linha.valores,
        null, DS.colors.textMain, fsValor, true, false, colunasComparativas);
    }
    y += h;
  });
}

// Uma linha do DRE: rótulo à esquerda (indentado quando é sub-item, ex.:
// "10.1 - Receitas Financeiras") + os valores centralizados.
function _rrLinhaDRE_(slide, mX, y, labelW, valWs, h, rotulo, valores, corFundo, corTexto, fs, negrito, indentado, colunasComparativas) {
  const padL = labelW * (indentado ? 0.11 : 0.055);
  _rrCelula_(slide, mX, y, labelW, h, corFundo);
  _rrUmaLinha_(slide, mX + padL, y, labelW - padL, h, rotulo,
    { fs: fs, fsMin: fs, bold: negrito, cor: corTexto,
      fonte: CR_DESIGN_SYSTEM.typography.tables, align: 'L' });

  let x = mX + labelW;
  valores.forEach((v, i) => {
    const cw = valWs[i];
    const corValor = colunasComparativas && colunasComparativas[i]
      ? _rrCorValorComparativo_(v, corTexto, corTexto === '#FFFFFF') : corTexto;
    _rrCelula_(slide, x, y, cw, h, corFundo);
    _rrUmaLinha_(slide, x, y, cw, h, v,
      { fs: fs, fsMin: fs, bold: negrito, cor: corValor,
        fonte: CR_DESIGN_SYSTEM.typography.tables,
        folga: _RR_RECUO_TEXTBOX / 2 });
    x += cw;
  });
}
