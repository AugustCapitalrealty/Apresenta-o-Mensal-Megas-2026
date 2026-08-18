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

  const deck  = getDeckMensal_();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const mX = W * 0.022;

  slide.getBackground().setSolidFill('#FFFFFF');

  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W * 0.62, -H * 0.32, W * 0.55, W * 0.55);
  ellipse.getFill().setSolidFill(DS.colors.brandLight, 0.045);
  ellipse.getBorder().setTransparent();

  // ── Título (nome da empresa) + subtítulo ──
  _rrUmaLinha_(slide, mX, H * 0.045, W * 0.55, H * 0.080, titulo,
    { fs: W * 0.029, bold: true, cor: DS.colors.textMain, align: 'L', folga: 0 });

  _rrUmaLinha_(slide, mX, H * 0.128, W * 0.55, H * 0.052,
    'Painel Executivo — ' + _rrMesAno_(dre.mes, dre.ano),
    { fs: W * 0.018, cor: DS.colors.brandMed, fonte: DS.typography.body, align: 'L', folga: 0 });

  // ── Logo Capital Realty, no topo (mesmo lugar do Resumo do Resultado) ──
  try {
    const blob = DriveApp.getFileById(DS.assets.logoId).getBlob();
    slide.insertImage(blob, W - mX - DS.assets.logoW, H * 0.055, DS.assets.logoW, DS.assets.logoH);
  } catch (e) {
    Logger.log('DRE ' + titulo + ': logo não carregado. ' + e.message);
  }

  // ── Tabela do DRE ──
  _rrTabelaDRE_(slide, W, mX, H * 0.205, H * 0.945 - H * 0.205, dre);

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
  // A coluna de rótulo aqui precisa ser mais larga que a do Resumo do
  // Resultado: "10 - OUTRAS RECEITAS E DESPESAS" e os sub-itens indentados
  // ("10.1 - RECEITAS FINANCEIRAS") são mais longos que o maior nome de
  // empresa daquele slide.
  const labelW = larguraTotal * 0.265;
  const valW   = (larguraTotal - labelW) / nCols;

  const hBanda = altura * 0.052;
  const hSub   = altura * 0.135;
  const restante = altura - hBanda - hSub;

  const nLinhas = dre.linhas.length;
  const pesoNormal = 1, pesoSub = 0.82, pesoEbitda = 1.2, pesoMargem = 1.35;
  const pesoDe = l => l.margem ? pesoMargem : l.ebitda ? pesoEbitda : l.indentado ? pesoSub : pesoNormal;
  const somaPesos = dre.linhas.reduce((s, l) => s + pesoDe(l), 0);
  const unidade = restante / Math.max(1, somaPesos);

  const fsBanda  = W * 0.0115;
  const fsHeader = W * 0.0098;
  const fsValor  = W * 0.0102;
  const fsSub    = W * 0.0098;

  let y = topo;

  // ── Faixa 1: rótulo (mescla as duas faixas) + 3 grupos ──
  _rrCelula_(slide, mX, y, labelW, hBanda + hSub, DS.colors.brandDark);
  _rrBloco_(slide, mX, y, labelW, hBanda + hSub, 'DRE\n(Em R$/Mil)',
    { fs: fsBanda, bold: true, cor: '#FFFFFF' });

  const grupos = [dre.mes, dre.acumuladoLabel, dre.ritmoLabel];
  const colsPorGrupo = Math.round(nCols / grupos.length);
  let x = mX + labelW;
  grupos.forEach((titulo, i) => {
    const cols = (i === grupos.length - 1) ? (nCols - colsPorGrupo * (grupos.length - 1)) : colsPorGrupo;
    const gw = valW * cols;
    _rrCelula_(slide, x, y, gw, hBanda, DS.colors.brandDark);
    _rrUmaLinha_(slide, x, y, gw, hBanda, titulo, { fs: fsBanda, bold: true, cor: '#FFFFFF' });
    x += gw;
  });
  y += hBanda;

  // ── Faixa 2: os rótulos de coluna ──
  x = mX + labelW;
  dre.headers.forEach(h => {
    _rrCelula_(slide, x, y, valW, hSub, DS.colors.brandDark);
    _rrBloco_(slide, x, y, valW, hSub, h, { fs: fsHeader, bold: true, cor: '#FFFFFF' });
    x += valW;
  });
  y += hSub;

  // ── Linhas do DRE ──
  dre.linhas.forEach(linha => {
    const h = unidade * pesoDe(linha);

    if (linha.margem) {
      _rrLinhaDRE_(slide, mX, y, labelW, valW, h, linha.rotulo, linha.valores,
        DS.colors.brandMed, '#FFFFFF', fsValor, true, false);
    } else if (linha.ebitda) {
      _rrLinhaDRE_(slide, mX, y, labelW, valW, h, linha.rotulo, linha.valores,
        '#EEF2F7', DS.colors.brandDark, fsValor, true, false);
    } else if (linha.indentado) {
      _rrLinhaDRE_(slide, mX, y, labelW, valW, h, linha.rotulo, linha.valores,
        '#FFFFFF', DS.colors.textBody, fsSub, false, true);
    } else {
      _rrLinhaDRE_(slide, mX, y, labelW, valW, h, linha.rotulo, linha.valores,
        '#FFFFFF', DS.colors.textMain, fsValor, true, false);
    }
    y += h;
  });
}

// Uma linha do DRE: rótulo à esquerda (indentado quando é sub-item, ex.:
// "10.1 - Receitas Financeiras") + os valores centralizados.
function _rrLinhaDRE_(slide, mX, y, labelW, valW, h, rotulo, valores, corFundo, corTexto, fs, negrito, indentado) {
  const padL = labelW * (indentado ? 0.11 : 0.055);
  _rrCelula_(slide, mX, y, labelW, h, corFundo);
  _rrUmaLinha_(slide, mX + padL, y, labelW - padL, h, rotulo,
    { fs: fs, bold: negrito, cor: corTexto, align: 'L' });

  let x = mX + labelW;
  valores.forEach(v => {
    _rrCelula_(slide, x, y, valW, h, corFundo);
    _rrUmaLinha_(slide, x, y, valW, h, v, { fs: fs, bold: negrito, cor: corTexto });
    x += valW;
  });
}
