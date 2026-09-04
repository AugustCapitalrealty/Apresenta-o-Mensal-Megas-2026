/**
 * ARQUIVO: 02_Dados.gs
 * SEÇÃO:   DADOS — Apresentação Mensal de Propriedades
 *
 * A planilha BASE DE DADOS — QUADRO REM (BD_CORRETIVAS_ID) tem DUAS bases
 * brutas, uma linha por registro, multi-empreendimento:
 *
 *     BD-CORRETIVAS    chamados corretivos
 *     BD-PREVENTIVAS   preventivas
 *
 * As duas são lidas pelo mesmo leitor genérico. A coluna "Centro de Custos"
 * já contém todo o portfólio — não há lista de imóveis para digitar, há
 * lista para descobrir. Mesmo princípio que corrigiu o backlog dos Megas:
 * preferir a base bruta à digitação.
 *
 * SOBRE OS NOMES DAS HELPERS
 * _histNorm_, _histParseDataHora_, _histAbertoNoMes_ e _bdChamadoFechado_
 * repetem os nomes de megas-mensal/02_Dados.gs DE PROPÓSITO. São projetos
 * Apps Script separados (não colidem em execução), e manter o mesmo nome faz
 * com que copiar uma função de lá para cá funcione sem reescrever as
 * chamadas internas. Ver o CLAUDE.md da raiz.
 */

// Nomes EXATOS das abas na planilha BASE DE DADOS — QUADRO REM. Repare no
// espaço em volta do hífen em "BD - PREVENTIVAS": as abas não seguem um
// padrão único, então _propAba_ compara ignorando espaços e pontuação.
const BD_ABA_CORRETIVAS  = 'BD-CORRETIVAS';
const BD_ABA_PREVENTIVAS = 'BD - PREVENTIVAS';

// VERIFICADO contra a planilha de controle do time (aba de fórmulas, blocos
// FACILITIES por Mega): as CANCELADAS ENTRAM na conta. Confronto de 12 casos
// — Curitiba, Itajaí e Esteio, janeiro a abril/2026 — bateu 12/12 sem filtro
// de Estado, e errou em 5 deles ao excluir canceladas:
//
//     Curitiba jan   oficial 197/28   tudo 197/28 ✓   sem canceladas 197/15 ✗
//     Esteio   jan   oficial 197/5    tudo 197/5  ✓   sem canceladas 197/2  ✗
//
// Não é detalhe: são 1.242 canceladas com SLA classificado na base (1.002
// delas "Não cumprido"), ~20% de toda a não-conformidade. Deixar em true
// afastaria o indicador do número oficial.
const SLA_EXCLUIR_CANCELADAS = false;

// JANELA DO MÊS — também verificada nos mesmos 12 casos.
// Vale a DATA DE AGENDAMENTO, não a de fechamento: a preventiva pertence ao
// mês em que estava programada. Pela data de fechamento os números não batem
// (Curitiba jun daria 94,88% em vez do valor da planilha).
// A fórmula da planilha confirma a janela: de "1/1/2026 00:00:00" até
// "31/1/2026 23:59:59", sobre a coluna de agendamento.
const SLA_JANELA_PADRAO = 'inicio';


function _histNorm_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim();
}

// As bases trazem data em ISO "AAAA-MM-DD HH:MM:SS" ou objetos Date nativos do Sheets.
function _histParseDataHora_(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const txt = String(v).trim();
  if (!txt) return null;
  const m = txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
}

// Mesma regra dos Megas: fechado é Estado "Fechado" E com data de fechamento.
// Foi ela que descasou estoque e fluxo lá — um registro com data mas outro
// estado contava como fechado e nunca saía do backlog.
// CORRETIVAS diz "Fechado", PREVENTIVAS diz "Fechada". Testar só uma das
// formas faria a base inteira de preventivas parecer aberta.
function _bdChamadoFechado_(estado, dtFechado) {
  const n = _histNorm_(estado);
  return (n === 'fechado' || n === 'fechada') && !!dtFechado;
}

// Aberto no fim do mês de referência (refFim é o 1º dia do mês seguinte,
// exclusivo). Aberto E fechado dentro do próprio mês não é backlog do mês.
function _histAbertoNoMes_(estado, dtReporte, dtFechado, refIni, refFim) {
  const n = _histNorm_(estado);
  const fechado = (n === 'fechado' || n === 'fechada');
  if (dtReporte) {
    if (dtReporte >= refFim) return false;
    if (fechado && dtFechado && dtFechado < refFim) return false;
    return true;
  }
  return !fechado;
}

// Megas x demais imóveis — o corte que a apresentação usa para separar
// "desempenho nos Megas" de "desempenho nos demais".
function _propEhMega_(cc) {
  return _histNorm_(cc).indexOf('mega') === 0;
}


// ==========================================
// LEITURA GENÉRICA DAS BASES
// ==========================================
// Um leitor só para BD-CORRETIVAS e BD-PREVENTIVAS: as duas moram na mesma
// planilha e compartilham as colunas que interessam aqui (Centro de Custos,
// Estado, SLA e datas). O mapeamento é por CONTEÚDO do cabeçalho, não por
// posição — coluna que muda de lugar não quebra a leitura, e coluna que muda
// de nome aparece em inspecionarBase().
// Número da planilha, ou null quando a célula está vazia / não é número.
// Devolver 0 para célula vazia somaria zeros na média e puxaria o tempo médio
// para baixo sem ninguém ver — "não medido" não é "demorou zero".
function _propNumeroOuNull_(v) {
  const txt = String(v == null ? '' : v).trim();
  if (!txt) return null;
  // Vem como texto de planilha: pode ter separador de milhar pt-BR.
  const n = Number(txt.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// ==========================================
// NORMALIZADORES E CLASSIFICADORES DE CHAMADO
// ==========================================
// Ficam AQUI, na camada de dados, e não no arquivo do slide que os usa:
// _propLerBase_ chama _idChamadoNormaliza_, e uma camada de dados que depende
// de um arquivo de desenho não dá para testar sem carregar o desenho junto.
// No Apps Script funcionaria (namespace único), mas o teste pegou.

function _ehCondominio_(cliente) {
  return _histNorm_(cliente).indexOf('condomini') >= 0;
}

// "Responsabilidade Locatario" aparece como um item A MAIS dentro da própria
// lista de Responsáveis. Quando está lá, o chamado é do locatário, não da
// operação — e não entra nesta lista, que é de pendências DA equipe Property.
function _chamadoResponsabilidadeLocatario_(responsaveisTxt) {
  return _histNorm_(responsaveisTxt).indexOf('responsabilidade locatario') >= 0;
}

// O Id vem da planilha às vezes como número formatado ("11.607.652") e às
// vezes como texto. Normaliza para dígitos, senão o mesmo chamado aparece
// escrito de dois jeitos entre slides.
function _idChamadoNormaliza_(v) {
  const txt = String(v || '').trim();
  if (!txt) return '';
  const n = parseFloat(txt.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? txt.replace(/\D/g, '') : String(Math.round(n));
}

function _histEmpChave_(s) {
  return String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim();
}

const _propBaseCache = {};

// Compara ignorando espaços e pontuação: "BD - PREVENTIVAS",
// "BD-PREVENTIVAS" e "BD PREVENTIVAS" viram todos "bdpreventivas".
function _propChaveAba_(s) {
  return _histNorm_(s).replace(/[^a-z0-9]/g, '');
}

function _propAba_(ss, nome) {
  const alvo = _propChaveAba_(nome);
  return ss.getSheetByName(nome) ||
         ss.getSheets().find(s => _propChaveAba_(s.getName()) === alvo) ||
         ss.getSheets().find(s => _propChaveAba_(s.getName()).indexOf(alvo) >= 0) ||
         null;
}

// A coluna Descrição vem com um prefixo de metadado de checklist na frente
// do texto livre — ex.: "PMP.904036.68674893 CHECKLIST - FACILITIES |
// Bombas de Drenagem | Posto SIM: C02. Em funcionamento os instrumentos do
// painel: Não Conforme - Bomba não está no local". O prefixo (ID do
// formulário + "CHECKLIST - <equipe>" + categorias separadas por "|",
// terminando em "<local>: <código>.") não interessa pra quem lê o slide —
// só a descrição real do problema, que vem depois. Remove só quando a
// descrição REALMENTE começa com esse padrão; texto livre sem prefixo
// (ex.: "Água voltando pelos tubos das bombas inundando o piso.") fica
// intacto. Cópia deste mesmo comportamento em megas-mensal/02_Dados.gs —
// pedido do usuário pra valer nos dois projetos.
function _limparDescricaoChecklist_(desc) {
  if (!desc) return desc;
  let limpo = desc;

  // 1) Prefixo do formulário: "<ID> CHECKLIST - <equipe> | ... : <código>."
  const reMeta = /^\S+\s+CHECKLIST\s*-\s*\S+(?:\s*\|[^|]*)+?:\s*\S+?\.\s*/i;
  limpo = limpo.replace(reMeta, '');

  // 2) Rótulo do item avaliado + resultado do checklist: "<campo
  // avaliado>: [Não] Conforme -" — ex.: "Estado de conservação e aspecto
  // geral da carcaça: Não Conforme -", "Em funcionamento os instrumentos
  // do painel: Não Conforme -". Só age quando o texto REALMENTE começa
  // com "<até 80 caracteres>: [Não] Conforme" — descrição livre sem
  // esse padrão (ex.: "Água voltando pelos tubos das bombas inundando o
  // piso.") não tem colon logo no início e fica intacta.
  const reCampo = /^[^:\n]{1,80}:\s*(?:Não\s+)?Conforme\b[\s\-–]*/i;
  limpo = limpo.replace(reCampo, '');

  limpo = limpo.trim();
  return limpo || desc;
}

function _propLerBase_(nomeAba) {
  if (_propBaseCache[nomeAba]) return _propBaseCache[nomeAba];
  try {
    const ss = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    const sheet = _propAba_(ss, nomeAba);
    if (!sheet) {
      Logger.log(nomeAba + ': aba não encontrada na planilha. Abas disponíveis: ' +
                 ss.getSheets().map(s => s.getName()).join(', '));
      return [];
    }

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) return [];

    const hdr = data[0].map(_histNorm_);
    const col = (...trechos) => {
      for (let i = 0; i < trechos.length; i++) {
        const c = hdr.findIndex(h => h.indexOf(trechos[i]) >= 0);
        if (c >= 0) return c;
      }
      return -1;
    };
    const cId     = col('id chamado', 'id agendamento');
    const cCC     = col('centro de custo');
    const cEstado = col('estado');
    const cSla    = col('sla');
    const cCli    = col('cliente');
    // "Fechado por" define a equipe nas PREVENTIVAS (ver _propEquipePreventiva_).
    const cQuem   = col('fechado por');
    // "Responsáveis" define a equipe nas CORRETIVAS (ver _propEquipeCorretiva_)
    // — lista separada por vírgula, diferente de "Fechado por" que é um nome só.
    const cResp   = col('responsaveis', 'responsável');
    // Nome do serviço/atividade — usada na relação de preventivas fora do
    // SLA (Slide_Preventivas.gs). Mesma coluna que megas-mensal/02_Dados.gs
    // já lê da mesma base.
    const cDesc   = col('descricao', 'descrição');
    // Prioridade do chamado (Emergencial/Alta/Normal/Baixa) — usada no
    // gráfico de Backlog Emergencial (Slide_Corretivas.gs). A aba tem duas
    // colunas "Prioridade" (uma de texto, outra numérica); col() pega a
    // primeira ocorrência, que é a de texto — mesmo comportamento de
    // megas-mensal/02_Dados.gs na mesma base.
    const cPri    = col('prioridade');
    // Só existe em BD-CORRETIVAS (BD-PREVENTIVAS não tem essa coluna) — o
    // motivo de um chamado ABERTO estar pausado (ex.: "Orçamento 2026",
    // "Alinhamento Operação", "Pendências de Obra"). Confirmado com
    // diagnosticarMotivoPausa: quando preenchido, É o motivo de verdade;
    // quando vazio, o chamado está "Em resolução" (sem pausa formal). Usada
    // por obterBacklogPorMotivo_ (Slide_ChamadosPendentes.gs).
    const cMotivo = col('motivo de pausa', 'motivo da pausa');
    // As duas bases nomeiam as datas de formas diferentes — a primeira
    // coluna que existir vence:
    //   CORRETIVAS:  "Data de reporte"    / "Fechado em"
    //   PREVENTIVAS: "Data agendamento"   / "Fechada em"
    const cIni = col('data de reporte', 'data agendamento', 'data de agendamento');
    const cFim = col('fechado em', 'fechada em');
    // APROVAÇÃO — só existe em BD-CORRETIVAS. Duas colunas, com papéis
    // diferentes:
    //   P  "Aprovado em"                  → QUANDO aprovou (define o mês)
    //   AG "Tempo para aprovar (segundos)" → QUANTO demorou (o valor medido)
    //
    // A espera sai da coluna AG, não de (P − B). A base já calcula esse
    // número, e recalcular por subtração assumiria que a espera é corrida —
    // se AG considerar horário útil ou calendário de SLA, a subtração daria
    // outro resultado e ninguém saberia qual está certo. AG é a fonte; a
    // subtração fica só de reserva, para a linha que tiver P e não tiver AG.
    const cAprov  = col('aprovado em', 'aprovada em', 'data de aprovacao', 'data de aprovação');
    const cTaprov = col('tempo para aprovar (segundos)', 'tempo para aprovar');

    if (cCC < 0) {
      Logger.log(nomeAba + ': sem coluna "Centro de Custos" — rode inspecionarBase("' +
                 nomeAba + '") para ver o cabeçalho real.');
      return [];
    }

    const saida = [];
    for (let r = 1; r < data.length; r++) {
      const cc = String(data[r][cCC] || '').trim();
      if (!cc) continue;
      saida.push({
        id       : cId     >= 0 ? _idChamadoNormaliza_(data[r][cId]) : '',
        cc       : cc,
        estado   : cEstado >= 0 ? String(data[r][cEstado] || '').trim() : '',
        sla      : cSla    >= 0 ? String(data[r][cSla]    || '').trim() : '',
        cliente  : cCli    >= 0 ? String(data[r][cCli]    || '').trim() : '',
        fechadoPor: cQuem  >= 0 ? String(data[r][cQuem]   || '').trim() : '',
        responsaveis: cResp >= 0 ? String(data[r][cResp]  || '').trim() : '',
        descricao: cDesc   >= 0 ? _limparDescricaoChecklist_(String(data[r][cDesc] || '').trim()) : '',
        prioridade: _normalizarPrioridade_(cPri >= 0 ? data[r][cPri] : ''),
        motivoPausa: cMotivo >= 0 ? String(data[r][cMotivo] || '').trim() : '',
        cancelado: _histNorm_(cEstado >= 0 ? data[r][cEstado] : '') === 'cancelada',
        dtReporte: cIni    >= 0 ? _histParseDataHora_(data[r][cIni]) : null,
        dtFechado: cFim    >= 0 ? _histParseDataHora_(data[r][cFim]) : null,
        dtAprovado: cAprov >= 0 ? _histParseDataHora_(data[r][cAprov]) : null,
        tempoAprovarSeg: cTaprov >= 0 ? _propNumeroOuNull_(data[r][cTaprov]) : null
      });
    }
    // Diz de que coluna saiu a aprovação. Sem isso, uma coluna renomeada
    // faria "Tempo médio de aprovação" sumir do slide sem ninguém saber por quê.
    if (nomeAba === BD_ABA_CORRETIVAS) {
      if (cAprov < 0 && cTaprov < 0) {
        Logger.log('BD-CORRETIVAS: nenhuma coluna de aprovação reconhecida. ' +
                   'Cabeçalho real: ' + data[0].filter(String).join(' | '));
      } else {
        Logger.log('BD-CORRETIVAS: ' + saida.length + ' linha(s) carregada(s).');
      }
    }

    // Só cacheia resultado bom: leitura vazia por falha transitória não pode
    // ficar grudada na rodada inteira.
    if (saida.length) _propBaseCache[nomeAba] = saida;
    return saida;
  } catch (e) {
    Logger.log('_propLerBase_(' + nomeAba + '): ' + e.message);
    return [];
  }
}

function _propLerCorretivas_()  { return _propLerBase_(BD_ABA_CORRETIVAS); }
function _propLerPreventivas_() { return _propLerBase_(BD_ABA_PREVENTIVAS); }


// ==========================================
// SLA — CUMPRIDO x NÃO CUMPRIDO
// ==========================================
// Regra do time: soma as marcadas como SLA CUMPRIDO, soma as NÃO CUMPRIDO, e
// divide uma pela soma das duas. O denominador NÃO é o total de preventivas
// — é só quem tem SLA definido. As "Sem SLA" ficam inteiramente de fora, em
// cima e embaixo da fração:
//
//     SLA % = cumpridos / (cumpridos + não cumpridos) × 100
//
// É diferente da taxa de execução (realizadas ÷ previstas), que mede se o
// serviço aconteceu. Esta mede se aconteceu DENTRO DO PRAZO, entre os que
// tinham prazo.

// ARMADILHA: "Não cumprido" CONTÉM a palavra "cumprido". Testar 'cumprido'
// primeiro classificaria todo "Não cumprido" como cumprido e inflaria o
// indicador em silêncio — o erro que ninguém percebe olhando o slide. A
// negativa é testada ANTES, e por isso a ordem destes ifs não pode mudar.
function _slaClasse_(valor) {
  const n = _histNorm_(valor);           // já sem acento: "não" vira "nao"
  if (!n) return 'SEM';
  if (n === 'nao cumprido' || n === 'sla nao cumprido') return 'NAO';
  if (n === 'cumprido'     || n === 'sla cumprido')     return 'CUMPRIDO';
  if (n === 'sem sla')                                  return 'SEM';
  // Correspondência EXATA, não "contém". Com indexOf('cumprido'), um valor
  // como "Parcialmente cumprido" cairia em CUMPRIDO e inflaria o indicador
  // — o mesmo tipo de erro silencioso do "Não cumprido" acima, só que sem
  // nem aparecer no vocabulário conhecido. Valor novo vira DESCONHECIDO,
  // é contado à parte e reportado por conferirSLA().
  return 'DESCONHECIDO';
}

// Recebe qualquer lista com um campo `sla` e devolve a conta pronta. Genérica
// de propósito: serve para preventivas e corretivas sem duplicar a regra.
function calcularSLA_(itens) {
  const r = { cumpridos: 0, naoCumpridos: 0, semSla: 0, desconhecidos: [], base: 0, pct: null,
              canceladasFora: 0 };
  itens.forEach(it => {
    if (SLA_EXCLUIR_CANCELADAS && it.cancelado) { r.canceladasFora++; return; }
    switch (_slaClasse_(it.sla)) {
      case 'CUMPRIDO': r.cumpridos++; break;
      case 'NAO':      r.naoCumpridos++; break;
      case 'SEM':      r.semSla++; break;
      default:         r.desconhecidos.push(String(it.sla || '').trim());
    }
  });
  r.base = r.cumpridos + r.naoCumpridos;
  // Sem base não há SLA a informar. Devolver 0% diria "nenhuma cumprida",
  // que é uma afirmação diferente de "nenhuma tinha prazo".
  r.pct = r.base ? (r.cumpridos / r.base) * 100 : null;
  return r;
}

// SLA por imóvel no mês, a partir de uma das bases.
//
// `janela` decide QUAIS registros entram: 'inicio' (data de agendamento no
// mês — o padrão, verificado contra a planilha) ou 'fim' (data de
// fechamento). conferirSLA() mostra as duas para conferência.
function slaPorImovel_(nomeAba, ano, mesIndex, janela) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));
  const campo  = (janela || SLA_JANELA_PADRAO) === 'fim' ? 'dtFechado' : 'dtReporte';

  const porCC = {};
  _propLerBase_(nomeAba).forEach(it => {
    const d = it[campo];
    if (!d || d < refIni || d >= refFim) return;
    (porCC[it.cc] = porCC[it.cc] || []).push(it);
  });

  return Object.keys(porCC).map(cc => {
    const r = calcularSLA_(porCC[cc]);
    r.cc = cc;
    r.mega = _propEhMega_(cc);
    return r;
  }).sort((a, b) => b.base - a.base);
}

// SLA consolidado do portfólio, com o corte Megas x demais — que é o recorte
// da apresentação.
function slaPortfolio_(nomeAba, ano, mesIndex, janela) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));
  const campo  = (janela || SLA_JANELA_PADRAO) === 'fim' ? 'dtFechado' : 'dtReporte';

  const noMes = _propLerBase_(nomeAba).filter(it => {
    const d = it[campo];
    return d && d >= refIni && d < refFim;
  });

  return {
    total : calcularSLA_(noMes),
    megas : calcularSLA_(noMes.filter(it => _propEhMega_(it.cc))),
    demais: calcularSLA_(noMes.filter(it => !_propEhMega_(it.cc)))
  };
}


// ==========================================
// PORTFÓLIO
// ==========================================
function listarPortfolioBD_(nomeAba) {
  const itens = _propLerBase_(nomeAba || BD_ABA_CORRETIVAS);
  if (!itens.length) return [];

  const porCC = {};
  itens.forEach(it => {
    if (!porCC[it.cc]) porCC[it.cc] = { cc: it.cc, total: 0, abertos: 0, primeiro: null, ultimo: null, semData: 0 };
    const g = porCC[it.cc];
    g.total++;
    if (!_bdChamadoFechado_(it.estado, it.dtFechado)) g.abertos++;
    if (it.dtReporte) {
      if (!g.primeiro || it.dtReporte < g.primeiro) g.primeiro = it.dtReporte;
      if (!g.ultimo   || it.dtReporte > g.ultimo)   g.ultimo   = it.dtReporte;
    } else {
      g.semData++;
    }
  });
  return Object.keys(porCC).map(k => porCC[k]).sort((a, b) => b.total - a.total);
}

function backlogPorCC_(cc, ano, mesIndex) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));
  return _propLerCorretivas_()
    .filter(it => it.cc === cc)
    .filter(it => _histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim))
    .length;
}


// ==========================================
// DIAGNÓSTICOS
// ==========================================

// Mostra o cabeçalho real de uma aba e uma linha de exemplo. Use quando a
// leitura reclamar de coluna ausente — o mapeamento é por conteúdo do
// cabeçalho, então é aqui que se vê o nome de verdade.
function inspecionarBase(nomeAba) {
  const aba = nomeAba || BD_ABA_PREVENTIVAS;
  Logger.log('======================================================');
  Logger.log('CABEÇALHO DE ' + aba);
  Logger.log('======================================================');
  try {
    const ss = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    Logger.log('Planilha: "' + ss.getName() + '"');
    Logger.log('Abas: ' + ss.getSheets().map(s => s.getName()).join(', '));

    const sheet = _propAba_(ss, aba);
    if (!sheet) { Logger.log('\n⚠ Aba "' + aba + '" não encontrada.'); return; }

    const data = sheet.getDataRange().getDisplayValues();
    Logger.log('\n' + sheet.getName() + ': ' + (data.length - 1) + ' linhas.');
    if (data.length < 2) return;
    data[0].forEach((h, i) => {
      const ex = String(data[1][i] || '').substring(0, 40);
      if (h || ex) Logger.log('  [' + String(i).padStart(2) + '] ' + String(h).padEnd(32) + ' ex.: ' + ex);
    });
  } catch (e) {
    Logger.log('Erro: ' + e.message);
  }
}

// Procura coluna de "motivo da pausa" (ou parecido) na BD-CORRETIVAS, pra
// avaliar se dá pra montar um slide de "Chamados Pendentes por Motivo",
// equivalente honesto ao "Chamados Pendentes (Backlog) por Estado" dos
// Megas (que lá vem de aba digitada à mão, sem fonte bruta — não existe
// pro portfólio de Propriedades). Mostra TODAS as colunas do cabeçalho e,
// pra qualquer uma cujo nome pareça ser de status/motivo/pausa, o
// vocabulário completo (valor + quantas linhas têm esse valor) — mesmo
// espírito de conferirSLA(): responder "que coluna é essa e o que tem
// dentro" sem abrir a planilha.
function diagnosticarMotivoPausa(nomeAba) {
  const aba = nomeAba || BD_ABA_CORRETIVAS;
  Logger.log('======================================================');
  Logger.log('DIAGNÓSTICO — MOTIVO DA PAUSA — ' + aba);
  Logger.log('======================================================');
  try {
    const ss    = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    const sheet = _propAba_(ss, aba);
    if (!sheet) { Logger.log('⚠ Aba "' + aba + '" não encontrada.'); return; }

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) { Logger.log('Aba vazia.'); return; }

    const hdrOriginal = data[0];
    const hdrNorm      = hdrOriginal.map(_histNorm_);

    Logger.log('\nTodas as colunas (' + hdrOriginal.length + '):');
    hdrOriginal.forEach((h, i) => {
      if (String(h).trim()) Logger.log('  [' + String(i).padStart(2) + '] ' + h);
    });

    // Candidatas: qualquer cabeçalho que contenha uma dessas palavras.
    const CHAVES = ['motivo', 'pausa', 'status', 'situacao', 'fase', 'etapa', 'estagio'];
    const candidatas = [];
    hdrNorm.forEach((h, i) => {
      if (CHAVES.some(k => h.indexOf(k) >= 0)) candidatas.push(i);
    });

    if (!candidatas.length) {
      Logger.log('\n⚠ Nenhuma coluna com nome parecido com motivo/pausa/status/situação/fase/etapa.');
      Logger.log('Se a coluna existir com outro nome, veja a lista completa acima e me diga qual é.');
      return;
    }

    candidatas.forEach(ci => {
      Logger.log('\n--- Coluna [' + ci + '] "' + hdrOriginal[ci] + '" ---');
      const vocab = {};
      for (let r = 1; r < data.length; r++) {
        const v = String(data[r][ci] || '').trim() || '(vazio)';
        vocab[v] = (vocab[v] || 0) + 1;
      }
      Object.keys(vocab).sort((a, b) => vocab[b] - vocab[a]).forEach(v => {
        Logger.log('  ' + String(vocab[v]).padStart(6) + '  ' + v);
      });
    });
  } catch (e) {
    Logger.log('Erro: ' + e.message);
  }
}

// Confere a lógica que o usuário descreveu pro backlog "por motivo": não
// existe coluna "Motivo" separada — inspecionarBase mostrou "Pausado por"
// [8], "Pausado em" [9] e "Estado" [28]. A hipótese é: pra um chamado
// ABERTO (Estado ≠ Fechada/Cancelada), se "Pausado por"/"Pausado em"
// estiver preenchido, o valor de ESTADO nesse momento já É o motivo da
// pausa (ex.: "Aguardando Aprovação Superior"); se não tiver pausa
// registrada, é "Em resolução" — não importa o que Estado diga.
//
// Mostra, separadamente, o vocabulário de Estado dos abertos COM pausa e
// dos abertos SEM pausa — se a hipótese estiver certa, o primeiro grupo
// tem vários valores diferentes e ricos (os "motivos"), e o segundo tem
// um valor só (ou poucos, genéricos) repetido em todas as linhas.
function diagnosticarEstadosPausa(nomeAba) {
  const aba = nomeAba || BD_ABA_CORRETIVAS;
  Logger.log('======================================================');
  Logger.log('DIAGNÓSTICO — ESTADO x PAUSA — ' + aba);
  Logger.log('======================================================');
  try {
    const ss    = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    const sheet = _propAba_(ss, aba);
    if (!sheet) { Logger.log('⚠ Aba "' + aba + '" não encontrada.'); return; }

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) { Logger.log('Aba vazia.'); return; }

    const hdr = data[0].map(_histNorm_);
    const col = nome => hdr.findIndex(h => h.indexOf(nome) >= 0);
    const cEstado     = col('estado');
    const cPausadoPor = col('pausado por');
    const cPausadoEm  = col('pausado em');
    if (cEstado < 0) { Logger.log('⚠ Coluna Estado não encontrada.'); return; }

    Logger.log('Colunas: Estado=[' + cEstado + ']  Pausado por=[' + cPausadoPor +
               ']  Pausado em=[' + cPausadoEm + ']');

    let abertos = 0, pausados = 0, semPausa = 0;
    const vocabPausado  = {};
    const vocabSemPausa = {};

    for (let r = 1; r < data.length; r++) {
      const estado = String(data[r][cEstado] || '').trim();
      const n = _histNorm_(estado);
      if (n === 'fechada' || n === 'fechado' || n === 'cancelada') continue;
      abertos++;

      const temPausa = (cPausadoPor >= 0 && String(data[r][cPausadoPor] || '').trim()) ||
                        (cPausadoEm  >= 0 && String(data[r][cPausadoEm]  || '').trim());

      if (temPausa) {
        pausados++;
        vocabPausado[estado] = (vocabPausado[estado] || 0) + 1;
      } else {
        semPausa++;
        vocabSemPausa[estado] = (vocabSemPausa[estado] || 0) + 1;
      }
    }

    Logger.log('\nTotal de linhas: ' + (data.length - 1));
    Logger.log('Abertos (Estado ≠ Fechada/Cancelada): ' + abertos);
    Logger.log('  · com Pausado por/em preenchido: ' + pausados);
    Logger.log('  · sem pausa registrada: ' + semPausa);

    const imprimeVocab = (titulo, vocab) => {
      Logger.log('\n--- ' + titulo + ' ---');
      const chaves = Object.keys(vocab);
      if (!chaves.length) { Logger.log('  (nenhum registro)'); return; }
      chaves.sort((a, b) => vocab[b] - vocab[a]).forEach(v => {
        Logger.log('  ' + String(vocab[v]).padStart(6) + '  ' + (v || '(vazio)'));
      });
    };
    imprimeVocab('ESTADO dos ABERTOS **COM** pausa (candidatos a "motivo")', vocabPausado);
    imprimeVocab('ESTADO dos ABERTOS **SEM** pausa (deveria virar "Em resolução")', vocabSemPausa);
  } catch (e) {
    Logger.log('Erro: ' + e.message);
  }
}

// Lista o portfólio conhecido pela base, separando Megas dos demais.
//
// É ferramenta de CONFERÊNCIA, não de cadastro: não existe lista de imóveis
// digitada em 01_Config.gs para preencher. O que importa aqui é ver se o
// corte Megas x demais (_propEhMega_) está classificando todo mundo no lado
// certo — um imóvel novo com centro de custos fora do padrão apareceria em
// "DEMAIS" sem avisar ninguém.
function descobrirPortfolio() {
  [BD_ABA_CORRETIVAS, BD_ABA_PREVENTIVAS].forEach(aba => {
    Logger.log('======================================================');
    Logger.log('PORTFÓLIO EM ' + aba);
    Logger.log('======================================================');

    const lista = listarPortfolioBD_(aba);
    if (!lista.length) { Logger.log('Nenhuma linha lida.\n'); return; }

    const fmt = d => d ? (String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear()) : '—';
    const bloco = (titulo, itens) => {
      if (!itens.length) return;
      Logger.log('\n' + titulo + ' (' + itens.length + ')');
      Logger.log('  ' + 'CENTRO DE CUSTOS'.padEnd(30) + 'REGISTROS'.padStart(10) +
                 'ABERTOS'.padStart(9) + '   PERÍODO');
      itens.forEach(g => {
        Logger.log('  ' + g.cc.padEnd(30) + String(g.total).padStart(10) +
                   String(g.abertos).padStart(9) + '   ' + fmt(g.primeiro) + ' a ' + fmt(g.ultimo) +
                   (g.semData ? '   (' + g.semData + ' sem data)' : ''));
      });
    };

    const megas  = lista.filter(g => _propEhMega_(g.cc));
    const demais = lista.filter(g => !_propEhMega_(g.cc));
    bloco('MEGAS', megas);
    bloco('DEMAIS IMÓVEIS', demais);

    const soma = c => c.reduce((s, g) => s + g.total, 0);
    Logger.log('\nTotal: ' + lista.length + ' imóveis, ' + soma(lista) + ' registros' +
               ' (Megas ' + megas.length + '/' + soma(megas) +
               ' · demais ' + demais.length + '/' + soma(demais) + ').\n');
  });
  Logger.log('Confira se todo imóvel caiu do lado certo do corte. Se um Mega ' +
             'aparecer em DEMAIS, o padrão do centro de custos mudou — ' +
             'ajuste _propEhMega_ (02_Dados.gs), não uma lista à mão.');
}

// Confere a regra de SLA contra a base real. Roda nas duas janelas porque só
// quem conhece o relatório sabe qual delas reproduz o número oficial.
function conferirSLA(ano, mes, nomeAba) {
  const aba  = nomeAba || BD_ABA_PREVENTIVAS;
  const hoje = new Date();
  const ref  = (ano && mes) ? { ano: ano, index: mes - 1 }
                            : { ano: hoje.getUTCFullYear(), index: hoje.getUTCMonth() - 1 };
  if (ref.index < 0) { ref.index = 11; ref.ano--; }

  Logger.log('======================================================');
  Logger.log('SLA — ' + aba + ' — ' + String(ref.index + 1).padStart(2, '0') + '/' + ref.ano);
  Logger.log('======================================================');
  Logger.log('Regra: cumpridos ÷ (cumpridos + não cumpridos). "Sem SLA" fica fora.');

  const todos = _propLerBase_(aba);
  if (!todos.length) {
    Logger.log('\nBase vazia. Rode inspecionarBase("' + aba + '") para ver o cabeçalho.');
    return;
  }

  // Vocabulário real da coluna: a classificação depende das strings exatas, e
  // um valor novo na planilha tem que aparecer aqui, não sumir na conta.
  const vocab = {};
  todos.forEach(it => {
    const v = String(it.sla || '(vazio)').trim();
    vocab[v] = (vocab[v] || 0) + 1;
  });
  Logger.log('\nValores da coluna SLA na base inteira (' + todos.length + ' registros):');
  Object.keys(vocab).sort((a, b) => vocab[b] - vocab[a]).forEach(v => {
    Logger.log('  ' + _slaClasse_(v === '(vazio)' ? '' : v).padEnd(13) + v + ': ' + vocab[v]);
  });

  const semData = todos.filter(it => !it.dtReporte && !it.dtFechado).length;
  if (semData) Logger.log('\n⚠ ' + semData + ' registro(s) sem nenhuma data legível.');

  [['inicio', 'data prevista/reporte no mês'],
   ['fim',    'data de execução/fechamento no mês']].forEach(([janela, rotulo]) => {
    const lista = slaPorImovel_(aba, ref.ano, ref.index, janela);
    const cons  = slaPortfolio_(aba, ref.ano, ref.index, janela);

    Logger.log('\n--- Janela: ' + rotulo + ' ---');
    if (!lista.length) { Logger.log('  nenhum registro nesta janela.'); return; }
    Logger.log('  ' + 'IMÓVEL'.padEnd(26) + 'CUMPR'.padStart(7) + 'N/CUMPR'.padStart(9) +
               'SEM SLA'.padStart(9) + 'SLA'.padStart(9));
    const linha = (rot, r) => Logger.log('  ' + rot.padEnd(26) + String(r.cumpridos).padStart(7) +
      String(r.naoCumpridos).padStart(9) + String(r.semSla).padStart(9) +
      (r.pct === null ? '—' : r.pct.toFixed(2) + '%').padStart(9));
    lista.forEach(g => linha(g.cc, g));
    Logger.log('  ' + '-'.repeat(60));
    linha('MEGAS', cons.megas);
    linha('DEMAIS IMÓVEIS', cons.demais);
    linha('PORTFÓLIO', cons.total);
    if (cons.total.desconhecidos.length) {
      Logger.log('  ⚠ valores não reconhecidos na coluna SLA: ' +
                 Array.from(new Set(cons.total.desconhecidos)).join(', '));
    }
  });

  Logger.log('\nA janela oficial é "data de agendamento" (SLA_JANELA_PADRAO), ' +
             'verificada contra a planilha de controle em 12 casos.');
}


// ==========================================
// EXECUÇÃO — REALIZADAS x PREVISTAS
// ==========================================
// Regra do time:
//   PREVISTAS  = registros com data de AGENDAMENTO no mês (mesma janela do SLA)
//   REALIZADAS = dessas, as que estão com Estado "Fechada"
//
//     Execução % = realizadas ÷ previstas × 100
//
// NÃO confundir com o SLA. São perguntas diferentes e denominadores
// diferentes de propósito:
//
//   Execução  o serviço ACONTECEU?      denominador = tudo que foi agendado
//   SLA       aconteceu NO PRAZO?       denominador = só quem tinha prazo
//
// A diferença é real na base: Curitiba/jan tem 225 previstas e 225 com SLA
// classificado (197+28), mas Esteio/jan tem 246 previstas e só 202 com SLA
// (197+5) — 44 entram na execução e ficam fora do SLA. Usar um denominador
// no lugar do outro muda os dois indicadores.
function calcularExecucao_(itens) {
  const previstas = itens.length;
  let realizadas = 0, emAberto = 0;
  itens.forEach(it => {
    const n = _histNorm_(it.estado);
    if (n === 'fechada' || n === 'fechado') realizadas++;
    // Nem fechada nem cancelada: ainda pode virar realizada antes do mês
    // acabar. É o que faz o número do mês corrente ser provisório.
    else if (n !== 'cancelada') emAberto++;
  });
  return {
    previstas : previstas,
    realizadas: realizadas,
    emAberto  : emAberto,
    // Sem nada agendado não há execução a informar — 0% diria "nada foi
    // feito", que é diferente de "nada foi programado".
    pct: previstas ? (realizadas / previstas) * 100 : null
  };
}

// MÊS AINDA ABERTO
// ==========================================
// O dado chega assim: uma preventiva agendada para o mês pode ser executada
// até o último dia, e o "Sem SLA" só se resolve quando ela fecha. Enquanto o
// mês não termina, execução e SLA estão INCOMPLETOS — não porque o
// desempenho foi ruim, mas porque a conta ainda não acabou.
//
// Sem essa marca, o mês corrente apareceria com execução baixa ao lado de
// meses fechados, e a comparação seria falsa: os slides mostrariam uma queda
// que não existe.
function _mesEncerrado_(ano, mesIndex) {
  return new Date() >= new Date(Date.UTC(ano, mesIndex + 1, 1));
}

// Registros de um mês, na janela padrão. Base comum dos dois indicadores —
// assim eles não podem divergir por filtrar populações diferentes.
function preventivasDoMes_(nomeAba, ano, mesIndex, janela) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));
  const campo  = (janela || SLA_JANELA_PADRAO) === 'fim' ? 'dtFechado' : 'dtReporte';
  return _propLerBase_(nomeAba).filter(it => {
    const d = it[campo];
    return d && d >= refIni && d < refFim;
  });
}

// SLA + execução por imóvel, de uma tacada só.
function indicadoresPorImovel_(nomeAba, ano, mesIndex, janela) {
  const porCC = {};
  preventivasDoMes_(nomeAba, ano, mesIndex, janela)
    .forEach(it => { (porCC[it.cc] = porCC[it.cc] || []).push(it); });

  const parcial = !_mesEncerrado_(ano, mesIndex);
  return Object.keys(porCC).map(cc => ({
    cc      : cc,
    mega    : _propEhMega_(cc),
    parcial : parcial,
    sla     : calcularSLA_(porCC[cc]),
    execucao: calcularExecucao_(porCC[cc])
  })).sort((a, b) => b.execucao.previstas - a.execucao.previstas);
}

// Consolidado do portfólio com o corte Megas x demais — o recorte da
// apresentação.
function indicadoresPortfolio_(nomeAba, ano, mesIndex, janela) {
  const noMes  = preventivasDoMes_(nomeAba, ano, mesIndex, janela);
  const megas  = noMes.filter(it => _propEhMega_(it.cc));
  const demais = noMes.filter(it => !_propEhMega_(it.cc));
  const bloco  = l => ({ sla: calcularSLA_(l), execucao: calcularExecucao_(l) });
  return { total: bloco(noMes), megas: bloco(megas), demais: bloco(demais),
           parcial: !_mesEncerrado_(ano, mesIndex) };
}

// Acumulado do ano até o mês de referência (inclusive) — é o número que o
// e-mail chama de "No acumulado do ano".
function indicadoresAcumulado_(nomeAba, ano, mesIndexAte, janela) {
  const ini   = new Date(Date.UTC(ano, 0, 1));
  const fim   = new Date(Date.UTC(ano, mesIndexAte + 1, 1));
  const campo = (janela || SLA_JANELA_PADRAO) === 'fim' ? 'dtFechado' : 'dtReporte';
  const lista = _propLerBase_(nomeAba).filter(it => {
    const d = it[campo];
    return d && d >= ini && d < fim;
  });
  return { sla: calcularSLA_(lista), execucao: calcularExecucao_(lista),
           parcial: !_mesEncerrado_(ano, mesIndexAte) };
}

// Mesma ideia de indicadoresAcumulado_ (ano inteiro até o mês, inclusive),
// mas filtrado pra equipe PROPRIEDADES — usada pelo card "ACUMULADO" de
// Slide_Preventivas.gs, mesmo corte do resto do deck (nada de
// Facilities/Terceiros).
function obterAcumuladoPropriedades_(nomeAba, ano, mesIndexAte, janela) {
  const resolver = nomeAba === BD_ABA_CORRETIVAS
    ? (it => _propEquipeCorretiva_(it.responsaveis))
    : (it => _propEquipePreventiva_(it.fechadoPor));
  const ini   = new Date(Date.UTC(ano, 0, 1));
  const fim   = new Date(Date.UTC(ano, mesIndexAte + 1, 1));
  const campo = (janela || SLA_JANELA_PADRAO) === 'fim' ? 'dtFechado' : 'dtReporte';
  const lista = _propLerBase_(nomeAba).filter(it => {
    const d = it[campo];
    return d && d >= ini && d < fim && resolver(it) === 'PROPERTY';
  });
  return { sla: calcularSLA_(lista), execucao: calcularExecucao_(lista),
           parcial: !_mesEncerrado_(ano, mesIndexAte) };
}

// Relação de preventivas da equipe PROPRIEDADES que NÃO cumpriram o SLA no
// mês de referência, agrupadas por descrição do serviço (mesma lógica do
// slide equivalente dos Megas — megas-mensal/Slide02_Preventivas.gs — só
// que sem chips de equipe: aqui só existe uma equipe pra mostrar). Serviço
// sem descrição na base cai fora da lista (não dá pra citar "o quê" sem
// nome), mas ainda conta pro SLA normalmente — só não aparece nesta relação.
function obterPreventivasForaSla_(ano, mesIndex, janela) {
  const lista = preventivasDoMes_(BD_ABA_PREVENTIVAS, ano, mesIndex, janela)
    .filter(it => _propEquipePreventiva_(it.fechadoPor) === 'PROPERTY')
    .filter(it => _slaClasse_(it.sla) === 'NAO')
    .filter(it => it.descricao);

  const porDescricao = {};
  lista.forEach(it => {
    porDescricao[it.descricao] = (porDescricao[it.descricao] || 0) + 1;
  });

  return Object.keys(porDescricao)
    .sort((a, b) => porDescricao[b] - porDescricao[a])
    .map(nome => ({ nome: nome, qtd: porDescricao[nome] }));
}

// Painel do mês: execução e SLA lado a lado, por imóvel, com Megas x demais
// e o acumulado do ano.
function conferirPreventivas(ano, mes, nomeAba) {
  const aba  = nomeAba || BD_ABA_PREVENTIVAS;
  const hoje = new Date();
  const ref  = (ano && mes) ? { ano: ano, index: mes - 1 }
                            : { ano: hoje.getUTCFullYear(), index: hoje.getUTCMonth() - 1 };
  if (ref.index < 0) { ref.index = 11; ref.ano--; }

  Logger.log('======================================================');
  Logger.log('PREVENTIVAS — ' + String(ref.index + 1).padStart(2, '0') + '/' + ref.ano);
  Logger.log('======================================================');
  Logger.log('Previstas = agendadas no mês · Realizadas = dessas, Estado "Fechada"');
  Logger.log('SLA = cumpridos ÷ (cumpridos + não cumpridos); "Sem SLA" fora.');

  const lista = indicadoresPorImovel_(aba, ref.ano, ref.index);
  if (!lista.length) { Logger.log('\nNenhum registro no mês.'); return; }

  const pct = v => v === null ? '—' : v.toFixed(2) + '%';
  Logger.log('\n  ' + 'IMÓVEL'.padEnd(26) + 'PREV'.padStart(6) + 'REAL'.padStart(6) +
             'EXECUÇÃO'.padStart(10) + 'C/NC'.padStart(9) + 'SLA'.padStart(9));
  const linha = (rot, d) => Logger.log('  ' + rot.padEnd(26) +
    String(d.execucao.previstas).padStart(6) + String(d.execucao.realizadas).padStart(6) +
    pct(d.execucao.pct).padStart(10) +
    (d.sla.cumpridos + '/' + d.sla.naoCumpridos).padStart(9) + pct(d.sla.pct).padStart(9));

  lista.forEach(g => linha(g.cc, g));
  const cons = indicadoresPortfolio_(aba, ref.ano, ref.index);
  Logger.log('  ' + '-'.repeat(66));
  linha('MEGAS', cons.megas);
  linha('DEMAIS IMÓVEIS', cons.demais);
  linha('PORTFÓLIO', cons.total);

  const ac = indicadoresAcumulado_(aba, ref.ano, ref.index);
  Logger.log('\n  ' + '-'.repeat(66));
  linha('ACUMULADO ' + ref.ano, ac);

  const semSla   = lista.reduce((s, g) => s + g.sla.semSla, 0);
  const emAberto = lista.reduce((s, g) => s + g.execucao.emAberto, 0);

  if (cons.parcial) {
    Logger.log('\n  ⚠ MÊS AINDA ABERTO — números PROVISÓRIOS.');
    Logger.log('    ' + emAberto + ' preventiva(s) nem fechada(s) nem cancelada(s): ainda podem');
    Logger.log('    ser executadas até o fim do mês, e o "Sem SLA" delas só se resolve');
    Logger.log('    no fechamento. Não compare com meses fechados nem leve para o slide.');
  } else if (emAberto) {
    Logger.log('\n  ' + emAberto + ' preventiva(s) do mês seguem sem fechar nem cancelar.');
  }

  if (semSla) {
    Logger.log('\n  ' + semSla + ' registro(s) "Sem SLA" no mês: entram nas PREVISTAS ' +
               'e ficam fora do denominador do SLA.');
  }
  const desc = cons.total.desconhecidos;
  if (desc.length) {
    Logger.log('  ⚠ valores não reconhecidos na coluna SLA: ' +
               Array.from(new Set(desc)).join(', '));
  }
}


// ==========================================
// EQUIPE — PROPRIEDADES x FACILITIES
// ==========================================
// A lógica é quase a mesma das corretivas, com UMA diferença na coluna:
//
//   CORRETIVAS   equipe vem de "Responsáveis" (quem está atribuído)
//   PREVENTIVAS  equipe vem de "Fechado por"  (quem executou)
//
// Regra do time: "se foi fechado por propriedades é de propriedades, e foi
// fechado por facilities é de facilities".
//
// O mapa nome→equipe é uma CÓPIA de megas-mensal/02_Dados.gs
// (_RESPONSAVEL_EQUIPE_). Apps Script não tem import; ao acrescentar alguém
// lá, acrescente aqui também — é o preço de projetos separados, e está no
// CLAUDE.md da raiz.
const _PROP_EQUIPE_ = (function () {
  const bruto = {
    PROPERTY: [
      'Jonatas Augusto Ferreira', 'Matheus Ferreira Rompa', 'Luiz Guilherme Bernart',
      'Nicolly Correa Branco', 'Ivan Fuscolin Neto', 'Jéssica Garcia de Holanda',
      'Coordenação Propriedades', 'Lucas Beltrao Carneiro Santos', 'Ricardo Murilo da Silva',
      'Analista de Propriedades II', 'Fernando Cesar Iurk', 'Cleverson Boeno Moro',
      'Daniel Moreira', 'Pedro Henrique Dinalli Fidalgo', 'Wilson Francisco Leffer Junior'
    ],
    FACILITIES: [
      'Guilherme Heck', 'Henrique Augusto Lobo', 'Jessé J. Do Prado', 'Jessé Jandir do Prado',
      'José Ernesto', 'Leandro Genoveski', 'MEGA Curitiba', 'Mega Esteio', 'Mega Itajaí',
      'Rodrigo Habitzreuter', 'Paulo Augusto Maximiano', 'Paulo Maximiano', 'Dionatan Rek',
      'Mauro Sergio Silva Coelho', 'Mauro Coelho', 'Felipe Eduardo Campos',
      'Amanda de Campos Alexandre', 'Amanda de Campos'
    ],
    OPERACAO: [
      'Gerente Hangar', 'Leonardo Casagrande', 'Mariana Lucia Fernandes Rodrigues',
      'Motorista', 'Motoristas', 'Anderson Matheus Da Cunha', 'Ariel Glisczeski Barbosa',
      "Sergio Sivonei Sant'ana"
    ]
  };
  const mapa = {};
  Object.keys(bruto).forEach(eq => bruto[eq].forEach(n => { mapa[_histNorm_(n)] = eq; }));
  return mapa;
})();

// "Ronda e Portaria (CTBA/ESTEIO/ITAJAÍ)" são os TERCEIROS de cada
// empreendimento — não é uma pessoa do mapa nem equipe própria da Capital
// Realty. Fecham 3.265 das 5.462 preventivas de 2026: 60% da base.
//
// Categoria própria, e não fallback para FACILITIES: jogá-las lá
// quadruplicaria o número de Facilities (de 1.719 para 4.984) e o slide
// atribuiria à equipe interna um volume que é de contratado. "CHECKLIST -
// TERCEIROS" também aparece na coluna Descrição, então a categoria já existe
// no vocabulário do time.
function _propEhTerceiro_(quemFechou) {
  const n = _histNorm_(quemFechou);
  return n.indexOf('ronda') >= 0 || n.indexOf('portaria') >= 0;
}

// Cópia de megas-mensal/02_Dados.gs (mesmo nome, mesma base BD-CORRETIVAS —
// ver CLAUDE.md sobre copiar por valor entre projetos separados).
function _normalizarPrioridade_(v) {
  const n = _histNorm_(v);
  if (n.indexOf('emergenc') >= 0) return 'Emergencial';
  if (n.indexOf('alta') >= 0)     return 'Alta';
  if (n.indexOf('normal') >= 0)   return 'Normal';
  if (n.indexOf('baixa') >= 0)    return 'Baixa';
  return '';
}

// Resolve a equipe de uma PREVENTIVA pela coluna "Fechado por".
// Diferente das corretivas, aqui é um nome só, não uma lista — quem fechou
// é quem executou.
function _propEquipePreventiva_(quemFechou) {
  const eq = _PROP_EQUIPE_[_histNorm_(quemFechou)];
  if (eq) return eq;
  if (_propEhTerceiro_(quemFechou)) return 'TERCEIROS';
  return '';   // sem quem fechou (ainda aberta) ou nome novo
}

// Resolve a equipe de uma CORRETIVA pela coluna "Responsáveis" — lista
// separada por vírgula, pode ter mais de um nome no mesmo chamado. Mesma
// regra de prioridade dos Megas (_resolverEquipeResponsaveis_ em
// megas-mensal/02_Dados.gs): PROPERTY vence se estiver na lista, senão
// FACILITIES, senão OPERACAO.
function _propEquipeCorretiva_(responsaveisTxt) {
  if (_propEhTerceiro_(responsaveisTxt)) return 'TERCEIROS';
  const equipes = String(responsaveisTxt || '').split(',')
    .map(n => _PROP_EQUIPE_[_histNorm_(n.trim())])
    .filter(Boolean);
  if (equipes.indexOf('PROPERTY') >= 0) return 'PROPERTY';
  if (equipes.indexOf('FACILITIES') >= 0) return 'FACILITIES';
  if (equipes.indexOf('OPERACAO') >= 0) return 'OPERACAO';
  return '';   // ninguém reconhecido na lista, ou lista vazia
}

// Agrupa itens JÁ FILTRADOS (mês, e opcionalmente Megas x demais) por
// equipe e calcula SLA + execução de cada grupo. Compartilhado entre
// preventivas (_propEquipePreventiva_) e corretivas (_propEquipeCorretiva_)
// — só muda a função que resolve a equipe de cada item.
function _propAgruparPorEquipe_(itens, resolverEquipeFn) {
  const porEq = {};
  itens.forEach(it => {
    const eq = resolverEquipeFn(it) || 'NÃO IDENTIFICADA';
    (porEq[eq] = porEq[eq] || []).push(it);
  });
  const saida = {};
  Object.keys(porEq).forEach(eq => {
    saida[eq] = { sla: calcularSLA_(porEq[eq]), execucao: calcularExecucao_(porEq[eq]) };
  });
  return saida;
}

// Indicadores por EQUIPE no mês — o corte "Propriedades x Facilities" que a
// apresentação pede, mais TERCEIROS (ronda e portaria de cada
// empreendimento), que é execução contratada e não da equipe interna.
// Sem corte Megas x demais — usada por conferirEquipes(); para o slide,
// ver indicadoresPorEquipeSegmento_.
function indicadoresPorEquipe_(ano, mesIndex, janela) {
  const itens = preventivasDoMes_(BD_ABA_PREVENTIVAS, ano, mesIndex, janela);
  const saida = _propAgruparPorEquipe_(itens, it => _propEquipePreventiva_(it.fechadoPor));
  saida.parcial = !_mesEncerrado_(ano, mesIndex);
  return saida;
}

// Mesma ideia de indicadoresPorEquipe_, mas com o corte Megas x demais que
// os slides de Preventivas/Corretivas precisam — genérica na base (aba +
// resolvedor de equipe) para servir às duas, sem duplicar a lógica de
// filtro por mês/mega.
function indicadoresPorEquipeSegmento_(nomeAba, resolverEquipeFn, ano, mesIndex, janela) {
  const itens  = preventivasDoMes_(nomeAba, ano, mesIndex, janela);
  const megas  = itens.filter(it => _propEhMega_(it.cc));
  const demais = itens.filter(it => !_propEhMega_(it.cc));
  return {
    megas  : _propAgruparPorEquipe_(megas, resolverEquipeFn),
    demais : _propAgruparPorEquipe_(demais, resolverEquipeFn),
    parcial: !_mesEncerrado_(ano, mesIndex)
  };
}

// Mostra a divisão por equipe com o volume de cada uma — inclusive a ronda,
// para a decisão sobre ela ser tomada com o número na frente.
function conferirEquipes(ano, mes) {
  const hoje = new Date();
  const ref  = (ano && mes) ? { ano: ano, index: mes - 1 }
                            : { ano: hoje.getUTCFullYear(), index: hoje.getUTCMonth() - 1 };
  if (ref.index < 0) { ref.index = 11; ref.ano--; }

  Logger.log('======================================================');
  Logger.log('PREVENTIVAS POR EQUIPE — ' + String(ref.index + 1).padStart(2, '0') + '/' + ref.ano);
  Logger.log('======================================================');
  Logger.log('Equipe = quem consta em "Fechado por" (regra das preventivas).');

  const d = indicadoresPorEquipe_(ref.ano, ref.index);
  const eqs = Object.keys(d).filter(k => k !== 'parcial');
  if (!eqs.length) { Logger.log('\nNenhum registro no mês.'); return; }

  const pct = v => v === null ? '—' : v.toFixed(2) + '%';
  Logger.log('\n  ' + 'EQUIPE'.padEnd(20) + 'PREV'.padStart(6) + 'REAL'.padStart(6) +
             'EXECUÇÃO'.padStart(10) + 'C/NC'.padStart(9) + 'SLA'.padStart(9));
  eqs.sort((a, b) => d[b].execucao.previstas - d[a].execucao.previstas).forEach(eq => {
    Logger.log('  ' + eq.padEnd(20) + String(d[eq].execucao.previstas).padStart(6) +
      String(d[eq].execucao.realizadas).padStart(6) + pct(d[eq].execucao.pct).padStart(10) +
      (d[eq].sla.cumpridos + '/' + d[eq].sla.naoCumpridos).padStart(9) +
      pct(d[eq].sla.pct).padStart(9));
  });

  if (d.TERCEIROS) {
    Logger.log('\n  TERCEIROS = ronda e portaria de cada empreendimento (' +
               d.TERCEIROS.execucao.previstas + ' no mês).');
    Logger.log('  Execução contratada, contada à parte da equipe interna.');
  }
  if (d['NÃO IDENTIFICADA']) {
    Logger.log('\n  ' + d['NÃO IDENTIFICADA'].execucao.previstas + ' sem equipe: ainda abertas ' +
               '(sem "Fechado por") ou nome novo — acrescente em _PROP_EQUIPE_.');
  }
  if (d.parcial) Logger.log('\n  ⚠ mês ainda aberto — números provisórios.');
}


// ==========================================
// HELPERS PARA SLIDES
// ==========================================
// Mês de referência — usa a última célula da aba DADOS ou fallback de calendário.
// Propriedades tem uma única apresentação, sem o esquema de projeto ativo dos Megas.
// Meses por extenso, SEM acento, para casar com texto normalizado.
const _MESES_SEM_ACENTO_ = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO',
                            'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

// Tira acento para comparar. A classe é escrita ESCAPADA (̀-ͯ) de
// propósito: são os acentos combinantes, e escrevê-los literais é o erro que
// o CLAUDE.md registra — some da tela e quebra a comparação em MARÇO.
function _mesNormalizar_(txt) {
  return String(txt || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Texto → índice do mês (0-11), ou -1. Aceita "AGOSTO", "Agosto/2026", "AGO".
function _mesIndiceDoTexto_(txt) {
  const t = _mesNormalizar_(txt);
  if (!t) return -1;
  let i = _MESES_SEM_ACENTO_.findIndex(m => t.indexOf(m) === 0);
  if (i < 0) i = _MESES_SEM_ACENTO_.findIndex(m => t.indexOf(m.slice(0, 3)) === 0);
  return i;
}

/**
 * O MÊS DA APRESENTAÇÃO — fonte única do deck.
 *
 * Vem de CONFIG!B1 da PLANILHA PROPRIEDADES (aba CONFIG, A1 "MÊS",
 * B1 "AGOSTO"). Foi decisão explícita do usuário: esse B1 é A referência, e
 * vale para TODOS os slides — capa, preventivas, corretivas, backlog, rodapé
 * das tabelas e o DRE/Bridge de manutenção.
 *
 * POR QUE UMA FONTE SÓ: até 03/09/2026 o mês vinha do B1 da primeira aba da
 * ANÁLISE DE PROJETOS, outra planilha. Com o DRE de manutenção lendo a
 * PLANILHA PROPRIEDADES, o deck passaria a ter duas fontes de mês — e no dia
 * em que uma fosse atualizada e a outra não, a capa diria um mês e o DRE
 * mostraria outro, sem erro nenhum na tela.
 *
 * A antiga vira RESERVA: se o CONFIG não abrir ou o B1 não tiver mês
 * reconhecível, ela assume, e o Logger diz que assumiu. Divergência entre as
 * duas é registrada — não é erro (a antiga pode só estar desatualizada), mas
 * é o tipo de coisa que se quer ver antes da reunião.
 *
 * Sem nenhuma das duas, cai no calendário: mês anterior ao de hoje.
 */
function obterMesReferencia_() {
  const hoje = new Date();
  let idx = -1, fonte = 'calendário';

  const doConfig = _mesRefDoConfig_();
  const daReserva = _mesRefDaReserva_();

  if (doConfig >= 0) {
    idx = doConfig; fonte = 'CONFIG!B1';
    if (daReserva >= 0 && daReserva !== doConfig) {
      Logger.log('Mês de referência: CONFIG!B1 diz ' + _MESES_SEM_ACENTO_[doConfig] +
                 ', a ANÁLISE DE PROJETOS diz ' + _MESES_SEM_ACENTO_[daReserva] +
                 '. Vale o CONFIG — confira se a outra ficou para trás.');
    }
  } else if (daReserva >= 0) {
    idx = daReserva; fonte = 'ANÁLISE DE PROJETOS (reserva)';
    Logger.log('Mês de referência: CONFIG!B1 não deu mês; usando a reserva.');
  }

  if (idx < 0) {
    const ant = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    idx = ant.getMonth();
    Logger.log('Mês de referência: nem CONFIG nem reserva deram mês; usando o calendário.');
  }

  const ano = idx > hoje.getMonth() ? hoje.getFullYear() - 1 : hoje.getFullYear();
  const nomesCompleto = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
                         'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const nomesCurto = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return {
    index: idx,
    nome: nomesCompleto[idx],
    curto: nomesCurto[idx],
    ano: ano,
    fonte: fonte,
    label: nomesCompleto[idx] + ' / ' + ano
  };
}

// CONFIG!B1 da PLANILHA PROPRIEDADES. Busca a aba pelo NOME, não pela
// posição: aba nova entra na frente e a primeira deixa de ser a que se pensa.
function _mesRefDoConfig_() {
  try {
    const ss  = SpreadsheetApp.openById(DRE_MANUTENCAO_ID);
    const aba = ss.getSheetByName('CONFIG');
    if (!aba) {
      Logger.log('Mês de referência: aba CONFIG não existe em "' + ss.getName() +
                 '". Abas: ' + ss.getSheets().map(x => x.getName()).join(' | '));
      return -1;
    }
    return _mesIndiceDoTexto_(aba.getRange(1, 2).getDisplayValue());
  } catch (e) {
    Logger.log('Mês de referência: CONFIG não abriu — ' + e.message);
    return -1;
  }
}

// A fonte antiga: B1 da primeira aba da ANÁLISE DE PROJETOS.
function _mesRefDaReserva_() {
  try {
    const ss = SpreadsheetApp.openById(PROPRIEDADES_SPREADSHEET_ID);
    return _mesIndiceDoTexto_(ss.getSheets()[0].getRange(1, 2).getDisplayValue());
  } catch (e) {
    return -1;
  }
}

// % de itens concluídos nos relatórios de Recebimento de Obras (Esteio +
// Curitiba + Análise de Projetos). Lê a mesma REL_RECEBIMENTO
// e o mesmo _tabLerAba_ que Slide_RecebimentoObras.gs usa para desenhar as
// tabelas — um número só de fonte, em vez de recalcular por conta própria e
// arriscar divergir do que a tabela mostra.
function obterRecebimentoObrasResumo_() {
  let total = 0, concluidos = 0, emAnalise = 0;
  try {
    ['esteio', 'ctba'].forEach(k => {
      if (typeof REL_RECEBIMENTO !== 'undefined' && REL_RECEBIMENTO[k]) {
        const rel = REL_RECEBIMENTO[k];
        const linhas = _tabLerAba_(rel.aba, rel.cabecalhoContem).rows;
        total += linhas.length;
        concluidos += linhas.filter(rel.testeConcluido).length;
      }
    });
  } catch (e) {
    Logger.log('obterRecebimentoObrasResumo_ (obras): ' + e.message);
  }

  try {
    if (typeof REL_RECEBIMENTO !== 'undefined' && REL_RECEBIMENTO['analise']) {
      const relAnalise = REL_RECEBIMENTO['analise'];
      const linhasAnalise = _tabLerAba_(relAnalise.aba, relAnalise.cabecalhoContem).rows;
      emAnalise = linhasAnalise.filter(r => /andamento|analise/i.test(_tabV_(r, 8))).length;
    }
  } catch (e) {
    Logger.log('obterRecebimentoObrasResumo_ (analise): ' + e.message);
  }

  const pendentes = total - concluidos;
  return {
    total: total,
    concluidos: concluidos,
    pendentes: pendentes,
    pct: total ? (concluidos / total) * 100 : null,
    emAnalise: emAnalise
  };
}

// Resumo da Gestão de Contratações (em andamento, em edital, em atraso, fechadas)
function obterContratacoesResumo_() {
  try {
    if (typeof _contLer_ === 'function') {
      const dados = _contLer_();
      return {
        emAndamento: dados.rows.length,
        emEdital: dados.emEdital || 0,
        emAtraso: dados.emAtraso || 0,
        fechadas: dados.historico.length
      };
    }
  } catch (e) {
    Logger.log('obterContratacoesResumo_: ' + e.message);
  }
  return {
    emAndamento: null,
    emEdital: null,
    emAtraso: null,
    fechadas: null
  };
}

// Backlog aberto do mês anterior (mesmo índice de mês, um a menos) — só
// para o delta do card de KPI.
function _propMesAnterior_(ano, mesIndex) {
  return mesIndex === 0 ? { ano: ano - 1, index: 11 } : { ano: ano, index: mesIndex - 1 };
}

// Indicadores do portfólio para o mês de referência
function obterIndicadoresPortfolio_() {
  const ref = obterMesReferencia_();
  const dadosPrev = indicadoresPortfolio_(BD_ABA_PREVENTIVAS, ref.ano, ref.index);
  const dadosCorr = indicadoresPortfolio_(BD_ABA_CORRETIVAS, ref.ano, ref.index);
  const recebimento = obterRecebimentoObrasResumo_();

  const backlogAtual = obterBacklogPorCC_(ref.ano, ref.index).reduce((s, b) => s + b.total, 0);
  const mesAnt = _propMesAnterior_(ref.ano, ref.index);
  const backlogAnterior = obterBacklogPorCC_(mesAnt.ano, mesAnt.index).reduce((s, b) => s + b.total, 0);

  return {
    pctRecebimentoObras: recebimento.pct || 0,
    recebimentoConcluidos: recebimento.concluidos,
    recebimentoTotal: recebimento.total,
    slaPreventivas: dadosPrev.total.sla.pct || 0,
    previntivasRealizado: dadosPrev.total.execucao.realizadas || 0,
    previntivasTotal: dadosPrev.total.execucao.previstas || 0,
    execucaoCorretivas: dadosCorr.total.execucao.pct || 0,
    corretvasRealizado: dadosCorr.total.execucao.realizadas || 0,
    corretvasTotal: dadosCorr.total.execucao.previstas || 0,
    backlogTotal: backlogAtual,
    backlogVariacao: backlogAtual - backlogAnterior
  };
}

// Indicadores acumulados por equipe, com o corte Megas x demais — usa
// indicadoresPorEquipeSegmento_ nas duas bases (preventivas por "Fechado
// por", corretivas por "Responsáveis"). As chaves de equipe são as que
// _PROP_EQUIPE_ produz de fato (PROPERTY/FACILITIES/OPERACAO/TERCEIROS) —
// não "PROPRIEDADES", que não existe no mapa e sempre lia 0.
// Soma dois blocos SLA (mesmo formato de calcularSLA_) — usado para juntar
// Megas + Demais num total só. Soma CONTAGEM, nunca percentual (a média de
// duas taxas com bases diferentes não é a taxa do total).
function _propMergeSLA_(a, b) {
  const cumpridos    = (a ? a.cumpridos    : 0) + (b ? b.cumpridos    : 0);
  const naoCumpridos = (a ? a.naoCumpridos : 0) + (b ? b.naoCumpridos : 0);
  const base = cumpridos + naoCumpridos;
  return { cumpridos: cumpridos, naoCumpridos: naoCumpridos, base: base,
           pct: base ? (cumpridos / base) * 100 : null };
}

// Idem para execução (mesmo formato de calcularExecucao_).
function _propMergeExecucao_(a, b) {
  const previstas  = (a ? a.previstas  : 0) + (b ? b.previstas  : 0);
  const realizadas = (a ? a.realizadas : 0) + (b ? b.realizadas : 0);
  return { previstas: previstas, realizadas: realizadas,
           pct: previstas ? (realizadas / previstas) * 100 : null };
}

// Recorta indicadoresPorEquipeSegmento_ pra UMA equipe só (Megas, Demais e
// as duas somadas) — base de obterIndicadoresPropriedades_ logo abaixo.
function _propIndicadoresEquipeUnica_(seg, equipe) {
  const bloco = grupo => {
    const g = grupo && grupo[equipe];
    return { sla: g ? g.sla : calcularSLA_([]), execucao: g ? g.execucao : calcularExecucao_([]) };
  };
  const megas = bloco(seg.megas), demais = bloco(seg.demais);
  return {
    megas: megas,
    demais: demais,
    total: { sla: _propMergeSLA_(megas.sla, demais.sla), execucao: _propMergeExecucao_(megas.execucao, demais.execucao) },
    parcial: seg.parcial
  };
}

// SLA + execução filtrados pra equipe PROPRIEDADES (equipe 'PROPERTY' no
// mapa _PROP_EQUIPE_), com o corte Megas x Demais e o total das duas
// somado. Usada por TODOS os slides de indicador deste deck — a
// apresentação de Propriedades não mostra número de Facilities nem de
// Terceiros (pedido do usuário: "não é para aparecer nada de facilities,
// apenas de propriedades").
function obterIndicadoresPropriedades_(nomeAba, ano, mesIndex, janela) {
  const resolver = nomeAba === BD_ABA_CORRETIVAS
    ? (it => _propEquipeCorretiva_(it.responsaveis))
    : (it => _propEquipePreventiva_(it.fechadoPor));
  const seg = indicadoresPorEquipeSegmento_(nomeAba, resolver, ano, mesIndex, janela);
  return _propIndicadoresEquipeUnica_(seg, 'PROPERTY');
}

// Cumpridos/não cumpridos do SLA de Propriedades no mês de referência, com
// o corte Megas x Demais — é só o que Slide_Preventivas.gs/Slide_
// Corretivas.gs desenham (uma linha "Propriedades" por bloco; nada de
// Facilities/Terceiros).
function obterIndicadoresAcumulado_() {
  const ref = obterMesReferencia_();
  const prev = obterIndicadoresPropriedades_(BD_ABA_PREVENTIVAS, ref.ano, ref.index);
  const corr = obterIndicadoresPropriedades_(BD_ABA_CORRETIVAS,  ref.ano, ref.index);

  const bloco = b => ({
    properties_cumpridos:     b.sla.cumpridos,
    properties_nao_cumpridos: b.sla.naoCumpridos
  });

  return {
    preventivas:       bloco(prev.megas),
    preventivasDemais: bloco(prev.demais),
    corretivas:        bloco(corr.megas),
    corretvasDemais:   bloco(corr.demais)
  };
}

// ==========================================
// DASHBOARD OPERACIONAL — 2 quadrantes comparativos
// ==========================================
// Monta os 3 pontos no tempo (mês atual / mês anterior / mesmo mês ano
// anterior) que o grid comparativo do Dashboard Operacional
// (Slide_IndicadoresGerais.gs, no estilo de megas-mensal/Slide01_
// Dashboard.gs) precisa — chamando obterIndicadoresPropriedades_/
// obterBacklogPorCC_ com (ano, mesIndex) diferentes. Nenhum dado novo: são
// as MESMAS funções que Preventivas/Backlog já usam pro mês corrente, já
// filtradas pra equipe Propriedades.
//
// Só Preventivas e Backlog entram — Corretivas e o corte Megas x Demais
// saíram do Dashboard por pedido do usuário (trabalhando por partes). O
// mapa fica só com as chaves que Slide_IndicadoresGerais.gs lê hoje; se
// Corretivas voltar ao grid, é só recalcular corr[] igual a prev[] abaixo.
//
// Recebimento de Obras fica FORA deste grid, de propósito: a planilha
// (REL_RECEBIMENTO) é uma LISTA VIVA de pendências, não um registro
// histórico por mês — não existe "quantos estavam concluídos em maio" pra
// reconstruir, a linha de uma pendência já concluída não guarda a data em
// que isso aconteceu. Forçar uma coluna "mês anterior" aqui seria inventar
// dado. Ele já aparece como card avulso (sem comparação histórica) no
// primeiro slide de KPIs — ver obterIndicadoresPortfolio_ acima.
/**
 * TEMPO MÉDIO DE APROVAÇÃO (horas) e % CONCLUSÃO HISTÓRICO, no mês pedido.
 *
 * Nos Megas os dois são células DIGITADAS na aba DADOS — ninguém os calcula.
 * Aqui saem da BD-CORRETIVAS, com estas definições:
 *
 * · TEMPO MÉDIO DE APROVAÇÃO = média da coluna "Tempo para aprovar
 *   (segundos)" (AG), em horas, dos chamados APROVADOS dentro do mês — a
 *   janela vem de "Aprovado em" (P).
 *
 *   O valor sai de AG, NÃO de (P − B). A base já calcula essa espera; refazer
 *   por subtração assumiria que ela é corrida, e se AG considerar horário
 *   útil ou calendário de SLA os dois números divergem sem que ninguém saiba
 *   qual está certo. A subtração fica de RESERVA, só para a linha que tiver
 *   data de aprovação e não tiver AG — e a divergência entre as duas é
 *   registrada no Logger, que é como se descobre a regra de AG sem perguntar.
 *
 *   A janela é a da aprovação, não a da abertura — mesma escolha que já vale
 *   para o tempo de atendimento, que usa a janela do fechamento: o indicador
 *   fala do que ACONTECEU no mês, não do que foi aberto nele. Chamado sem
 *   aprovação fica de fora (não é aprovação instantânea, é aprovação que não
 *   houve).
 *
 * · % CONCLUSÃO HISTÓRICO = de tudo que foi aberto ATÉ o fim do mês, quanto
 *   já estava fechado ali. É acumulado desde o começo da base, não do mês —
 *   é o que "histórico" quer dizer, e é o que faz o número ser comparável
 *   entre meses: um mês com poucos chamados não distorce a série.
 *   Equivale a  fechados(até D) ÷ criados(até D).
 *
 * Devolve { tempoAprovacaoH, conclusaoHistoricoPct, aprovadosNoMes,
 *           semDataAprovacao } — nulls quando não há base, nunca zero: "não
 * houve o que medir" é diferente de "o resultado foi zero" (lição 3).
 */
// Conclusão histórica acumulada das corretivas de PROPERTY nos pontos solicitados.
// Execução rápida e direta sem cálculos pesados de tempo de aprovação.
function obterConclusaoHistoricaPropriedades_(pontos) {
  const itens = _propLerCorretivas_()
    .filter(it => _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY');

  return pontos.map(p => {
    const refFim = new Date(Date.UTC(p.ano, p.index + 1, 1));
    let criadosAte = 0, fechadosAte = 0;
    for (let i = 0; i < itens.length; i++) {
      const it = itens[i];
      if (it.dtReporte && it.dtReporte < refFim) {
        criadosAte++;
        if (_bdChamadoFechado_(it.estado, it.dtFechado) && it.dtFechado && it.dtFechado < refFim) {
          fechadosAte++;
        }
      }
    }
    return {
      conclusaoHistoricoPct: criadosAte > 0 ? (fechadosAte / criadosAte) * 100 : null,
      criadosAte: criadosAte,
      fechadosAte: fechadosAte
    };
  });
}

// DESATIVADA (não tem chamador). Saiu do dashboard no commit de performance:
// custava ~2min de leitura da BD-CORRETIVAS e as linhas que ela alimentava
// ("Tempo médio de aprovação", fluxo) não são desenhadas no slide. Fica aqui
// porque é a única implementação da conta de tempo de aprovação — se a linha
// voltar ao slide, é esta função que volta junto. A conferência estoque ×
// fluxo que dependia dela agora vive em Diagnostico_Identidade.gs.
function obterAprovacaoEConclusao_(ano, mesIndex) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));

  const itens = _propLerCorretivas_()
    .filter(it => _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY');

  const esperas = [];              // em SEGUNDOS
  let semDataAprovacao = 0;        // aprovado no mês, mas sem espera utilizável
  let porSubtracao = 0;            // caiu na reserva (P − B)
  let divergentes = 0;             // AG e (P − B) discordam em mais de 1h
  let criadosAte = 0, fechadosAte = 0;

  itens.forEach(it => {
    // --- Tempo de aprovação: aprovados DENTRO do mês ---
    if (it.dtAprovado && it.dtAprovado >= refIni && it.dtAprovado < refFim) {
      const porSub = (it.dtReporte && it.dtAprovado >= it.dtReporte)
        ? (it.dtAprovado - it.dtReporte) / 1000
        : null;

      if (it.tempoAprovarSeg != null && it.tempoAprovarSeg >= 0) {
        esperas.push(it.tempoAprovarSeg);
        // Discordância grande entre a coluna e a subtração indica que AG não é
        // tempo corrido. Vale saber, não vale corrigir por conta própria.
        if (porSub != null && Math.abs(porSub - it.tempoAprovarSeg) > 3600) divergentes++;
      } else if (porSub != null) {
        esperas.push(porSub);
        porSubtracao++;
      } else {
        // Sem AG e com data de aprovação anterior ao reporte: data trocada,
        // não espera negativa. Uma média com número negativo é pior que uma
        // média com um caso a menos.
        semDataAprovacao++;
      }
    }

    // --- Conclusão histórica: acumulado até o fim do mês ---
    if (it.dtReporte && it.dtReporte < refFim) {
      criadosAte++;
      if (_bdChamadoFechado_(it.estado, it.dtFechado) && it.dtFechado && it.dtFechado < refFim) {
        fechadosAte++;
      }
    }
  });

  return {
    tempoAprovacaoH: esperas.length
      ? esperas.reduce((soma, seg) => soma + seg, 0) / esperas.length / 3600
      : null,
    conclusaoHistoricoPct: criadosAte > 0 ? (fechadosAte / criadosAte) * 100 : null,
    aprovadosNoMes: esperas.length,
    semDataAprovacao: semDataAprovacao,
    porSubtracao: porSubtracao,
    divergentes: divergentes,
    criadosAte: criadosAte,
    fechadosAte: fechadosAte
  };
}


function obterDashboardPropriedades_() {
  const ref    = obterMesReferencia_();
  const mesAnt = _propMesAnterior_(ref.ano, ref.index);
  const anoAnt = { ano: ref.ano - 1, index: ref.index };
  const pontos = [
    { ano: ref.ano,    index: ref.index },
    { ano: mesAnt.ano, index: mesAnt.index },
    { ano: anoAnt.ano, index: anoAnt.index }
  ];

  // Só a equipe PROPRIEDADES — Facilities e Terceiros não aparecem nesta
  // apresentação (pedido do usuário).
  const prev = pontos.map(p => obterIndicadoresPropriedades_(BD_ABA_PREVENTIVAS, p.ano, p.index));
  const backlog = pontos.map(p =>
    obterBacklogPorCC_(p.ano, p.index).reduce((s, b) => s + b.total, 0));

  const nomesCurto = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const headers = pontos.map(p => nomesCurto[p.index] + "'" + String(p.ano).slice(-2));

  // Conclusão histórica das corretivas (PROPERTY) nos 3 pontos.
  // Tempo de aprovação e fluxo de chamados foram removidos do dashboard
  // para acelerar a geração (economiza ~2 minutos em BD-CORRETIVAS).
  //
  // Sair daqui levou junto a conferência da identidade estoque × fluxo, e o
  // slide continua mostrando "Backlog em aberto". Ela não sumiu: roda sob
  // demanda em conferirIdentidadeBacklog() (Diagnostico_Identidade.gs). Se um
  // backlog parecer estranho, é lá que se confere.
  const conclusoes = obterConclusaoHistoricaPropriedades_(pontos);

  const recebimento = obterRecebimentoObrasResumo_();
  const contratacoes = obterContratacoesResumo_();

  const linha3 = (a, b, c) => ({ atual: a, mesAnt: b, anoAnt: c });
  const map = new Map();

  // Quadrante 1 & 2: Manutenção (Preventiva + Corretiva)
  map.set('SLA Preventivas',        linha3(prev[0].total.sla.pct,      prev[1].total.sla.pct,      prev[2].total.sla.pct));
  map.set('Execução Preventivas',   linha3(prev[0].total.execucao.pct, prev[1].total.execucao.pct, prev[2].total.execucao.pct));
  map.set('Preventivas previstas',  linha3(prev[0].total.execucao.previstas,  prev[1].total.execucao.previstas,  prev[2].total.execucao.previstas));
  map.set('Preventivas realizadas', linha3(prev[0].total.execucao.realizadas, prev[1].total.execucao.realizadas, prev[2].total.execucao.realizadas));

  map.set('Backlog em aberto',      linha3(backlog[0], backlog[1], backlog[2]));
  map.set('Percentual de conclusão histórico',
    linha3(conclusoes[0].conclusaoHistoricoPct, conclusoes[1].conclusaoHistoricoPct, conclusoes[2].conclusaoHistoricoPct));
  map.set('Tempo médio de aprovação',   linha3(null, null, null));
  map.set('Chamados abertos',            linha3(null, null, null));
  map.set('Chamados fechados',           linha3(null, null, null));
  map.set('Tempo médio de atendimento',  linha3(null, null, null));

  // Quadrante 2: Gestão Financeira · Orçamento (Torre de Manutenção)
  let dadosTorre = null;
  try {
    dadosTorre = obterDadosTorreManutencao_();
  } catch (e) {
    Logger.log('Aviso (Dashboard): Torre de Manutenção indisponível: ' + e.message);
  }

  const fmtK = v => (v == null || isNaN(v)) ? '—' : 'R$ ' + Math.abs(Math.round(v)).toLocaleString('pt-BR');
  const fmtVar = (nom, pct) => {
    if (nom == null || isNaN(nom)) return '—';
    const sinal = nom >= 0 ? '+' : '−';
    const pctStr = (pct != null && !isNaN(pct)) ? ' (' + (pct >= 0 ? '+' : '') + (pct * 100).toFixed(1).replace('.', ',') + '%)' : '';
    return sinal + fmtK(Math.abs(nom)) + pctStr;
  };

  const orcCR = dadosTorre ? dadosTorre.cr.total.orc26 : 421028;
  const orcDem = dadosTorre ? dadosTorre.demercado.total.orc26 : 183515;
  const ritmoCR = dadosTorre ? dadosTorre.cr.total.ritmo25 : 455412;
  const ritmoDem = dadosTorre ? dadosTorre.demercado.total.ritmo25 : 161957.30;
  
  const orcAbs = Math.abs(orcCR) + Math.abs(orcDem);
  const ritmoAbs = Math.abs(ritmoCR) + Math.abs(ritmoDem);
  const econNom = ritmoAbs - orcAbs; // >0 = economia (gasta menos que o ritmo)
  const varPct = ritmoAbs !== 0 ? (orcAbs - ritmoAbs) / ritmoAbs : 0; // <0 = redução percentual de custo

  map.set('Orçamento 2026 (Total)',     linha3(fmtK(orcAbs), null, null));
  map.set('Ritmo 2025 (Base)',          linha3(fmtK(ritmoAbs), null, null));
  map.set('Orçamento Capital Realty',   linha3(fmtK(Math.abs(orcCR)), null, null));
  map.set('Orçamento Demercado',        linha3(fmtK(Math.abs(orcDem)), null, null));
  map.set('Economia Projetada (26/25)', linha3(fmtVar(econNom, varPct), null, null));
  map.set('CAPEX',                      linha3('—', null, null));

  // Quadrante 3: Vistorias & Análises de Projetos (subgrupos)
  map.set('Vistorias - Entrada/saída',     linha3('—', null, null));
  map.set('Vistorias - Recebimento obras', linha3('—', null, null));
  map.set('Vistorias - Monitoramento',     linha3('—', null, null));
  map.set('Vistorias - Documentação',      linha3('—', null, null));
  map.set('Adequações - Quantidade',       linha3('—', null, null));
  map.set('Adequações - Prazo médio',      linha3('—', null, null));
  map.set('Adequações - Conclusão (%)',    linha3('—', null, null));
  // Mantidos para retrocompatibilidade
  map.set('Obras concluídas (%)',          linha3(recebimento.pct, null, null));
  map.set('Pendências de obras (Qtd)',     linha3(recebimento.pendentes, null, null));
  map.set('Total de obras (Qtd)',          linha3(recebimento.total, null, null));
  map.set('Projetos em análise (Qtd)',     linha3(recebimento.emAnalise, null, null));

  // Quadrante 4: Gestão de Contratações
  map.set('Contratações em andamento',  linha3(contratacoes.emAndamento, null, null));
  map.set('Em fase de edital',          linha3(contratacoes.emEdital, null, null));
  map.set('Contratações em atraso',     linha3(contratacoes.emAtraso, null, null));
  map.set('Contratações concluídas',    linha3(contratacoes.fechadas, null, null));
  map.set('Contratações conclusão (%)', linha3('4', null, null));
  map.set('Contratações prazo médio',   linha3('15', null, null));

  Logger.log('Dashboard: conclusão histórica — ' + conclusoes[0].fechadosAte + ' fechados de ' +
             conclusoes[0].criadosAte + ' abertos até o fim do mês' +
             (conclusoes[0].conclusaoHistoricoPct == null ? '' :
              ' = ' + conclusoes[0].conclusaoHistoricoPct.toFixed(1) + '%'));

  return { headers: headers, map: map, parcial: prev[0].parcial };
}

// Backlog por Centro de Custos, em aberto NO FIM do mês (ano/mesIndex —
// default o mês de referência). Usa _histAbertoNoMes_, a MESMA definição de
// "aberto no mês" do resto do deck — não "aberto agora" — para que esta
// tabela e o KPI de Indicadores Gerais (que soma este mesmo resultado)
// nunca divirjam. Lição do backlog dos Megas (CLAUDE.md): estoque e KPI têm
// que sair da mesma fonte, senão o mês não fecha.
//
// Filtrado pra equipe PROPRIEDADES via "Responsáveis" (_propEquipeCorretiva_)
// — mesmo corte do resto do deck, e mesmo padrão que
// megas-mensal/Slide_BacklogClientesProperties.gs já usa pra separar
// backlog aberto por equipe responsável a partir da mesma coluna.
function obterBacklogPorCC_(ano, mesIndex) {
  const ref     = obterMesReferencia_();
  const anoRef  = ano != null ? ano : ref.ano;
  const mesRef  = mesIndex != null ? mesIndex : ref.index;
  const refIni  = new Date(Date.UTC(anoRef, mesRef, 1));
  const refFim  = new Date(Date.UTC(anoRef, mesRef + 1, 1));

  const abertos = _propLerCorretivas_()
    .filter(it => _histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim))
    .filter(it => _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY');
  const porCC = {};
  abertos.forEach(it => {
    const cc = it.cc || 'Sem Centro de Custos';
    porCC[cc] = (porCC[cc] || 0) + 1;
  });
  return Object.keys(porCC).map(cc => ({ cc, total: porCC[cc] })).sort((a, b) => b.total - a.total);
}


// ==========================================
// INDICADORES DE CORRETIVAS — Slide_Corretivas.gs
// ==========================================
// Chamados criados/fechados e tempo médio entre criado e fechado, mensal e
// acumulado do ano — os três direto da BD-CORRETIVAS (mesma base e mesma
// regra de "fechado" — _bdChamadoFechado_ — do resto do deck), filtrados
// pra equipe PROPRIEDADES via "Responsáveis". "Índice de disponibilidade"
// (que o slide equivalente dos Megas mostra) NÃO entra: lá vem de uma aba
// digitada à mão por Mega, sem fórmula na base bruta — não existe fonte
// equivalente pro portfólio de Propriedades, e inventar a conta violaria a
// mesma regra que já tirou Recebimento de Obras do Dashboard (nada de dado
// reconstruído/inventado). Ver decisão do usuário no histórico do projeto.
function obterFluxoCorretivasPropriedades_(ano, mesIndex) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));
  const anoIni = new Date(Date.UTC(ano, 0, 1));

  const itens = _propLerCorretivas_().filter(it => _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY');

  let mCriados = 0, mFechados = 0, aCriados = 0, aFechados = 0;
  const temposMes = [], temposAno = [];

  itens.forEach(it => {
    if (it.dtReporte && it.dtReporte >= refIni && it.dtReporte < refFim) mCriados++;
    if (it.dtReporte && it.dtReporte >= anoIni && it.dtReporte < refFim) aCriados++;

    const fechado = _bdChamadoFechado_(it.estado, it.dtFechado);
    if (fechado && it.dtReporte && it.dtFechado >= refIni && it.dtFechado < refFim) {
      mFechados++;
      temposMes.push(it.dtFechado - it.dtReporte);
    }
    if (fechado && it.dtReporte && it.dtFechado >= anoIni && it.dtFechado < refFim) {
      aFechados++;
      temposAno.push(it.dtFechado - it.dtReporte);
    }
  });

  // Média em horas, só de quem fechou DENTRO da janela e tem as duas datas —
  // não dá pra medir "tempo até fechar" de quem ainda está aberto.
  const mediaHoras = arr => arr.length
    ? arr.reduce((soma, ms) => soma + ms, 0) / arr.length / 3600000
    : null;

  return {
    mensal:    { criados: mCriados, fechados: mFechados, tempoMedioH: mediaHoras(temposMes) },
    acumulado: { criados: aCriados, fechados: aFechados, tempoMedioH: mediaHoras(temposAno) }
  };
}

// Últimos `n` meses até o mês de referência (inclusive), mais antigo
// primeiro — janela do gráfico de Backlog Emergencial.
function _propUltimosMeses_(ref, n) {
  const lista = [];
  for (let i = n - 1; i >= 0; i--) {
    let idx = ref.index - i, ano = ref.ano;
    while (idx < 0) { idx += 12; ano--; }
    lista.push({ ano: ano, index: idx });
  }
  return lista;
}

// Backlog de chamados EMERGENCIAIS (coluna "Prioridade"), mês a mês, dos
// últimos `n` meses — mesma regra de "aberto no mês" (_histAbertoNoMes_) e
// mesmo filtro de equipe (PROPERTY) do resto do deck. Diferente do
// equivalente dos Megas (que conta emergencial de QUALQUER equipe, decisão
// explícita de lá): aqui entra só Propriedades, pelo mesmo motivo que tirou
// Facilities/Terceiros do resto da apresentação.
function obterBacklogEmergencialPorMes_(n) {
  const ref   = obterMesReferencia_();
  const meses = _propUltimosMeses_(ref, n || 13);
  const base  = _propLerCorretivas_();

  return meses.map(m => {
    const refIni = new Date(Date.UTC(m.ano, m.index, 1));
    const refFim = new Date(Date.UTC(m.ano, m.index + 1, 1));
    const qtd = base.filter(it =>
      it.prioridade === 'Emergencial' &&
      _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY' &&
      _histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim)
    ).length;
    return { ano: m.ano, index: m.index, qtd: qtd };
  });
}

// Data curta dd/mm/aa — cópia de megas-mensal/02_Dados.gs.
function _histFormatarDataCurta_(d) {
  if (!d) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(d.getUTCFullYear()).slice(-2);
  return dd + '/' + mm + '/' + yy;
}

// Dias em aberto NÃO é "até hoje" — é até o ÚLTIMO DIA do mês de referência
// (refFim): a apresentação é gerada dias depois do mês já ter fechado, e o
// número tem que refletir o estado NO FIM do mês, não no dia em que o
// slide foi gerado. Cópia de megas-mensal/02_Dados.gs.
function _histDiasAberto_(dtReporte, refFim) {
  if (!dtReporte) return null;
  return Math.max(0, Math.floor((refFim - dtReporte) / 86400000));
}

// Detalhe dos chamados EMERGENCIAIS (equipe Propriedades) em aberto no mês
// de referência — um item por chamado, com Empreendimento (Centro de
// Custos), descrição, data de abertura e dias em aberto (até o fim do mês
// de referência).
// Ordenado do mais antigo pro mais novo (dias desc) — os que mais
// precisam de atenção aparecem primeiro. Usado por
// Slide_BacklogEmergencialDetalhe.gs.
function obterBacklogEmergencialDetalhe_() {
  const ref    = obterMesReferencia_();
  const refIni = new Date(Date.UTC(ref.ano, ref.index, 1));
  const refFim = new Date(Date.UTC(ref.ano, ref.index + 1, 1));

  const itens = _propLerCorretivas_()
    .filter(it => it.prioridade === 'Emergencial')
    .filter(it => _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY')
    .filter(it => _histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim))
    .map(it => ({
      cc          : it.cc,
      descricao   : it.descricao || '(sem descrição)',
      dataAbertura: _histFormatarDataCurta_(it.dtReporte),
      dias        : _histDiasAberto_(it.dtReporte, refFim)
    }));

  return itens.sort((a, b) => (b.dias || 0) - (a.dias || 0));
}


// ==========================================
// CHAMADOS PENDENTES (BACKLOG) POR MOTIVO — Slide_ChamadosPendentes.gs
// ==========================================
// Equivalente honesto do slide "Chamados Pendentes (Backlog)" dos Megas —
// lá vem de uma aba digitada à mão (MÊS/ESTADO/QUANTIDADE); aqui é 100%
// derivado da BD-CORRETIVAS, coluna "Motivo de pausa" (só existe nessa
// base — confirmado com diagnosticarMotivoPausa). Regra confirmada com o
// usuário: chamado aberto com "Motivo de pausa" preenchido → essa é a
// categoria ("direcionado"); vazio → "Em resolução", não importa o que a
// coluna Estado diga especificamente. Só equipe PROPRIEDADES, mesmo corte
// do resto do deck.
function obterBacklogPorMotivo_(ano, mesIndex) {
  const refIni = new Date(Date.UTC(ano, mesIndex, 1));
  const refFim = new Date(Date.UTC(ano, mesIndex + 1, 1));

  const abertos = _propLerCorretivas_()
    .filter(it => _histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim))
    .filter(it => _propEquipeCorretiva_(it.responsaveis) === 'PROPERTY');

  let emResolucao = 0;
  const porMotivo = {};
  abertos.forEach(it => {
    const motivo = String(it.motivoPausa || '').trim();
    if (motivo) porMotivo[motivo] = (porMotivo[motivo] || 0) + 1;
    else emResolucao++;
  });

  return {
    total: abertos.length,
    emResolucao: emResolucao,
    direcionados: Object.keys(porMotivo)
      .sort((a, b) => porMotivo[b] - porMotivo[a])
      .map(m => ({ estado: m, qtd: porMotivo[m] }))
  };
}

// Mês de referência + mês anterior, prontos pro gráfico de barras (▲/▼ vs
// mês anterior em cada categoria, igual ao slide dos Megas).
function obterDadosChamadosPendentes_() {
  const ref    = obterMesReferencia_();
  const mesAnt = _propMesAnterior_(ref.ano, ref.index);

  const atual    = obterBacklogPorMotivo_(ref.ano, ref.index);
  const anterior = obterBacklogPorMotivo_(mesAnt.ano, mesAnt.index);

  const mapaAnterior = {};
  anterior.direcionados.forEach(d => { mapaAnterior[d.estado] = d.qtd; });

  const direcionados = atual.direcionados.map(d => ({
    estado: d.estado,
    qtd: d.qtd,
    anterior: mapaAnterior[d.estado] != null ? mapaAnterior[d.estado] : null
  }));

  return {
    mesLabel: (ref.curto || ref.nome) + '/' + ref.ano,
    total: atual.total,
    totalAnterior: anterior.total,
    emResolucao: atual.emResolucao,
    emResolucaoAnterior: anterior.emResolucao,
    direcionados: direcionados
  };
}

// ==========================================
// TORRE DE MANUTENÇÃO (CAPITAL REALTY & DEMERCADO)
// ==========================================
/**
 * Retorna os dados consolidados da Torre de Manutenção (Capital Realty e Demercado).
 * Lê das planilhas online indicadas por TORRE_MANUTENCAO_CR_ID e TORRE_MANUTENCAO_DEMERCADO_ID;
 * caso contrário ou se inacessíveis, recorre aos dados de referência dos arquivos XLSX locais.
 */
function obterDadosTorreManutencao_() {
  let crLinhas = null;
  let demLinhas = null;

  // 1. Leitura online da Torre Capital Realty
  if (typeof TORRE_MANUTENCAO_CR_ID !== 'undefined' && TORRE_MANUTENCAO_CR_ID) {
    try {
      const ssCR = SpreadsheetApp.openById(TORRE_MANUTENCAO_CR_ID);
      const abaCR = ssCR.getSheets()[0];
      if (abaCR) {
        const dadosCR = abaCR.getDataRange().getValues();
        if (dadosCR.length > 1) crLinhas = _parseTorreRows_(dadosCR);
      }
    } catch (e) {
      Logger.log('Aviso Torre CR: falha ao ler planilha online (' + e.message + '). Usando base de referência.');
    }
  }

  // 2. Leitura online da Torre Demercado
  if (typeof TORRE_MANUTENCAO_DEMERCADO_ID !== 'undefined' && TORRE_MANUTENCAO_DEMERCADO_ID) {
    try {
      const ssDem = SpreadsheetApp.openById(TORRE_MANUTENCAO_DEMERCADO_ID);
      const abaDem = ssDem.getSheets()[0];
      if (abaDem) {
        const dadosDem = abaDem.getDataRange().getValues();
        if (dadosDem.length > 1) demLinhas = _parseTorreRows_(dadosDem);
      }
    } catch (e) {
      Logger.log('Aviso Torre Demercado: falha ao ler planilha online (' + e.message + '). Usando base de referência.');
    }
  }

  // Fallback para dados de referência aprendidos das planilhas locais
  if (!crLinhas) {
    crLinhas = _parseTorreRows_(TORRE_MANUTENCAO_CR_REF);
  }
  if (!demLinhas) {
    demLinhas = _parseTorreRows_(TORRE_MANUTENCAO_DEMERCADO_REF);
  }

  return {
    cr: crLinhas,
    demercado: demLinhas
  };
}

function _parseTorreRows_(matriz) {
  let startIdx = 0;
  if (matriz.length > 0 && typeof matriz[0][1] === 'string' && /Real|Orçamento/i.test(matriz[0][1])) {
    startIdx = 1;
  }

  const rows = [];
  let totalRow = null;

  for (let i = startIdx; i < matriz.length; i++) {
    const r = matriz[i];
    const nome = String(r[0] || '').replace(/\u00A0/g, ' ').trim();
    if (!nome) continue;

    const real24   = _toNum_(r[1]);
    const orc25    = _toNum_(r[2]);
    const ritmo25  = _toNum_(r[3]);
    const orc26    = _toNum_(r[4]);
    const varPct   = r[5] != null ? _toNum_(r[5]) : (ritmo25 !== 0 ? (orc26 - ritmo25) / Math.abs(ritmo25) : 0);
    const varNom   = r[6] != null ? _toNum_(r[6]) : (ritmo25 - orc26);

    const item = {
      imovel: nome,
      real24: real24,
      orc25: orc25,
      ritmo25: ritmo25,
      orc26: orc26,
      varPct: varPct,
      varNom: varNom,
      isTotal: /TOTAL/i.test(nome)
    };

    if (item.isTotal) {
      totalRow = item;
    } else {
      rows.push(item);
    }
  }

  return {
    rows: rows,
    total: totalRow || _calcularTotalTorre_(rows)
  };
}

function _toNum_(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const s = String(v).replace(/\u00A0/g, '').replace('R$', '').replace('%', '').trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function _calcularTotalTorre_(rows) {
  const tot = {
    imovel: 'TOTAL MANUTENÇÃO',
    real24: 0, orc25: 0, ritmo25: 0, orc26: 0, varPct: 0, varNom: 0, isTotal: true
  };
  rows.forEach(r => {
    tot.real24 += r.real24;
    tot.orc25 += r.orc25;
    tot.ritmo25 += r.ritmo25;
    tot.orc26 += r.orc26;
    tot.varNom += r.varNom;
  });
  tot.varPct = tot.ritmo25 !== 0 ? (tot.orc26 - tot.ritmo25) / Math.abs(tot.ritmo25) : 0;
  return tot;
}

