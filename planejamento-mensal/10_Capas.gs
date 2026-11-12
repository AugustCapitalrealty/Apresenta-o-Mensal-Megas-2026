/**
 * ARQUIVO: 10_Capas.gs
 * Capa, divisórias das seções, encerramento e o MODELO de Destaques.
 *
 * Mesmo desenho das capas dos Megas (megas-mensal/10_Slide_Capas.gs, redesenho
 * de 10/11/2026), pedido do Guilherme em 12/11 ("gere as capas bonitas"):
 * foto em tela cheia + véu leve (22%) + degradê em PNG à esquerda para o texto
 * ler (cr-scrim-capa.png) + título em duas linhas (2ª em azul claro) + barra
 * curta + logo negativo. Sem anéis, triângulos ou símbolos.
 * Sem a foto ou sem o PNG, cai num fundo azul-marinho liso — nunca quebra.
 */

// Fotos (IDs que já funcionam no Slides: as fotos de capa dos Megas, de
// megas-mensal/01_Config.gs). Para trocar, basta pôr outro ID aqui.
const PG_FOTOS = {
  CAPA: '1F3tWOxcemRJUcf5di6DygCu7s5KHH_NC',   // Mega Curitiba
  SEC1: '1TwANLdubJUHjcW8WpWRRR5gRv2Sty10K',   // Mega Itajaí  — 01 Financeiro
  SEC2: '1ed2NujxpCBkk6tMDBC0h3LwB9wu6NEVA',   // Mega Esteio  — 02 Metas
  SEC3: '1F3tWOxcemRJUcf5di6DygCu7s5KHH_NC',   // Mega Curitiba — 03 Projetos
  FIM:  '1F3tWOxcemRJUcf5di6DygCu7s5KHH_NC'    // encerramento (véu forte)
};
// 29 - Template Apresentações/01 - Fotos para slides/cr-scrim-capa.png (o mesmo dos Megas).
const PG_CAPA_SCRIM_ID = '1xus46vuE0D4oKyX_VLZ4YG5_icoDmT4s';
const PG_AZUL_DESTAQUE = '#60A5FA';

function _pgMesTexto_(ctx) { return PG_MESES[ctx.mes] + ' ' + ctx.ano; }

// Foto cobrindo a página sem distorcer (a sobra é cortada pela borda do slide),
// véu azul-marinho por cima e, se pedido, o degradê PNG. Devolve true se pôs a foto.
function _pgFundoFoto_(s, fotoId, alphaVeu, comScrim) {
  const DS = CR_DESIGN_SYSTEM;
  s.getBackground().setSolidFill(DS.brandDark);
  try {
    const img = s.insertImage(DriveApp.getFileById(fotoId).getBlob());
    const ar = img.getWidth() / img.getHeight(), pAR = PG_W / PG_H;
    let w, h;
    if (ar > pAR) { h = PG_H; w = PG_H * ar; } else { w = PG_W; h = PG_W / ar; }
    img.setWidth(w).setHeight(h).setLeft((PG_W - w) / 2).setTop((PG_H - h) / 2);
  } catch (e) {
    Logger.log('Capa: foto indisponível (' + fotoId + '), fundo liso. ' + e.message);
    return false;
  }
  _pgRet_(s, 0, 0, PG_W, PG_H, DS.brandDark, { alpha: alphaVeu });
  if (comScrim) {
    try {
      const sc = s.insertImage(DriveApp.getFileById(PG_CAPA_SCRIM_ID).getBlob());
      sc.setLeft(0).setTop(0).setWidth(PG_W).setHeight(PG_H);
    } catch (e) {
      Logger.log('Capa: degradê PNG indisponível, usando véu sólido. ' + e.message);
      _pgRet_(s, 0, 0, PG_W, PG_H, DS.brandDark, { alpha: 0.45 });
    }
  }
  return true;
}

function _pgCapaTxt_(s, txt, x, y, w, h, fs, cor, negrito) {
  return _pgTxt_(s, txt, x, y, w, h, { fs: fs, cor: cor, negrito: negrito !== false, fonte: CR_DESIGN_SYSTEM.titulos, topo: true });
}

function slideCapaPG_(s, ctx) {
  const DS = CR_DESIGN_SYSTEM;
  _pgFundoFoto_(s, PG_FOTOS.CAPA, 0.22, true);
  _pgLogo_(s, PG_LOGO_NEG_ID, 50, 34, 34);
  const x0 = 50, yT = PG_H * 0.36;
  _pgCapaTxt_(s, 'RELATÓRIO GERENCIAL', x0, yT - 30, 420, 20, 10, DS.brandSoft);
  _pgCapaTxt_(s, 'PLANEJAMENTO\n& GESTÃO', x0 - 2, yT - 6, 520, 104, 40, '#FFFFFF');
  _pgRet_(s, x0 + 2, yT + 104, 48, 3, PG_AZUL_DESTAQUE);
  _pgCapaTxt_(s, _pgMesTexto_(ctx), x0, yT + 116, 420, 34, 22, PG_AZUL_DESTAQUE);
  _pgCapaTxt_(s, 'Gerência de Planejamento e Gestão', x0, yT + 150, 420, 22, 12, '#FFFFFF', false);
  _pgTxt_(s, 'Expandir Eficiência', PG_W - 250, PG_H - 40, 210, 20, { fs: 9, cor: '#CBD5E1', align: 'R', fonte: DS.titulos });
}

// Título da divisória em duas linhas (2ª em azul claro), como nos Megas.
const PG_SECOES = [
  null,
  { num: '01', l1: 'RESULTADO', l2: 'FINANCEIRO', foto: 'SEC1' },
  { num: '02', l1: 'FAROL DE', l2: 'METAS 2026', foto: 'SEC2' },
  { num: '03', l1: 'PROJETOS', l2: 'DO ANO', foto: 'SEC3' }
];

function slideSecaoPG_(s, ctx, n) {
  const DS = CR_DESIGN_SYSTEM, sec = PG_SECOES[n];
  _pgFundoFoto_(s, PG_FOTOS[sec.foto], 0.22, true);
  const x0 = 56, tY = PG_H / 2 - 80;
  _pgCapaTxt_(s, sec.num + '  ·  PLANEJAMENTO & GESTÃO  ·  ' + _pgMesTexto_(ctx), x0, tY - 28, 520, 20, 10, DS.brandSoft);
  _pgCapaTxt_(s, sec.l1, x0 - 2, tY, 560, 52, 40, '#FFFFFF');
  _pgCapaTxt_(s, sec.l2, x0 - 2, tY + 48, 560, 52, 40, PG_AZUL_DESTAQUE);
  _pgRet_(s, x0, tY + 112, 48, 3, PG_AZUL_DESTAQUE);
  _pgLogo_(s, PG_LOGO_NEG_ID, x0, PG_H - 58, 28);
}

function slideEncerramentoPG_(s, ctx) {
  const DS = CR_DESIGN_SYSTEM;
  _pgFundoFoto_(s, PG_FOTOS.FIM, 0.86, false);
  const x0 = 56, tY = PG_H / 2 - 60;
  _pgCapaTxt_(s, 'OBRIGADO', x0 - 2, tY, 560, 56, 44, '#FFFFFF');
  _pgRet_(s, x0, tY + 62, 48, 3, PG_AZUL_DESTAQUE);
  _pgCapaTxt_(s, 'Planejamento & Gestão  ·  ' + _pgMesTexto_(ctx), x0, tY + 74, 560, 22, 12, PG_AZUL_DESTAQUE);
  _pgLogo_(s, PG_LOGO_NEG_ID, x0, PG_H - 58, 28);
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
