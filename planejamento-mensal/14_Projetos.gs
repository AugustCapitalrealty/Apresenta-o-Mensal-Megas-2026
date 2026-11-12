/**
 * ARQUIVO: 14_Projetos.gs
 * 03 PROJETOS — LISTA dos projetos feitos no ano (Guilherme, 12/11/2026:
 * "só com lista de projetos feitos durante o ano"; saíram portfólio com
 * prazo/avanço, cronograma e próximos marcos).
 * Fonte: aba PROJETOS (Projeto · Área cliente · Situação · Concluído em · O que foi feito).
 * Ordem: concluídos (pela data), depois em andamento e pausados.
 */

const PG_PROJ_POR_SLIDE = 12;

function slidesProjetosAnoPG_(novo, ctx) {
  const lista = _pgProjetosOrdenados_(ctx.projetos);
  const paginas = Math.max(1, Math.ceil(lista.length / PG_PROJ_POR_SLIDE));
  for (let p = 0; p < paginas; p++) {
    _pgSlideProjetosAno_(novo(), ctx, lista.slice(p * PG_PROJ_POR_SLIDE, (p + 1) * PG_PROJ_POR_SLIDE),
      p * PG_PROJ_POR_SLIDE, p + 1, paginas, lista);
  }
}

function _pgSlideProjetosAno_(s, ctx, itens, offset, pag, total, todos) {
  const DS = CR_DESIGN_SYSTEM;
  const conc = todos.filter(p => p.situacao === 'concluido').length;
  const and = todos.filter(p => p.situacao === 'em andamento').length;
  _pgHeader_(s, 'PROJETOS REALIZADOS EM ' + ctx.ano + (total > 1 ? ' (' + pag + '/' + total + ')' : ''),
    todos.length + ' projetos no ano · ' + conc + ' concluído(s) · ' + and + ' em andamento');
  const x = DS.marginX + 3;
  const cols = [{ w: 24, align: 'C' }, { w: 190, align: 'L' }, { w: 92, align: 'L' }, { w: 82, align: 'C' },
                { w: 56, align: 'C' }, { w: 210, align: 'L' }];
  const W = cols.reduce((a, c) => a + c.w, 0);
  _pgTabela_(s, x, 72, cols, [{ tipo: 'cab', cel: ['Nº', 'PROJETO', 'ÁREA CLIENTE', 'SITUAÇÃO', 'CONCLUÍDO', 'O QUE FOI FEITO'] }], 16, 7);

  const alt = Math.min(36, Math.floor(296 / Math.max(itens.length, 1)));
  let y = 88;
  itens.forEach((p, i) => {
    const st = _pgSituacao_(p);
    _pgLinha_(s, x, y + alt, x + W, y + alt, DS.lines, 0.5);
    _pgRet_(s, x, y + 4, 3, alt - 8, st.cor);
    let xx = x;
    _pgTxt_(s, String(offset + i + 1), xx - 5, y, cols[0].w + 10, alt, { fs: 8, negrito: true, cor: DS.textMuted, align: 'C' }); xx += cols[0].w;
    _pgTxt_(s, p.projeto, xx - 5, y, cols[1].w + 6, alt, { fs: 8.5, negrito: true }); xx += cols[1].w;
    _pgTxt_(s, p.area || '—', xx - 5, y, cols[2].w + 6, alt, { fs: 7.5, cor: DS.textBody }); xx += cols[2].w;
    _pgPill_(s, xx + 4, y + alt / 2 - 6, cols[3].w - 8, 12, st, 6); xx += cols[3].w;
    _pgTxt_(s, p.concluidoEm ? _pgDataCurta_(p.concluidoEm) : '—', xx - 5, y, cols[4].w + 10, alt,
      { fs: 8, align: 'C', cor: p.concluidoEm ? DS.textMain : DS.textMuted }); xx += cols[4].w;
    _pgTxt_(s, _pgTruncar_(p.feito || '—', 105), xx - 5, y, cols[5].w + 8, alt, { fs: 7, cor: DS.textBody });
    y += alt;
  });
  if (!itens.length) _pgTxt_(s, 'Nenhum projeto na aba PROJETOS.', x, 100, 400, 20, { fs: 10, cor: DS.textMuted });
  _pgRodape_(s, 'Fonte: ' + PG_PLANILHA_NOME + ', aba PROJETOS.' + (ctx.metas ? _pgAvisoSituacao_(ctx, ctx.metas.situacao) : ''));
}

function _pgTruncar_(t, max) {
  t = String(t || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const c = t.slice(0, max), e = c.lastIndexOf(' ');
  return (e > max * 0.6 ? c.slice(0, e) : c) + '…';
}
