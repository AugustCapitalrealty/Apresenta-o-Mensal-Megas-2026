/**
 * ARQUIVO: 01_Slide_Corretivas.gs
 * DESCRIÇÃO: Volume Histórico Corretivas.
 */

function gerarSlideCorretivas(slide, dataGlobal, unit) {
  const d = obterCorretivasTV_(unit);
  // Sem dado, NÃO limpa o slide: a TV continua mostrando a última versão boa
  // em vez de ficar em branco na parede.
  if (!d) { Logger.log('⚠️ Corretivas (' + unit.name + '): sem dados na BD — slide preservado.'); return; }

  slide.getPageElements().forEach(el => el.remove());
  criarDashboardCorretivas(slide, d.atual, d.anterior, d.historico, dataGlobal, unit, d.diasComparacao);
}

// Visual do Orçamento 2027 (Visual.gs, rebrand de 19/10/2026): faixa de KPIs
// com o total em aberto no cartão cheio e um painel com a evolução da fila.
// Subir é ruim (fila maior): ▲ vermelho, ▼ verde.
function criarDashboardCorretivas(slide, atual, anterior, historico, dataGlobal, unit, diasComp) {
  const quando = diasComp ? ` em ${diasComp} dias` : '';
  const varTot = _tvVariacao_(atual.total - anterior.total, true);
  // Sinal de menos tipográfico (−), igual ao da seta: "▼ −6 (−7,5%)".
  const pct = (a, b) => b > 0 ? ` (${a - b > 0 ? '+' : ''}${((a - b) / b * 100).toFixed(1).replace('.', ',').replace('-', '−')}%)` : '';
  applyBrandHeaderAndBackground(slide, 'Visão geral corretiva',
    `${atual.total} chamados em aberto · ${varTot.txt}${quando}`, dataGlobal, unit);
  const c = CR_DESIGN_SYSTEM.colors;

  const kx = 30, ky = 84, kh = 64, kg = 10, kw = (660 - 3 * kg) / 4;
  const sub = (a, b) => { const v = _tvVariacao_(a - b, true); return { sub: v.txt + pct(a, b) + quando, corSub: v.cor }; };
  _tvKpi_(slide, kx, ky, kw, kh, Object.assign({ rotulo: 'Chamados em aberto', valor: atual.total, destaque: true, fsValor: 28 },
    sub(atual.total, anterior.total)));
  _tvKpi_(slide, kx + (kw + kg), ky, kw, kh, Object.assign({ rotulo: 'Facilities', valor: atual.facilities, fsValor: 28 },
    sub(atual.facilities, anterior.facilities)));
  _tvKpi_(slide, kx + 2 * (kw + kg), ky, kw, kh, Object.assign({ rotulo: 'Property', valor: atual.propriedades, fsValor: 28 },
    sub(atual.propriedades, anterior.propriedades)));
  const pF = atual.total > 0 ? Math.round(atual.facilities / atual.total * 100) : 0;
  _tvKpi_(slide, kx + 3 * (kw + kg), ky, kw, kh, { rotulo: 'Composição', valor: `${pF}% Facilities`,
    sub: `${100 - pF}% Property`, fsValor: 18 });

  // Evolução da fila
  const px = 30, py = 158, pw = 660, ph = 218;
  const cy = _tvCard_(slide, px, py, pw, ph, 'Evolução da fila · a cada 7 dias');
  const n = Math.max(1, historico.length);
  const maxVal = Math.max(...historico.map(h => h.total), 1);
  const areaX = px + 24, areaW = pw - 48, baseY = py + ph - 28, altMax = baseY - cy - 24;
  const passo = areaW / n, barW = Math.min(46, passo * 0.56);
  historico.forEach((item, i) => {
    const ultima = i === historico.length - 1;
    const bx = areaX + i * passo + (passo - barW) / 2;
    const bh = Math.max(item.total / maxVal * altMax, 1);
    _tvRet_(slide, bx, baseY - bh, barW, bh, ultima ? c.brandDark : c.brandTint2);
    _tvTexto_(slide, bx - 14, baseY - bh - 20, barW + 28, 18, String(item.total),
      { fs: 11, fsMin: 8, bold: true, cor: ultima ? c.brandDark : c.textBody, fonte: CR_DESIGN_SYSTEM.typography.titles, align: 'C' });
    _tvTexto_(slide, bx - 20, baseY + 3, barW + 40, 16, item.dataCurta,
      { fs: 8.5, fsMin: 7, bold: ultima, cor: ultima ? c.brandDark : c.textBody, fonte: CR_DESIGN_SYSTEM.typography.body, align: 'C' });
  });
  const eixo = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, areaX, baseY, areaX + areaW, baseY);
  eixo.getLineFill().setSolidFill(c.lines);
  eixo.setWeight(1);

  _tvRodape_(slide, `Fonte: BD-CORRETIVAS (Infraspeak) · fila em aberto hoje${diasComp ? `, comparada com ${diasComp} dias atrás` : ''} · ▲ vermelho = fila maior`);
}
