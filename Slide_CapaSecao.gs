/**
 * ARQUIVO: Slide_CapaSecao.gs
 * COMPONENTE — CAPA DE SEÇÃO (divisória de assunto), versão premium
 * Replica as capas do relatório manual (MANUTENÇÃO PREVENTIVA, SERVIÇOS
 * CONTRATADOS, etc.) na mesma linguagem visual da Capa (Slide00_Capa.gs):
 * foto de fundo full-bleed + véu azul 50% + scrim de legibilidade + anéis
 * e triângulo decorativos, título em duas linhas (branca + azul clara).
 *
 * Foto de fundo: uma por CATEGORIA (FOTOS_SECAO em 01_Config.gs, chave =
 * linha2 — ex. 'PREVENTIVA', 'CORRETIVA'...), compartilhada pelas 3 cidades.
 * Sem foto para a categoria, cai no capaFotoId da cidade (legado) e, por
 * fim, no fundo escuro premium padrão — nunca quebra a geração.
 *
 * PRÉ-REQUISITO: Slide_CapasComuns.gs (helpers _capa*).
 */

function gerarCapaSecao(linha1, linha2) {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const projeto = getProjetoAtivo();
  const DS = CR_DESIGN_SYSTEM;

  const fotoId = (typeof FOTOS_SECAO !== 'undefined' && FOTOS_SECAO[linha2]) || projeto.capaFotoId;

  // ── Fundo: foto da categoria (ou da cidade) + véu, ou fundo escuro padrão ──
  let comFoto = false;
  if (fotoId) {
    comFoto = _capaFotoFundo_(slide, W, H, fotoId, { cor: DS.colors.brandDark, alpha: 0.5 });
  }
  if (comFoto) {
    // Scrim lateral esquerdo (escurece p/ o texto ler, some rumo à direita)
    _capaGradiente_(slide, 0, 0, W * 0.62, H, DS.colors.brandDark, DS.colors.brandDark,
      { alphaFrom: 0.55, alphaTo: 0.0, steps: 22 });
    // Anéis + triângulo brancos translúcidos por cima da foto
    _capaAnel_(slide, W - 260, 60, 420, '#FFFFFF', 1.25, 0.12);
    _capaAnel_(slide, W - 220, 100, 320, '#FFFFFF', 1,    0.07);
    _capaTriangulo_(slide, W - 165, 165, 90, '#FFFFFF', 0.08);
    // Espinha lateral (assinatura), por cima da foto
    _capaGradiente_(slide, 0, 0, 6, H, DS.colors.brandLight, DS.colors.brandSoft, { vertical: true, steps: 30 });
  } else {
    _capaFundo_(slide, W, H);
  }

  // Título em duas linhas: primeira branca, segunda azul clara
  const tY = H / 2 - 110;
  const t1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 58, tY, W - 120, 56);
  t1.getText().setText(linha1).getTextStyle()
    .setFontSize(38).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);

  const t2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 58, tY + 50, W - 120, 56);
  t2.getText().setText(linha2).getTextStyle()
    .setFontSize(38).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  // Sublinha branca curta
  const sub = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 62, tY + 112, 55, 3);
  sub.getFill().setSolidFill('#FFFFFF'); sub.getBorder().setTransparent();

  // Subtítulo
  const st = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 58, tY + 126, W - 120, 30);
  st.getText().setText(projeto.nome + ' | Relatório Operacional').getTextStyle()
    .setFontSize(16).setForegroundColor('#CBD5E1').setFontFamily(DS.typography.body);

  // Wordmark Capital Realty no rodapé esquerdo
  _capaWordmark_(slide, 58, H - 58, { h: 30 });

  Logger.log('Capa de seção gerada: ' + linha1 + ' ' + linha2 + (fotoId ? ' (com foto)' : ' (sem foto)'));
}
