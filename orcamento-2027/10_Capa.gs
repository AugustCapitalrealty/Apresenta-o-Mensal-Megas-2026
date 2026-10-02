/**
 * ARQUIVO: 10_Capa.gs
 * SLIDE:   Capa da seção de uma cidade
 */

function gerarSlideCapa_(slide, W, H, cid) {
  const DS = CR_DESIGN_SYSTEM;
  slide.getBackground().setSolidFill(DS.colors.brandDark);

  // Grafismo de fundo: as elipses SANGRAM para fora da página de propósito.
  const halo = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 300, -220, 560, 560);
  halo.getFill().setSolidFill(DS.colors.brandLight, 0.12); halo.getBorder().setTransparent();
  const massa = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -220, H - 240, 500, 500);
  massa.getFill().setSolidFill(DS.colors.brandMed, 0.22); massa.getBorder().setTransparent();
  const anel = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 250, -130, 420, 420);
  anel.getFill().setTransparent();
  anel.getBorder().getLineFill().setSolidFill(DS.colors.brandSoft, 0.14); anel.getBorder().setWeight(1);

  _orcRet_(slide, 0, 0, 6, H, DS.colors.brandLight);   // espinha lateral

  // Logo branco; sem a imagem, cai para o nome em texto (nunca quebra a capa).
  try {
    const img = slide.insertImage(DriveApp.getFileById(LOGOS_CR.fullNegativo).getBlob());
    const h = 30, w = h * img.getWidth() / img.getHeight();
    img.setWidth(w).setHeight(h).setLeft(48).setTop(40);
  } catch (e) {
    Logger.log('Capa: logo indisponível, usando texto. ' + e.message);
    _orcUmaLinha_(slide, 48, 40, 260, 26, 'CAPITAL REALTY',
      { align: 'L', fs: 15, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles });
  }

  const y0 = Math.round(H * 0.34);
  _orcUmaLinha_(slide, 48, y0, W - 140, 20, ('Orçamento ' + ORC_ANO).toUpperCase().split('').join(' '),
    { align: 'L', fs: 11, bold: true, cor: DS.colors.brandSoft, fonte: DS.typography.titles });
  // O título é a cidade, não a conta: o deck cobre o orçamento do Mega, e
  // Manutenção de Imóveis é só uma das seções (pedido do gestor, 29/09/2026).
  _orcUmaLinha_(slide, 48, y0 + 24, W - 140, 50, cid.nome,
    { align: 'L', fs: 34, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, fsMin: 20 });
  _orcRet_(slide, 55, y0 + 82, 56, 3, DS.colors.brandLight);

  _orcLinha_(slide, 42, H - 40, W - 42, H - 40, '#334155', 1);
  _orcUmaLinha_(slide, 42, H - 34, W - 84, 18, 'Capital Realty · Facilities · Planejamento ' + ORC_ANO,
    { align: 'L', fs: 7.5, bold: true, cor: DS.colors.textMuted, fonte: DS.typography.body });
}
