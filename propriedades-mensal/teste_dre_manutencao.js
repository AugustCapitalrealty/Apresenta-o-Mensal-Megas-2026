/**
 * Teste do DRE/BRIDGE de MANUTENÇÃO (Dados_DREManutencao.gs).
 *
 * POR QUE ESTE TESTE EXISTE: a projeção do ano é um SPLICE — realizado nos
 * meses que já aconteceram, ritmo nos que faltam. É fácil trocar isso por
 * "soma a coluna de ritmo", que é o que a coluna Total da própria planilha
 * faz, e a diferença é grande: −1.083.499 contra −1.030.231. O número
 * continua parecendo certo no slide.
 *
 * Também trava a leitura da coluna que MENTE: na aba de ritmo a primeira
 * coluna do mês se chama "Planejado" e é ritmo. Ler o plano de lá daria um
 * plano quase o dobro do real.
 *
 * As matrizes vêm de teste_dre_fixtures.json, extraído da planilha de
 * verdade — não são números inventados.
 *
 * Rode com:  node propriedades-mensal/teste_dre_manutencao.js
 */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

const logs = [];
global.Logger = { log: m => logs.push(String(m)) };

const FIX = JSON.parse(fs.readFileSync(path.join(DIR, 'teste_dre_fixtures.json'), 'utf8'));
let ABAS = FIX;
global.SpreadsheetApp = {
  openById: () => ({
    getSheets: () => Object.keys(ABAS).map(n => aba(n)),
    getSheetByName: n => (ABAS[n] ? aba(n) : null)
  })
};
function aba(nome) {
  const m = ABAS[nome];
  return {
    getName: () => nome,
    getLastRow: () => m.length,
    getLastColumn: () => m[0].length,
    getRange: () => ({ getDisplayValues: () => m })
  };
}
global.SlidesApp = { openById: () => { throw new Error('sem Slides no teste'); } };
global.DriveApp  = { getFileById: () => { throw new Error('sem Drive no teste'); } };

let fonte = ['01_Config.gs', '02_Dados.gs', 'Dados_DREManutencao.gs', 'Slide_BridgeManutencao.gs']
  .map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n');
fonte = fonte.replace(/^(const|let) /gm, 'var ');
(0, eval)(fonte);

// A obterMesReferencia_ DE VERDADE, guardada antes de os dublês a
// sobrescreverem — os testes de CONFIG!B1 lá embaixo precisam dela de volta.
const obterMesReferenciaReal_ = obterMesReferencia_;

// Ago/2026: é o último mês com realizado na planilha real.
global.obterMesReferencia_ = () => ({ index: 7, nome: 'AGOSTO', curto: 'Ago', ano: 2026 });

let falhas = 0, testes = 0;
function ok(desc, cond, extra) {
  testes++;
  if (cond) console.log('  ✓ ' + desc);
  else { falhas++; console.log('  ✗ ' + desc + (extra ? '  → ' + extra : '')); }
}
const perto = (a, b, tol) => a != null && Math.abs(a - b) <= (tol || 1);

// ─────────────────────────────────────────────────────────────────────────
console.log('\n== Leitura das duas abas ==');
const d = obterDREManutencao_();
ok('devolve dado', !!d);
ok('mês de referência é AGO (index 7)', d.refIndex === 7);
ok('duas empresas', d.empresas.length === 2);
ok('16 centros de custo na união', d.empresas.reduce((s, e) => s + e.centros.length, 0) === 16);

console.log('\n== O plano vem da aba certa ==');
ok('plano do ano = 592.450 (aba PLANEJAMENTO)', perto(d.total.ano.plan, 592450, 3),
   'veio ' + d.total.ano.plan);
ok('NÃO é 1.083.499 (a coluna "Planejado" da aba de ritmo)',
   !perto(d.total.ano.plan, 1083499, 3));

console.log('\n== A projeção do ano é o splice, não a soma da coluna ==');
ok('projeção = 1.030.231 (real Jan..Ago + ritmo Set..Dez)',
   perto(d.total.ano.proj, 1030231, 5), 'veio ' + d.total.ano.proj);
ok('NÃO é 1.083.499 (soma da coluna de ritmo inteira)',
   !perto(d.total.ano.proj, 1083499, 5));
ok('projeção > realizado acumulado', d.total.ano.proj > d.total.acum.real);

console.log('\n== Realizado ==');
ok('acumulado Jan..Ago = 272.958', perto(d.total.acum.real, 272958, 3),
   'veio ' + d.total.acum.real);
ok('mês (Ago) = 133.681', perto(d.total.mes.real, 133681, 3), 'veio ' + d.total.mes.real);
ok('mês de Ago ≠ acumulado', d.total.mes.real !== d.total.acum.real);

console.log('\n== Empresas ==');
const cr  = d.empresas.find(e => e.nome === 'Capital Realty');
const dem = d.empresas.find(e => e.nome === 'Demercado');
ok('CR plano ano = 408.935',  perto(cr.total.ano.plan, 408935, 3), 'veio ' + cr.total.ano.plan);
ok('Demercado plano ano = 183.515', perto(dem.total.ano.plan, 183515, 3), 'veio ' + dem.total.ano.plan);
ok('CR + Demercado = total do plano',
   perto(cr.total.ano.plan + dem.total.ano.plan, d.total.ano.plan, 2));
ok('CR realizado acum = 197.473', perto(cr.total.acum.real, 197473, 3), 'veio ' + cr.total.acum.real);
ok('Demercado realizado acum = 75.485', perto(dem.total.acum.real, 75485, 3), 'veio ' + dem.total.acum.real);

console.log('\n== As linhas somam o total da planilha (sem centro faltando) ==');
ok('nenhum aviso de centro de custo faltando',
   !d.avisos.some(a => a.indexOf('falta centro de custo') !== -1), d.avisos.join(' | '));

console.log('\n== Centro que só existe numa aba devolve null, não zero ==');
const ar3000 = cr.centros.find(c => c.codigo === '14.04.02.001');   // só no PLANEJAMENTO
ok('AR 3000 tem plano', ar3000.ano.plan != null);
ok('AR 3000 não tem realizado → null (não 0)', ar3000.acum.real === null);
const guaratuba = dem.centros.find(c => c.codigo === '64.03.10.001'); // só no RITMO
ok('Terreno Guaratuba não tem plano → null (não 0)', guaratuba.ano.plan === null);
ok('Terreno Guaratuba tem realizado', guaratuba.acum.real != null);

console.log('\n== Valores em módulo (o slide fala em gasto) ==');
ok('plano do ano é positivo', d.total.ano.plan > 0);
ok('realizado é positivo', d.total.acum.real > 0);

console.log('\n== Zero falso: aba que não abre ==');
ABAS = {};
const vazio = obterDREManutencao_();
ok('sem aba nenhuma → null, não um DRE zerado', vazio === null);
ok('e avisa no Logger', logs.some(l => /não existe/.test(l)));
ABAS = FIX;

console.log('\n== Divergência de mês de referência é avisada ==');
global.obterMesReferencia_ = () => ({ index: 5, nome: 'JUNHO', curto: 'Jun', ano: 2026 });
const jun = obterDREManutencao_();
ok('avisa que o último realizado é AGO, não JUN',
   jun.avisos.some(a => /último mês com realizado/.test(a)), jun.avisos.join(' | '));
ok('e o acumulado encolhe para Jan..Jun', jun.total.acum.real < d.total.acum.real);

console.log('\n== Mês de referência vem de CONFIG!B1 ==');
// A partir daqui usa a obterMesReferencia_ DE VERDADE (02_Dados.gs), não o dublê.
global.obterMesReferencia_ = obterMesReferenciaReal_;
let CONFIG_B1 = 'AGOSTO', RESERVA_B1 = 'AGOSTO';
global.SpreadsheetApp = {
  openById: id => ({
    getName: () => 'planilha',
    getSheets: () => (id === DRE_MANUTENCAO_ID
      ? [abaConfig()].concat(Object.keys(ABAS).map(n => aba(n)))
      : [abaB1(RESERVA_B1)]),
    getSheetByName: n => (n === 'CONFIG' ? abaConfig() : (ABAS[n] ? aba(n) : null))
  })
};
function abaB1(v) { return { getName: () => 'x', getRange: () => ({ getDisplayValue: () => v }) }; }
function abaConfig() { return { getName: () => 'CONFIG', getRange: () => ({ getDisplayValue: () => CONFIG_B1 }) }; }

let r = obterMesReferencia_();
ok('lê AGOSTO do CONFIG!B1', r.index === 7 && r.nome === 'AGOSTO', JSON.stringify(r));
ok('e diz de onde veio', r.fonte === 'CONFIG!B1');

CONFIG_B1 = 'Março';
r = obterMesReferencia_();
ok('MARÇO com cedilha e acento vira índice 2', r.index === 2, JSON.stringify(r));

CONFIG_B1 = 'setembro/2026';
r = obterMesReferencia_();
ok('aceita "setembro/2026" minúsculo com sufixo', r.index === 8);

CONFIG_B1 = '';
RESERVA_B1 = 'JUNHO';
r = obterMesReferencia_();
ok('CONFIG vazio → cai na reserva', r.index === 5 && /reserva/.test(r.fonte), JSON.stringify(r));

CONFIG_B1 = 'AGOSTO'; RESERVA_B1 = 'JUNHO';
logs.length = 0;
r = obterMesReferencia_();
ok('CONFIG ganha da reserva', r.index === 7);
ok('e a divergência é registrada', logs.some(l => /confira se a outra ficou para trás/.test(l)),
   logs.join(' | '));
RESERVA_B1 = 'AGOSTO';

console.log('\n== Bridge: as barras reconciliam plano → realizado ==');
global.obterMesReferencia_ = () => ({ index: 7, nome: 'AGOSTO', curto: 'Ago', ano: 2026 });
const dd = obterDREManutencao_();
const br = _bridgeBarras_(dd);
ok('monta barras', !!br);
ok('início = plano acumulado', perto(br.inicio, dd.total.acum.plan, 1));
ok('fim = realizado acumulado', perto(br.fim, dd.total.acum.real, 1));
ok('início + deltas = fim (resíduo zero)', Math.abs(br.residuo) < 1,
   'resíduo ' + br.residuo);
ok('primeira barra é o início', br.barras[0].tipo === 'inicio');
ok('última barra é o fim', br.barras[br.barras.length - 1].tipo === 'fim');
ok('desvios ordenados do maior para o menor',
   br.desvios.every((d, i) => i === 0 || Math.abs(br.desvios[i - 1].valor) >= Math.abs(d.valor)));
ok('gastou menos que o plano no acumulado', br.fim < br.inicio);

console.log('\n== Bridge: centro sem plano não vira variação ==');
// Terreno Guaratuba não tem plano — não há de quê variar. Tem que cair na
// barra SEM PLANO, senão o gasto dele seria lido como estouro de orçamento.
ok('nenhum desvio é do Terreno Guaratuba',
   !br.desvios.some(d => /Guaratuba/.test(d.nome)));
ok('existe barra SEM PLANO', br.barras.some(b => /SEM PLANO/.test(b.nome)));

console.log('\n' + (falhas ? '✗ ' + falhas + ' de ' + testes + ' falharam' : '✓ ' + testes + '/' + testes + ' passaram') + '\n');
process.exit(falhas ? 1 : 0);
