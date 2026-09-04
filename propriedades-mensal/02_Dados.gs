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
