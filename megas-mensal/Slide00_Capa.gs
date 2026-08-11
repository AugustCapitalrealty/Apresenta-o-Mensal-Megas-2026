/**
 * ARQUIVO: Slide00_Capa.gs
 * SLIDE 00 — CAPA (única, versão premium)
 * Capa de abertura e contra capa MESCLADAS numa única capa, por pedido do
 * usuário: manteve a estrutura com FOTO de fundo (que ele preferiu) e o
 * conteúdo funcional (título, Mega, período) — sem o card de "Identificação
 * do Relatório" e sem logo (o nome do Mega já aparece como herói no texto).
 *
 * Fundo: foto full-bleed + véu azul institucional 50% quando a cidade tem
 * fotoFundoId (as três cidades já têm); senão, cai no fundo escuro premium
 * padrão (mesma linguagem, sem foto). Mês de referência vem dos DADOS
 * (obterMesReferencia_ em 02_Dados.gs) — a capa nunca diverge do conteúdo.
 *
 * PRÉ-REQUISITO: Slide_CapasComuns.gs (helpers _capa*).
 */

function gerarSlideCapa() {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const projeto = getProjetoAtivo();
  const DS = CR_DESIGN_SYSTEM;
  const ref = obterMesReferencia_();

  // ── Fundo: foto (quando a cidade tem fotoFundoId) ou fundo escuro padrão ──
  let comFoto = false;
  if (projeto.fotoFundoId) {
    comFoto = _capaFotoFundo_(slide, W, H, projeto.fotoFundoId, { cor: DS.colors.brandDark, alpha: 0.5 });
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

  // Wordmark Capital Realty (topo esquerdo). Sem logo do Mega na capa
  // (removida por pedido — o nome do Mega já aparece como herói abaixo).
  _capaWordmark_(slide, 42, 30);

  // Overline espaçado
  const over = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 44, H * 0.30, W - 200, 20);
  over.getText().setText(_capaEspacado_('Relatório Operacional de Facilities')).getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  // Barra de destaque em gradiente acima do título
  _capaGradiente_(slide, 46, H * 0.30 + 26, 66, 4, DS.colors.brandLight, '#60A5FA', { steps: 12 });

  // Título principal
  const titulo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, H * 0.30 + 36, W - 120, 130);
  titulo.getText().setText('RESULTADOS\nFACILITIES').getTextStyle()
    .setFontSize(44).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  // O Slides não aceita lineSpacing abaixo de 100 (mínimo "espaçamento
  // simples" da própria interface) — usar <100 lança "Invalid argument:
  // spacing" na API.
  titulo.getText().getParagraphStyle().setLineSpacing(100);

  // Cidade (herói do co-branding)
  const cidade = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, H * 0.30 + 158, W - 120, 40);
  cidade.getText().setText(projeto.nome).getTextStyle()
    .setFontSize(24).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  // Pill de período em gradiente
  const pillY = H * 0.30 + 202, pillW = 250, pillH = 30;
  _capaGradiente_(slide, 42, pillY, pillW, pillH, DS.colors.brandMed, DS.colors.brandLight, { steps: 24 });
  const pillBorda = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 42, pillY, pillW, pillH);
  pillBorda.getFill().setTransparent();
  pillBorda.getBorder().getLineFill().setSolidFill('#60A5FA', 0.35); pillBorda.getBorder().setWeight(1);
  const pillT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, pillY, pillW, pillH);
  pillT.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  pillT.getText().setText(ref.nome + ' ' + ref.ano).getTextStyle()
    .setFontSize(11).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  pillT.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Rodapé
  _capaRodape_(slide, W, H, 'CAPITAL REALTY · INFRAESTRUTURA LOGÍSTICA', 'Expandir Eficiência');

  Logger.log('Slide 00 (Capa única, premium) gerado → ' + ref.label);
}
