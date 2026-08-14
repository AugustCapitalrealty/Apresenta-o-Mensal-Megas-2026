/**
 * ARQUIVO: 10_Dados_BasesBrutas.gs
 * DESCRIÇÃO: Camada de dados dos 4 slides operacionais, lida das BASES BRUTAS
 * (uma linha por registro) em vez das células pré-agregadas da planilha da TV.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * Até aqui o Gestão à Vista TV lia número já somado:
 *   ▸ Visão Geral Corretiva  → células fixas da aba CHAMADOS (linhas 40/41/42
 *                              por semana, 78/79/80 col. D pro dia)
 *   ▸ Visão Geral Preventiva → células fixas da aba PREVENTIVA (24/25/26),
 *                              mais o histórico mensal e o comparativo de
 *                              mesmo período em colunas à direita
 *   ▸ Backlog Corretivo      → aba "CHAMADOS - DETALHE - <CIDADE>"   (cópia local)
 *   ▸ Backlog Preventivo     → aba "PREVENTIVA - DETALHE - <CIDADE>" (cópia local)
 *
 * Agora os quatro saem da planilha BASE DE DADOS — QUADRO REM
 * (BD_CORRETIVAS_ID), abas BD-CORRETIVAS e BD-PREVENTIVAS — a MESMA fonte da
 * apresentação mensal dos Megas e da de Propriedades. É a lição nº 3 do
 * CLAUDE.md ("prefira a base bruta à aba digitada") aplicada aqui.
 *
 * O GANHO QUE NÃO É ÓBVIO: com o fluxo (Visão Geral Corretiva = chamados
 * criados) e o estoque (Backlog Corretivo = chamados em aberto) saindo das
 * MESMAS linhas, a identidade da lição nº 2 do CLAUDE.md
 *     backlog(fim) = backlog(início) + criados − fechados
 * passa a valer por construção, em vez de depender de duas abas digitadas
 * concordarem entre si.
 *
 * INDEPENDENTE: não depende de nenhum outro arquivo do projeto. Repare que
 * 09_Metas_Auto.gs já tem um `_histNorm` (sem underscore final) — o daqui é
 * `_histNorm_` COM underscore, nome diferente, então os dois convivem no
 * mesmo namespace global sem colidir.
 *
 * NOMES REPETIDOS DE PROPÓSITO: _histParseDataHora_, _bdChamadoFechado_,
 * _slaClasse_, _normalizarPrioridade_, _resolverEquipeResponsaveis_ e
 * _limparDescricaoChecklist_ têm os mesmos nomes de megas-mensal/02_Dados.gs e
 * propriedades-mensal/02_Dados.gs. São projetos Apps Script separados (não
 * colidem em execução), e manter o nome faz copiar função entre eles
 * funcionar sem reescrever as chamadas.
 */

// Planilha "BASE DE DADOS — QUADRO REM": as duas bases brutas,
// multi-empreendimento, histórico desde 2021.
const BD_CORRETIVAS_ID = '1YlNZK_SdS_VTSPWzqOn_cYs1PjM5BO-VWgqSp-YpcVo';

// Nomes EXATOS das abas. Repare no espaço em volta do hífen em
// "BD - PREVENTIVAS": as abas não seguem um padrão único, então _tvAba_
// compara ignorando espaços e pontuação.
const BD_ABA_CORRETIVAS  = 'BD-CORRETIVAS';
const BD_ABA_PREVENTIVAS = 'BD - PREVENTIVAS';

// Quantas semanas fechadas o gráfico "EVOLUÇÃO" das Corretivas mostra.
const TV_SEMANAS_HISTORICO = 5;

// Quantos meses o gráfico "EVOLUÇÃO" das Preventivas mostra (o último é o
// mês corrente, até hoje).
const TV_MESES_HISTORICO = 5;


// ==========================================
// HELPERS DE PARSE / CLASSIFICAÇÃO
// ==========================================

// Texto sem acento, minúsculo, espaços colapsados. Note o underscore FINAL:
// 09_Metas_Auto.gs tem um `_histNorm` sem ele, e são funções distintas.
function _histNorm_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim();
}

// Número no padrão brasileiro (66336 → "66.336"; 27.91 → "27,91").
function formatarNumeroBR(valor) {
  if (valor === null || valor === undefined || valor === '' || valor === '-') return '-';
  const s = String(valor).trim();
  if (/[^\d.,\-\s]/.test(s)) return s;
  let n;
  if (s.indexOf(',') >= 0) n = Number(s.replace(/\./g, '').replace(',', '.'));
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) n = Number(s.replace(/\./g, ''));
  else n = Number(s);
  if (isNaN(n)) return s;
  const temDecimal = Math.abs(n % 1) > 1e-9;
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: temDecimal ? 2 : 0,
    maximumFractionDigits: 2
  });
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
// mudar. Correspondência EXATA, não "contém": valor novo vira DESCONHECIDO e
// aparece em diagnosticarBasesBrutas(), em vez de entrar torto na conta.
function _slaClasse_(valor) {
  const n = _histNorm_(valor);
  if (!n) return 'SEM';
  if (n === 'nao cumprido' || n === 'sla nao cumprido') return 'NAO';
  if (n === 'cumprido'     || n === 'sla cumprido')     return 'CUMPRIDO';
  if (n === 'sem sla')                                  return 'SEM';
  return 'DESCONHECIDO';
}

// A coluna Descrição vem com um prefixo de metadado de checklist na frente do
// texto livre — ex.: "PMP.904036.68674893 CHECKLIST - FACILITIES | Bombas de
// Drenagem | Posto SIM: C02. Estado de conservação da carcaça: Não Conforme -
// Bomba fora do lugar". Só interessa a descrição real do problema. Remove só
// quando REALMENTE começa com esse padrão; texto livre fica intacto. Mesma
// função já usada nos outros dois projetos.
function _limparDescricaoChecklist_(desc) {
  if (!desc) return desc;
  let limpo = desc;
  const reMeta = /^\S+\s+CHECKLIST\s*-\s*\S+(?:\s*\|[^|]*)+?:\s*\S+?\.\s*/i;
  limpo = limpo.replace(reMeta, '');
  const reCampo = /^[^:\n]{1,80}:\s*(?:Não\s+)?Conforme\b[\s\-–]*/i;
  limpo = limpo.replace(reCampo, '');
  limpo = limpo.trim();
  return limpo || desc;
}


// ==========================================
// EQUIPE RESPONSÁVEL (coluna "Responsáveis" — lista separada por vírgula)
// ==========================================
// Mapa NOME → EQUIPE, cópia do de megas-mensal/02_Dados.gs (mesmas pessoas,
// mesmos Megas). Chave normalizada pra casar com/sem acento e maiúsculas.
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
// lista de Responsáveis — quando presente, PREVALECE sobre a equipe.
function _chamadoResponsabilidadeLocatario_(responsaveisTxt) {
  return _histNorm_(responsaveisTxt).indexOf('responsabilidade locatario') >= 0;
}

// Prioridade: locatário → PROPERTY (regra combinada: "quem prevalece é
// Property") → FACILITIES → OPERACAO → '' se ninguém reconhecido.
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

// Resolve a equipe de um item: usa uma coluna "Equipe" pronta quando existe,
// senão deduz da lista de Responsáveis.
//
// ATENÇÃO — vale para CORRETIVAS, não para PREVENTIVAS. Conferido no
// cabeçalho real da planilha: a BD-PREVENTIVAS não tem "Responsáveis" nem
// "Equipe"; as únicas colunas de gente são "Fechado por", "Iniciado por",
// "Utilizadores" e "Fornecedor". Numa rotina AINDA ABERTA (o caso do Backlog
// Preventivo) "Fechado por" está necessariamente vazio, então não há de onde
// tirar a equipe. Devolve '' — e quem chama tem que tratar isso como
// "desconhecido", NÃO como Facilities: carimbar todo mundo de Facilities
// daria um "MAIOR VOLUME: FACILITIES" que é só o default aparecendo, não um
// fato sobre a operação.
function _tvEquipeItem_(item) {
  const eq = _histNorm_(item.equipe);
  if (eq.indexOf('propert') >= 0 || eq.indexOf('propriedade') >= 0) return 'PROPERTY';
  if (eq.indexOf('facilit') >= 0) return 'FACILITIES';
  return _resolverEquipeResponsaveis_(item.responsaveis || item.fechadoPor);
}


// ==========================================
// LEITURA GENÉRICA DAS BASES
// ==========================================
// Um leitor só para as duas abas: elas moram na mesma planilha e compartilham
// as colunas que interessam. O mapeamento é por CONTEÚDO do cabeçalho, não por
// posição — coluna que muda de lugar não quebra a leitura, e coluna que muda
// de nome aparece em diagnosticarBasesBrutas().
const _tvBaseCache = {};

function _tvChaveAba_(s) {
  return _histNorm_(s).replace(/[^a-z0-9]/g, '');
}

function _tvAba_(ss, nome) {
  const alvo = _tvChaveAba_(nome);
  return ss.getSheetByName(nome) ||
         ss.getSheets().find(s => _tvChaveAba_(s.getName()) === alvo) ||
         ss.getSheets().find(s => _tvChaveAba_(s.getName()).indexOf(alvo) >= 0) ||
         null;
}

function _tvLerBase_(nomeAba) {
  if (_tvBaseCache[nomeAba]) return _tvBaseCache[nomeAba];
  try {
    const ss    = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    const sheet = _tvAba_(ss, nomeAba);
    if (!sheet) {
      Logger.log(nomeAba + ': aba não encontrada. Abas disponíveis: ' +
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

    const cCC     = col('centro de custo');
    const cEstado = col('estado');
    const cSla    = col('sla');
    const cQuem   = col('fechado por');
    const cResp   = col('responsaveis', 'responsável');
    const cEquipe = col('equipe');
    const cDesc   = col('descricao', 'descrição');
    // A aba tem duas colunas "Prioridade" (uma de texto, outra numérica);
    // col() pega a primeira, que é a de texto — mesmo comportamento dos
    // outros dois projetos na mesma base.
    const cPri    = col('prioridade');
    // Coluna da DISCIPLINA (painel "DISCIPLINAS" do Backlog Corretivo). Na
    // BD-CORRETIVAS ela se chama "Área" — valores como "Elétrica/Lógica/
    // Telefonia", "Cobertura", "Hidrossanitário", "Portas/Esquadrias/
    // Niveladoras". Não confundir com "Tipo", que é a mesma área concatenada
    // com o sintoma ("Cobertura - Infiltração d' água") e explodiria o painel
    // em dezenas de fatias. Os outros rótulos ficam como rede de segurança
    // caso a base seja renomeada; não achando nenhum, o painel só não é
    // desenhado (o slide não quebra).
    const cDisc   = col('area', 'disciplina', 'especialidade', 'familia', 'categoria');
    // As duas bases nomeiam as datas de formas diferentes — a primeira que
    // existir vence:
    //   CORRETIVAS:  "Data de reporte"  / "Fechado em"
    //   PREVENTIVAS: "Data agendamento" / "Fechada em"
    const cIni = col('data de reporte', 'data agendamento', 'data de agendamento');
    const cFim = col('fechado em', 'fechada em');

    if (cCC < 0) {
      Logger.log(nomeAba + ': sem coluna "Centro de Custos" — rode diagnosticarBasesBrutas().');
      return [];
    }
    // Só a base de CORRETIVAS alimenta o painel DISCIPLINAS; avisar sobre a
    // de PREVENTIVAS era ruído puro no Logger.
    if (nomeAba === BD_ABA_CORRETIVAS) {
      Logger.log(nomeAba + ': disciplina → ' +
        (cDisc >= 0 ? '"' + data[0][cDisc] + '"' : 'NÃO ENCONTRADA (painel DISCIPLINAS fica vazio)'));
    }

    const saida = [];
    for (let r = 1; r < data.length; r++) {
      const cc = String(data[r][cCC] || '').trim();
      if (!cc) continue;
      saida.push({
        cc         : cc,
        estado     : cEstado >= 0 ? String(data[r][cEstado] || '').trim() : '',
        sla        : cSla    >= 0 ? String(data[r][cSla]    || '').trim() : '',
        fechadoPor : cQuem   >= 0 ? String(data[r][cQuem]   || '').trim() : '',
        responsaveis: cResp  >= 0 ? String(data[r][cResp]   || '').trim() : '',
        equipe     : cEquipe >= 0 ? String(data[r][cEquipe] || '').trim() : '',
        disciplina : cDisc   >= 0 ? String(data[r][cDisc]   || '').trim() : '',
        descricao  : cDesc   >= 0 ? _limparDescricaoChecklist_(String(data[r][cDesc] || '').trim()) : '',
        prioridade : _normalizarPrioridade_(cPri >= 0 ? data[r][cPri] : ''),
        dtReporte  : cIni    >= 0 ? _histParseDataHora_(data[r][cIni]) : null,
        dtFechado  : cFim    >= 0 ? _histParseDataHora_(data[r][cFim]) : null
      });
    }
    // Só cacheia resultado bom: leitura vazia por falha transitória não pode
    // ficar grudada na rodada inteira.
    if (saida.length) _tvBaseCache[nomeAba] = saida;
    return saida;
  } catch (e) {
    Logger.log('_tvLerBase_(' + nomeAba + '): ' + e.message);
    return [];
  }
}

// Itens de UMA unidade. unit.name ("MEGA CURITIBA") casa com o Centro de
// Custos da base ("Mega Curitiba") depois de normalizar.
function _tvItensUnidade_(nomeAba, unit) {
  const alvo = _histNorm_(unit.name);
  return _tvLerBase_(nomeAba).filter(it => _histNorm_(it.cc) === alvo);
}


// ==========================================
// JANELAS SEMANAIS
// ==========================================
// A TV é semanal ("Comparações referem-se à semana anterior" no rodapé), então
// o recorte é a semana de SEGUNDA a DOMINGO. O gráfico mostra as N últimas
// semanas FECHADAS e o cartão grande mostra a semana CORRENTE em andamento —
// exatamente a estrutura que a leitura por células já tinha (histórico =
// colunas fechadas, cartão = número do dia), só que agora contada da base.
//
// Tudo em UTC porque _histParseDataHora_ constrói as datas em UTC; misturar
// fuso local aqui deslocaria os itens de sexta/domingo de semana.
function _tvSegundaDaSemana_(d) {
  const base = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow  = base.getUTCDay();            // 0=dom … 6=sáb
  return new Date(base.getTime() - ((dow + 6) % 7) * 864e5);   // volta até a segunda
}

function _tvLabelDia_(d) {
  return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

// As `n` últimas semanas COMPLETAS, em ordem cronológica. A mais recente é a
// que terminou no domingo passado.
function _tvSemanasCompletas_(n) {
  const segundaCorrente = _tvSegundaDaSemana_(new Date());
  const semanas = [];
  for (let i = n; i >= 1; i--) {
    const ini = new Date(segundaCorrente.getTime() - i * 7 * 864e5);
    semanas.push({ ini: ini, fim: new Date(ini.getTime() + 7 * 864e5), label: _tvLabelDia_(ini) });
  }
  return semanas;
}

// A semana em andamento. O fim é o domingo (exclusivo): como não existe
// registro no futuro, contar a janela inteira dá o acumulado da semana até
// agora, sem depender do relógio.
function _tvSemanaCorrente_() {
  const ini = _tvSegundaDaSemana_(new Date());
  return { ini: ini, fim: new Date(ini.getTime() + 7 * 864e5), label: _tvLabelDia_(ini) };
}

function _tvDentro_(d, janela) {
  return !!d && d >= janela.ini && d < janela.fim;
}


// ==========================================
// JANELAS MENSAIS (slide de Preventivas)
// ==========================================
// Preventivas raciocina por MÊS, não por semana: a aba PREVENTIVA tinha uma
// coluna por mês escrita por extenso na linha 23, e o slide comparava o mês
// corrente (até hoje) com o mês anterior RESTRITO AOS MESMOS DIAS — comparar
// um mês pela metade com um mês fechado inteiro sempre acusaria queda. Essas
// janelas reproduzem exatamente esse recorte a partir da base bruta.

function _tvHojeUTC_() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function _tvInicioDoMes_(ano, mesIdx) {
  return new Date(Date.UTC(ano, mesIdx, 1));
}

// Mês inteiro [1º, 1º do mês seguinte).
function _tvMesCompleto_(ano, mesIdx) {
  return {
    ini: _tvInicioDoMes_(ano, mesIdx),
    fim: _tvInicioDoMes_(ano, mesIdx + 1),   // Date.UTC normaliza mês 12 → janeiro do ano seguinte
    label: MESES_POR_EXTENSO[((mesIdx % 12) + 12) % 12]
  };
}

// Os `n` últimos meses, sendo o ÚLTIMO o mês corrente (que vai só até hoje,
// como a coluna do mês corrente na planilha ia). Em ordem cronológica.
function _tvMesesHistorico_(n) {
  const hoje = _tvHojeUTC_();
  const ano = hoje.getUTCFullYear(), mes = hoje.getUTCMonth();
  const meses = [];
  for (let i = n - 1; i >= 1; i--) meses.push(_tvMesCompleto_(ano, mes - i));
  const corrente = _tvMesCompleto_(ano, mes);
  // mês corrente: só até o fim do dia de hoje
  meses.push({ ini: corrente.ini, fim: new Date(hoje.getTime() + 864e5), label: corrente.label });
  return meses;
}

// Mês ANTERIOR restrito aos mesmos dias já decorridos no mês corrente
// (ex.: hoje é dia 14 → junho de 1 a 14). Nunca passa do fim do mês anterior:
// se hoje for 31 e o mês anterior tiver 30 dias, para no dia 30.
function _tvMesAnteriorMesmoPeriodo_() {
  const hoje = _tvHojeUTC_();
  const ano = hoje.getUTCFullYear(), mes = hoje.getUTCMonth();
  const iniAtual = _tvInicioDoMes_(ano, mes);
  const diasCorridos = Math.round((hoje.getTime() - iniAtual.getTime()) / 864e5) + 1;

  const iniPrev = _tvInicioDoMes_(ano, mes - 1);
  const fimPrevCheio = iniAtual;                              // 1º do mês corrente
  const fimPrevPeriodo = new Date(iniPrev.getTime() + diasCorridos * 864e5);
  return {
    ini: iniPrev,
    fim: new Date(Math.min(fimPrevPeriodo.getTime(), fimPrevCheio.getTime())),
    label: MESES_POR_EXTENSO[((mes - 1) % 12 + 12) % 12],
    dias: diasCorridos
  };
}


// ==========================================
// SLIDE 1 — VISÃO GERAL CORRETIVA (fluxo: chamados criados)
// ==========================================
// Conta os chamados ABERTOS na janela ("Data de reporte"), separados por
// equipe responsável. Substitui as células fixas das linhas 40/41/42
// (histórico) e 78/79/80 col. D (dia) da aba CHAMADOS.
//
// Retorna { atual, anterior, historico:[{dataCurta, facilities, propriedades,
// total}] } ou null se a base não trouxer linha nenhuma da unidade — nesse
// caso o slide é preservado como está, em vez de ir a zero na TV.
function obterCorretivasTV_(unit) {
  const itens = _tvItensUnidade_(BD_ABA_CORRETIVAS, unit);
  if (!itens.length) {
    Logger.log('BD-CORRETIVAS: nenhuma linha com Centro de Custos = "' + unit.name + '".');
    return null;
  }
  // Guarda contra coluna de data renomeada: sem "Data de reporte" legível
  // todas as janelas dariam 0 e o slide zeraria em silêncio.
  if (!itens.some(it => it.dtReporte)) {
    Logger.log('BD-CORRETIVAS: ' + itens.length + ' linhas de ' + unit.name +
               ', mas nenhuma com data legível — confira o cabeçalho da aba.');
    return null;
  }

  const contar = janela => {
    const res = { facilities: 0, propriedades: 0, total: 0 };
    itens.forEach(it => {
      if (!_tvDentro_(it.dtReporte, janela)) return;
      res.total++;
      const eq = _tvEquipeItem_(it);
      if (eq === 'PROPERTY') res.propriedades++;
      else res.facilities++;   // sem responsável reconhecido conta como Facilities (mesma regra dos Megas)
    });
    return res;
  };

  const historico = _tvSemanasCompletas_(TV_SEMANAS_HISTORICO).map(s => {
    const c = contar(s);
    return { dataCurta: s.label, facilities: c.facilities, propriedades: c.propriedades, total: c.total };
  });

  return {
    atual    : contar(_tvSemanaCorrente_()),
    anterior : historico[historico.length - 1] || { facilities: 0, propriedades: 0, total: 0 },
    historico: historico
  };
}


// ==========================================
// SLIDE 3 — VISÃO GERAL PREVENTIVA (conforme / não conforme / SLA)
// ==========================================
// Mesma regra de SLA já validada nos outros dois projetos:
//     SLA % = cumpridas / (cumpridas + não cumpridas) × 100
// "Sem SLA" fica inteiramente fora da fração, em cima e embaixo. A janela vale
// pela DATA DE AGENDAMENTO (a rotina pertence ao mês em que estava
// programada), e as CANCELADAS ENTRAM na conta — as duas escolhas foram
// conferidas contra a planilha oficial do time em 12 casos, ver o cabeçalho de
// propriedades-mensal/02_Dados.gs.
//
// Substitui TUDO que o slide lia da aba PREVENTIVA:
//   ▸ células fixas das linhas 24/25/26 (conforme/não conforme/%)
//   ▸ o histórico mensal das colunas com nome de mês na linha 23
//   ▸ o bloco "SLA CUMPRIDO <unidade>" do comparativo de mesmo período
//
// Retorna { atual, anterior, historico[], comparativo } no MESMO formato que
// 03_Slide_Preventivas.gs já consumia, para o desenho não mudar:
//   atual       → mês corrente até hoje
//   anterior    → mês anterior COMPLETO (só o fallback do desenho)
//   comparativo → mês anterior restrito aos mesmos dias já decorridos
function obterPreventivasMensalTV_(unit) {
  const itens = _tvItensUnidade_(BD_ABA_PREVENTIVAS, unit);
  if (!itens.length) {
    Logger.log('BD-PREVENTIVAS: nenhuma linha com Centro de Custos = "' + unit.name + '".');
    return null;
  }
  if (!itens.some(it => it.dtReporte)) {
    Logger.log('BD-PREVENTIVAS: ' + itens.length + ' linhas de ' + unit.name +
               ', mas nenhuma com data de agendamento legível — confira o cabeçalho.');
    return null;
  }

  const contar = janela => {
    let conforme = 0, naoConforme = 0;
    itens.forEach(it => {
      if (!_tvDentro_(it.dtReporte, janela)) return;
      const cls = _slaClasse_(it.sla);
      if (cls === 'CUMPRIDO') conforme++;
      else if (cls === 'NAO') naoConforme++;
    });
    const total = conforme + naoConforme;
    return {
      conforme    : conforme,
      naoConforme : naoConforme,
      total       : total,
      slaPerc     : total > 0 ? formatarNumeroBR(Math.round(conforme / total * 10000) / 100) + '%' : '-',
      dataCurta   : janela.label
    };
  };

  const meses     = _tvMesesHistorico_(TV_MESES_HISTORICO);
  const historico = meses.map(contar);
  const atual     = historico[historico.length - 1];

  // Mês anterior COMPLETO — o desenho usa isso só quando o comparativo de
  // mesmo período não estiver disponível.
  const hoje = _tvHojeUTC_();
  const anterior = contar(_tvMesCompleto_(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1));

  // Mês anterior no MESMO período (1 até o dia de hoje).
  const jPeriodo = _tvMesAnteriorMesmoPeriodo_();
  const periodo  = contar(jPeriodo);

  const comparativo = {
    mesLabel            : atual.dataCurta,           // nome do mês CORRENTE (o desenho deriva o anterior daqui)
    slaMesAtual         : atual.slaPerc,
    slaMesAnterior      : periodo.slaPerc,
    cumpridoAnterior    : periodo.conforme,
    naoCumpridoAnterior : periodo.naoConforme,
    diasComparados      : jPeriodo.dias
  };

  return { atual, anterior, historico, comparativo };
}


// ==========================================
// SLIDE 2 — BACKLOG CORRETIVO (estoque: chamados em aberto AGORA)
// ==========================================
// Em aberto = não fechado (Estado "Fechado" E com data de fechamento). Sem
// janela de tempo: é a fila de hoje.
//
// Retorna { pEmergencial, pAlta, pNormal, pBaixa, topAreas } ou null.
function obterBacklogCorretivoTV_(unit) {
  const itens = _tvItensUnidade_(BD_ABA_CORRETIVAS, unit);
  if (!itens.length) return null;

  const abertos = itens.filter(it => !_bdChamadoFechado_(it.estado, it.dtFechado));

  const res = { pEmergencial: 0, pAlta: 0, pNormal: 0, pBaixa: 0, topAreas: [] };
  const areasMap = {};

  abertos.forEach(it => {
    if (it.prioridade === 'Emergencial') res.pEmergencial++;
    else if (it.prioridade === 'Alta')   res.pAlta++;
    else if (it.prioridade === 'Normal') res.pNormal++;
    else if (it.prioridade === 'Baixa')  res.pBaixa++;

    if (it.disciplina) areasMap[it.disciplina] = (areasMap[it.disciplina] || 0) + 1;
  });

  res.topAreas = Object.keys(areasMap)
    .map(k => ({ area: k, count: areasMap[k] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return res;
}


// ==========================================
// SLIDE 4 — BACKLOG PREVENTIVO (rotinas atrasadas / em curso)
// ==========================================
// "Em curso" = Estado diz explicitamente em curso/execução. "Em aberto" =
// qualquer outra rotina NÃO fechada — inclusive um Estado que ainda não
// conhecemos. É de propósito: vocabulário novo entra como fila em aberto
// (visível, conservador) em vez de sumir da conta em silêncio.
//
// Agrupa por descrição + equipe, como a versão anterior fazia, e mede os dias
// em aberto a partir da data de agendamento.
function obterBacklogPreventivoTV_(unit) {
  const itens = _tvItensUnidade_(BD_ABA_PREVENTIVAS, unit);
  if (!itens.length) return null;

  const abertas = itens.filter(it => !_bdChamadoFechado_(it.estado, it.dtFechado));
  const hoje = Date.now();

  const gruposMap = {};
  let countEmAberto = 0, countEmCurso = 0, facilCount = 0, propCount = 0;

  abertas.forEach(it => {
    const n = _histNorm_(it.estado);
    const isEmCurso  = n.indexOf('em curso') >= 0 || n.indexOf('em execucao') >= 0;
    const isEmAberto = !isEmCurso;

    if (isEmAberto) countEmAberto++; else countEmCurso++;

    // Sem coluna de equipe na base, rotina aberta fica '—' em vez de virar
    // Facilities por omissão (ver _tvEquipeItem_).
    const equipe = _tvEquipeItem_(it) || '—';
    if (equipe === 'PROPERTY') propCount++;
    else if (equipe === 'FACILITIES') facilCount++;

    // Agrupa rotinas irmãs: tira o sufixo numérico ("Bomba de incêndio 03")
    // para as três ocorrências virarem uma linha "3x".
    let desc = String(it.descricao || '').trim();
    let descAgrupada = desc.replace(/[\s-]+\d+$/, '').trim();
    if (descAgrupada.length < 3) descAgrupada = desc;
    if (descAgrupada.length > 40) descAgrupada = descAgrupada.substring(0, 37) + '...';
    if (!descAgrupada) return;

    const chave = descAgrupada + '|' + equipe + '|' + isEmAberto;
    if (!gruposMap[chave]) {
      gruposMap[chave] = {
        desc: descAgrupada, equipe: equipe, isEmAberto: isEmAberto,
        qtd: 0, dataAntigaTs: Infinity, dataLabel: '-'
      };
    }
    gruposMap[chave].qtd++;

    const ts = it.dtReporte ? it.dtReporte.getTime() : Infinity;
    if (ts < gruposMap[chave].dataAntigaTs) {
      gruposMap[chave].dataAntigaTs = ts;
      if (ts !== Infinity) {
        const dias = Math.max(0, Math.floor((hoje - ts) / 864e5));
        gruposMap[chave].dataLabel = dias === 0 ? 'Hoje' : dias + ' dias';
      }
    }
  });

  const lista = Object.keys(gruposMap).map(k => gruposMap[k]).sort((a, b) => {
    if (a.isEmAberto !== b.isEmAberto) return a.isEmAberto ? -1 : 1;
    if (b.qtd !== a.qtd) return b.qtd - a.qtd;
    return a.dataAntigaTs - b.dataAntigaTs;
  });

  // "MAIOR VOLUME" só afirma alguma coisa se ALGUMA rotina teve equipe
  // resolvida; senão é '—'. Empate com as duas em zero cairia em FACILITIES
  // e mentiria com cara de dado.
  const equipeLider = (facilCount === 0 && propCount === 0)
    ? '—'
    : (facilCount >= propCount ? 'FACILITIES' : 'PROPERTY');
  if (facilCount === 0 && propCount === 0 && abertas.length) {
    Logger.log('BD-PREVENTIVAS (' + unit.name + '): nenhuma rotina aberta tem equipe ' +
               'identificável (a base não traz Responsáveis/Equipe) — o slide mostra "—".');
  }

  return {
    countEmAberto: countEmAberto,
    countEmCurso : countEmCurso,
    lista        : lista.slice(0, 6),
    equipeLider  : equipeLider
  };
}


// ==========================================
// DIAGNÓSTICO — RODE ISTO PRIMEIRO
// ==========================================
// Mesmo espírito do diagnosticarBacklog() dos Megas: antes de discutir
// número, mostrar o dado bruto. Diz se as abas abrem, qual é o cabeçalho real
// (para achar o nome da coluna de DISCIPLINA), quantas linhas cada Mega tem e
// que valores as colunas Estado e SLA trazem de verdade.
//
// SEM sufixo "_" de propósito: o menu "Selecionar função" do editor do Apps
// Script ESCONDE funções que começam ou terminam com underscore.
function diagnosticarBasesBrutas() {
  Logger.log('======================================================');
  Logger.log('DIAGNÓSTICO — BASES BRUTAS (BASE DE DADOS — QUADRO REM)');
  Logger.log('======================================================');

  let ss;
  try {
    ss = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    Logger.log('✓ Planilha: "' + ss.getName() + '"');
  } catch (e) {
    Logger.log('✗ Não abriu a planilha: ' + e.message);
    return;
  }
  Logger.log('  Abas: ' + ss.getSheets().map(s => s.getName()).join(' | '));

  [BD_ABA_CORRETIVAS, BD_ABA_PREVENTIVAS].forEach(nomeAba => {
    Logger.log('\n──────────────────────────────────────────');
    Logger.log('ABA: ' + nomeAba);
    const sheet = _tvAba_(ss, nomeAba);
    if (!sheet) { Logger.log('  ✗ não encontrada'); return; }

    const cabecalho = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    Logger.log('  Colunas (' + cabecalho.length + '):');
    cabecalho.forEach((h, i) => { if (String(h).trim()) Logger.log('    [' + i + '] ' + h); });

    const itens = _tvLerBase_(nomeAba);
    Logger.log('  Linhas lidas: ' + itens.length);

    UNITS.forEach(unit => {
      const meus = itens.filter(it => _histNorm_(it.cc) === _histNorm_(unit.name));
      const abertos = meus.filter(it => !_bdChamadoFechado_(it.estado, it.dtFechado));
      Logger.log('    · ' + unit.name + ': ' + meus.length + ' linhas, ' + abertos.length + ' em aberto');
    });

    const conta = (campo, filtro) => {
      const m = {};
      itens.filter(filtro || (() => true)).forEach(it => {
        const v = String(it[campo] || '(vazio)').trim() || '(vazio)';
        m[v] = (m[v] || 0) + 1;
      });
      return Object.keys(m).sort((a, b) => m[b] - m[a]).map(k => k + '=' + m[k]).join(' | ');
    };

    Logger.log('  Estado (só os EM ABERTO): ' +
      conta('estado', it => !_bdChamadoFechado_(it.estado, it.dtFechado)));
    Logger.log('  SLA: ' + conta('sla'));
    Logger.log('  Disciplina: ' + (itens.some(it => it.disciplina)
      ? conta('disciplina')
      : 'coluna não localizada — me diga qual é o rótulo dela no cabeçalho acima'));

    const desconhecidos = itens.filter(it => _slaClasse_(it.sla) === 'DESCONHECIDO');
    if (desconhecidos.length) {
      Logger.log('  ⚠ ' + desconhecidos.length + ' linha(s) com SLA fora do vocabulário conhecido — ' +
                 'não entram na conta de SLA. Valores: ' + conta('sla', it => _slaClasse_(it.sla) === 'DESCONHECIDO'));
    }
  });

  // A BD-PREVENTIVAS não tem coluna de Responsáveis/Equipe, então a coluna
  // "RESPONSÁVEL" do Backlog Preventivo hoje sai como "—". Estas são as
  // únicas colunas de gente da base: mostra quantas rotinas ABERTAS têm cada
  // uma preenchida, para decidir se alguma serve de substituta.
  Logger.log('\n──────────────────────────────────────────');
  Logger.log('QUEM É RESPONSÁVEL POR UMA PREVENTIVA ABERTA?');
  try {
    const ss2   = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    const sheet = _tvAba_(ss2, BD_ABA_PREVENTIVAS);
    if (!sheet) { Logger.log('  aba não encontrada'); return; }
    const data = sheet.getDataRange().getDisplayValues();
    const hdr  = data[0].map(_histNorm_);

    const cCC  = hdr.findIndex(h => h.indexOf('centro de custo') >= 0);
    const cEst = hdr.findIndex(h => h.indexOf('estado') >= 0);
    const cFim = hdr.findIndex(h => h.indexOf('fechada em') >= 0 || h.indexOf('fechado em') >= 0);

    // Toda coluna cujo nome sugira pessoa/responsável.
    const candidatas = [];
    hdr.forEach((h, i) => {
      if (h.indexOf('fornecedor') >= 0 || h.indexOf('utilizador') >= 0 ||
          h.indexOf('iniciado por') >= 0 || h.indexOf('fechado por') >= 0 ||
          h.indexOf('responsav') >= 0 || h.indexOf('equipe') >= 0 ||
          h.indexOf('tipo trabalho') >= 0) {
        candidatas.push({ i: i, nome: data[0][i] });
      }
    });

    const megas = UNITS.map(u => _histNorm_(u.name));
    let abertas = 0;
    const preenchidas = {}, exemplos = {};
    candidatas.forEach(c => { preenchidas[c.i] = 0; exemplos[c.i] = []; });

    for (let r = 1; r < data.length; r++) {
      if (cCC < 0 || megas.indexOf(_histNorm_(data[r][cCC])) < 0) continue;
      if (_bdChamadoFechado_(cEst >= 0 ? data[r][cEst] : '', cFim >= 0 ? data[r][cFim] : '')) continue;
      abertas++;
      candidatas.forEach(c => {
        const v = String(data[r][c.i] || '').trim();
        if (v) {
          preenchidas[c.i]++;
          if (exemplos[c.i].length < 3 && exemplos[c.i].indexOf(v) < 0) exemplos[c.i].push(v);
        }
      });
    }

    Logger.log('  rotinas ABERTAS dos 3 Megas: ' + abertas);
    if (!abertas) { Logger.log('  (nenhuma aberta agora — rode de novo quando houver)'); }
    candidatas.forEach(c => {
      const n = preenchidas[c.i];
      const pct = abertas ? Math.round(n / abertas * 100) : 0;
      Logger.log('    · "' + c.nome + '": ' + n + '/' + abertas + ' (' + pct + '%)' +
                 (exemplos[c.i].length ? '  ex.: ' + exemplos[c.i].join(' / ') : ''));
    });
    Logger.log('  → a que estiver perto de 100% e trouxer NOME DE PESSOA serve de ' +
               'substituta para a coluna RESPONSÁVEL do slide 4.');
  } catch (e) {
    Logger.log('  falhou: ' + e.message);
  }

  Logger.log('\nPronto.');
}
