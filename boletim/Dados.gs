/**
 * ARQUIVO: Dados.gs
 * DESCRIÇÃO: Camada de dados do Boletim lida da BASE BRUTA (uma linha por
 * registro), em vez das células já somadas da planilha QUADRO DE INDICADORES.
 *
 * ETAPA 1 de 4 — NADA NA TELA MUDA AINDA. Este arquivo só acrescenta a
 * leitura da base e o diagnóstico que confere se ela bate com o que os slides
 * mostram hoje. A troca dos slides vem depois, um por vez, com os dois
 * números lado a lado antes de decidir.
 *
 * DE ONDE VEM: a planilha BASE DE DADOS — QUADRO REM (BD_CORRETIVAS_ID), abas
 * BD-CORRETIVAS e BD-PREVENTIVAS — a MESMA fonte da apresentação mensal dos
 * Megas, da de Propriedades e do Gestão à Vista TV. É a lição nº 3 do
 * CLAUDE.md ("prefira a base bruta à aba digitada").
 *
 * POR QUE ISSO IMPORTA AQUI: o slide 07 mostra, por empreendimento, o backlog
 * de HOJE, de 7 dias atrás e de 28 dias atrás, mais os abertos e fechados da
 * semana. Hoje são seis células digitadas que precisam concordar entre si.
 * Saindo todas da mesma base, a identidade
 *     backlog(hoje) = backlog(7d atrás) + abertos − fechados
 * passa a valer por construção — é a lição nº 2 do CLAUDE.md.
 *
 * NOMES REPETIDOS DE PROPÓSITO: _histNorm_, _histParseDataHora_,
 * _bdChamadoFechado_, _slaClasse_, _normalizarPrioridade_,
 * _resolverEquipeResponsaveis_ e _limparDescricaoChecklist_ têm os mesmos
 * nomes nos outros projetos. São projetos Apps Script separados (não colidem
 * em execução), e manter o nome faz copiar função entre eles funcionar sem
 * reescrever as chamadas.
 */

// Planilha "BASE DE DADOS — QUADRO REM": as duas bases brutas,
// multi-empreendimento, histórico desde 2021.
const BD_CORRETIVAS_ID = '1YlNZK_SdS_VTSPWzqOn_cYs1PjM5BO-VWgqSp-YpcVo';

// Nomes EXATOS das abas. Repare no espaço em volta do hífen em
// "BD - PREVENTIVAS": as abas não seguem um padrão único, então _bolAba_
// compara ignorando espaços e pontuação.
const BD_ABA_CORRETIVAS  = 'BD-CORRETIVAS';
const BD_ABA_PREVENTIVAS = 'BD - PREVENTIVAS';

// Fotos do backlog que o slide 07 mostra hoje (colunas p28 / p7 / hoje).
const BOL_BACKLOG_DIAS = [28, 7, 0];

// Coluna C da BD-CORRETIVAS (0-based = 2). RESERVA de posição para o tipo de
// serviço, usada só quando nenhum cabeçalho casa — ver _bolLerBase_.
const BOL_COL_TIPO_SERVICO = 2;

// Como o tipo de serviço vira fatia da composição. As palavras são as mesmas
// dos CONT.SES da planilha ("*Melhoria*" / "*Consulta*"), procuradas sem
// acento e sem caixa. Acrescentar um sinônimo aqui muda os quatro lugares.
const BOL_TIPO_REGRAS = [
  { bucket: 'MELHORIAS', palavras: ['melhoria'] },
  { bucket: 'PROJETOS',  palavras: ['consulta'] }
];


// ==========================================
// HELPERS DE PARSE / CLASSIFICAÇÃO
// ==========================================

function _histNorm_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim();
}

// As bases trazem data em ISO "AAAA-MM-DD HH:MM:SS".
function _histParseDataHora_(v) {
  const txt = String(v == null ? '' : v).trim();
  if (!txt) return null;
  const m = txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
}

// Fechado é Estado "Fechado" E com data de fechamento. Foi essa regra que
// descasou estoque e fluxo nos Megas — um registro com data mas outro estado
// contava como fechado e nunca saía do backlog. CORRETIVAS diz "Fechado",
// PREVENTIVAS diz "Fechada": testar só uma das formas faria a base inteira de
// preventivas parecer aberta.
function _bdChamadoFechado_(estado, dtFechado) {
  const n = _histNorm_(estado);
  return (n === 'fechado' || n === 'fechada') && !!dtFechado;
}

function _normalizarPrioridade_(v) {
  const n = _histNorm_(v);
  if (n.indexOf('emergenc') >= 0) return 'Emergencial';
  if (n.indexOf('alta') >= 0)     return 'Alta';
  if (n.indexOf('normal') >= 0)   return 'Normal';
  if (n.indexOf('baixa') >= 0)    return 'Baixa';
  return '';
}

// ARMADILHA: "Não cumprido" CONTÉM a palavra "cumprido". Testar 'cumprido'
// primeiro classificaria todo "Não cumprido" como cumprido e inflaria o
// indicador em silêncio. A negativa vem ANTES — a ordem destes ifs não pode
// mudar.
function _slaClasse_(valor) {
  const n = _histNorm_(valor);
  if (!n) return 'SEM';
  if (n === 'nao cumprido' || n === 'sla nao cumprido') return 'NAO';
  if (n === 'cumprido'     || n === 'sla cumprido')     return 'CUMPRIDO';
  if (n === 'sem sla')                                  return 'SEM';
  return 'DESCONHECIDO';
}

// A coluna Descrição vem com um prefixo de metadado de checklist na frente do
// texto livre. Só interessa a descrição real do problema.
function _limparDescricaoChecklist_(desc) {
  if (!desc) return desc;
  let limpo = desc;
  limpo = limpo.replace(/^\S+\s+CHECKLIST\s*-\s*\S+(?:\s*\|[^|]*)+?:\s*\S+?\.\s*/i, '');
  limpo = limpo.replace(/^CHECKLIST\s*-\s*[^|]*\|\s*/i, '');
  limpo = limpo.replace(/^[^:\n]{1,80}:\s*(?:Não\s+)?Conforme\b[\s\-–]*/i, '');
  limpo = limpo.trim();
  return limpo || desc;
}


// ==========================================
// EQUIPE RESPONSÁVEL (coluna "Responsáveis" — lista separada por vírgula)
// ==========================================
// Mapa NOME → EQUIPE, cópia do de megas-mensal/02_Dados.gs.
const _RESPONSAVEL_EQUIPE_ = (function () {
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
      'Rodrigo Habitzreuter', 'Paulo Augusto Maximiano', 'Dionatan Rek',
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
  Object.keys(bruto).forEach(equipe => bruto[equipe].forEach(nome => { mapa[_histNorm_(nome)] = equipe; }));
  return mapa;
})();

// "Responsabilidade Locatario" aparece como um item A MAIS dentro da própria
// lista de Responsáveis — quando presente, PREVALECE sobre a equipe. É o que
// alimenta a fatia "Locatários" do slide 05.
function _chamadoResponsabilidadeLocatario_(responsaveisTxt) {
  return _histNorm_(responsaveisTxt).indexOf('responsabilidade locatario') >= 0;
}

/**
 * Em que fatia da composição o chamado cai: CORRETIVAS, MELHORIAS, PROJETOS
 * ou LOCATARIO. Cada chamado cai em EXATAMENTE UMA — é isso que faz o painel
 * fechar com o backlog total.
 *
 * A ORDEM importa e é uma decisão, não um detalhe: "Responsabilidade
 * Locatário" (quem paga) e "Melhoria" (que tipo de obra é) são perguntas
 * diferentes, e um chamado pode ser as duas coisas. Locatário vem primeiro
 * porque é a fatia que o cartão de KPI já mostra — assim o 46 do cartão e o 46
 * do painel são o mesmo número. obterComposicaoTipoBoletim_ registra no Logger
 * quantos chamados são os dois ao mesmo tempo: se for um número grande, a
 * ordem passa a mudar o slide e vale decidir com esse dado na mão.
 */
function _bolTipoServico_(item) {
  if (_chamadoResponsabilidadeLocatario_(item.responsaveis)) return 'LOCATARIO';
  const t = _histNorm_(item.tipoServico);
  for (let i = 0; i < BOL_TIPO_REGRAS.length; i++) {
    const r = BOL_TIPO_REGRAS[i];
    for (let k = 0; k < r.palavras.length; k++) {
      if (t.indexOf(r.palavras[k]) >= 0) return r.bucket;
    }
  }
  return 'CORRETIVAS';
}

// 0 → 'A', 2 → 'C', 26 → 'AA'. Só para o log dizer de que coluna leu.
function _bolLetraColuna_(i) {
  let s = '', n = i + 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - 1 - r) / 26; }
  return s;
}

// Prioridade: locatário → PROPERTY → FACILITIES → OPERACAO → '' se ninguém
// reconhecido. Nome desconhecido cai em FACILITIES no consumo (mesma regra da
// apresentação mensal), mas aqui devolvemos '' para o diagnóstico conseguir
// medir quantos não foram reconhecidos.
function _resolverEquipeResponsaveis_(responsaveisTxt) {
  if (_chamadoResponsabilidadeLocatario_(responsaveisTxt)) return 'LOCATARIO';
  const equipes = String(responsaveisTxt || '').split(',')
    .map(n => _RESPONSAVEL_EQUIPE_[_histNorm_(n.trim())])
    .filter(Boolean);
  if (equipes.indexOf('PROPERTY') >= 0)   return 'PROPERTY';
  if (equipes.indexOf('FACILITIES') >= 0) return 'FACILITIES';
  if (equipes.indexOf('OPERACAO') >= 0)   return 'OPERACAO';
  return '';
}


// ==========================================
// LEITURA DA BASE
// ==========================================
const _bolBaseCache = {};

function _bolChaveAba_(s) { return _histNorm_(s).replace(/[^a-z0-9]/g, ''); }

function _bolAba_(ss, nome) {
  const alvo = _bolChaveAba_(nome);
  return ss.getSheetByName(nome) ||
         ss.getSheets().filter(s => _bolChaveAba_(s.getName()) === alvo)[0] ||
         ss.getSheets().filter(s => _bolChaveAba_(s.getName()).indexOf(alvo) >= 0)[0] ||
         null;
}

// Mapeamento por CONTEÚDO do cabeçalho, não por posição — coluna que muda de
// lugar não quebra a leitura, e coluna que muda de nome aparece no
// diagnóstico.
function _bolLerBase_(nomeAba) {
  if (_bolBaseCache[nomeAba]) return _bolBaseCache[nomeAba];
  try {
    const ss    = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    const sheet = _bolAba_(ss, nomeAba);
    if (!sheet) {
      Logger.log(nomeAba + ': aba não encontrada. Abas: ' + ss.getSheets().map(s => s.getName()).join(', '));
      return [];
    }

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) return [];

    const hdr = data[0].map(_histNorm_);
    // Acha a coluna pelo primeiro trecho de cabeçalho que casar, na ordem dada.
    const acha = function (trechos) {
      for (let i = 0; i < trechos.length; i++) {
        for (let k = 0; k < hdr.length; k++) if (hdr[k].indexOf(trechos[i]) >= 0) return k;
      }
      return -1;
    };

    const cCC     = acha(['centro de custo']);
    const cEstado = acha(['estado']);
    const cSla    = acha(['sla']);
    const cResp   = acha(['responsaveis', 'responsável']);
    const cDesc   = acha(['descricao', 'descrição']);
    const cPri    = acha(['prioridade']);
    const cArea   = acha(['area']);              // disciplina
    const cEquip  = acha(['equipamento']);        // viabilidade de MTBF
    const cTipo   = acha(['tipo de reporte', 'tipo']);
    // TIPO DE SERVIÇO (Melhoria / Consulta-projeto / corretiva) — coluna C.
    // NÃO é a "Tipo de reporte", que traz OPERATOR/CONTACT (quem abriu). É a
    // coluna que as fórmulas da planilha sempre usaram:
    //   CONT.SES('BD-CORRETIVAS'!$C:$C; "*Melhoria*")  → Melhorias
    //   CONT.SES('BD-CORRETIVAS'!$C:$C; "*Consulta*")  → Projetos
    // Procura por cabeçalho ignorando "tipo de reporte"; não achando, tenta a
    // posição C — mas só ACEITA a posição se a coluna realmente contiver as
    // palavras procuradas. Sem essa conferência, uma base com outro layout
    // faria a reserva cair numa coluna qualquer (no limite a de Estado), nada
    // casaria com "melhoria"/"consulta" e o painel mostraria 100% Corretivas
    // sem erro nenhum — o zero falso da lição 3, com outra roupa.
    const cTipoSrv = (function () {
      for (let k = 0; k < hdr.length; k++) {
        if (hdr[k].indexOf('tipo de reporte') >= 0) continue;
        if (hdr[k].indexOf('tipo') >= 0 || hdr[k].indexOf('servico') >= 0) return k;
      }
      const p = BOL_COL_TIPO_SERVICO;
      const casa = data.some(function (l, r) {
        if (!r || p >= l.length) return false;
        const v = _histNorm_(l[p]);
        return BOL_TIPO_REGRAS.some(function (g) {
          return g.palavras.some(function (w) { return v.indexOf(w) >= 0; });
        });
      });
      if (casa) return p;
      Logger.log(nomeAba + ': nenhuma coluna de tipo de serviço reconhecida — nem por ' +
                 'cabeçalho, nem na coluna ' + _bolLetraColuna_(p) + ' (que não traz ' +
                 '"Melhoria" nem "Consulta" em linha nenhuma). A composição por tipo ' +
                 'fica com as células digitadas.');
      return -1;
    })();
    const cTfec   = acha(['tempo para fechar (segundos)', 'tempo para fechar']);
    // CORRETIVAS: "Data de reporte"/"Fechado em" · PREVENTIVAS: "Data agendamento"/"Fechada em"
    const cIni = acha(['data de reporte', 'data agendamento', 'data de agendamento']);
    const cFim = acha(['fechado em', 'fechada em']);

    if (cCC < 0) {
      Logger.log(nomeAba + ': sem coluna "Centro de Custos" — rode diagnosticarBoletim().');
      return [];
    }

    const saida = [];
    for (let r = 1; r < data.length; r++) {
      const cc = String(data[r][cCC] || '').trim();
      if (!cc) continue;
      saida.push({
        cc          : cc,
        estado      : cEstado >= 0 ? String(data[r][cEstado] || '').trim() : '',
        sla         : cSla    >= 0 ? String(data[r][cSla]    || '').trim() : '',
        responsaveis: cResp   >= 0 ? String(data[r][cResp]   || '').trim() : '',
        descricao   : cDesc   >= 0 ? _limparDescricaoChecklist_(String(data[r][cDesc] || '').trim()) : '',
        prioridade  : _normalizarPrioridade_(cPri >= 0 ? data[r][cPri] : ''),
        area        : cArea   >= 0 ? String(data[r][cArea]   || '').trim() : '',
        equipamento : cEquip  >= 0 ? String(data[r][cEquip]  || '').trim() : '',
        tipo        : cTipo   >= 0 ? String(data[r][cTipo]   || '').trim() : '',
        tipoServico : cTipoSrv >= 0 && cTipoSrv < data[r].length
                        ? String(data[r][cTipoSrv] || '').trim() : '',
        tempoFechar : cTfec   >= 0 ? String(data[r][cTfec]   || '').trim() : '',
        dtReporte   : cIni    >= 0 ? _histParseDataHora_(data[r][cIni]) : null,
        dtFechado   : cFim    >= 0 ? _histParseDataHora_(data[r][cFim]) : null
      });
    }
    // Diz de que coluna saiu o tipo de serviço. Se um dia a coluna mudar de
    // lugar e a reserva por posição pegar a errada, o sintoma seria "tudo
    // virou Corretiva" — silencioso. Com o cabeçalho no log, aparece.
    if (nomeAba === BD_ABA_CORRETIVAS && cTipoSrv >= 0) {
      Logger.log('BD-CORRETIVAS: tipo de serviço lido da coluna ' +
                 _bolLetraColuna_(cTipoSrv) + ' ("' + (data[0][cTipoSrv] || '(sem cabeçalho)') + '").');
    }

    // Só cacheia resultado bom: leitura vazia por falha transitória não pode
    // ficar grudada na rodada inteira.
    if (saida.length) _bolBaseCache[nomeAba] = saida;
    return saida;
  } catch (e) {
    Logger.log('_bolLerBase_(' + nomeAba + '): ' + e.message);
    return [];
  }
}

// Chave de comparação entre o nome do empreendimento no boletim e o Centro de
// Custos da base: sem acento, sem caixa, sem pontuação. "MEGA ITAJAI" e
// "Mega Itajaí" viram a mesma coisa.
function _bolChaveEmp_(s) {
  return _histNorm_(s).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}


// ==========================================
// JANELAS
// ==========================================

// Um item estava ABERTO no instante `d`: já reportado até ali e ainda não
// fechado naquele momento. Mesmo raciocínio do _histAbertoNoMes_ da
// apresentação mensal, num instante em vez de num mês.
function _bolAbertoEm_(item, d) {
  if (item.dtReporte && item.dtReporte > d) return false;
  if (_bdChamadoFechado_(item.estado, item.dtFechado) && item.dtFechado && item.dtFechado <= d) return false;
  return true;
}

function _bolHojeUTC_() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// Fim do dia de N dias atrás (N=0 → fim de hoje). É o instante das fotos de
// backlog do slide 07 (colunas p28 / p7 / hoje).
function _bolInstante_(diasAtras) {
  return new Date(_bolHojeUTC_().getTime() + 864e5 - (diasAtras || 0) * 864e5);
}

// Janela [ini, fim) da semana ISO que contém `dataRef` (padrão: hoje), em UTC
// para casar com as datas da base. Reaproveita intervaloSemanaISO de
// config.gs, que já é a regra do boletim (segunda a domingo).
function _bolJanelaSemana_(dataRef) {
  const iv  = intervaloSemanaISO(dataRef || new Date());
  const ini = new Date(Date.UTC(iv.inicio.getFullYear(), iv.inicio.getMonth(), iv.inicio.getDate()));
  const fim = new Date(Date.UTC(iv.fim.getFullYear(), iv.fim.getMonth(), iv.fim.getDate()) + 864e5);
  return { ini: ini, fim: fim };
}

function _bolDentro_(d, janela) {
  return !!d && d >= janela.ini && d < janela.fim;
}


// ==========================================
// CONTAS POR EMPREENDIMENTO (base para a etapa 2)
// ==========================================
// Para cada Centro de Custos: abertos e fechados na semana, e o backlog nas
// três fotos que o slide 07 mostra. Tudo da MESMA base, então a identidade
//     backlog(hoje) = backlog(7d) + abertos(7d) − fechados(7d)
// vale por construção.
//
// Retorna { porEmp: { <chave>: {...} }, total: {...}, semana } ou null.
function obterCorretivasBoletim_(dataRef) {
  const itens = _bolLerBase_(BD_ABA_CORRETIVAS);
  if (!itens.length) return null;
  // Guarda contra coluna de data renomeada: sem data legível tudo daria 0 e
  // os slides zerariam em silêncio (a "armadilha do zero falso").
  if (!itens.some(function (it) { return it.dtReporte; })) {
    Logger.log('BD-CORRETIVAS: ' + itens.length + ' linhas, nenhuma com data legível — confira o cabeçalho.');
    return null;
  }

  const semana = _bolJanelaSemana_(dataRef);
  const fotos  = BOL_BACKLOG_DIAS.map(function (d) { return { dias: d, instante: _bolInstante_(d) }; });

  const zero = function () {
    const o = { abertosSemana: 0, fechadosSemana: 0, backlog: {}, equipes: {} };
    fotos.forEach(function (f) { o.backlog[f.dias] = 0; });
    return o;
  };

  const porEmp = {};
  const total  = zero();

  itens.forEach(function (it) {
    const chave = _bolChaveEmp_(it.cc);
    if (!porEmp[chave]) { porEmp[chave] = zero(); porEmp[chave].nome = it.cc; }
    const alvos = [porEmp[chave], total];

    if (_bolDentro_(it.dtReporte, semana)) alvos.forEach(function (a) { a.abertosSemana++; });
    if (_bolDentro_(it.dtFechado, semana)) alvos.forEach(function (a) { a.fechadosSemana++; });

    fotos.forEach(function (f) {
      if (_bolAbertoEm_(it, f.instante)) alvos.forEach(function (a) { a.backlog[f.dias]++; });
    });

    // Composição do backlog de HOJE por equipe (slide 05).
    if (_bolAbertoEm_(it, fotos[fotos.length - 1].instante)) {
      const eq = _resolverEquipeResponsaveis_(it.responsaveis) || 'NAO_RECONHECIDO';
      alvos.forEach(function (a) { a.equipes[eq] = (a.equipes[eq] || 0) + 1; });
    }
  });

  return { porEmp: porEmp, total: total, semana: semana, fotos: fotos };
}


// ==========================================
// SLIDE 05 — MANUTENÇÃO CORRETIVA (Visão Executiva)
// ==========================================
// Fila de HOJE por equipe + como ela se comportou nos últimos meses.
// Substitui as células C37:C40 (backlog por equipe) e as linhas 182/183/185
// (histórico mensal) da aba QUADRO COMPARATIVO.
//
// Os cinco cartões do topo passam a fechar entre si por construção: cada
// chamado em aberto cai em EXATAMENTE uma equipe, então
//     Facilities + Property + Locatários + Operação = Backlog Total
// Hoje são quatro células digitadas em lugares diferentes que precisam
// concordar — e o slide já saiu com a composição somando 465 enquanto os
// cartões somavam 504.
//
// O "vs período anterior" também deixa de ser comparação entre fontes
// distintas (cartão da tabela resumo x histórico da linha 182): passa a ser a
// mesma conta em dois instantes.

// Fim do mês (início do 1º dia do mês seguinte, exclusivo) — o instante em
// que se fotografa a fila daquele mês.
function _bolFimDoMes_(ano, mesIdx) {
  return new Date(Date.UTC(ano, mesIdx + 1, 1));
}

const BOL_MESES_NOME = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
                        'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

// Os `n` últimos meses, do mais antigo ao mais recente. O ÚLTIMO é o mês
// corrente e é fotografado HOJE (não no fim do mês, que ainda não chegou) —
// senão a última barra mostraria o futuro.
function _bolMesesFila_(n) {
  const hoje = _bolHojeUTC_();
  const ano = hoje.getUTCFullYear(), mes = hoje.getUTCMonth();
  const saida = [];
  for (let i = n - 1; i >= 1; i--) {
    const d = new Date(Date.UTC(ano, mes - i, 1));
    saida.push({
      label: BOL_MESES_NOME[d.getUTCMonth()],
      instante: _bolFimDoMes_(d.getUTCFullYear(), d.getUTCMonth())
    });
  }
  saida.push({ label: BOL_MESES_NOME[mes], instante: _bolInstante_(0) });
  return saida;
}

// Equipe de um chamado para o slide 05. Nome fora do mapa cai em FACILITIES —
// mesma regra da apresentação mensal, e o motivo é o mesmo: "OUTROS" dava a
// impressão falsa de que ninguém da operação era responsável.
function _bolEquipeChamado_(item) {
  return _resolverEquipeResponsaveis_(item.responsaveis) || 'FACILITIES';
}

// Retorna { kpis, historico[], meses, tipoDisciplina[] } ou null.
//   kpis      → fila de hoje por equipe + total + o mesmo de N meses atrás
//   historico → uma entrada por mês: { label, FACILITIES, PROPERTY, ... , total }
function obterQuadroCorretivasBoletim_(nMeses) {
  nMeses = nMeses || 4;
  const itens = _bolLerBase_(BD_ABA_CORRETIVAS);
  if (!itens.length) return null;
  if (!itens.some(function (it) { return it.dtReporte; })) {
    Logger.log('BD-CORRETIVAS: linhas sem data legível — o slide 05 fica com a fonte antiga.');
    return null;
  }

  const EQUIPES = ['FACILITIES', 'PROPERTY', 'LOCATARIO', 'OPERACAO'];

  const fotografar = function (instante) {
    const o = { total: 0 };
    EQUIPES.forEach(function (e) { o[e] = 0; });
    itens.forEach(function (it) {
      if (!_bolAbertoEm_(it, instante)) return;
      o.total++;
      const eq = _bolEquipeChamado_(it);
      o[eq] = (o[eq] || 0) + 1;
    });
    return o;
  };

  const meses = _bolMesesFila_(nMeses);
  const historico = meses.map(function (m) {
    const f = fotografar(m.instante);
    f.label = m.label;
    return f;
  });

  // A foto de HOJE é a última do histórico — o cartão grande e a última barra
  // do gráfico passam a ser literalmente o mesmo número.
  const hoje = historico[historico.length - 1];
  const anterior = historico.length > 1 ? historico[historico.length - 2] : hoje;

  return {
    kpis: {
      total     : hoje.total,
      facilities: hoje.FACILITIES,
      property  : hoje.PROPERTY,
      locatarios: hoje.LOCATARIO,
      operacao  : hoje.OPERACAO,
      totalAnterior: anterior.total,
      mesAnterior  : anterior.label
    },
    historico: historico,
    meses: meses.map(function (m) { return m.label; }),
    composicao: obterComposicaoTipoBoletim_()
  };
}


/**
 * Composição da fila de HOJE por TIPO: Corretivas / Melhorias / Projetos /
 * Locatários — o recorte que o painel do slide 05 sempre teve.
 *
 * DE ONDE VEM A REGRA: das fórmulas que a planilha já usava. Melhoria e
 * Projeto estão na coluna C da BD-CORRETIVAS, achados por trecho de texto
 * ("*Melhoria*", "*Consulta*"); Locatário sai da coluna Responsáveis. O que
 * sobra é corretiva. A conta de "em aberto" é a mesma dos cartões
 * (_bolAbertoEm_), que é o equivalente do
 *     CONT.SES(reportado <= D) − CONT.SES(fechado <= D)
 * das fórmulas.
 *
 * O QUE MUDA EM RELAÇÃO ÀS CÉLULAS DIGITADAS: aqui as quatro fatias FECHAM
 * com o backlog total, porque cada chamado em aberto cai em exatamente uma.
 * Nas células não fechava — o slide saía com Corretivas 348 + Melhorias 83 +
 * Projetos 2 + Locatários 46 = 479 embaixo de um backlog de 525, e as quatro
 * contagens eram independentes, então ninguém percebia os 46 que sumiam.
 *
 * Devolve [{ label, val, pct }] na ordem fixa do painel, ou [] se a base não
 * responder.
 */
function obterComposicaoTipoBoletim_() {
  const itens = _bolLerBase_(BD_ABA_CORRETIVAS);
  if (!itens.length) return [];

  const instante = _bolInstante_(0);
  const ORDEM  = ['CORRETIVAS', 'MELHORIAS', 'PROJETOS', 'LOCATARIO'];
  const ROTULO = { CORRETIVAS: 'CORRETIVAS', MELHORIAS: 'MELHORIAS',
                   PROJETOS: 'PROJETOS', LOCATARIO: 'LOCATÁRIOS' };

  const cont = {};
  ORDEM.forEach(function (k) { cont[k] = 0; });
  let total = 0, ambos = 0, semTipo = 0;

  itens.forEach(function (it) {
    if (!_bolAbertoEm_(it, instante)) return;
    total++;
    const t = _histNorm_(it.tipoServico);
    if (!t) semTipo++;
    // Chamado que é obra E é do locatário: conta em Locatários (ver a ordem em
    // _bolTipoServico_), mas fica registrado para a escolha ser visível.
    const ehObra = BOL_TIPO_REGRAS.some(function (r) {
      return r.palavras.some(function (p) { return t.indexOf(p) >= 0; });
    });
    if (ehObra && _chamadoResponsabilidadeLocatario_(it.responsaveis)) ambos++;
    cont[_bolTipoServico_(it)]++;
  });

  if (!total) return [];

  Logger.log('Composição por tipo (fila de hoje = ' + total + '): ' +
    ORDEM.map(function (k) { return ROTULO[k] + '=' + cont[k]; }).join(' | '));
  if (ambos) {
    Logger.log('  · ' + ambos + ' chamado(s) são Melhoria/Projeto E de responsabilidade do ' +
               'locatário. Estão contados em Locatários. Se esse número crescer, a ordem ' +
               'das fatias passa a mudar o slide.');
  }
  // Zero falso: coluna renomeada faria tipoServico vir vazio em TODAS as
  // linhas, e o painel mostraria 100% Corretivas sem erro nenhum.
  if (semTipo === total) {
    Logger.log('  ⚠ NENHUM chamado em aberto tem tipo de serviço preenchido — a coluna ' +
               'provavelmente mudou de nome/lugar. O painel cairia em 100% Corretivas; ' +
               'devolvendo vazio para o slide usar a fonte antiga.');
    return [];
  }
  if (semTipo) {
    Logger.log('  · ' + semTipo + ' chamado(s) em aberto sem tipo de serviço — contados como Corretivas.');
  }

  return ORDEM.map(function (k) {
    return { label: ROTULO[k], val: cont[k], pct: Math.round(cont[k] / total * 100) };
  });
}


// Composição da fila de HOJE por DISCIPLINA (coluna "Área" da base:
// Elétrica/Lógica/Telefonia, Cobertura, Hidrossanitário, Piso...).
//
// NÃO é o que o slide 05 mostra — ele usa obterComposicaoTipoBoletim_. Esta
// aqui responde outra pergunta ("em que disciplina a fila está concentrada?")
// e serve ao diagnóstico. Vale manter porque é o recorte que diz onde alocar
// gente, enquanto o por-tipo diz que natureza de trabalho está represada.
//
// HISTÓRICO, para não repetir o engano: esta função chegou a substituir o
// painel por tipo, com a justificativa de que a base não separava Corretivas
// de Melhorias e Projetos. Estava errado — separa, na coluna C, e as fórmulas
// da planilha já usavam isso. O erro foi olhar só os cabeçalhos "Tipo de
// reporte" (OPERATOR/CONTACT) e "Tipo", e concluir que não havia de onde tirar
// em vez de perguntar como a planilha fazia.
//
// As `n` maiores viram linhas; o resto é somado em "OUTRAS", para o painel
// continuar com poucas linhas e ainda assim somar o backlog inteiro.
// Devolve [{ label, val, pct }] ou [] se a base não responder.
function obterComposicaoBacklogBoletim_(n) {
  n = n || 4;
  const itens = _bolLerBase_(BD_ABA_CORRETIVAS);
  if (!itens.length) return [];

  const instante = _bolInstante_(0);
  const porArea = {};
  let total = 0;
  itens.forEach(function (it) {
    if (!_bolAbertoEm_(it, instante)) return;
    total++;
    const a = String(it.area || '').trim() || '(sem área)';
    porArea[a] = (porArea[a] || 0) + 1;
  });
  if (!total) return [];

  const ordenado = Object.keys(porArea)
    .map(function (k) { return { label: k, val: porArea[k] }; })
    .sort(function (a, b) { return b.val - a.val; });

  const linhas = ordenado.slice(0, n);
  const resto  = ordenado.slice(n).reduce(function (s, d) { return s + d.val; }, 0);
  if (resto > 0) linhas.push({ label: 'OUTRAS', val: resto });

  linhas.forEach(function (l) { l.pct = Math.round(l.val / total * 100); });
  return linhas;
}


// ==========================================
// DIAGNÓSTICO — RODE ISTO PRIMEIRO
// ==========================================
// Responde as perguntas que decidem as etapas 2 a 4, ANTES de trocar
// qualquer slide:
//
//   1. Os nomes batem? (empreendimento do boletim x Centro de Custos da base)
//   2. Os números batem? (o que a planilha mostra x o que a base calcula)
//   3. O que dá para calcular que hoje é digitado? (MTTR, composição, equipes)
//
// SEM sufixo "_" de propósito: o menu "Selecionar função" do editor esconde
// funções que começam ou terminam com underscore.
function diagnosticarBoletim() {
  Logger.log('==========================================================');
  Logger.log('DIAGNÓSTICO DO BOLETIM — base bruta x planilha do boletim');
  Logger.log('==========================================================');

  const itens = _bolLerBase_(BD_ABA_CORRETIVAS);
  Logger.log('BD-CORRETIVAS: ' + itens.length + ' linha(s) lida(s).');
  if (!itens.length) { Logger.log('Sem dados — nada a conferir.'); return; }

  // ── 1. Empreendimento do boletim x Centro de Custos da base ──────────────
  Logger.log('\n── 1. OS NOMES BATEM? ──────────────────────────────────');
  const doBoletim = {};   // chave -> nome como está na planilha
  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet = ss.getSheetByName('BOLETIM - CORRETIVAS');
    if (sheet) {
      // Mesmas linhas/coluna que gerarSlide07_CorretivasEmpreendimento usa.
      const bloco = sheet.getRange(7, 4, 20, 1).getDisplayValues();
      bloco.forEach(function (l) {
        const nome = String(l[0] || '').trim();
        if (nome) doBoletim[_bolChaveEmp_(nome)] = nome;
      });
    } else {
      Logger.log('  ✗ aba "BOLETIM - CORRETIVAS" não encontrada.');
    }
  } catch (e) {
    Logger.log('  ✗ não deu para ler a planilha do boletim: ' + e.message);
  }

  const daBase = {};
  itens.forEach(function (it) { daBase[_bolChaveEmp_(it.cc)] = it.cc; });

  const nosDois = [], soBoletim = [], soBase = {};
  Object.keys(doBoletim).forEach(function (k) {
    if (daBase[k]) nosDois.push(doBoletim[k]); else soBoletim.push(doBoletim[k]);
  });
  Object.keys(daBase).forEach(function (k) { if (!doBoletim[k]) soBase[k] = daBase[k]; });

  Logger.log('  ✓ nos dois (' + nosDois.length + '): ' + nosDois.join(' | '));
  if (soBoletim.length) {
    Logger.log('  ⚠ SÓ no boletim (' + soBoletim.length + ') — sem chamado nenhum na base, ' +
               'ou o nome está escrito diferente: ' + soBoletim.join(' | '));
  }
  const chavesSoBase = Object.keys(soBase);
  if (chavesSoBase.length) {
    const comQtd = chavesSoBase.map(function (k) {
      const n = itens.filter(function (it) { return _bolChaveEmp_(it.cc) === k; }).length;
      return soBase[k] + ' (' + n + ')';
    }).sort();
    Logger.log('  ⚠ SÓ na base (' + chavesSoBase.length + ') — não têm linha no boletim: ' + comQtd.join(' | '));
  }

  // ── 2. Os números batem? ────────────────────────────────────────────────
  Logger.log('\n── 2. OS NÚMEROS BATEM? (planilha → base) ──────────────');
  const calc = obterCorretivasBoletim_();
  if (!calc) { Logger.log('  não deu para calcular.'); return; }
  Logger.log('  Semana ISO usada: ' + calc.semana.ini.toISOString().slice(0, 10) +
             ' a ' + new Date(calc.semana.fim.getTime() - 864e5).toISOString().slice(0, 10));

  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet = ss.getSheetByName('BOLETIM - CORRETIVAS');
    if (sheet) {
      const num = function (v) {
        const n = parseFloat(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.'));
        return isNaN(n) ? null : n;
      };
      const cmp = function (planilha, base) {
        const p = num(planilha);
        if (p === null) return String(base);
        return p === base ? String(base) : (String(base) + '≠' + p);
      };

      Logger.log('  emp | abertos sem. | fechados sem. | backlog hoje | 7d | 28d   (base≠planilha quando difere)');
      const bloco = sheet.getRange(7, 1, 20, 25).getDisplayValues();
      let divergentes = 0;
      bloco.forEach(function (r) {
        const nome = String(r[3] || '').trim();     // coluna 4
        if (!nome) return;
        const e = calc.porEmp[_bolChaveEmp_(nome)];
        if (!e) { Logger.log('    ' + nome + ': sem linha na base'); return; }
        const linha = '    ' + nome +
          ' | ' + cmp(r[7],  e.abertosSemana) +      // coluna 8
          ' | ' + cmp(r[11], e.fechadosSemana) +     // coluna 12
          ' | ' + cmp(r[21], e.backlog[0]) +         // coluna 22 (hoje)
          ' | ' + cmp(r[20], e.backlog[7]) +         // coluna 21 (7 dias)
          ' | ' + cmp(r[19], e.backlog[28]);         // coluna 20 (28 dias)
        if (linha.indexOf('≠') >= 0) divergentes++;
        Logger.log(linha);
      });
      Logger.log('  → ' + divergentes + ' empreendimento(s) com pelo menos uma divergência.');
    }
  } catch (e) {
    Logger.log('  ✗ comparação falhou: ' + e.message);
  }

  // Identidade da lição nº 2 do CLAUDE.md, no total do portfólio.
  const t = calc.total;
  const esperado = t.backlog[7] + t.abertosSemana - t.fechadosSemana;
  Logger.log('\n  Conferência de coerência interna (total do portfólio):');
  Logger.log('    backlog(7d)=' + t.backlog[7] + ' + abertos=' + t.abertosSemana +
             ' − fechados=' + t.fechadosSemana + ' = ' + esperado +
             '  |  backlog(hoje)=' + t.backlog[0] +
             (esperado === t.backlog[0] ? '  ✓ fecha' :
              '  ⚠ difere em ' + (t.backlog[0] - esperado) +
              ' (a semana ISO e a janela de 7 dias não são o mesmo recorte — esperado)'));

  // ── 3. O que dá para automatizar além disso? ────────────────────────────
  Logger.log('\n── 3. O QUE MAIS DÁ PARA CALCULAR? ─────────────────────');

  const abertos = itens.filter(function (it) { return _bolAbertoEm_(it, _bolInstante_(0)); });
  Logger.log('  Backlog de hoje por equipe (slide 05): ' +
    Object.keys(t.equipes).sort(function (a, b) { return t.equipes[b] - t.equipes[a]; })
      .map(function (k) { return k + '=' + t.equipes[k]; }).join(' | '));
  const naoRec = t.equipes['NAO_RECONHECIDO'] || 0;
  if (naoRec) {
    Logger.log('    ⚠ ' + naoRec + ' chamado(s) com responsável fora do mapa _RESPONSAVEL_EQUIPE_. ' +
               'No consumo eles caem em Facilities (regra da mensal); se forem muitos, vale ' +
               'acrescentar os nomes.');
  }

  const pct = function (n) { return abertos.length ? Math.round(n / abertos.length * 100) + '%' : '0%'; };
  const preenchidos = function (campo) {
    return abertos.filter(function (it) { return String(it[campo] || '').trim(); }).length;
  };
  Logger.log('  Preenchimento nos ' + abertos.length + ' chamados em aberto:');
  [['area', 'Área (disciplina)'], ['equipamento', 'Equipamentos (viabilidade de MTBF)'],
   ['tipo', 'Tipo (classificar melhorias/projetos?)'], ['tempoFechar', 'Tempo para fechar (MTTR)']
  ].forEach(function (p) {
    const n = preenchidos(p[0]);
    Logger.log('    · ' + p[1] + ': ' + n + '/' + abertos.length + ' (' + pct(n) + ')');
  });

  const amostra = function (campo, n) {
    const vals = {};
    itens.forEach(function (it) { const v = String(it[campo] || '').trim(); if (v) vals[v] = (vals[v] || 0) + 1; });
    return Object.keys(vals).sort(function (a, b) { return vals[b] - vals[a]; })
      .slice(0, n).map(function (k) { return k + '=' + vals[k]; }).join(' | ');
  };
  Logger.log('  Valores de "Tipo" (top 8): ' + amostra('tipo', 8));
  Logger.log('  Valores de "Área"  (top 8): ' + amostra('area', 8));

  // ── 3b. A composição por tipo bate? ─────────────────────────────────────
  // É o painel do slide 05. As palavras procuradas são as mesmas dos CONT.SES
  // da planilha; se a base trouxer um "Melhoria" escrito de outro jeito, ele
  // aparece aqui como Corretiva e a lista abaixo mostra onde.
  Logger.log('\n── 3b. COMPOSIÇÃO POR TIPO (painel do slide 05) ────────');
  Logger.log('  Valores de tipo de serviço, coluna C (top 12):');
  Logger.log('    ' + amostra('tipoServico', 12));

  const comp = obterComposicaoTipoBoletim_();
  if (!comp.length) {
    Logger.log('  ✗ não deu para calcular — o slide cai nas células digitadas.');
  } else {
    const somaComp = comp.reduce(function (a, c) { return a + c.val; }, 0);
    Logger.log('  ' + comp.map(function (c) { return c.label + '=' + c.val + ' (' + c.pct + '%)'; }).join(' | '));
    Logger.log('  soma=' + somaComp + '  |  backlog de hoje=' + abertos.length +
               (somaComp === abertos.length ? '  ✓ fecha'
                : '  ⚠ NÃO fecha — as fatias deveriam particionar o backlog'));

    // O que a planilha tem digitado nas mesmas quatro células, para comparar.
    try {
      const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
      const sheet = ss.getSheetByName(CR_DESIGN_SYSTEM.assets.sheetName);
      if (sheet) {
        const cel = function (c) { return Number(sheet.getRange(c).getValue()) || 0; };
        const g = cel('G40'), d = cel('D40'), e = cel('E40'), f = cel('F40');
        Logger.log('  Planilha (G40/D40/E40/F40): CORRETIVAS=' + g + ' | MELHORIAS=' + d +
                   ' | PROJETOS=' + e + ' | LOCATÁRIOS=' + f + '  → soma=' + (g + d + e + f));
      }
    } catch (err) {
      Logger.log('  (não deu para ler as células da planilha: ' + err.message + ')');
    }
  }

  // MTTR: dá para medir de "Data de reporte" até "Fechado em".
  const fechados = itens.filter(function (it) {
    return _bdChamadoFechado_(it.estado, it.dtFechado) && it.dtReporte && it.dtFechado;
  });
  if (fechados.length) {
    const dias = fechados.map(function (it) { return (it.dtFechado - it.dtReporte) / 864e5; })
      .sort(function (a, b) { return a - b; });
    const media = dias.reduce(function (s, d) { return s + d; }, 0) / dias.length;
    const mediana = dias[Math.floor(dias.length / 2)];
    Logger.log('  Tempo de reparo (reporte → fechamento) em ' + fechados.length + ' chamados fechados: ' +
               'média ' + (Math.round(media * 10) / 10) + 'd, mediana ' + (Math.round(mediana * 10) / 10) + 'd.');
    Logger.log('    → compare com o "TEMPO DE REPARO (DIAS)" do slide 04. Se bater, dá para calcular; ' +
               'se não, a planilha usa outra definição (tempo útil, descontando pausas).');
  }

  Logger.log('\nPronto. Nada na tela mudou — esta etapa só mede.');
}
