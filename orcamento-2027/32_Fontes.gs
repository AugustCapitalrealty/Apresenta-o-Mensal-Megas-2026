/**
 * ARQUIVO: 32_Fontes.gs
 * FONTES:  A coluna FONTE das tabelas de manutenção (slide de cada categoria e "Demais categorias") é digitada à mão
 *          no Slides ("ORÇ. PROSSALTER", "CONTRATO", "HISTÓRICO"…). Antes, cada geração apagava o que foi digitado
 *          (12/10/2026: "já salva as fontes para não perder durante as atualizações").
 *
 *   ▸ Toda geração (deck de Facilities ou do Mega) lê a coluna FONTE dos slides que vai apagar e guarda na aba
 *     "Fontes" da planilha de textos (ORC_TEXTOS_ID): MEGA · ITEM (como aparece no slide) · FONTE · ONDE · DATA.
 *   ▸ Ao desenhar a tabela, a FONTE do item vem dessa aba (pelo Mega e pelo texto do item — o escolhido na
 *     planilha de textos, o original, ou o começo dele quando o slide mostrava o texto cortado com "…").
 *   ▸ salvarFontes() → guarda agora o que está digitado no deck de Facilities e na v3 do gestor (só leitura).
 *
 * A aba pode ser editada à mão: a coluna FONTE vale na próxima geração. Linha nunca é apagada; uma fonte nova
 * digitada no slide troca a da aba, e "—" (vazio) no slide não apaga a da aba.
 */

const ORC_FONTES_ABA = 'Fontes';
const ORC_FONTES_CABECALHO = ['MEGA', 'ITEM (como aparece no slide)', 'FONTE', 'ONDE', 'ATUALIZADO EM'];
let _ORC_FONTES = null;   // { exatas: { chave: fonte }, cortadas: [{ mega, inicio, fonte }] }, lido uma vez por geração

// As fontes dos prints do Guilherme (12/10/2026, 22h — "Demais categorias" dos três Megas), copiadas aqui para valerem
// mesmo antes de salvarFontes(): base por baixo da aba "Fontes" (o que estiver na aba vale), e salvarFontes() grava
// na aba as que ainda não estão lá. [item como aparece no slide, fonte].
const ORC_FONTES_PRINTS = {
  'Mega Esteio': [
    ['2 CAÇAMBAS METÁLICAS PARA RESÍDUOS – AMZ B', 'ORÇ. JAJEMEC'],
    ['4 CONTENTORES DE LIXO 1.000 L – AMZ A', 'ORÇ CONTEMAR'],
    ['2 CONTENTORES DE LIXO 1.000 L – AMZ B', 'ORÇ. CONTEMAR'],
    ['LAUDO DE LINHA DE VIDA ARMAZÉM A - ALPENDRE', 'ORÇ. MIRIAD'],
    ['LAUDO DE LINHA DE VIDA ARMAZÉM A - COBERTURA', 'ORÇ. MIRIAD'],
    ['LAUDO DE LINHA DE VIDA ARMAZÉM B2 - ALPENDRE', 'ORÇ. MIRIAD'],
    ['LAUDO LINHA DE VIDA – COBERTURA DAS DOCAS B2', 'ORÇ. MIRIAD'],
    ['LAUDO LINHA DE VIDA – COBERTURA DO AMZ B2', 'ORÇ. MIRIAD'],
    ['LINHA DE VIDA – ESCADA MARINHEIRO AMZ A', 'ORÇ. PROSSALTER'],
    ['LINHA DE VIDA – ESCADA MARINHEIRO AMZ B2', 'ORÇ. PROSSALTER'],
    ['INSTALAÇÃO DE MAQUINA RENTBRELLA ARMAZÉM A', 'CONTRATO'],
    ['INSTALAÇÃO DE MAQUINA RENTBRELLA ARMAZÉM B', 'CONTRATO'],
    ['JUNTA DE DILATAÇÃO TERRAE – AMZ A (T1, T3, T7)', 'ORÇ. ADS/CSM'],
    ['JUNTA DE DILATAÇÃO TERRAE – AMZ B (T5, T6)', 'ORÇ. ADS/CSM'],
    ['PROVISÃO PARA MANUTENÇÃO NÃO PREVISTA (3%)', 'PREMISSA'],
    ['KIT ESTAÇÃO DE MONITORAMENTO CANAL DE DRENAGEM', 'ORÇ. CAS TECNOLOGIA'],
    ['KIT SONDA – RESERVATÓRIO POTÁVEL E HIDRANTE (AMZ A)', 'ORÇ. CAS TECNOLOGIA'],
    ['KIT MONITORAMENTO RESERVATÓRIO SPK (ARMAZÉM A)', 'ORÇ. CAS TECNOLOGIA'],
    ['KIT MONITORAMENTO RESERVATÓRIO ARMAZÉM B1', 'ORÇ. CAS TECNOLOGIA'],
    ['KIT MONITORAMENTO RESERVATÓRIO ARMAZÉM B2', 'ORÇ. CAS TECNOLOGIA'],
    ['KIT MONITORAMENTO CANAL DE DRENAGEM', 'ORÇ. CAS TECNOLOGIA'],
    ['COMPRA DE INSUMOS DE MATERIAIS DE CONSTRUÇÃO ZELADORIA', 'HISTÓRICO'],
    ['SUBSTITUIÇÃO POR VIDA ÚTIL DA LONA DO MEGA (POSTO)', 'ORÇ. FILBER'],
    ['MANUTENÇÃO PREVENTIVA ANUAL DA COMPORTA AMZ A', 'ORÇ. ARC'],
    ['MANUTENÇÃO PREVENTIVA ANUAL DA COMPORTA AMZ B', 'ORÇ. ARC'],
    ['PONTO DE ÁGUA PARA BEBEDOURO (FIM DOS GALÕES)', 'ORÇ. ADS'],
    ['DEMARCAÇÃO SEMESTRAL – PORTARIAS A E B (MATERIAL)', 'HISTÓRICO'],
    ['DEMARCAÇÃO ANUAL – FRENTE DE DOCAS (MATERIAL)', 'HISTÓRICO'],
    ['SUBSTITUIÇÃO E MANUTENÇÃO DE PISO PODOTÁTIL (PORTARIA A)', 'HISTÓRICO'],
    ['REVISÃO DOS AR-CONDICIONADOS (PMOC)', 'ORÇ. CLIMATIZAR'],
    ['PURIFICADOR DE ÁGUA – SALA ADMINISTRATIVA', 'ORÇ. MAGAZINE'],
    ['LIMPEZA DA GALERIA DA COMPORTA B2 (RETIRADO)', 'ORÇ. ADS']
  ],
  'Mega Itajaí': [
    ['CONTRATO — ARCA AGRO (ÁREA VERDE)', 'CONTRATO'],
    ['DEMARCAÇÃO ANUAL – VIAS DE CARRO (1.060 M²)', 'ORÇ ELETROSINAL'],
    ['DEMARCAÇÃO ANUAL – CALÇADA', 'ORÇ ELETROSINAL'],
    ['DEMARCAÇÃO ANUAL – BOLSÃO (300 M²)', 'ORÇ ELETROSINAL'],
    ['DEMARCAÇÃO SEMESTRAL – ÁREA DE ACESSOS (100 M²)', 'ORÇ ELETROSINAL'],
    ['DEMARCAÇÃO SEMESTRAL – PONTE (22 M²)', 'ORÇ ELETROSINAL'],
    ['DEMARCAÇÃO SEMESTRAL – EMBARQUE/DESEMBARQUE', 'ORÇ ELETROSINAL'],
    ['CONTRATO — RODRIGO ROHDE (ELÉTRICA)', 'CONTRATO'],
    ['CONTRATO — MG GERADORES', 'CONTRATO'],
    ['MANUTENÇÃO SEGURANÇA ELETRÔNICA – FM SECURITY', 'PROPOSTA FM'],
    ['LIMPEZA E SUCÇÃO ANUAL DAS FOSSAS (450 M³)', 'ORÇ. ESGOMIL'],
    ['ANÁLISE LABORATORIAL SEMESTRAL – 20 STE', 'ORÇ. FREITAG'],
    ['PROVISÃO PARA MANUTENÇÃO NÃO PREVISTA (3%)', 'PREMISSA'],
    ['LINHA DE VIDA – ESCADA MARINHEIRO AMZ 1', 'ORÇ. PROSSALTER'],
    ['LINHA DE VIDA – ESCADA MARINHEIRO AMZ 2', 'ORÇ. PROSSALTER'],
    ['LINHA DE VIDA – ESCADA MARINHEIRO AMZ 3', 'ORÇ. PROSSALTER'],
    ['LINHA DE VIDA – ESCADA MARINHEIRO AMZ 4', 'ORÇ. PROSSALTER'],
    ['SUBSTITUIÇÃO DE PAVIMENTO PINTADO', 'ORÇ. BRONZE'],
    ['TROCA DOS AR-CONDICIONADOS – PORTARIA E ADM', 'ORÇ. MAGAZINE'],
    ['CONTRATO — AR-CONDICIONADO (PMOC)', 'CONTRATO'],
    ['MATERIAIS DE CONSTRUÇÃO PARA PEQUENOS REPAROS', 'HISTÓRICO'],
    ['MÁQUINA DE GUARDA-CHUVA (RENTBRELLA)', 'CONTRATO'],
    ['REPOSIÇÃO E SUBSTITUIÇÃO DE PLACAS DE SINALIZAÇÃO', 'VERBA'],
    ['SUBSTITUIÇÃO DA GELADEIRA DA COPA', 'ORÇ. MAGAZINE'],
    ['INFRA ELÉTRICA E LÓGICA – MONITORAMENTO', 'HISTÓRICO']
  ],
  'Mega Curitiba': [
    ['RS2000 SUM NG MODBUS - PROJETO DE AUTOMAÇÃO DE LEITURAS', 'ORÇ. CAS'],
    ['COMPRA DE 22 MEDIDORES DE ENERGIA TRIFASICO DIRETO 100A…', 'ORÇ. CAS'],
    ['MÃO DE OBRA DA TROCA DE ENERGIA', 'ORÇ. CAS'],
    ['HIDRÔMETRO DE ÁGUA - PROJETO DE AUTOMAÇÃO DE LEITURAS', 'ORÇ. CAS'],
    ['INSTALAÇÃO E CONFIGURAÇÃO MEDIDORES CAS - PROJETO AUTOM…', 'ORÇ. CAS'],
    ['DEMARCAÇÃO ANUAL – FRENTE DOS AMZ 1 A 7 (540 M²)', 'ORÇ. ELETROSINAL'],
    ['DEMARCAÇÃO – BOLSÃO DE PESADOS (300 M²)', 'ORÇ. ELETROSINAL'],
    ['DEMARCAÇÃO SEMESTRAL – ÁREA DE ACESSOS (122 M²)', 'ORÇ. ELETROSINAL'],
    ['DEMARCAÇÃO SEMESTRAL – DESCIDA (114 M²)', 'ORÇ. ELETROSINAL'],
    ['RECUPERAÇÃO DE VIGA + LOMBADAS DE CONCRETO – AMZ 4', 'ORÇ. KOKOT'],
    ['RECUPERAÇÃO DE VIGA + LOMBADA DE CONCRETO – AMZ 3', 'ORÇ. KOKOT'],
    ['DEMARCAÇÃO SEMESTRAL – ROTATÓRIA (34 M²)', 'ORÇ. ELETROSINAL'],
    ['DEMARCAÇÃO SEMESTRAL – LOMBADAS (28 M²)', 'ORÇ. ELETROSINAL'],
    ['DEMARCAÇÃO SEMESTRAL – RUA LATERAL AMZ 1 E 2', 'ORÇ. ELETROSINAL'],
    ['DEMARCAÇÃO SEMESTRAL – EMBARQUE/DESEMBARQUE', 'ORÇ. ELETROSINAL'],
    ['COMPRA DE TORNIQUETE DIGICON INOX TX1500', 'ORÇ. DIGICON'],
    ['MANUTENÇÃO SEGURANÇA ELETRÔNICA – FM SECURITY', 'PROPOSTA FM'],
    ['PROVISÃO PARA MANUTENÇÃO NÃO PREVISTA (3%)', 'PREMISSA'],
    ['CONTRATO — EQUILÍBRIO (CONSULTORIA AMBIENTAL)', 'CONTRATO'],
    ['MATERIAIS DE CONSTRUÇÃO PARA PEQUENOS REPAROS', 'HISTÓRICO'],
    ['MÃO DE OBRA – INSTALAÇÃO DO 4º TORNIQUETE', 'ORÇAMENTO DIGICON'],
    ['CONTRATO — AR-CONDICIONADO (PMOC)', 'CONTRATO'],
    ['LAVAGEM DAS TELAS E ESTRUTURAS DO CAMPO SOCIETY', 'ORÇ. KTV'],
    ['LAVAGEM TOTEM MEGA', 'ORÇ. KTV'],
    ['KIT SONDA – RESERVATÓRIO SPK', 'ORÇ. CAS'],
    ['KIT SONDA – RESERVATÓRIO POTÁVEL + HIDRANTE', 'ORÇ. CAS'],
    ['TV + SUPORTE NO QUIOSQUE', 'ORÇ. MAGAZINE']
  ]
};

// As dos prints como lista de _orcGuardarFontes_.
function _orcFontesDosPrints_() {
  const out = [];
  Object.keys(ORC_FONTES_PRINTS).forEach(mega => ORC_FONTES_PRINTS[mega].forEach(l =>
    out.push({ mega: mega, item: l[0], fonte: l[1], onde: 'print de 12/10/2026 (Demais categorias)' })));
  return out;
}

function salvarFontes() {
  const lista = [];
  const ler = (id, nome) => {
    if (!id) return;
    try {
      const deck = SlidesApp.openById(id);
      const antes = lista.length;
      deck.getSlides().forEach(s => _orcFontesDoSlide_(s, null).forEach(f => lista.push(f)));
      Logger.log(nome + ': ' + (lista.length - antes) + ' fontes digitadas');
    } catch (e) { Logger.log(nome + ' não lido: ' + e.message); }
  };
  ler(ORC_DECK_VERSAO_GESTOR_ID, 'v3 do gestor');
  ler(_orcIdFacilities_(), 'Deck de Facilities');   // depois da v3: o que está no deck vale
  const p = _orcGuardarFontes_(_orcFontesDosPrints_(), true);   // as dos prints: só as que a aba ainda não tem
  Logger.log('Prints de 12/10: ' + p.novas + ' fontes novas na aba (' + p.iguais + ' já estavam)');
  const r = _orcGuardarFontes_(lista);
  Logger.log('Fontes na aba "' + ORC_FONTES_ABA + '" da planilha de textos: ' + r.novas + ' novas, ' + r.trocadas +
             ' trocadas, ' + r.iguais + ' iguais — https://docs.google.com/spreadsheets/d/' + ORC_TEXTOS_ID + '/edit');
}

// Antes de apagar os slides de uma geração: guarda as fontes digitadas neles. Nunca para a geração.
function _orcSalvarFontesDeSlides_(slides, mega) {
  try {
    const lista = [];
    slides.forEach(s => _orcFontesDoSlide_(s, mega).forEach(f => lista.push(f)));
    if (!lista.length) return;
    const r = _orcGuardarFontes_(lista);
    _ORC_FONTES = null;
    Logger.log(mega + ': fontes dos slides antigos guardadas (' + r.novas + ' novas, ' + r.trocadas + ' trocadas, ' + r.iguais + ' iguais)');
  } catch (e) { Logger.log(mega + ': fontes dos slides antigos não guardadas — ' + e.message); }
}

// [{ mega, item, fonte, onde }] da coluna FONTE de uma tabela de manutenção (cabeçalho ITEM e FONTE; o subtítulo
// diz "do orçamento de manutenção"). mega: o do deck; null = o do texto do slide ("· Mega X").
function _orcFontesDoSlide_(slide, mega) {
  const formas = slide.getShapes();
  const ler = sh => { try { return sh.getText().asString().replace(/\n$/, '').trim(); } catch (e) { return ''; } };
  // O subtítulo vem nos primeiros textos do slide (cabeçalho): sem ele, não lê o resto (geração mais rápida).
  let vistos = 0, eManutencao = false;
  for (let i = 0; i < formas.length && vistos < 6 && !eManutencao; i++) {
    const t = ler(formas[i]);
    if (!t) continue;
    vistos++;
    eManutencao = t.indexOf('do orçamento de manutenção') >= 0;
  }
  if (!eManutencao) return [];
  const tx = formas.map(sh => ({ sh: sh, t: ler(sh) })).filter(o => o.t);
  const cabF = tx.filter(o => o.t === 'FONTE')[0], cabI = tx.filter(o => o.t === 'ITEM')[0];
  if (!cabF || !cabI) return [];
  if (!mega) {
    const m = tx.map(o => o.t).join(' | ').match(/·\s*(Mega (?:Esteio|Itajaí|Curitiba))(?![A-Za-zÀ-ú])/);
    if (!m) return [];
    mega = m[1];
  }
  const yCab = cabF.sh.getTop();
  const coluna = cab => tx.filter(o => o !== cab && Math.abs(o.sh.getLeft() - cab.sh.getLeft()) < 1.5 && o.sh.getTop() > yCab + 2);
  const itens = coluna(cabI), onde = tx[0].t;
  return coluna(cabF).filter(f => f.t !== ORC_FONTE_VAZIA).map(f => {
    const it = itens.filter(i => Math.abs(i.sh.getTop() - f.sh.getTop()) < 3)[0];
    return it ? { mega: mega, item: it.t, fonte: f.t, onde: onde } : null;
  }).filter(Boolean);
}

function _orcChaveFonte_(mega, item) {
  return _orcNorm_(mega) + '|' + _orcNorm_(String(item).replace(/…\s*$/, ''));
}

// Grava na aba: linha nova para item novo; troca a FONTE quando mudou (soNovas: não troca — conta como igual).
// Devolve { novas, trocadas, iguais }.
function _orcGuardarFontes_(lista, soNovas) {
  const r = { novas: 0, trocadas: 0, iguais: 0 };
  if (!lista.length || !ORC_TEXTOS_ID) return r;
  const ss = SpreadsheetApp.openById(ORC_TEXTOS_ID);
  let sh = ss.getSheetByName(ORC_FONTES_ABA);
  if (!sh) {
    sh = ss.insertSheet(ORC_FONTES_ABA);
    sh.getRange(1, 1, 1, ORC_FONTES_CABECALHO.length).setValues([ORC_FONTES_CABECALHO]);
  }
  const dados = sh.getLastRow() > 0 ? sh.getDataRange().getValues() : [ORC_FONTES_CABECALHO];
  const linha = {};
  dados.slice(1).forEach((l, i) => { if (l[0] && l[1]) linha[_orcChaveFonte_(l[0], l[1])] = { n: i + 2, fonte: String(l[2] || '').trim() }; });
  const d = new Date(), p = n => ('0' + n).slice(-2);
  const quando = p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + 'h' + p(d.getMinutes());
  const novas = [];
  lista.forEach(f => {
    const k = _orcChaveFonte_(f.mega, f.item), ja = linha[k];
    if (ja && (ja.fonte === f.fonte || soNovas)) { r.iguais++; return; }
    if (ja && ja.n > 0) { sh.getRange(ja.n, 3, 1, 3).setValues([[f.fonte, f.onde, quando]]); ja.fonte = f.fonte; r.trocadas++; return; }
    if (ja) { ja.linha[2] = f.fonte; ja.fonte = f.fonte; r.trocadas++; return; }   // repetida nesta mesma lista
    const nova = [f.mega, f.item, f.fonte, f.onde, quando];
    novas.push(nova);
    linha[k] = { n: 0, fonte: f.fonte, linha: nova };
    r.novas++;
  });
  if (novas.length) sh.getRange(dados.length + 1, 1, novas.length, ORC_FONTES_CABECALHO.length).setValues(novas);
  return r;
}

function _orcLerFontes_() {
  if (_ORC_FONTES) return _ORC_FONTES;
  _ORC_FONTES = { exatas: {}, cortadas: [] };
  const por = (mega, item, fonte) => {
    _ORC_FONTES.exatas[_orcChaveFonte_(mega, item)] = fonte;
    if (/…\s*$/.test(item)) _ORC_FONTES.cortadas.unshift({ mega: _orcNorm_(mega), inicio: _orcNorm_(item.replace(/…\s*$/, '')), fonte: fonte });
  };
  _orcFontesDosPrints_().forEach(x => por(x.mega, x.item, x.fonte));   // base: os prints; a aba vale por cima
  if (!ORC_TEXTOS_ID) return _ORC_FONTES;
  try {
    const sh = SpreadsheetApp.openById(ORC_TEXTOS_ID).getSheetByName(ORC_FONTES_ABA);
    if (!sh || sh.getLastRow() < 2) return _ORC_FONTES;
    sh.getDataRange().getValues().slice(1).forEach(l => {
      const mega = String(l[0] || '').trim(), item = String(l[1] || '').trim(), fonte = String(l[2] || '').trim();
      if (!mega || !item || !fonte) return;
      por(mega, item, fonte);
    });
  } catch (e) { Logger.log('Aba de fontes indisponível — a coluna FONTE sai com "—": ' + e.message); }
  return _ORC_FONTES;
}

// FONTE guardada para o item do Mega, ou ''.
function _orcFonteSalva_(mega, descricao) {
  const f = _orcLerFontes_();
  const textos = [_orcTextoEscolhido_('Categorias', descricao), String(descricao)];
  for (let i = 0; i < textos.length; i++) { const v = f.exatas[_orcChaveFonte_(mega, textos[i])]; if (v) return v; }
  const m = _orcNorm_(mega);
  const c = f.cortadas.filter(x => x.mega === m && x.inicio.length >= 10 &&
                                   textos.some(t => _orcNorm_(t).indexOf(x.inicio) === 0))[0];
  return c ? c.fonte : '';
}
