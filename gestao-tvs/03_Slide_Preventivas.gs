/**
 * ARQUIVO: 03_Slide_Preventivas.gs
 * DESCRIÇÃO: Volume e SLA Preventivas (Multi-TV).
 */

/**
 * FONTE: BD-PREVENTIVAS (base bruta, uma linha por rotina) via
 * obterPreventivasMensalTV_ em Dados.gs. Antes TUDO neste slide
 * vinha da aba PREVENTIVA da planilha da TV: as células fixas 24/25/26, o
 * histórico das colunas com nome de mês na linha 23 e o bloco
 * "SLA CUMPRIDO <unidade>" do comparativo de mesmo período.
 *
 * O RECORTE NÃO MUDOU — é o que importa aqui. O cartão grande continua sendo o
 * mês corrente até hoje, o gráfico continua sendo os 5 últimos meses, e o
 * comparativo continua confrontando o mês corrente com o mês anterior
 * RESTRITO AOS MESMOS DIAS (comparar meio mês com um mês fechado inteiro
 * sempre acusaria queda). O que mudou é de onde os números saem.
 *
 * O SLA passa a ser calculado pela mesma regra dos outros dois projetos —
 * cumpridas ÷ (cumpridas + não cumpridas), com "Sem SLA" fora da fração.
 */
function gerarSlidePreventivas(slide, dataGlobal, unit) {
  const d = obterPreventivasMensalTV_(unit);
  // Sem dado, NÃO limpa o slide: a TV segue com a última versão boa em vez de
  // ficar em branco na parede.
  if (!d) { Logger.log('⚠️ Preventivas (' + unit.name + '): sem dados na BD — slide preservado.'); return; }

  Logger.log('ℹ️ Preventivas (' + unit.name + '): atual=' + JSON.stringify(d.atual) +
             ' comparativo=' + JSON.stringify(d.comparativo));

  slide.getPageElements().forEach(el => el.remove());
  criarDashboardPreventivas(slide, d.atual, d.anterior, d.historico, dataGlobal, unit, d.comparativo);
}

// Visual do Orçamento 2027 (Visual.gs, rebrand de 19/10/2026): o SLA do mês
// no cartão cheio, volume e conformidade nos cartões ao lado; embaixo, a
// barra de cumprimento contra a meta e a evolução dos últimos meses.
// Aqui SUBIR conformes é bom (verde) e subir não conformes é ruim (vermelho).
function criarDashboardPreventivas(slide, atual, anterior, historico, dataGlobal, unit, compMensal) {
  // Comparativo "mesmo período" (mês anterior até o mesmo dia de hoje) —
  // mais justo que o mês anterior completo quando o mês corrente ainda não
  // fechou. Usa compMensal quando disponível; senão cai no mês adjacente
  // completo (comportamento antigo), sem quebrar nada.
  const temPeriodo = !!(compMensal && compMensal.cumpridoAnterior != null && compMensal.naoCumpridoAnterior != null);
  const confAnt = temPeriodo ? compMensal.cumpridoAnterior : anterior.conforme;
  const naoConfAnt = temPeriodo ? compMensal.naoCumpridoAnterior : anterior.naoConforme;
  const totalAnt = confAnt + naoConfAnt;

  const pC = atual.total > 0 ? atual.conforme / atual.total : null;
  const slaTxt = pC == null ? '—' : Math.round(pC * 100) + '%';

  // "▲ +2,10 p.p. vs setembro (1 a 18)" — diz QUAIS dias entraram na
  // comparação, para quem olha a TV conferir o recorte sem perguntar.
  let comp = null;
  if (compMensal) {
    const num = s => parseFloat(String(s).replace('%', '').replace(',', '.'));
    const at = num(compMensal.slaMesAtual), an = num(compMensal.slaMesAnterior);
    if (!isNaN(at) && !isNaN(an)) {
      const diff = Math.round((at - an) * 100) / 100;
      const idx = MESES_POR_EXTENSO.indexOf(String(compMensal.mesLabel).trim().toLowerCase());
      const mesAnt = idx >= 0 ? MESES_POR_EXTENSO[(idx + 11) % 12] : 'mês anterior';
      const periodo = compMensal.diasComparados ? `(1 a ${compMensal.diasComparados})` : '(mesmo período)';
      const c0 = CR_DESIGN_SYSTEM.colors;
      comp = {
        txt: (diff > 0 ? '▲ +' : (diff < 0 ? '▼ −' : '— ')) + Math.abs(diff).toFixed(2).replace('.', ',') +
             ` p.p. vs ${mesAnt} ${periodo}`,
        cor: diff > 0 ? c0.accentGreen : (diff < 0 ? c0.accentRed : c0.textBody)
      };
    }
  }

  applyBrandHeaderAndBackground(slide, 'Visão geral preventiva',
    `SLA de ${slaTxt} no mês · meta 90%` + (comp ? ' · ' + comp.txt : ''), dataGlobal, unit);
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;

  const vx = (a, b, maiorRuim) => {
    if (!(b > 0) && a === b) return {};
    const v = _tvVariacao_(a - b, maiorRuim);
    const p = b > 0 ? ` (${a - b > 0 ? '+' : ''}${((a - b) / b * 100).toFixed(1).replace('.', ',').replace('-', '−')}%)` : '';
    return { sub: v.txt + p, corSub: v.cor };
  };
  const kx = 30, ky = 84, kh = 64, kg = 10, kw = (660 - 3 * kg) / 4;
  _tvKpi_(slide, kx, ky, kw, kh, { rotulo: 'SLA do mês', valor: slaTxt, destaque: true, fsValor: 28,
    sub: comp ? comp.txt : 'meta 90%', corSub: comp ? comp.cor : null });
  _tvKpi_(slide, kx + (kw + kg), ky, kw, kh, Object.assign({ rotulo: 'Rotinas no mês', valor: atual.total, fsValor: 28 },
    vx(atual.total, totalAnt, false), { corSub: null }));
  _tvKpi_(slide, kx + 2 * (kw + kg), ky, kw, kh, Object.assign({ rotulo: 'Conformes', valor: atual.conforme, fsValor: 28 },
    vx(atual.conforme, confAnt, false)));
  _tvKpi_(slide, kx + 3 * (kw + kg), ky, kw, kh, Object.assign({ rotulo: 'Não conformes', valor: atual.naoConforme, fsValor: 28 },
    vx(atual.naoConforme, naoConfAnt, true)));

  // Cumprimento contra a meta
  const lx = 30, ly = 158, lw = 280, lh = 218;
  const cy = _tvCard_(slide, lx, ly, lw, lh, 'Cumprimento do SLA · meta 90%');
  if (pC != null) {
    const bx = lx + 20, bw = lw - 40, by = cy + 52, bh = 22;
    _tvTexto_(slide, bx - 7, cy + 4, bw + 14, 40, slaTxt,
      { fs: 34, fsMin: 20, bold: true, cor: pC >= 0.9 ? c.accentGreen : c.accentRed, fonte: DS.typography.titles, align: 'C' });
    _tvRet_(slide, bx, by, bw, bh, '#FCA5A5', { redondo: true });
    if (pC > 0) _tvRet_(slide, bx, by, Math.max(bw * pC, 4), bh, c.accentGreen, { redondo: true });
    const mx = bx + bw * 0.9;
    _tvRet_(slide, mx - 1, by - 6, 2, bh + 12, c.textMain);
    _tvTexto_(slide, mx - 30, by + bh + 6, 60, 14, 'meta 90%',
      { fs: 8, fsMin: 7, bold: true, cor: c.textMain, fonte: DS.typography.body, align: 'C' });
    _tvTexto_(slide, bx - 7, by + bh + 28, bw + 14, 16, `${atual.conforme} dentro do prazo · ${atual.naoConforme} fora`,
      { fs: 9.5, fsMin: 7.5, cor: c.textBody, fonte: DS.typography.body, align: 'C', cortar: true });
  } else {
    _tvTexto_(slide, lx, cy + 60, lw, 24, 'Sem rotinas no mês até agora.',
      { fs: 11, fsMin: 9, italic: true, cor: c.textMuted, fonte: DS.typography.body, align: 'C' });
  }

  // Evolução das rotinas
  const rx = lx + lw + 10, rw = 660 - lw - 10;
  const ry0 = _tvCard_(slide, rx, ly, rw, lh, 'Rotinas por mês · últimos ' + historico.length);
  const n = Math.max(1, historico.length);
  const maxVal = Math.max(...historico.map(h => h.total), 1);
  const areaX = rx + 20, areaW = rw - 40, baseY = ly + lh - 28, altMax = baseY - ry0 - 24;
  const passo = areaW / n, barW = Math.min(44, passo * 0.56);
  historico.forEach((item, i) => {
    const ultima = i === historico.length - 1;
    const bx = areaX + i * passo + (passo - barW) / 2;
    const bh = Math.max(item.total / maxVal * altMax, 1);
    _tvRet_(slide, bx, baseY - bh, barW, bh, ultima ? c.brandDark : c.brandTint2);
    _tvTexto_(slide, bx - 14, baseY - bh - 20, barW + 28, 18, String(item.total),
      { fs: 11, fsMin: 8, bold: true, cor: ultima ? c.brandDark : c.textBody, fonte: DS.typography.titles, align: 'C' });
    _tvTexto_(slide, bx - 20, baseY + 3, barW + 40, 16, item.dataCurta,
      { fs: 8.5, fsMin: 7, bold: ultima, cor: ultima ? c.brandDark : c.textBody, fonte: DS.typography.body, align: 'C' });
  });
  const eixo = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, areaX, baseY, areaX + areaW, baseY);
  eixo.getLineFill().setSolidFill(c.lines);
  eixo.setWeight(1);

  _tvRodape_(slide, 'Fonte: BD-PREVENTIVAS (Infraspeak) · SLA = cumpridas ÷ (cumpridas + não cumpridas) · ' +
                    'variação contra o mês anterior no mesmo período');
}
