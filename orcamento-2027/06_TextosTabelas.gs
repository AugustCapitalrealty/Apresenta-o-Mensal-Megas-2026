/**
 * ARQUIVO: 06_TextosTabelas.gs
 * SEÇÃO:   NÚCLEO — Texto curto das descrições longas
 * DESCRIÇÃO: As tabelas usam uma fonte só (pedido do gestor, 05/10/2026): a
 *            descrição que não cabe é cortada com "…", em vez de encolher a
 *            letra só naquela linha. Quem decide o texto curto é o gestor,
 *            na planilha ORC_TEXTOS_ID — uma aba por tipo de tabela:
 *
 *              A  TEXTO ORIGINAL          (como vem das planilhas do orçamento)
 *              B  COMO APARECE HOJE       (o que a última geração desenhou)
 *              C  TEXTO NA APRESENTAÇÃO   (o gestor preenche; vazio = original)
 *              D  CORTADO?                (SIM = saiu com "…")
 *              E  CABE ATÉ (LETRAS)       (aprox., em maiúsculas)
 *              F  ONDE APARECE
 *
 *            Cada geração lê a coluna C antes de desenhar e, no fim, devolve
 *            à planilha as colunas B, D, E e F, acrescentando os textos novos.
 *            A coluna C nunca é sobrescrita.
 */

// Abas da planilha, na ordem do deck. O nome é o que vai em op.aba / cel.aba.
const ORC_TEXTOS_ABAS = ['Composição', 'Maiores itens', 'Categorias', 'Ofensores', 'Sugestões'];
const ORC_TEXTOS_CABECALHO = ['TEXTO ORIGINAL', 'COMO APARECE HOJE', 'TEXTO NA APRESENTAÇÃO (preencher)',
                              'CORTADO?', 'CABE ATÉ (LETRAS)', 'ONDE APARECE'];

let _ORC_TEXTOS_ESCOLHAS = null;   // { aba: { _orcNorm_(original): escolhido } }, lido uma vez por geração
let _ORC_TEXTOS_USADOS = {};       // aba|original → { aba, original, exibido, cortado, cabe, onde: {} }
let _ORC_SLIDE_ATUAL = '';         // nome do passo em desenho (coluna ONDE APARECE)

// Começo de cada geração: relê as escolhas (o gestor pode ter mudado a
// planilha desde a última) e zera o registro.
function _orcTextosReiniciar_() {
  _ORC_TEXTOS_ESCOLHAS = null;
  _ORC_TEXTOS_USADOS = {};
  _ORC_SLIDE_ATUAL = '';
}

function _orcLerEscolhas_() {
  if (_ORC_TEXTOS_ESCOLHAS) return _ORC_TEXTOS_ESCOLHAS;
  _ORC_TEXTOS_ESCOLHAS = {};
  if (!ORC_TEXTOS_ID) return _ORC_TEXTOS_ESCOLHAS;
  try {
    SpreadsheetApp.openById(ORC_TEXTOS_ID).getSheets().forEach(sh => {
      const m = _ORC_TEXTOS_ESCOLHAS[sh.getName()] = {};
      sh.getDataRange().getValues().slice(1).forEach(r => {
        const orig = String(r[0] === undefined ? '' : r[0]).trim();
        const esc = String(r[2] === undefined ? '' : r[2]).trim();
        if (orig && esc) m[_orcNorm_(orig)] = esc;
      });
    });
  } catch (e) {
    // Sem a planilha o deck sai igual, com o texto original cortado.
    Logger.log('Planilha de textos indisponível — usando os textos originais: ' + e.message);
  }
  return _ORC_TEXTOS_ESCOLHAS;
}

// Texto escolhido para o original: o da própria aba e, sem ele, o escolhido
// em qualquer outra — a mesma descrição aparece em várias tabelas, e
// preencher uma vez já vale para todas (cada aba pode sobrepor).
function _orcTextoEscolhido_(aba, original) {
  const m = _orcLerEscolhas_();
  const k = _orcNorm_(original);
  if (m[aba] && m[aba][k]) return m[aba][k];
  const outra = Object.keys(m).filter(a => m[a][k])[0];
  return outra ? m[outra][k] : String(original);
}

// Chamado por _orcUmaLinha_ para todo texto com op.aba.
function _orcRegistrarTexto_(aba, original, exibido, cabe) {
  const chave = aba + '|' + _orcNorm_(original);
  const r = _ORC_TEXTOS_USADOS[chave] ||
    (_ORC_TEXTOS_USADOS[chave] = { aba: aba, original: String(original), exibido: exibido, cabe: cabe, onde: {} });
  // A mesma descrição em larguras diferentes: vale a mais apertada.
  if (cabe < r.cabe) { r.cabe = cabe; r.exibido = exibido; }
  if (_ORC_SLIDE_ATUAL) r.onde[_ORC_SLIDE_ATUAL] = true;
}

/**
 * Copia as propostas de ORC_PROPOSTAS_TEXTOS (07_PropostasTextos.gs) para a
 * coluna C da planilha de textos. Escreve onde a coluna C está vazia ou ainda
 * tem a PROPOSTA ANTERIOR — é assim que uma proposta revista substitui a
 * antiga. O que o gestor escreveu à mão nunca é trocado. Rode depois de uma
 * geração (a planilha de textos precisa ter as linhas) e gere de novo para
 * ver o resultado.
 */
function aplicarPropostasTextos() {
  const props = {};                                   // aba → { _orcNorm_(original): { prop, anterior } }
  ORC_PROPOSTAS_TEXTOS.forEach(r => {
    const aba = String(r[0] || '').trim(), orig = String(r[1] || '').trim(), prop = String(r[2] || '').trim();
    if (aba && orig && prop) {
      (props[aba] || (props[aba] = {}))[_orcNorm_(orig)] = { prop: prop, anterior: String(r[3] || '').trim() };
    }
  });
  const ss = SpreadsheetApp.openById(ORC_TEXTOS_ID);
  let aplicadas = 0, revistas = 0, mantidas = 0, semLinha = 0;
  Object.keys(props).forEach(aba => {
    const sh = ss.getSheetByName(aba);
    const vistos = {};
    if (sh && sh.getLastRow() > 1) {
      const dados = sh.getDataRange().getValues().slice(1);
      const colC = dados.map(r => {
        const k = _orcNorm_(r[0]), atual = String(r[2] === undefined ? '' : r[2]).trim();
        const p = props[aba][k];
        if (!p) return [atual];
        vistos[k] = true;
        if (!atual) { aplicadas++; return [p.prop]; }
        if (p.anterior && atual !== p.prop && _orcNorm_(atual) === _orcNorm_(p.anterior)) { revistas++; return [p.prop]; }
        mantidas++;
        return [atual];
      });
      sh.getRange(2, 3, colC.length, 1).setValues(colC);
    }
    semLinha += Object.keys(props[aba]).filter(k => !vistos[k]).length;
  });
  Logger.log('Propostas aplicadas: ' + aplicadas + ' · revistas (trocaram a anterior): ' + revistas +
             ' · já preenchidas (mantidas): ' + mantidas +
             (semLinha ? ' · sem linha na planilha de textos: ' + semLinha + ' (rode gerarTodas() antes)' : ''));
}

// Fim da geração: grava o que foi desenhado. Linha que já existe mantém a
// coluna C; texto novo entra no fim da aba; nada é apagado (uma geração
// parcial, de outra cidade, não some com as linhas das outras abas).
function _orcSalvarTextos_() {
  const usados = Object.keys(_ORC_TEXTOS_USADOS).map(k => _ORC_TEXTOS_USADOS[k]);
  if (!ORC_TEXTOS_ID || !usados.length) return;
  try {
    const ss = SpreadsheetApp.openById(ORC_TEXTOS_ID);
    const nc = ORC_TEXTOS_CABECALHO.length;
    ORC_TEXTOS_ABAS.forEach(nome => {
      const daqui = usados.filter(r => r.aba === nome);
      let sh = ss.getSheetByName(nome);
      if (!sh && !daqui.length) return;
      if (!sh) sh = ss.insertSheet(nome);

      const linhas = sh.getLastRow() > 1
        ? sh.getDataRange().getValues().slice(1).map(r => ORC_TEXTOS_CABECALHO.map((c, i) => r[i] === undefined ? '' : r[i]))
        : [];
      const indice = {};
      linhas.forEach((l, i) => { indice[_orcNorm_(l[0])] = i; });
      daqui.forEach(r => {
        const cortado = /…$/.test(r.exibido) ? 'SIM' : '';
        const onde = Object.keys(r.onde).join(' · ');
        const i = indice[_orcNorm_(r.original)];
        if (i === undefined) linhas.push([r.original, r.exibido, '', cortado, r.cabe, onde]);
        else linhas[i] = [linhas[i][0], r.exibido, linhas[i][2], cortado, r.cabe, onde];
      });

      const tudo = [ORC_TEXTOS_CABECALHO].concat(linhas);
      sh.clearContents();
      sh.getRange(1, 1, tudo.length, nc).setValues(tudo);
      sh.getRange(1, 1, 1, nc).setFontWeight('bold').setBackground(CR_DESIGN_SYSTEM.colors.brandDark).setFontColor('#FFFFFF');
      if (linhas.length) sh.getRange(2, 3, linhas.length, 1).setBackground('#FEF9C3');   // a coluna a preencher
      sh.setFrozenRows(1);
      [380, 300, 300, 80, 110, 260].forEach((w, i) => sh.setColumnWidth(i + 1, w));
    });
    // A aba vazia que vem na planilha nova sai, para não parecer pendência.
    ss.getSheets().forEach(sh => {
      if (ORC_TEXTOS_ABAS.indexOf(sh.getName()) < 0 && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
    });
    Logger.log('Planilha de textos atualizada: ' + usados.length + ' textos — ' +
               usados.filter(r => /…$/.test(r.exibido)).length + ' cortados.');
  } catch (e) {
    Logger.log('Planilha de textos não atualizada: ' + e.message);
  }
}
