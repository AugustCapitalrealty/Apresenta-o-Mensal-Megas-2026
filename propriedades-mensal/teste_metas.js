/**
 * Teste do FAROL DE METAS (Slide_Metas.gs + Dados_Metas.gs).
 *
 * POR QUE EXISTE: o farol feito à mão errava duas coisas que agora são
 * calculadas — os PONTOS (dizia 15 onde a soma das verdes dá 35) e a COR do
 * SIM/NÃO (amarelo no farol do Wilson, vermelho no do Ricardo, mesmo dado).
 * Se a regra voltar a divergir, é aqui que aparece.
 *
 * Rode com:  node propriedades-mensal/teste_metas.js
 */
const fs = require('fs'), path = require('path');
const DIR = __dirname;
const logs = [];
global.Logger = { log: m => logs.push(String(m)) };
global.SlidesApp = { ShapeType: {}, ContentAlignment: {}, ParagraphAlignment: {}, PredefinedLayout: {} };
global.SpreadsheetApp = { openById: () => { throw new Error('sem planilha no teste'); } };
global.DriveApp = { getFileById: () => { throw new Error('sem Drive'); } };

let fonte = ['00_Helpers.gs', '01_Config.gs', 'Slide_Metas.gs']
  .map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n');
(0, eval)(fonte.replace(/^(const|let) /gm, 'var '));

let falhas = 0, testes = 0;
function ok(d, c, e) { testes++; if (c) console.log('  ✓ ' + d); else { falhas++; console.log('  ✗ ' + d + (e ? '  → ' + e : '')); } }

const CALC = {
  slaPreventivas: { mes: 100.0, ano: 81.9 },
  ppc:            { mes: 71.43, ano: 67.21 },   // lido do painel, como o Facilities
  piso:           { mes: 6.50,  ano: 61.03 },
  reabertura:     { mes: null,  ano: 0.0 }
};
const R = (i, j) => _metaResolver_(METAS_PROPRIEDADES[i].linhas[j], CALC);
const pontos = i => METAS_PROPRIEDADES[i].linhas
  .map(l => _metaResolver_(l, CALC)).reduce((s, l) => s + (l.verdeAno ? l.pontos : 0), 0);

console.log('\n== Pontos: soma das linhas com ANO verde ==');
ok('Wilson = 0 (nenhuma verde no ano)', pontos(0) === 0, 'deu ' + pontos(0));
ok('Ricardo = 35 (checklist 20 + reabertura 15)', pontos(1) === 35, 'deu ' + pontos(1));
ok('e NÃO 15, que era o valor digitado no farol', pontos(1) !== 15);

console.log('\n== SIM/NÃO tem cor única (o farol pintava dos dois jeitos) ==');
const wilsonNao = R(0, 0), ricardoNao = R(1, 1);
ok('Wilson "meta SIM, real NÃO" → Amarelo', wilsonNao.statusMes === 'Amarelo', wilsonNao.statusMes);
ok('Ricardo, mesma situação → Amarelo também', ricardoNao.statusMes === 'Amarelo', ricardoNao.statusMes);
ok('vermelho fica para meta numérica furada', R(1, 2).statusMes === 'Vermelho');

console.log('\n== PPC: meta 80% no mes e no ano ==');
ok('meta do mes e 80, nao 6,67', METAS_PROPRIEDADES[1].linhas[0].metaMes === '80',
   METAS_PROPRIEDADES[1].linhas[0].metaMes);
ok('PPC 71,43% no mes < 80 → Vermelho', R(1, 0).statusMes === 'Vermelho', R(1, 0).statusMes);
ok('PPC 67,21% no ano < 80 → Vermelho', R(1, 0).statusAno === 'Vermelho');
ok('o valor vem da celula, com as duas casas', R(1, 0).realAno === '67,21', R(1, 0).realAno);

console.log('\n== Sentido >= e <= ==');
ok('SLA 100 >= 90 → Verde', R(0, 3).statusMes === 'Verde');
ok('SLA 81,9 < 90 → Vermelho', R(0, 3).statusAno === 'Vermelho');
ok('reabertura 0 <= 2 → Verde (sentido invertido)', R(1, 4).statusAno === 'Verde');

console.log('\n== Não medido ≠ zero ==');
ok('reabertura do mês sem fechamentos → "—"', R(1, 4).realMes === '—', R(1, 4).realMes);
ok('e status Cinza, não Verde nem Vermelho', R(1, 4).statusMes === 'Cinza', R(1, 4).statusMes);
ok('cinza não pontua', !R(1, 4).verdeAno === false);
ok('mas o ANO, medido, pontua', R(1, 4).verdeAno === true);

console.log('\n== Formatação por unidade ==');
ok('% com duas casas e vírgula', R(0, 3).realAno === '81,90', R(0, 3).realAno);
ok('metros com sufixo m', R(1, 2).realAno === '61,03m', R(1, 2).realAno);

console.log('\n== Linhas fixas não são tocadas pelo cálculo ==');
ok('checklist do Ricardo continua SIM/SIM', R(1, 3).realMes === 'SIM' && R(1, 3).realAno === 'SIM');

console.log('\n' + (falhas ? '✗ ' + falhas + ' de ' + testes + ' falharam' : '✓ ' + testes + '/' + testes + ' passaram') + '\n');
process.exit(falhas ? 1 : 0);
