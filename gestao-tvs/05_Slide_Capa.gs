/**
 * ARQUIVO: 05_Slide_Capa.gs
 * DESCRIÇÃO: Slide de abertura da TV.
 *
 * Visual do Orçamento 2027 (Visual.gs, rebrand de 19/10/2026) — a sub capa
 * "relatório claro": fundo claro, logos, o nome do Mega grande, a frase, a
 * data de sincronização, um bloco na cor da marca à direita e, no pé, a
 * trilha com o que a TV mostra em seguida.
 */

function gerarSlideCapa(slide, dataGlobal, unit) {
  // Limpa o próprio slide: a capa não depende de fonte externa, então limpa
  // direto (o laço que esvaziava os 5 primeiros de uma vez saiu de 00_Main.gs).
  slide.getPageElements().forEach(el => el.remove());

  _tvAplicarMarca_(unit);
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  const serifa = DS.typography.heading !== DS.typography.titles;
  slide.getBackground().setSolidFill(c.bgSlide);

  // Logos
  try { insertLogoProportional(slide, DriveApp.getFileById(unit.unitLogoId).getBlob(), 40, 34, 120, 48); } catch (e) {}
  try { insertLogoProportional(slide, DriveApp.getFileById(unit.brandLogoId).getBlob(), 172, 38, 130, 40); } catch (e) {}

  // Título, frase e sincronização
  _tvTexto_(slide, 33, 110, 400, 22, 'GESTÃO À VISTA',
    { fs: 11, fsMin: 9, bold: true, cor: c.brandLight, fonte: DS.typography.titles });
  _tvTexto_(slide, 33, 130, 400, 64, _tvNomeUnidade_(unit),
    { fs: serifa ? 50 : 44, fsMin: 24, bold: true, cor: c.brandDark, fonte: DS.typography.heading });
  _tvTexto_(slide, 33, 194, 400, 22, 'Facilities e Property · o que está aberto, atrasado e parado',
    { fs: 12, fsMin: 9, cor: c.textBody, fonte: DS.typography.body, cortar: true });
  _tvRet_(slide, 40, 228, 60, 4, c.brandLight);
  _tvTexto_(slide, 33, 240, 400, 20, `Sincronizado: ${dataGlobal}`,
    { fs: 10.5, fsMin: 8, bold: true, cor: c.textBody, fonte: DS.typography.body });

  // Bloco da marca à direita (onde o Orçamento põe a foto)
  _tvRet_(slide, 452, 34, 4, 262, c.brandLight);
  _tvRet_(slide, 456, 34, 234, 262, c.brandDark);
  _tvTexto_(slide, 470, 200, 210, 30, _tvNomeUnidade_(unit).toUpperCase(),
    { fs: 13, fsMin: 9, bold: true, cor: c.brandAccent, fonte: DS.typography.titles, cortar: true });
  _tvTexto_(slide, 470, 226, 210, 56, 'Painel de\ngestão à vista',
    { fs: 20, fsMin: 14, bold: true, cor: '#FFFFFF', fonte: DS.typography.heading });

  // Trilha do que vem a seguir na TV
  const secoes = ['Corretivas', 'Preventivas', 'Previsão do tempo', 'Metas'];
  if (unit.cheiasSheetId) secoes.push('Cheias');
  if (unit.portalEmpreendimento) secoes.push('Solicitações', 'Webdox');
  const tx = 40, tw = 650, ty = 318, passo = tw / secoes.length;
  const linha = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, tx, ty, tx + tw, ty);
  linha.getLineFill().setSolidFill(c.lines);
  linha.setWeight(1);
  secoes.forEach((s, i) => {
    const x = tx + i * passo;
    _tvRet_(slide, x, ty - 1.5, Math.min(40, passo - 8), 3, c.brandLight);
    _tvTexto_(slide, x - 7, ty + 6, passo, 16, ('0' + (i + 1)).slice(-2),
      { fs: 9, fsMin: 7, bold: true, cor: c.brandLight, fonte: DS.typography.titles });
    _tvTexto_(slide, x - 7, ty + 22, passo, 16, s,
      { fs: 9, fsMin: 6.5, cor: c.textBody, fonte: DS.typography.body, cortar: true });
  });

  _tvRodape_(slide, `${_tvNomeUnidade_(unit)} · Gestão à vista · ` +
                    (unit.marca === 'DEMERCADO' ? 'Demercado Investimentos' : 'Capital Realty') + ' · Facilities');
}
