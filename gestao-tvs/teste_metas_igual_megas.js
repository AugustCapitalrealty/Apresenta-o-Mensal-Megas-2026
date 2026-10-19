// Confere que o slide de Metas da TV sai IGUAL ao da Apresentação Mensal dos
// Megas (megas-mensal/13_Slide_Metas.gs): desenha a mesma tabela com os dois
// códigos num dublê do SlidesApp e compara forma por forma — tipo, texto,
// fonte, tamanho, negrito, cores (inclusive por trecho do selo ▲/▼), x e
// largura. A altura e o y NÃO entram: a TV tem cabeçalho próprio, mais alto
// (tabela começa em y=96, na mensal em y=66), então as linhas ficam um pouco
// mais baixas de propósito.
//
// Também reprova se alguma forma sair da página ou tiver dimensão inválida.
//
// Uso: node gestao-tvs/teste_metas_igual_megas.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..');
let ok = 0, falhas = 0;
function confere(cond, msg) { if (cond) ok++; else { falhas++; console.log('  ✗ ' + msg); } }

// ---------- dublê do SlidesApp ----------
function criarSlide(registro) {
  const novoTexto = (shape) => {
    const estilo = {};
    const trechos = [];
    const tr = {
      setText(t) { shape.texto = String(t); return tr; },
      getTextStyle() {
        const st = {
          setFontSize(v) { estilo.tam = v; return st; }, setBold(v) { estilo.negrito = !!v; return st; },
          setFontFamily(v) { estilo.fonte = v; return st; }, setForegroundColor(v) { estilo.cor = v; return st; }
        };
        return st;
      },
      getParagraphStyle() {
        const ps = { setParagraphAlignment(v) { shape.alinhar = v; return ps; }, setLineSpacing() { return ps; } };
        return ps;
      },
      getRange(a, b) {
        if (a < 0 || b > shape.texto.length || a > b) throw new Error(`getRange(${a},${b}) fora de "${shape.texto}"`);
        const t = { ini: a, fim: b };
        trechos.push(t);
        return { getTextStyle: () => ({ setForegroundColor(v) { t.cor = v; return this; } }) };
      }
    };
    shape.estilo = estilo; shape.trechos = trechos;
    return tr;
  };
  return {
    getPageElements: () => [],
    getBackground: () => ({ setSolidFill() {} }),
    insertShape(tipo, x, y, w, h) {
      [x, y, w, h].forEach(v => { if (typeof v !== 'number' || isNaN(v)) throw new Error('dimensão inválida: ' + v); });
      if (w < 0 || h < 0) throw new Error(`dimensão negativa ${w}x${h}`);
      const shape = { tipo, x, y, w, h, texto: null };
      let tr = null;
      const api = {
        getFill: () => ({ setSolidFill(c) { if (c == null) throw new Error('setSolidFill(undefined)'); shape.fundo = c; } }),
        getBorder: () => {
          const b = { setTransparent() { shape.borda = 'transp'; return b; }, setWeight() { return b; },
                      getLineFill: () => ({ setSolidFill(c) { shape.borda = c; } }) };
          return b;
        },
        setContentAlignment() { return api; },
        getText() { if (!tr) tr = novoTexto(shape); return tr; }
      };
      registro.push(shape);
      return api;
    }
  };
}

const SlidesApp = {
  ShapeType: { RECTANGLE: 'RECT', TEXT_BOX: 'TEXT', ROUND_RECTANGLE: 'ROUND', ELLIPSE: 'ELLIPSE' },
  ContentAlignment: { MIDDLE: 'MIDDLE' },
  ParagraphAlignment: { START: 'START', CENTER: 'CENTER' },
  PredefinedLayout: { BLANK: 'BLANK' }
};

function carregar(arquivos, extra) {
  const ctx = vm.createContext(Object.assign({ SlidesApp, Logger: { log() {} }, console }, extra));
  arquivos.forEach(a => {
    const fonte = fs.readFileSync(path.join(RAIZ, a), 'utf8').replace(/^(const|let) /gm, 'var ');
    vm.runInContext(fonte, ctx, { filename: a });
  });
  return ctx;
}

// ---------- os mesmos dados nos dois ----------
// Linha 0 composta (Custo M² do Supervisor) com selo R$ verde e % vermelho;
// linha 1 SIM/NÃO; linha 2 numérica com selo; linha 3 com célula vazia.
function dadosMetas(cores) {
  const linhas = [
    ['CUSTO M² MEGAS E 80% DAS MANUT PLANEJADAS', '25', 'Performance', 'R$ / %', '<=/>=',
     'R$ 4,21 / 80%', 'R$ 3,86 / 12,5%', '', 'R$ 4,05 / 80%', 'R$ 3,66 / 10%', ''],
    ['IMPLEMENTAR PROJETO DE ADEQUAÇÃO E MODERNIZAÇÃO DA SEGURANÇA', '20', 'Projetos', 'SIM/NÃO', '=',
     'SIM', 'NÃO', '', 'SIM', 'NÃO', ''],
    ['CHECK-LIST/SLA', '20', 'Performance', '%', '>=', '90', '98,41', '', '90', '92', 'Verde'],
    ['ÍNDICE DE DISPONIBILIDADE ATIVOS CRÍTICOS', '15', '', '%', '>=', '90', '', '', '90', '88,03', '']
  ];
  linhas[0]._trendMes  = { segmentos: [{ txt: '▼ −0,12', cor: cores.verde }, { txt: '▲ +2,50', cor: cores.vermelho }] };
  linhas[0]._trendAcum = { segmentos: [{ txt: '▼ −0,05', cor: cores.verde }, { txt: '', cor: null }] };
  linhas[2]._trendMes  = { segmentos: [{ txt: '▲ +0,75', cor: cores.verde }] };
  return { titulo: 'METAS MAURO COELHO - FACILITIES 2026', papel: 'SUPERVISOR', linhas };
}

// ---------- Megas ----------
const formasMegas = [];
const megas = carregar(['megas-mensal/01_Config.gs', 'megas-mensal/00_Helpers.gs', 'megas-mensal/02_Dados.gs', 'megas-mensal/13_Slide_Metas.gs'], {});
const slideMegas = criarSlide(formasMegas);
const coresMegas = { verde: megas.CORES.cardGreen, vermelho: megas.CORES.cardRed };
megas.obterDadosMetas_ = () => dadosMetas(coresMegas);
megas.getDeckAtivo = () => ({ appendSlide: () => slideMegas, getPageWidth: () => 720, getPageHeight: () => 405 });
megas.criarHeaderPadrao = () => {};
megas.gerarSlideMetas('SUPERVISOR');

// ---------- TV ----------
const formasTV = [];
const tv = carregar(['gestao-tvs/Config.gs', 'gestao-tvs/Dados.gs', 'gestao-tvs/07_Slide_Metas.gs'],
  { Utilities: { formatDate: () => '19/10/2026' } });
tv.applyBrandHeaderAndBackground = () => {};
// Mesmas cores de selo nos dois: o teste compara o DESENHO, não a paleta de
// tendência de cada projeto (que vem de tendenciaTexto/tendenciaTexto_).
tv.renderSlideMetas(criarSlide(formasTV), { name: 'CURITIBA' }, dadosMetas(coresMegas));

// ---------- comparação ----------
console.log('Metas TV × Megas');
const assinatura = f => JSON.stringify({
  tipo: f.tipo, x: Math.round(f.x * 10) / 10, w: Math.round(f.w * 10) / 10,
  texto: f.texto, fundo: f.fundo, borda: f.borda,
  estilo: f.estilo && Object.keys(f.estilo).sort().map(k => k + "=" + f.estilo[k]).join(" "),
  alinhar: f.alinhar, trechos: f.trechos
});
confere(formasTV.length === formasMegas.length,
  `quantidade de formas: TV ${formasTV.length} × Megas ${formasMegas.length}`);
let difs = 0;
for (let i = 0; i < Math.min(formasTV.length, formasMegas.length); i++) {
  const a = assinatura(formasTV[i]), b = assinatura(formasMegas[i]);
  if (a !== b && difs++ < 8) console.log(`  forma ${i}:\n    TV    ${a}\n    Megas ${b}`);
}
confere(difs === 0, `${difs} forma(s) diferentes entre TV e Megas`);

// Mesma diferença de y em todas as formas da tabela = mesmo desenho, só
// deslocado pelo cabeçalho. Confere a barra de título e a de pontuação.
confere(formasTV[0].y === 96 && formasMegas[0].y === 66, 'barra de título começa em 96 (TV) e 66 (Megas)');
confere(formasTV[formasTV.length - 4].y === formasMegas[formasMegas.length - 4].y, 'rodapé de pontuação no mesmo y');

// Nada fora da página 720×405
const fora = formasTV.filter(f => f.x < -12 || f.y < 0 || f.x + f.w > 732 || f.y + f.h > 405);
confere(fora.length === 0, `${fora.length} forma(s) fora da página: ` + JSON.stringify(fora.slice(0, 2)));

// A linha composta tem as duas sublinhas, com o selo do % em vermelho
const sub = formasTV.filter(f => f.texto === '80% DAS MANUT PLANEJADAS');
confere(sub.length === 1, 'sublinha "80% DAS MANUT PLANEJADAS" desenhada');
const seloPct = formasTV.find(f => f.texto === '▲ +2,50');
confere(seloPct && seloPct.estilo.cor === coresMegas.vermelho, 'selo do % com a cor própria (vermelho)');

// Célula vazia vira "-"
confere(formasTV.some(f => f.texto === '-'), 'célula vazia aparece como "-"');

// Status manual é descartado quando o Real é recalculado (lerMetas)
const planilha = { getSheetByName: () => ({
  getLastRow: () => 2,
  getRange: () => ({ getDisplayValues: () => [[
    'Curitiba', 'Supervisor', 'T', 'CHECK-LIST/SLA', '20', 'Performance', '%', '>=',
    '90', '95', 'Verde', '90', '95', 'Verde']] })
}) };
tv.obterMetaAuto = (u, d, m, qual) => ({ valor: qual === 'mes' ? '89,13' : '91', trend: null });
const lidas = tv.lerMetas(planilha, { name: 'CURITIBA' }, 'SUPERVISOR');
confere(lidas.linhas[0][7] === '' && tv.statusMeta(lidas.linhas[0], 'mes') === 'Vermelho',
  'Status Mês manual "Verde" descartado: 89,13% < 90% sai Vermelho');
confere(tv.statusMeta(lidas.linhas[0], 'acum') === 'Verde', 'Status Acum. recalculado: 91% ≥ 90% sai Verde');

// Dados.gs antigo (sem segmentos) continua funcionando com o 07 novo
confere(JSON.stringify(tv._metasTrend_({ trend: { txt: '▲ +1', cor: '#0' } })) === '{"segmentos":[{"txt":"▲ +1","cor":"#0"}]}',
  '_metasTrend_ aceita o trend antigo, sem segmentos');
confere(tv._metasTrend_({ trend: null }) === null, '_metasTrend_ sem tendência devolve null');

console.log(falhas ? `\n✗ ${falhas} falha(s), ${ok} ok` : `\n✓ ${ok}/${ok} passaram`);
process.exit(falhas ? 1 : 0);
