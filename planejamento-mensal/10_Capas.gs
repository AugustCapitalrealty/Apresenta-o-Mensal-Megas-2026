/**
 * ARQUIVO: 10_Capas.gs
 * Capa, divisórias das seções, encerramento e o MODELO de Destaques.
 * Fundo escuro em formas (o Slides não tem degradê de fundo pela API): azul-
 * marinho + aro translúcido, logo negativo. Sem foto, sem símbolos (pedido
 * do Guilherme para as capas dos Megas, 10/11/2026: "símbolos feios").
 */

function _pgFundoEscuro_(s) {
  const DS = CR_DESIGN_SYSTEM;
  s.getBackground().setSolidFill(DS.brandDark);
  _pgRet_(s, PG_W * 0.42, -PG_H * 0.35, PG_W * 0.9, PG_H * 1.7, DS.brandLight, { alpha: 0.18, forma: SlidesApp.ShapeType.ELLIPSE });
  _pgRet_(s, PG_W * 0.52, -PG_H * 0.12, PG_W * 0.62, PG_H * 1.24, DS.brandDark, { alpha: 0.55, forma: SlidesApp.ShapeType.ELLIPSE });
}

function _pgMesTexto_(ctx) { return PG_MESES[ctx.mes] + ' ' + ctx.ano; }

function slideCapaPG_(s, ctx) {
  const DS = CR_DESIGN_SYSTEM;
  _pgFundoEscuro_(s);
  _pgTxt_(s, 'RELATÓRIO GERENCIAL', 48, 100, 400, 18, { fs: 11, negrito: true, fonte: DS.titulos, cor: DS.brandSoft });
  _pgTxt_(s, 'PLANEJAMENTO\n& GESTÃO', 44, 120, 520, 96, { fs: 38, negrito: true, fonte: DS.titulos, cor: '#FFFFFF', topo: true });
  _pgRet_(s, 48, 226, 66, 4, DS.brandSoft);
  _pgTxt_(s, _pgMesTexto_(ctx), 44, 238, 400, 26, { fs: 17, negrito: true, fonte: DS.titulos, cor: '#FFFFFF' });
  _pgLogo_(s, PG_LOGO_NEG_ID, 48, 334, 34);
}

const PG_SECOES = [
  null,
  { num: '01', titulo: 'FINANCEIRO', sub: 'Realizado × planejado do centro de custo de P&G' },
  { num: '02', titulo: 'METAS', sub: 'Farol de metas 2026' },
  { num: '03', titulo: 'PROJETOS', sub: 'Projetos realizados no ano' }
];

function slideSecaoPG_(s, ctx, n) {
  const DS = CR_DESIGN_SYSTEM, sec = PG_SECOES[n];
  _pgFundoEscuro_(s);
  _pgTxt_(s, 'PLANEJAMENTO & GESTÃO · ' + _pgMesTexto_(ctx), 48, 112, 500, 16, { fs: 9.5, negrito: true, fonte: DS.titulos, cor: DS.brandSoft });
  _pgTxt_(s, sec.num, 44, 132, 200, 60, { fs: 44, negrito: true, fonte: DS.titulos, cor: DS.brandSoft });
  _pgTxt_(s, sec.titulo, 44, 190, 560, 48, { fs: 34, negrito: true, fonte: DS.titulos, cor: '#FFFFFF' });
  _pgRet_(s, 48, 244, 66, 4, DS.brandSoft);
  _pgTxt_(s, sec.sub, 44, 254, 520, 20, { fs: 12, cor: '#D6E2F5' });
  _pgLogo_(s, PG_LOGO_NEG_ID, 48, 344, 28);
}

function slideEncerramentoPG_(s, ctx) {
  const DS = CR_DESIGN_SYSTEM;
  _pgFundoEscuro_(s);
  _pgTxt_(s, 'OBRIGADO', 44, 140, 500, 56, { fs: 40, negrito: true, fonte: DS.titulos, cor: '#FFFFFF' });
  _pgRet_(s, 48, 202, 66, 4, DS.brandSoft);
  _pgTxt_(s, 'Planejamento & Gestão · ' + _pgMesTexto_(ctx), 44, 212, 500, 20, { fs: 12, cor: '#D6E2F5' });
  _pgLogo_(s, PG_LOGO_NEG_ID, 48, 334, 34);
}

/**
 * Destaques do período: feito À MÃO, como nos Megas. O gerador só cria o
 * modelo vazio quando o deck não tem nenhum slide "DESTAQUES DO PERÍODO".
 * O modelo NÃO leva tag: depois de criado, é slide manual e nunca é apagado.
 */
function criarModeloDestaquesPG_(deck, ctx) {
  if (deck.getSlides().some(_pgEhDestaques_)) return false;
  const DS = CR_DESIGN_SYSTEM;
  const s = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  _pgHeader_(s, 'DESTAQUES DO PERÍODO', 'Planejamento & Gestão · ' + _pgMesTexto_(ctx) + ' · preencher à mão');
  const cards = [['POSITIVO', DS.verde], ['NEGATIVO', DS.vermelho], ['ATENÇÃO', DS.amarelo], ['PRÓXIMOS PASSOS', DS.brandLight]];
  const w = (PG_W - 2 * DS.marginX - 12) / 2, h = 150;
  cards.forEach((c, i) => {
    const x = DS.marginX + (i % 2) * (w + 12), y = 76 + Math.floor(i / 2) * (h + 10);
    const y0 = _pgCard_(s, x, y, w, h, c[0], c[1]);
    _pgTxt_(s, '•  (escrever aqui)', x + 12, y0, w - 24, h - (y0 - y) - 8, { fs: 10, cor: DS.textMuted, topo: true });
  });
  return true;
}
