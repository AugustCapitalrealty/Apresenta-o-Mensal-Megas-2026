/**
 * ARQUIVO: 05_Slide_Capa.gs
 * DESCRIÇÃO: Slide de abertura da TV.
 *
 * Visual da capa do Orçamento 2027 (orcamento-2027/10_Capa.gs): a foto real
 * do Mega numa faixa larga em cima, com a cor escura da marca à esquerda
 * sumindo até a foto limpa à direita, os logos em chips brancos e um filete
 * na cor de destaque. Embaixo, no fundo claro, o nome do Mega grande, a data
 * de sincronização e a trilha do que a TV mostra em seguida. Sem foto (Drive
 * fora, ID errado), a faixa sai lisa na cor da marca — a capa nunca quebra.
 *
 * A foto é a MESMA da capa da apresentação mensal e do Orçamento
 * (UNITS[].fotoCapaId, em Config.gs).
 */

function gerarSlideCapa(slide, dataGlobal, unit) {
  // Limpa o próprio slide: a capa não depende de fonte externa, então limpa
  // direto (o laço que esvaziava os 5 primeiros de uma vez saiu de 00_Main.gs).
  slide.getPageElements().forEach(el => el.remove());

  _tvAplicarMarca_(unit);
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  const serifa = DS.typography.heading !== DS.typography.titles;
  slide.getBackground().setSolidFill(c.bgSlide);

  // Faixa da foto. A foto entra ANTES de tudo: o que sobra dela é coberto
  // com a cor do fundo (_tvFotoEmBloco_), e isso apagaria o que já estivesse ali.
  const fh = 200;
  if (!_tvFotoEmBloco_(slide, unit.fotoCapaId, 0, 0, 720, fh, unit.fotoFoco, c.bgSlide)) {
    _tvRet_(slide, 0, 0, 720, fh, c.brandDark);
  }
  _tvVeu_(slide, 0, 0, 720, fh, c.brandDark, 0.9, 0, 36);
  _tvRet_(slide, 0, fh, 720, 4, c.brandLight);

  // Logos em chips brancos (sobre a foto, o logo colorido some)
  const w1 = _tvLogoChip_(slide, unit.unitLogoId, 40, 24, 96, 30);
  _tvLogoChip_(slide, unit.brandLogoId, 40 + (w1 ? w1 + 10 : 0), 24, 120, 30);

  // Sobre o véu, em branco
  _tvTexto_(slide, 33, 112, 420, 20, 'GESTÃO À VISTA',
    { fs: 11, fsMin: 9, bold: true, cor: c.brandAccent, fonte: DS.typography.titles });
  _tvTexto_(slide, 33, 130, 420, 36, 'Painel de gestão à vista',
    { fs: serifa ? 26 : 22, fsMin: 14, bold: true, cor: '#FFFFFF', fonte: DS.typography.heading });
  _tvTexto_(slide, 33, 164, 420, 20, 'Facilities e Property · o que está aberto, atrasado e parado',
    { fs: 10.5, fsMin: 8, cor: '#F1F5F9', fonte: DS.typography.body, cortar: true });

  // Nome do Mega e sincronização, no fundo claro
  _tvTexto_(slide, 33, 214, 460, 56, _tvNomeUnidade_(unit),
    { fs: serifa ? 46 : 40, fsMin: 24, bold: true, cor: c.brandDark, fonte: DS.typography.heading });
  _tvTexto_(slide, 33, 278, 460, 20, `Sincronizado: ${dataGlobal}`,
    { fs: 10.5, fsMin: 8, bold: true, cor: c.textBody, fonte: DS.typography.body });

  // Trilha do que vem a seguir na TV (na ordem do Painel_<Mega>.txt)
  const secoes = ['Corretivas', 'Preventivas', 'Tempo e chuva', 'Metas'];
  if (unit.cheiasSheetId) secoes.push('Cheias');
  if (unit.portalEmpreendimento) secoes.push('Solicitações', 'Fluig', 'Webdox');
  const tx = 40, tw = 650, ty = 322, passo = tw / secoes.length;
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
