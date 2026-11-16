// node teste_analise.js — Análise de Projetos: concluídas do mês + indicadores
// (16_Slide_RecebimentoObras.gs). Dados: os 34 registros da planilha ANÁLISE DE
// PROJETOS lidos em 16/11/2026 (teste_analise_fixture.json), mês de referência
// OUTUBRO/2026. Os valores esperados são os do rascunho v1 aprovado.
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

let falhas = 0, total = 0;
function checa(cond, nome) { total++; if (cond) console.log('  ✓ ' + nome); else { falhas++; console.log('  ✗ ' + nome); } }

global.Logger = { log: () => {} };
global.SlidesApp = { PredefinedLayout: { BLANK: 'BLANK' } };
global.MimeType = { GOOGLE_SLIDES: 'slides' };
global.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null }) };

const ARQUIVOS = fs.readdirSync(DIR).filter(f => /\.gs$/.test(f)).sort();
(0, eval)(ARQUIVOS.map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n').replace(/^(const|let) /gm, 'var '));

const LINHAS = JSON.parse(fs.readFileSync(path.join(DIR, 'teste_analise_fixture.json'), 'utf8'));
const REF = { index: 9, nome: 'OUTUBRO', curto: 'Out', ano: 2026 };
const ind = _analiseIndicadores_(LINHAS, REF);

console.log('\n== Concluídas no mês e em andamento ==');
checa(ind.abertos.length === 1 && ind.abertos[0][2] === 'PORTA PALLETS', 'em andamento: só o PORTA PALLETS');
checa(ind.concMes === 4, 'concluídas em outubro (pela ENTREGA): 4');
checa(ind.concMesAnt === 3, 'concluídas em setembro: 3');
checa(ind.linhasTabela.length === 5, 'tabela do slide = 1 em andamento + 4 do mês (o histórico não é listado)');
checa(ind.linhasTabela[0][2] === 'PORTA PALLETS', 'o em andamento vem primeiro');
const objs = ind.linhasTabela.slice(1).map(r => r[2]).join(' | ');
checa(objs === 'CONTAINERS EXTERNOS BEAUTY WEEK | PACOTE IMPLANTAÇÃO | PACOTE DE IMPLANTAÇÃO (AREA NOVA) | NOVO GRUPO GERADOR',
      'as 4 concluídas em ordem de entrega: ' + objs);
checa(ind.concAno === 33 && ind.semData === 4, '33 concluídas no ano, 4 delas sem data de entrega');

console.log('\n== Prazo (Entrega − Recebimento) ==');
checa(ind.prazoMes === 3, 'prazo médio de outubro: 3 d');
checa(ind.prazoMesAnt === 9, 'prazo médio de setembro: 9 d');
checa(Math.round(ind.prazoAno * 10) / 10 === 9.2, 'prazo médio do ano: 9,2 d (' + ind.prazoAno + ')');
checa(ind.prazoMediana === 6, 'mediana do ano: 6 d');
checa(ind.prazoMax === 88, 'maior prazo: 88 d');

console.log('\n== Gráfico e recortes ==');
checa(JSON.stringify(ind.porMes) === JSON.stringify([0, 0, 0, 5, 6, 5, 4, 2, 3, 4]), 'por mês de entrega jan→out: ' + ind.porMes.join(','));
checa(ind.porMes.reduce((s, v) => s + v, 0) === 29, 'a soma por mês é 29 (os 4 sem data ficam de fora)');
checa(JSON.stringify(ind.porEmp) === JSON.stringify([['Mega Curitiba', 21], ['Mega Itajaí', 8], ['Mega Esteio', 3], ['Lojas Garoto', 1]]), 'por empreendimento (nomes em Title Case)');
checa(JSON.stringify(ind.porAval) === JSON.stringify([['Wilson', 20], ['Jonatas', 13]]), 'por avaliador (primeiro nome)');
checa(ind.porLoc[0][0] === 'SHOPEE' && ind.porLoc[0][1] === 15 && ind.porLoc[1][0] === 'MERCADO LIVRE' && ind.porLoc[1][1] === 4, 'locatários como na planilha (siglas intactas): SHOPEE 15, MERCADO LIVRE 4');
checa(ind.porLoc.some(x => x[0] === 'JBT' && x[1] === 2) && ind.porLoc.some(x => x[0] === 'HP TRADE'), 'JBT e HP TRADE não viram Jbt/Hp Trade');
checa(ind.pctMemorial === 36 && ind.pctComplementar === 24, '36% com memorial base, 24% com análise complementar');

console.log('\n== Bordas ==');
{
  const vazio = _analiseIndicadores_([], REF);
  checa(vazio.concMes === 0 && vazio.prazoMes === null && vazio.prazoAno === null && vazio.pctMemorial === null,
        'planilha vazia: zeros e "—", sem NaN');
  checa(vazio.porMes.length === 10 && vazio.linhasTabela.length === 0, 'planilha vazia: 10 meses, tabela vazia');
  const jan = _analiseIndicadores_(LINHAS, { index: 0, nome: 'JANEIRO', curto: 'Jan', ano: 2026 });
  checa(jan.concMes === 0 && jan.concMesAnt === 0 && jan.porMes.length === 1, 'janeiro: sem mês anterior no ano, sem estourar');
  const fut = _analiseIndicadores_(LINHAS, { index: 6, nome: 'JULHO', curto: 'Jul', ano: 2026 });
  checa(fut.concMes === 4 && fut.concAno === 24, 'deck de julho: 4 no mês e 24 no ano (20 entregues até julho + 4 sem data); ignora entregas de agosto em diante (' + fut.concAno + ')');
  checa(fut.porMes.length === 7 && fut.porMes[6] === 4, 'deck de julho: gráfico só até julho');
  const outroAno = _analiseIndicadores_(LINHAS, { index: 9, nome: 'OUTUBRO', curto: 'Out', ano: 2027 });
  checa(outroAno.concMes === 0 && outroAno.porMes.every(v => v === 0), 'deck de 2027 não conta entregas de 2026');
}
checa(_analiseTitulo_('MEGA CURITIBA') === 'Mega Curitiba' && _analiseTitulo_('PRAÇA CARLOS GOMES') === 'Praça Carlos Gomes' &&
      _analiseTitulo_('  LOJAS   GAROTO ') === 'Lojas Garoto' && _analiseTitulo_('') === '', 'Title Case (sem espaços extras, vazio → vazio)');

console.log(falhas ? '\n✗ ' + falhas + ' de ' + total + ' falharam' : '\n✓ ' + total + '/' + total + ' passaram');
process.exitCode = falhas ? 1 : 0;
