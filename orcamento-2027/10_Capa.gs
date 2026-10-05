/**
 * ARQUIVO: 10_Capa.gs
 * SLIDES:  Capa da cidade, sub capa de cada seção e o slide de Premissas.
 *          Nenhum deles lê planilha: são a estrutura do deck.
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

// ==========================================
// SUB CAPA DE SEÇÃO
// ==========================================
// Abre cada seção do deck (Premissas, Resumo Executivo, DRE, Manutenção,
// Segurança, Limpeza), como o gestor montou à mão na revisão de 30/09/2026.
// Mesma linguagem da capa, com o número da seção no lugar do logo.
function gerarSlideSubcapa_(slide, W, H, cid, numero, titulo) {
  const DS = CR_DESIGN_SYSTEM;
  slide.getBackground().setSolidFill(DS.colors.brandDark);

  // Grafismo de fundo: a elipse SANGRA para fora da página de propósito.
  const halo = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 260, H - 250, 460, 460);
  halo.getFill().setSolidFill(DS.colors.brandLight, 0.12); halo.getBorder().setTransparent();
  _orcRet_(slide, 0, 0, 6, H, DS.colors.brandLight);   // espinha lateral

  const y0 = Math.round(H * 0.28);
  _orcUmaLinha_(slide, 48, y0, 160, 56, ('0' + numero).slice(-2),
    { align: 'L', fs: 40, bold: true, cor: DS.colors.brandLight, fonte: DS.typography.titles });
  _orcUmaLinha_(slide, 48, y0 + 58, W - 140, 44, titulo,
    { align: 'L', fs: 30, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, fsMin: 18 });
  _orcRet_(slide, 55, y0 + 108, 56, 3, DS.colors.brandLight);
  _orcUmaLinha_(slide, 48, y0 + 118, W - 140, 18, cid.nome + ' · Orçamento ' + ORC_ANO,
    { align: 'L', fs: 10, cor: '#CBD5E1', fonte: DS.typography.body });

  _orcLinha_(slide, 42, H - 40, W - 42, H - 40, '#334155', 1);
  _orcUmaLinha_(slide, 42, H - 34, W - 84, 18, 'Capital Realty · Facilities · Planejamento ' + ORC_ANO,
    { align: 'L', fs: 7.5, bold: true, cor: DS.colors.textMuted, fonte: DS.typography.body });
}

// ==========================================
// PREMISSAS
// ==========================================
// [chave em cid.premissas, título do bloco, o que vai nele]
const ORC_PREMISSAS_BLOCOS = [
  ['premissas', 'Premissas',            'as bases adotadas no orçamento'],
  ['analisado', 'O que foi analisado',  'fontes, contas e períodos considerados'],
  ['comoLer',   'Como ler o relatório', 'o que cada seção mostra e como interpretar']
];
const ORC_PREMISSAS_VAZIO = 'Escreva aqui.';

// Três blocos que o gestor preenche. Sem texto em cid.premissas, cada bloco
// leva uma caixa com "Escreva aqui." para ele digitar por cima no Slides — a
// caixa já tem fonte e cor do corpo, então o que ele digitar sai no padrão.
function gerarSlidePremissas_(slide, W, H, cid) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const textos = cid.premissas || {};
  _orcHeader_(slide, W, 'Premissas — Orçamento ' + ORC_ANO,
    cid.nome + ' · como o orçamento foi construído e como ler esta apresentação');

  const ty = 74, gap = 10, cw = (W - MX * 2 - gap * 2) / 3, ch = H - 28 - ty;
  ORC_PREMISSAS_BLOCOS.forEach((b, i) => {
    const x = MX + i * (cw + gap);
    _orcRet_(slide, x, ty, cw, ch, C.cardBg, { redondo: true, borda: C.lines });
    _orcRet_(slide, x, ty, cw, 4, C.brandLight);
    _orcUmaLinha_(slide, x + 12, ty + 12, cw - 24, 20, b[1],
      { align: 'L', fs: 12, bold: true, cor: C.brandDark, fonte: DS.typography.titles, fsMin: 9 });
    _orcUmaLinha_(slide, x + 12, ty + 32, cw - 24, 14, b[2],
      { align: 'L', fs: 7.5, italic: true, cor: C.textMuted, fonte: DS.typography.body, cortar: true });
    _orcLinha_(slide, x + 12, ty + 52, x + cw - 12, ty + 52, C.lines, 0.75);
    const texto = String(textos[b[0]] || '').trim();
    _orcParagrafo_(slide, x + 8, ty + 58, cw - 16, ch - 66, texto || ORC_PREMISSAS_VAZIO,
      { fs: 9, fsMin: 6.5, cor: C.textBody });
  });
}
