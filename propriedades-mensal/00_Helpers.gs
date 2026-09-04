/**
 * ARQUIVO: 00_Helpers.gs
 * HELPERS COMPARTILHADOS — número, texto e normalização
 *
 * POR QUE ESTE ARQUIVO EXISTE: o projeto tinha QUATRO conversores de
 * texto→número, cada um com uma regra diferente (um entendia negativo entre
 * parênteses, outro não; um devolvia null para vazio, outro devolvia ZERO),
 * quatro formatadores e dois normalizadores de acento com a mesma regex
 * escrita de jeitos diferentes. Ler um número passou a depender de qual
 * arquivo você estava.
 *
 * Aqui fica UMA implementação de cada. Os nomes antigos continuam existindo
 * como apelidos que chamam estas — assim nada precisa ser reescrito de uma vez
 * e o projeto não quebra no meio da mudança.
 */

// ==========================================
// NÚMERO
// ==========================================

/**
 * Texto → número, no formato da controladoria brasileira.
 *
 * Entende, tudo junto: "1.234,56", "(1.234,56)" como NEGATIVO (formato
 * contábil), "R$ 1.234", "67,21%", espaço não-quebrável.
 *
 * VAZIO DEVOLVE null, NÃO ZERO. É a lição 3 do CLAUDE.md: não medir é
 * diferente de medir zero, e as duas coisas precisam pintar diferente no
 * slide. Quem precisa de zero pede explicitamente com _numOuZero_.
 */
function _num_(v) {
  if (v == null) return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  let t = String(v).replace(/ /g, ' ').trim();
  if (!t || t === '-' || t === '—' || t.charAt(0) === '#') return null;   // #DIV/0! etc.
  const neg = /^\(.*\)$/.test(t);
  t = t.replace(/[()]/g, '').replace(/R\$/gi, '').replace(/%/g, '').trim();
  // Tira o separador de milhar só quando ele SEPARA MILHAR (três dígitos
  // depois). "1.234" vira 1234; "1.5" continua 1.5.
  t = t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(t);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

// Mesma leitura, mas vazio vira 0. Use só quando a ausência REALMENTE
// significa zero — somatório de coluna, contagem. Nunca para exibir.
function _numOuZero_(v) { const n = _num_(v); return n == null ? 0 : n; }

// 1234567 → "1.234.567"
function _milhar_(n) {
  if (n == null || isNaN(n)) return '—';
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Valor em reais → R$ mil, inteiro. null → "—" (não medido); 0 → "0".
function _mil_(v) {
  if (v == null || isNaN(v)) return '—';
  const m = v / 1000;
  return (Math.abs(m) < 0.5 && m !== 0) ? '~0' : _milhar_(Math.round(m));
}

// Percentual com duas casas, vírgula decimal. null → "—".
function _pct_(v, casas) {
  if (v == null || isNaN(v)) return '—';
  return v.toFixed(casas == null ? 2 : casas).replace('.', ',') + '%';
}


// ==========================================
// TEXTO
// ==========================================

/**
 * Tira acento para comparar. A classe é escrita ESCAPADA (̀-ͯ) de
 * propósito: são os acentos combinantes, e escrevê-los literais é o erro que o
 * CLAUDE.md registra — some da tela e quebra a comparação em MARÇO. Já
 * aconteceu neste projeto.
 */
function _norm_(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

// Corta no último espaço quando ele não fica cedo demais — cortar no meio de
// uma palavra é mais difícil de ler que perder a palavra inteira.
function _truncar_(txt, max) {
  const t = String(txt == null ? '' : txt).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const esp = corte.lastIndexOf(' ');
  return (esp > max * 0.6 ? corte.slice(0, esp) : corte) + '…';
}

/**
 * Quantos caracteres cabem numa caixa dessa largura, nessa fonte.
 *
 * Toda TEXT_BOX do Slides tem ~7pt de recuo interno de cada lado que a API não
 * deixa desligar; em caixa estreita ele "come" a largura e o Slides quebra a
 * linha mesmo sobrando espaço visual (lição 1).
 */
const TEXTBOX_INSET_PT = 4;
function _charsQueCabem_(w, fontSize) {
  return Math.max(8, Math.floor((w - TEXTBOX_INSET_PT * 2) / (fontSize * 0.62)));
}


// ==========================================
// DESENHO
// ==========================================

/**
 * Caixa de texto simples. É a helper mais usada do projeto (17 arquivos).
 *
 * `folga` alarga a caixa para os dois lados sem mudar onde o texto aparece —
 * serve para vencer o recuo interno em célula estreita, onde "Realizado"
 * quebrava em "Realizad/o" e "R$ 6,46" saía em duas linhas. Só faz sentido em
 * texto CENTRALIZADO e curto; num parágrafo alinhado à esquerda a folga só
 * faria o texto invadir a célula vizinha.
 */
function _sTxt(slide, x, y, w, h, txt, size, bold, cor, align, folga) {
  const f = folga || 0;
  const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x - f, y, w + f * 2, h);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  const ts = tb.getText();
  ts.setText(String(txt == null ? '' : txt));
  ts.getTextStyle().setFontSize(size).setBold(!!bold).setForegroundColor(cor)
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body);
  const ps = ts.getParagraphStyle();
  if (align === 'center')     ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  else if (align === 'right') ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  else                        ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  tb.getBorder().setTransparent();
  return tb;
}

// Retângulo cheio, sem borda — o bloco mais repetido do projeto.
function _sRet_(slide, x, y, w, h, cor, alpha) {
  const r = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  if (alpha == null) r.getFill().setSolidFill(cor); else r.getFill().setSolidFill(cor, alpha);
  r.getBorder().setTransparent();
  return r;
}


// ==========================================
// APELIDOS — os nomes antigos, agora com uma implementação só
// ==========================================
// Ficam para o código existente não precisar ser reescrito de uma vez. Ao
// mexer num arquivo, troque pela função nova e apague o apelido daqui.

function _dreNum_(v)    { return _num_(v); }
function _metaPct_(v)   { return _num_(v); }
function _brgMilhar_(n) { return _milhar_(n); }
function _dreMil_(v)    { return _mil_(v); }
function _dashNum_(v)   { return (v == null || isNaN(v)) ? null : v; }
function _truncarNome_(txt, max) { return _truncar_(txt, max); }

// _metaNum_ devolvia NaN para vazio e o comparador de status conta com isso
// (isNaN → status Cinza). Mantém o contrato.
function _metaNum_(s) { const n = _num_(s); return n == null ? NaN : n; }

// ⚠ _toNum_ devolve ZERO para vazio. É o zero falso da lição 3, e está assim
// porque somatórios antigos contam com esse comportamento. NÃO use em código
// novo — use _num_ e trate o null.
function _toNum_(v) { return _numOuZero_(v); }
