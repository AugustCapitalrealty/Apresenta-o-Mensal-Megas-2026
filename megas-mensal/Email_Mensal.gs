/**
 * ARQUIVO: Email_Mensal.gs
 * TEXTO DE E-MAIL DE ENVIO DA APRESENTAÇÃO MENSAL — gerado num Google Doc
 *
 * Monta o corpo do e-mail que acompanha a apresentação, no mesmo formato que
 * já era escrito à mão, mas com os números vindo das MESMAS funções que
 * alimentam os slides. Assim o e-mail não pode divergir do anexo — que é o
 * risco de redigitar: o deck dizendo 208 e o e-mail dizendo 220.
 *
 * COMO USAR
 *   Rode gerarEmailMensalCuritiba() (ou Itajai/Esteio) no editor. O Doc é
 *   criado no seu Drive e o link sai no Logger. Abra, revise os trechos
 *   marcados com [...], copie e cole no e-mail.
 *
 * O QUE O CÓDIGO NÃO PREENCHE
 *   As EXPLICAÇÕES das variações financeiras ("consumo de combustível dos
 *   geradores durante o reparo dos cabos de alta tensão") não existem em
 *   nenhuma planilha — são contexto que só quem acompanhou o mês tem. O
 *   texto traz a conta e o valor, e deixa um marcador [motivo: ...] para
 *   você completar. Inventar esse trecho seria pior do que deixar em branco:
 *   sairia plausível e errado.
 *
 * SE UM DADO FALTAR
 *   O tópico correspondente sai com [dado indisponível: ...] em vez de um
 *   número inventado ou de um "undefined" no meio da frase. O Logger diz o
 *   que faltou.
 */

// Metas citadas no texto. Ficam aqui porque são o que se AFIRMA no e-mail
// ("acima da meta de 90%"), não o que se lê da planilha.
const EMAIL_META_SLA          = 90;
const EMAIL_META_DISPONIBILIDADE = 90;


// ==========================================
// PONTOS DE ENTRADA
// ==========================================
function gerarEmailMensalCuritiba() { setProjetoAtivo('CURITIBA'); gerarEmailMensal_(); }
function gerarEmailMensalItajai()   { setProjetoAtivo('ITAJAI');   gerarEmailMensal_(); }
function gerarEmailMensalEsteio()   { setProjetoAtivo('ESTEIO');   gerarEmailMensal_(); }

// Um Doc por cidade, numa rodada só.
function gerarEmailMensalTodosOsMegas() {
  ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(c => { setProjetoAtivo(c); gerarEmailMensal_(); });
}


// ==========================================
// GERAÇÃO
// ==========================================
function gerarEmailMensal_() {
  const projeto = getProjetoAtivo();
  const ref     = obterMesReferencia_();
  const mesAno  = _emCapitalizar_(MESES_NOME_REF[ref.index]) + '/' + ref.ano;

  const faltando = [];
  const linhas = [];

  linhas.push('Boa tarde, tudo bem?');
  linhas.push('');
  linhas.push('Segue em anexo a apresentação mensal de resultados referente ao mês de ' +
              mesAno + ' do ' + _emNomeExtenso_(projeto.nome) + '.');
  linhas.push('');
  linhas.push('Destaques do período:');
  linhas.push('');

  [_emTopicoPreventivas_(faltando),
   _emTopicoChamados_(faltando),
   _emTopicoDisponibilidade_(faltando),
   _emTopicoFinanceiro_(faltando)
  ].forEach(t => { if (t) { linhas.push(t); linhas.push(''); } });

  linhas.push('Qualquer dúvida, fico à disposição.');
  linhas.push('');
  linhas.push('Atenciosamente,');

  const doc = _emCriarDoc_('E-mail — ' + projeto.nome + ' — ' + mesAno, linhas);

  Logger.log('E-mail de ' + projeto.nome + ' (' + mesAno + '): ' + doc.getUrl());
  if (faltando.length) {
    Logger.log('  ⚠ sem dado para: ' + faltando.join('; ') +
               '. Os tópicos correspondentes saíram marcados no Doc.');
  }
  return doc.getUrl();
}


// ==========================================
// TÓPICOS
// ==========================================

function _emTopicoPreventivas_(faltando) {
  const d = _emSeguro_(() => obterDadosPreventivas());
  if (!d || !d.mensal) { faltando.push('preventivas'); return _emPendente_('Preventivas'); }

  const slaM  = _emNum_(d.mensal.sla);
  const relM  = _emNum_(d.mensal.realizadas), preM = _emNum_(d.mensal.previstas);
  const slaA  = _emNum_(d.anual && d.anual.sla);
  const relA  = _emNum_(d.anual && d.anual.realizadas), preA = _emNum_(d.anual && d.anual.previstas);
  if (slaM === null) { faltando.push('SLA de preventivas'); return _emPendente_('Preventivas'); }

  let t = '• Preventivas: SLA atendido de ' + _emPct_(slaM) + ' no mês';
  if (relM !== null && preM !== null) {
    t += ' (' + _emInt_(relM) + ' realizadas de ' + _emInt_(preM) + ' previstas)';
  }
  t += ', ' + _emVsMeta_(slaM, EMAIL_META_SLA) + ' da meta de ' + EMAIL_META_SLA + '%.';

  if (slaA !== null) {
    t += ' No acumulado do ano, o SLA está em ' + _emPct_(slaA);
    if (relA !== null && preA !== null) {
      t += ' (' + _emInt_(relA) + ' realizadas de ' + _emInt_(preA) + ' previstas)';
    }
    t += '.';
  }
  return t;
}

function _emTopicoChamados_(faltando) {
  const serie = _emSeguro_(() => obterDadosBacklogHistorico_());
  if (!serie || !serie.length) { faltando.push('backlog'); return _emPendente_('Chamados'); }

  const ref = obterMesReferencia_();
  const ord = ref.ano * 100 + (ref.index + 1);
  const i   = serie.findIndex(p => p.ord === ord);
  if (i < 0 || serie[i].geral == null) { faltando.push('backlog do mês'); return _emPendente_('Chamados'); }

  const atual = serie[i], ant = i > 0 ? serie[i - 1] : null;
  let t = '• Chamados: O total de chamados em aberto encerrou o mês em ' + _emInt_(atual.geral);

  if (ant && ant.geral != null) {
    const dif = atual.geral - ant.geral;
    t += dif === 0 ? ', mesmo patamar do mês anterior'
                   : ', ' + (dif > 0 ? 'aumento' : 'redução') + ' de ' + Math.abs(dif) +
                     ' em relação ao mês anterior';
  }
  t += '.';

  if (atual.facilities != null) {
    const temAnt = ant && ant.facilities != null;
    if (temAnt && ant.facilities === atual.facilities) {
      // "passou de 171 para 171" não é frase — quando não muda, diz que não mudou.
      t += ' O backlog de Facilities permaneceu em ' + _emInt_(atual.facilities) + ' chamados.';
    } else if (temAnt) {
      t += ' O backlog de Facilities passou de ' + _emInt_(ant.facilities) + ' para ' +
           _emInt_(atual.facilities) + ' chamados.';
    } else {
      t += ' O backlog de Facilities está em ' + _emInt_(atual.facilities) + ' chamados.';
    }
  }

  // O fluxo do mês explica a variação do estoque — é a conta que já foi
  // conciliada na BD-CORRETIVAS, então citar os dois no e-mail é seguro.
  const fluxo = _emSeguro_(() => obterFluxoCorretivasBD_());
  if (fluxo) {
    t += ' No mês foram abertos ' + _emInt_(fluxo.mCriados) + ' e encerrados ' +
         _emInt_(fluxo.mFechados) + ' chamados.';
  }
  return t;
}

function _emTopicoDisponibilidade_(faltando) {
  const d = _emSeguro_(() => obterDadosCorretivasV6());
  const v = d && d.mensal ? _emKpi_(d.mensal, 'disponibilidade') : null;
  if (v === null) { faltando.push('índice de disponibilidade'); return _emPendente_('Disponibilidade dos ativos críticos'); }

  return '• Disponibilidade dos ativos críticos: Índice de ' + _emPct_(v) + ' no mês, ' +
         _emVsMeta_(v, EMAIL_META_DISPONIBILIDADE) + ' da meta de ' + EMAIL_META_DISPONIBILIDADE + '%.';
}

function _emTopicoFinanceiro_(faltando) {
  const dre = _emSeguro_(() => obterDadosDRE_());
  if (!dre || !dre.total || !dre.total.mes) { faltando.push('financeiro'); return _emPendente_('Financeiro'); }

  const mes  = dre.total.mes;
  const acum = dre.total.acum;
  const dif  = mes.real - mes.orc;                       // + = acima do orçado
  const pct  = mes.orc ? Math.abs(dif / mes.orc * 100) : null;

  // R$/m² sai da mesma fonte do slide de Custo do m² (aba METRO QUADRADO).
  const cm = _emSeguro_(() => obterDadosCustoM2());
  const m2Real = cm && cm.kpis ? cm.kpis.custo : null;
  const m2Orc  = cm && cm.kpis ? cm.kpis.meta  : null;

  let t = '• Financeiro: No mês, o realizado foi de ' + _emReais_(mes.real);
  if (m2Real != null) t += ' (' + _emRsM2_(m2Real) + ')';
  t += ' frente a ' + _emReais_(mes.orc);
  if (m2Orc != null) t += ' (' + _emRsM2_(m2Orc) + ')';
  t += ' orçado, ficando ' + (pct === null ? '[%]' : _emPct1_(pct)) + ' ' +
       (dif > 0 ? 'acima' : 'abaixo') + ' do orçado (' +
       (dif > 0 ? '+' : '−') + _emReais_(Math.abs(dif)) + ').';

  // Ofensores e defensores: o código traz a conta e o valor; o MOTIVO é
  // contexto humano e fica marcado para preenchimento.
  const fin = _emSeguro_(() => obterDadosFinanceiro());
  if (fin && fin.ofensores && fin.ofensores.length) {
    t += ' A variação para cima concentra-se em ' + _emContas_(fin.ofensores) + '.';
  }
  if (fin && fin.defensores && fin.defensores.length) {
    t += ' Já a variação para baixo se deve principalmente a ' + _emContas_(fin.defensores) + '.';
  }

  if (acum && acum.orc) {
    const pctA = Math.abs((acum.real - acum.orc) / acum.orc * 100);
    t += ' No acumulado do ano, o realizado é de ' + _emReais_(acum.real) +
         ' frente a ' + _emReais_(acum.orc) + ' orçado (' +
         (acum.real > acum.orc ? '+' : '−') + _emPct1_(pctA) + ').';
  }
  return t;
}

// "material de consumo (+R$ 22 mil, [motivo: ...])" — no máximo duas contas,
// como no texto que já era escrito à mão.
function _emContas_(lista) {
  return lista.slice(0, 2).map(c => {
    const d = Math.abs(c.realizado - c.orcado);
    const sinal = c.realizado > c.orcado ? '+' : '−';
    return _emMinuscula_(c.natureza) + ' (' + sinal + _emMil_(d) + ', [motivo: ...])';
  }).join(' e ');
}


// ==========================================
// DOCUMENTO
// ==========================================
function _emCriarDoc_(titulo, linhas) {
  const doc  = DocumentApp.create(titulo);
  const body = doc.getBody();
  body.clear();

  linhas.forEach(l => {
    const p = body.appendParagraph(l);
    p.setFontFamily('Arial').setFontSize(11).setForegroundColor('#000000');
    p.setSpacingBefore(0).setSpacingAfter(0);
  });

  doc.saveAndClose();
  return doc;
}


// ==========================================
// FORMATAÇÃO E APOIO
// ==========================================
function _emSeguro_(fn) {
  try { return fn(); } catch (e) { Logger.log('E-mail: ' + e.message); return null; }
}

// Tópico que não pôde ser preenchido. Sai VISÍVEL no Doc — melhor um marcador
// que você enxerga na revisão do que uma frase com número errado.
function _emPendente_(rotulo) {
  return '• ' + rotulo + ': [dado indisponível — confira a planilha e complete]';
}

function _emKpi_(bloco, trecho) {
  if (!bloco || !bloco.kpis) return null;
  const k = bloco.kpis.find(x => _histNorm_(x.l).indexOf(trecho) >= 0);
  return k ? _emNum_(k.v) : null;
}

// "94,74%" → 94.74 · "1.121" → 1121 · "-" → null
function _emNum_(v) {
  if (v == null || v === '' || v === '-') return null;
  const n = _numLenient_(v);
  return isNaN(n) ? null : n;
}

// SLA e disponibilidade vêm da planilha já com as casas que o time usa
// ("94,74%", "92%") — aqui só se preserva isso.
function _emPct_(n) {
  return formatarNumeroBR(Math.round(n * 100) / 100) + '%';
}

// Percentual CALCULADO pelo código (variação orçado x realizado). Uma casa,
// como no texto que já era escrito à mão: "7,3% abaixo", "(-8,8%)".
// formatarNumeroBR não serve aqui: ele usa duas casas sempre que há decimal,
// e sairia "7,30%".
function _emPct1_(n) {
  const s = (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
  return s.replace(/,0$/, '') + '%';
}

function _emInt_(n) {
  return formatarNumeroBR(Math.round(n));
}

function _emReais_(n) {
  return 'R$ ' + formatarNumeroBR(Math.round(n));
}

// "R$ 22 mil" — arredondamento que o texto escrito à mão já usava para as
// contas de variação.
function _emMil_(n) {
  return 'R$ ' + formatarNumeroBR(Math.round(n / 1000)) + ' mil';
}

function _emRsM2_(n) {
  return 'R$ ' + formatarNumeroBR(Math.round(n * 100) / 100) + '/m²';
}

function _emVsMeta_(valor, meta) {
  if (valor > meta) return 'acima';
  if (valor < meta) return 'abaixo';
  return 'em linha com';
}

function _emCapitalizar_(s) {
  const t = String(s || '').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function _emMinuscula_(s) {
  return String(s || '').toLowerCase();
}

// "Mega Curitiba" → "Mega Centro Logístico Curitiba", como no texto do e-mail.
function _emNomeExtenso_(nome) {
  const cidade = String(nome || '').replace(/^mega\s*/i, '').trim();
  return cidade ? 'Mega Centro Logístico ' + cidade : nome;
}
