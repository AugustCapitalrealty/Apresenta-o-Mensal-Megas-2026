/**
 * ARQUIVO: Dados.gs
 * DESCRIÇÃO: Camada de dados do Gestão à Vista TV — TUDO que lê planilha
 * mora aqui. Os arquivos de slide só desenham.
 *
 * Junta o que antes eram dois arquivos separados (09_Metas_Auto.gs e
 * 10_Dados_BasesBrutas.gs). Estavam divididos por acidente histórico, não por
 * desenho: um nasceu para as Metas, o outro para os 4 slides operacionais. O
 * sintoma da separação era `_histNorm` e `_histNorm_` — a MESMA função com
 * dois nomes, uma em cada arquivo. Agora é uma só.
 *
 * Mesma convenção de megas-mensal/02_Dados.gs e propriedades-mensal/02_Dados.gs:
 * um arquivo de dados por projeto, ao lado do Config.gs.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PARTE 1 — BASES BRUTAS (slides 1 a 4)
 * ─────────────────────────────────────────────────────────────────────────
 * Os 4 slides operacionais contam da planilha BASE DE DADOS — QUADRO REM
 * (BD_CORRETIVAS_ID), abas BD-CORRETIVAS e BD-PREVENTIVAS — uma linha por
 * registro, a MESMA fonte da apresentação mensal dos Megas e da de
 * Propriedades. Antes liam número já somado da planilha da TV:
 *
 *   ▸ Visão Geral Corretiva  → células fixas da aba CHAMADOS (40/41/42, 78/79/80)
 *   ▸ Backlog Corretivo      → aba "CHAMADOS - DETALHE - <CIDADE>"   (cópia local)
 *   ▸ Visão Geral Preventiva → células fixas da aba PREVENTIVA (24/25/26),
 *                              mais o histórico mensal e o comparativo de
 *                              mesmo período em colunas à direita
 *   ▸ Backlog Preventivo     → aba "PREVENTIVA - DETALHE - <CIDADE>" (cópia local)
 *
 * É a lição nº 3 do CLAUDE.md ("prefira a base bruta à aba digitada").
 *
 * O GANHO QUE NÃO É ÓBVIO: com o fluxo (Corretiva = chamados criados) e o
 * estoque (Backlog = chamados em aberto) saindo das MESMAS linhas, a
 * identidade da lição nº 2 do CLAUDE.md
 *     backlog(fim) = backlog(início) + criados − fechados
 * vale por construção, em vez de depender de duas abas digitadas concordarem.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PARTE 2 — VALORES AUTOMÁTICOS DAS METAS (slide 7)
 * ─────────────────────────────────────────────────────────────────────────
 * Indicadores que já são calculados em outras planilhas sobrescrevem o Real
 * Mês/Real Acum. digitado na aba METAS. Falhando qualquer coisa (aba ausente,
 * sem match), o valor digitado prevalece — nada quebra. Fontes por unidade em
 * Config.gs (metasAutoSpreadsheetId / ppcId / reaberturaId):
 *   ▸ CHECK-LIST/SLA (exceto "terceiros"/"acesso") → aba PREVENTIVAS
 *   ▸ ÍNDICE DE DISPONIBILIDADE                    → aba CHAMADOS
 *   ▸ CUSTO M²                                     → aba METRO QUADRADO (+ PPC)
 *   ▸ CHECK-LIST/SLA - TERCEIROS (Analista)        → aba META
 *   ▸ CUMPRIR ORÇAMENTO (Analista)                 → aba FINANCEIRO BRIDGE
 *   ▸ TAXA DE REABERTURA                           → planilha externa
 *
 * MÊS DE REFERÊNCIA (obterMesReferencia): NÃO é o mês do calendário — é o mês
 * que a planilha "Mega <cidade>" está reportando (aba DADOS, célula B1),
 * porque o fechamento atrasa. Usar o calendário faria o Custo M² ler a coluna
 * "Ritmo" (projeção) em vez de "Real".
 *
 * Repare que a PARTE 1 usa o mês do CALENDÁRIO (a TV mostra o que está
 * acontecendo agora) e a PARTE 2 usa o mês REPORTADO (a meta fala do último
 * mês fechado). São recortes diferentes de propósito.
 *
 * NOMES REPETIDOS DE PROPÓSITO: _histNorm_, _histParseDataHora_,
 * _bdChamadoFechado_, _slaClasse_, _normalizarPrioridade_,
 * _resolverEquipeResponsaveis_ e _limparDescricaoChecklist_ têm os mesmos
 * nomes de megas-mensal/02_Dados.gs e propriedades-mensal/02_Dados.gs. São
 * projetos Apps Script separados (não colidem em execução), e manter o nome
 * faz copiar função entre eles funcionar sem reescrever as chamadas.
 */


// ==========================================================================
// PARTE 1 — BASES BRUTAS
// ==========================================================================

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

// Texto sem acento, minúsculo, espaços colapsados. Usada pelas duas partes
// deste arquivo.
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

// ==========================================================================
// PARTE 2 — VALORES AUTOMÁTICOS DAS METAS
// ==========================================================================

// ==========================================
// HISTÓRICO GERENCIAL (planilha Mês | Empreendimento | INDICADOR | DADO)
// ==========================================
function _histEmpChave(s) {
  return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}
function _histParseMes(txt) {
  const m = String(txt || '').trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const mes = parseInt(m[1], 10), ano = parseInt(m[2], 10);
  if (mes < 1 || mes > 12) return null;
  return { ord: ano * 100 + mes };
}
function _histNumLenient(v) {
  if (v == null) return NaN;
  if (typeof v === 'number') return v;
  let s = String(v).replace(/[^\d,.\-]/g, '');
  if (!s) return NaN;
  s = s.indexOf(',') >= 0 ? s.replace(/\./g, '').replace(',', '.') : s.replace(/\.(?=\d{3}\b)/g, '');
  const n = Number(s);
  return isNaN(n) ? NaN : n;
}

// Série mensal (ordenada) de um indicador para a unidade, lida da planilha
// HISTORICO_VALIDADO_ID. [] se a planilha/indicador não existir/não bater.
function lerHistoricoGerencial(unit, indicador) {
  const alvoEmp = _histEmpChave(unit.name);
  const alvoInd = _histNorm_(indicador);
  const saida = [];
  try {
    const ss = SpreadsheetApp.openById(HISTORICO_VALIDADO_ID);
    ss.getSheets().forEach(sheet => {
      const data = sheet.getDataRange().getDisplayValues();
      if (data.length < 2) return;
      const hdr = data[0].map(_histNorm_);
      const cMes = hdr.findIndex(h => h.indexOf('mes') === 0);
      const cEmp = hdr.findIndex(h => h.indexOf('empreend') >= 0);
      const cInd = hdr.findIndex(h => h.indexOf('indicador') >= 0);
      const cVal = hdr.findIndex(h => h.indexOf('dado') >= 0 || h.indexOf('valor') >= 0);
      if (cMes < 0 || cInd < 0 || cVal < 0) return;
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (cEmp >= 0 && _histEmpChave(row[cEmp]) !== alvoEmp) continue;
        if (_histNorm_(row[cInd]) !== alvoInd) continue;
        const mes = _histParseMes(row[cMes]);
        const val = _histNumLenient(row[cVal]);
        if (!mes || isNaN(val)) continue;
        saida.push({ ord: mes.ord, valor: val });
      }
    });
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler HISTORICO GERENCIAL ("${indicador}", ${unit.name}): ${e.message}`);
  }
  saida.sort((a, b) => a.ord - b.ord);
  return saida;
}

// Variação do valor ATUAL vs o mês anterior no HISTÓRICO GERENCIAL. O "mês
// de referência" é o mesmo usado nos outros indicadores automáticos
// (obterMesReferencia — o mês que a planilha "Mega <cidade>" está
// reportando agora, não necessariamente o mês do calendário). null se não
// houver mês anterior na base.
function deltaVsMesAnterior(unit, atualTxt, indicador) {
  const atualN = _histNumLenient(atualTxt);
  if (isNaN(atualN)) return null;
  const serie = lerHistoricoGerencial(unit, indicador);
  if (!serie.length) return null;

  const ordRef = obterMesReferencia(unit).ord;

  let prev = null;
  serie.forEach(p => { if (p.ord < ordRef && (!prev || p.ord > prev.ord)) prev = p; });
  if (!prev) {
    const outros = serie.filter(p => p.ord !== ordRef);
    if (outros.length) prev = outros[outros.length - 1];
  }
  if (!prev) return null;
  return Math.round((atualN - prev.valor) * 100) / 100;
}

// Texto + cor da seta de tendência (▲/▼), para desenhar como selo sobre o
// valor. menorMelhor=true → delta negativo é bom (ex.: custo). null se não
// houver delta.
function tendenciaTexto(delta, menorMelhor) {
  const ds = CR_DESIGN_SYSTEM;
  if (delta == null || isNaN(delta)) return null;
  if (delta === 0) return { txt: '▬ 0', cor: ds.colors.textBody };
  const seta = delta > 0 ? '▲' : '▼';
  // Sempre 2 casas decimais quando houver fração (ex.: 0,3 -> "0,30"),
  // igual a formatarNumeroBR() da Apresentação Mensal — _fmtNumeroBR já
  // implementa a mesma regra (minimumFractionDigits/maximumFractionDigits:2).
  const numTxt = _fmtNumeroBR(Math.abs(delta));
  const txt = `${seta} ${delta > 0 ? '+' : '−'}${numTxt}`;
  const bom = menorMelhor ? delta < 0 : delta > 0;
  return { txt: txt, cor: bom ? ds.colors.accentGreen : ds.colors.accentRed };
}


// ==========================================
// MÊS DE REFERÊNCIA — o mês que a planilha "Mega <cidade> - Planilha 2026"
// está reportando agora (lido da aba DADOS, célula B1, ex.: "JUN"), e NÃO o
// mês do calendário: a organização fecha os indicadores com atraso (ex.:
// em julho, os dados ainda mostram junho como último mês fechado). Usar o
// mês do calendário faria os indicadores automáticos lerem uma coluna
// "Ritmo" (projeção) em vez de "Real" (fechado), ou ficarem vazios.
// Fallback: mês anterior ao calendário. Resultado em cache por unidade.
// ==========================================
const MESES_3_REF = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
let _mesReferenciaCache = {};
function obterMesReferencia(unit) {
  if (!unit.metasAutoSpreadsheetId) {
    const hoje = new Date();
    const idx = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getMonth();
    const ano = idx > hoje.getMonth() ? hoje.getFullYear() - 1 : hoje.getFullYear();
    return { index: idx, ano: ano, ord: ano * 100 + (idx + 1) };
  }

  const chave = unit.metasAutoSpreadsheetId;
  if (chave in _mesReferenciaCache) return _mesReferenciaCache[chave];

  const hoje = new Date();
  let idx = -1;
  try {
    const ss = SpreadsheetApp.openById(unit.metasAutoSpreadsheetId);
    const sheet = ss.getSheetByName('DADOS') || ss.getSheets()[0];
    const cab = _histNorm_(sheet.getRange(1, 2).getDisplayValue());
    idx = MESES_3_REF.findIndex(m => cab.indexOf(m) === 0);
  } catch (e) {
    Logger.log(`⚠️ Mês de referência (${unit.name}): usando fallback de calendário. ${e.message}`);
  }
  if (idx < 0) idx = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getMonth(); // último dia do mês anterior
  const ano = idx > hoje.getMonth() ? hoje.getFullYear() - 1 : hoje.getFullYear();

  const ref = { index: idx, ano: ano, ord: ano * 100 + (idx + 1) };
  _mesReferenciaCache[chave] = ref;
  return ref;
}


// ==========================================
// CHECK-LIST/SLA (aba PREVENTIVAS da planilha "Mega <cidade>")
// Colunas: A=INDICADOR, B=MENSAL, C=ANUAL (acumulado) — mesma estrutura da
// aba CHAMADOS. Indicador de linha contém "sla" ou "atend".
// ==========================================
let _preventivasCache = {};
function obterDadosPreventivasAuto(unit) {
  if (!unit.metasAutoSpreadsheetId) return null;
  const chave = unit.metasAutoSpreadsheetId;
  if (chave in _preventivasCache) return _preventivasCache[chave];

  let out = null;
  try {
    const ss = SpreadsheetApp.openById(unit.metasAutoSpreadsheetId);
    const aba = ss.getSheetByName('PREVENTIVAS');
    if (aba) {
      const data = aba.getDataRange().getDisplayValues();
      const linha = data.find(r => {
        const n = _histNorm_(r[0]);
        return n.indexOf('sla') >= 0 || n.indexOf('atend') >= 0;
      });
      if (linha) out = { mes: linha[1], acum: linha[2] };
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler SLA de Preventivas (${unit.name}): ${e.message}`);
  }
  _preventivasCache[chave] = out;
  return out;
}


// ==========================================
// ÍNDICE DE DISPONIBILIDADE (aba CHAMADOS da planilha "Mega <cidade>")
// ==========================================
let _disponibilidadeCache = {};
function obterIndiceDisponibilidade(unit) {
  if (!unit.metasAutoSpreadsheetId) return null;
  const chave = unit.metasAutoSpreadsheetId;
  if (chave in _disponibilidadeCache) return _disponibilidadeCache[chave];

  let out = null;
  try {
    const ss = SpreadsheetApp.openById(unit.metasAutoSpreadsheetId);
    const aba = ss.getSheetByName('CHAMADOS');
    if (aba) {
      const data = aba.getDataRange().getDisplayValues();
      const linha = data.find(r => _histNorm_(r[0]).indexOf('disponibilidade') >= 0);
      if (linha) out = { mes: linha[1], acum: linha[2] };
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler Índice de Disponibilidade (${unit.name}): ${e.message}`);
  }
  _disponibilidadeCache[chave] = out;
  return out;
}


// ==========================================
// CHECK-LIST/SLA - TERCEIROS (Analista) — aba META da planilha "Mega <cidade>"
// Colunas: MÊS (data) | CARGO | META (descrição) | RESULTADO MÊS | RESULTADO
// ACUMULADO. Lida com getValues() (não getDisplayValues()) porque a coluna
// MÊS é uma data de verdade — extrair ano/mês do objeto Date evita depender
// do formato de exibição da célula.
// ==========================================
let _metaAnalistaRawCache = {};
function _lerMetaAnalistaRaw(unit) {
  if (!unit.metasAutoSpreadsheetId) return [];
  const chave = unit.metasAutoSpreadsheetId;
  if (chave in _metaAnalistaRawCache) return _metaAnalistaRawCache[chave];

  let saida = [];
  try {
    const ss = SpreadsheetApp.openById(unit.metasAutoSpreadsheetId);
    const aba = ss.getSheetByName('META');
    if (aba) {
      const ultima = aba.getLastRow();
      if (ultima >= 2) {
        const raw = aba.getRange(2, 1, ultima - 1, 5).getValues();
        raw.forEach(l => {
          const dt = l[0];
          if (!(dt instanceof Date)) return;
          const vMes = _histNumLenient(l[3]);
          const vAcum = _histNumLenient(l[4]);
          if (isNaN(vMes) && isNaN(vAcum)) return;
          saida.push({
            ord: dt.getFullYear() * 100 + (dt.getMonth() + 1),
            cargo: _histNorm_(l[1]),
            desc: _histNorm_(l[2]),
            mes: vMes,
            acum: vAcum
          });
        });
      }
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler aba META (${unit.name}): ${e.message}`);
  }
  _metaAnalistaRawCache[chave] = saida;
  return saida;
}

// Série [{ord, mes, acum}] para CARGO=Analista e Descrição batendo matchFn,
// ordenada por mês. Quando há mais de uma linha para o mesmo mês, a ÚLTIMA
// linha da planilha vence (correção manual).
function _serieMetaAnalista(unit, matchFn) {
  const porOrd = {};
  _lerMetaAnalistaRaw(unit).forEach(l => {
    if (l.cargo.indexOf('analista') >= 0 && matchFn(l.desc)) porOrd[l.ord] = l;
  });
  return Object.keys(porOrd).map(k => porOrd[k]).sort((a, b) => a.ord - b.ord);
}


// ==========================================
// TAXA DE REABERTURA (Analista) — planilha externa "MEGA <CIDADE>
// FACILITIES" (unit.reaberturaId), aba TAXA DE ABERTURA: uma linha
// FECHADOS, uma linha REABERTOS, um mês por coluna. O cabeçalho de mês é
// uma data de verdade (lida com getValues(), mesma lógica da aba META).
// ==========================================
let _reaberturaCache = {};
function obterDadosTaxaReabertura(unit) {
  if (!unit.reaberturaId) return null;
  const chave = unit.reaberturaId;
  if (chave in _reaberturaCache) return _reaberturaCache[chave];

  let out = null;
  try {
    const ss = SpreadsheetApp.openById(unit.reaberturaId);
    const aba = ss.getSheetByName('TAXA DE ABERTURA') || ss.getSheetByName('TAXA DE REABERTURA');
    if (aba) {
      const data = aba.getDataRange().getValues();
      let rFechados = -1, rReabertos = -1;
      for (let r = 0; r < data.length; r++) {
        const lbl = _histNorm_(data[r][0] || data[r][1] || '');
        if (rFechados < 0 && lbl.indexOf('fechado') >= 0) rFechados = r;
        if (rReabertos < 0 && lbl.indexOf('reaberto') >= 0) rReabertos = r;
      }
      if (rFechados >= 0 && rReabertos >= 0) {
        const hdrRow = Math.min(rFechados, rReabertos) - 1;
        if (hdrRow >= 0) {
          const cols = [];
          data[hdrRow].forEach((cell, c) => {
            if (cell instanceof Date) cols.push({ c: c, ord: cell.getFullYear() * 100 + (cell.getMonth() + 1) });
          });
          if (cols.length) {
            cols.sort((a, b) => a.ord - b.ord);
            out = cols.map(g => ({
              ord: g.ord,
              fechados: _histNumLenient(data[rFechados][g.c]),
              reabertos: _histNumLenient(data[rReabertos][g.c])
            }));
          }
        }
      }
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler Taxa de Reabertura (${unit.name}): ${e.message}`);
  }
  _reaberturaCache[chave] = out;
  return out;
}


// ==========================================
// CUMPRIR ORÇAMENTO (Analista) — soma das rubricas Energia Elétrica, Água,
// Telefone, Material de Consumo e Informática na aba FINANCEIRO BRIDGE da
// planilha "Mega <cidade>".
// ==========================================
let _orcamentoAnalistaCache = {};
function obterDadosOrcamentoAnalista(unit) {
  if (!unit.metasAutoSpreadsheetId) return null;
  const chave = unit.metasAutoSpreadsheetId;
  if (chave in _orcamentoAnalistaCache) return _orcamentoAnalistaCache[chave];

  let out = null;
  try {
    const ss = SpreadsheetApp.openById(unit.metasAutoSpreadsheetId);
    const aba = ss.getSheetByName('FINANCEIRO BRIDGE');
    if (aba) {
      const data = aba.getDataRange().getValues();
      const toAbs = v => Math.abs(typeof v === 'number' ? v : 0);

      let hdrRow = -1;
      for (let r = 0; r < Math.min(5, data.length); r++) {
        if (data[r].some(c => /^or[cç]/i.test(_histNorm_(c)))) { hdrRow = r; break; }
      }

      if (hdrRow >= 0) {
        const hdr = data[hdrRow];
        const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const grupos = [];
        for (let c = 1; c + 1 < hdr.length; c += 3) {
          if (!/^or[cç]/.test(_histNorm_(hdr[c]))) break;
          const m = String(hdr[c]).match(/([A-Za-zçÇ]{3})\/(\d{2,4})/);
          if (!m) continue;
          const idxMes = MESES.indexOf(_histNorm_(m[1]).substring(0, 3));
          if (idxMes < 0) continue;
          const ano2 = m[2].length === 2 ? m[2] : m[2].slice(-2);
          grupos.push({ ord: (2000 + parseInt(ano2, 10)) * 100 + (idxMes + 1), cOrc: c, cReal: c + 1 });
        }

        // Rubricas-alvo por palavra-chave (radical "materia" cobre "material"
        // e "materiais"; "informatic" cobre "Materiais de Informática" e
        // "Assistência de Informática").
        const bateRubrica = norm => {
          if (norm.indexOf('energia') >= 0 && norm.indexOf('eletric') >= 0) return true;
          if (norm === 'agua' || norm.indexOf('agua') === 0) return true;
          if (norm.indexOf('telefon') >= 0) return true;
          if (norm.indexOf('materia') >= 0 && norm.indexOf('consumo') >= 0) return true;
          if (norm.indexOf('informatic') >= 0) return true;
          return false;
        };

        const linhasAlvo = [];
        for (let r = hdrRow + 1; r < data.length; r++) {
          const norm = _histNorm_(data[r][0]);
          if (norm && bateRubrica(norm)) linhasAlvo.push(r);
        }

        if (grupos.length && linhasAlvo.length) {
          out = grupos.map(g => {
            let orc = 0, real = 0;
            linhasAlvo.forEach(r => { orc += toAbs(data[r][g.cOrc]); real += toAbs(data[r][g.cReal]); });
            return { ord: g.ord, orc: orc, real: real };
          }).sort((a, b) => a.ord - b.ord);
        }
      }
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler Cumprir Orçamento (FINANCEIRO BRIDGE, ${unit.name}): ${e.message}`);
  }
  _orcamentoAnalistaCache[chave] = out;
  return out;
}

// ==========================================
// PPC — PLANO DE PREVENTIVAS CUMPRIDO (planilha "PPC MEGA <CIDADE> 2026")
// Aba DASHBOARD: linha 4 = mês (JANEIRO..DEZEMBRO, uma coluna por mês),
// linha 7 = aderência % do mês, linha 8 = meta %, linha 9 = acumulado %.
// Fonte da parte "% das manutenções planejadas" da meta composta Custo M².
// Retorna array indexado por mês (0=Jan..11=Dez) com {aderencia, meta,
// acumulado}, ou null se a unidade não tiver ppcId / aba fora do formato.
// ==========================================
function _histPct(v) {
  return _histNumLenient(String(v == null ? '' : v).replace('%', ''));
}

let _ppcCache = {};
function obterDadosPPC(unit) {
  if (!unit.ppcId) return null;
  const chave = unit.ppcId;
  if (chave in _ppcCache) return _ppcCache[chave];

  let out = null;
  try {
    const ss = SpreadsheetApp.openById(unit.ppcId);
    const aba = ss.getSheetByName('DASHBOARD');
    if (aba) {
      const data = aba.getDataRange().getDisplayValues();
      if (data.length >= 9) {
        const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
          'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const linhaMes = data[3];       // linha 4
        const linhaAderencia = data[6]; // linha 7
        const linhaMeta = data[7];      // linha 8
        const linhaAcumulado = data[8]; // linha 9

        const porMes = [];
        linhaMes.forEach((cell, c) => {
          const idxMes = MESES.indexOf(_histNorm_(cell));
          if (idxMes < 0) return;
          porMes[idxMes] = {
            aderencia: _histPct(linhaAderencia[c]),
            meta: _histPct(linhaMeta[c]),
            acumulado: _histPct(linhaAcumulado[c])
          };
        });
        if (porMes.length) out = porMes;
      }
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler PPC (${unit.name}): ${e.message}`);
  }
  _ppcCache[chave] = out;
  return out;
}

function _fmtNumeroBR(v) {
  if (v == null || isNaN(v)) return null;
  const temDecimal = Math.abs(v % 1) > 1e-9;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: temDecimal ? 2 : 0, maximumFractionDigits: 2 });
}

// Igual a formatarPorcentagem() da Apresentação Mensal: arredonda para
// inteiro e acrescenta "%" (ex.: 99.41 -> "99%"). Valores já com "%" ou
// não numéricos voltam como estão.
function _fmtPercentInt(v) {
  if (v == null || v === '' || v === '-') return null;
  const s = String(v);
  if (s.indexOf('%') >= 0) return s;
  const n = _histNumLenient(s);
  if (isNaN(n)) return s;
  const pct = (n <= 1 && n !== 0) ? n * 100 : n;
  return Math.round(pct) + '%';
}

function _fmtMoedaSlideSemCentavos(v) {
  if (v == null || isNaN(v)) return null;
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}


// ==========================================
// CUSTO M² (aba METRO QUADRADO da planilha "Mega <cidade>")
// Estrutura fixa: header (linha 1) com blocos de 3 colunas por mês
// ("Orç Mmm/AA", "Real Mmm/AA", "Variação R$"); a linha "R$/m²" fica logo
// abaixo da linha "TOTAL ÁREA ... COM IPTU E SEGURO".
// ==========================================
const _CUSTO_M2_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function _custoM2ParseNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  let s = String(valor).trim().replace(/\s/g, '').replace('R$', '').replace(/[()]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.abs(n);
}

function _custoM2ExtrairMeses(headerRow) {
  const meses = [];
  for (let c = 1; c < headerRow.length; c += 3) {
    const txt = String(headerRow[c] || '').replace(/ /g, ' ').trim();
    const m = txt.match(/Or[cç]\s+([A-Za-zçÇ]{3})\/(\d{2,4})/i);
    if (!m) continue;
    const mesKey = _histNorm_(m[1]).substring(0, 3);
    const idx = _CUSTO_M2_MESES.indexOf(mesKey);
    if (idx < 0) continue;
    meses.push({ index: idx, colOrc: c, colReal: c + 1 });
  }
  return meses;
}

let _custoM2Cache = {};
function _obterSerieCustoM2(unit) {
  if (!unit.metasAutoSpreadsheetId) return null;
  const chave = unit.metasAutoSpreadsheetId;
  if (chave in _custoM2Cache) return _custoM2Cache[chave];

  let out = null;
  try {
    const ss = SpreadsheetApp.openById(unit.metasAutoSpreadsheetId);
    const aba = ss.getSheetByName('METRO QUADRADO');
    if (aba) {
      const data = aba.getDataRange().getDisplayValues();
      const meses = _custoM2ExtrairMeses(data[0] || []);

      const normLbl = s => String(s || '').replace(/ /g, ' ').replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
      let idxComIptu = -1;
      for (let r = 0; r < data.length; r++) {
        const lbl = normLbl(data[r][0]);
        if (lbl.indexOf('TOTAL ÁREA') >= 0 && lbl.indexOf('IPTU E SEGURO') >= 0) { idxComIptu = r + 1; break; }
      }

      if (idxComIptu >= 0 && meses.length) {
        const linha = data[idxComIptu];
        const orc = [], real = [];
        meses.forEach(m => {
          orc[m.index] = _custoM2ParseNumero(linha[m.colOrc]);
          real[m.index] = _custoM2ParseNumero(linha[m.colReal]);
        });
        out = { orcSerie: orc, realSerie: real };
      }
    }
  } catch (e) {
    Logger.log(`⚠️ Falha ao ler Custo M² (${unit.name}): ${e.message}`);
  }
  _custoM2Cache[chave] = out;
  return out;
}

// Mês/Real/Orç do mês de referência (mês corrente, com fallback ao último
// mês com dado completo) + tendência vs mês anterior, direto da série.
function obterDadosCustoM2(unit) {
  const serie = _obterSerieCustoM2(unit);
  if (!serie) return null;
  const { orcSerie: orc, realSerie: real } = serie;

  const temDados = i => orc[i] != null && real[i] != null;
  const mesAtual = obterMesReferencia(unit).index;
  let ref = temDados(mesAtual) ? mesAtual : -1;
  if (ref < 0) { for (let i = real.length - 1; i >= 0; i--) { if (temDados(i)) { ref = i; break; } } }
  if (ref < 0) return null;

  let delta = null;
  if (ref > 0 && real[ref] != null && real[ref - 1] != null) {
    delta = Math.round((real[ref] - real[ref - 1]) * 100) / 100;
  }
  return { orcado: orc[ref], realizado: real[ref], refIndex: ref, delta };
}

// Custo/m² ACUMULADO = média dos R$/m² mensais até o mês de referência.
function obterCustoM2Acumulado(unit) {
  const cm = obterDadosCustoM2(unit);
  const serie = _obterSerieCustoM2(unit);
  if (!cm || !serie) return null;

  const media = (arr, fim) => {
    let s = 0, n = 0;
    for (let i = 0; i <= fim && i < arr.length; i++) {
      if (arr[i] != null && arr[i] > 0) { s += arr[i]; n++; }
    }
    return n ? s / n : null;
  };

  const orcado = media(serie.orcSerie, cm.refIndex);
  const realizado = media(serie.realSerie, cm.refIndex);
  if (realizado == null) return null;
  const realizadoAnt = cm.refIndex > 0 ? media(serie.realSerie, cm.refIndex - 1) : null;
  const delta = realizadoAnt != null ? Math.round((realizado - realizadoAnt) * 100) / 100 : null;
  return { orcado, realizado, delta };
}

function _fmtMoedaSlide(v) {
  if (v == null || isNaN(v)) return null;
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


// ==========================================
// DISPATCHER — resolve o valor automático de UMA linha da tabela de Metas
// pela Descrição. Retorna { valor, metaValor?, trend } ou null (sem match ou
// sem dado — a célula digitada na aba METAS permanece como está).
// ==========================================
function obterMetaAuto(unit, descricao, metaAtual, qual) {
  const d = _histNorm_(descricao);
  const ehMensal = qual === 'mes';

  try {
    // CHECK-LIST/SLA (Preventivas) — exceto SLA de Terceiros (Analista).
    // Arredondado com "%" (ex.: "99%"), igual à Apresentação Mensal
    // (formatarPorcentagem); a tendência usa indicadores distintos para
    // mês/acumulado ("SLA MENSAL"/"SLA ACUMULADO", aba PREVENTIVAS do
    // HISTORICO GERENCIAL).
    if ((d.indexOf('check') >= 0 || d.indexOf('sla') >= 0) && d.indexOf('terceiro') < 0 && d.indexOf('acesso') < 0) {
      const prev = obterDadosPreventivasAuto(unit);
      if (!prev) return null;
      const val = ehMensal ? prev.mes : prev.acum;
      if (!val || val === '-') return null;
      // O VALOR exibido fica cru (ex. "99,41", sem arredondar/sem "%") —
      // pedido explícito, diferente da Apresentação Mensal. A TENDÊNCIA
      // continua comparando a versão arredondada ("99%") contra o mês
      // anterior, que é o cálculo que bate com a Apresentação Mensal
      // (ex.: +0,75) — arredondar só pra exibição não deveria mudar isso.
      const valFmt = _fmtPercentInt(val);
      const delta = deltaVsMesAnterior(unit, valFmt, ehMensal ? 'SLA MENSAL' : 'SLA ACUMULADO');
      return { valor: String(val), trend: tendenciaTexto(delta, false) };
    }

    // CHECK-LIST/SLA - TERCEIROS (Analista)
    if (d.indexOf('terceiro') >= 0) {
      const serie = _serieMetaAnalista(unit, desc => desc.indexOf('terceiro') >= 0);
      if (!serie.length) return null;
      const refOrd = obterMesReferencia(unit).ord;
      const atual = serie.find(s => s.ord === refOrd) || serie[serie.length - 1];
      const val = ehMensal ? atual.mes : atual.acum;
      if (val == null || isNaN(val)) return null;

      const anteriores = serie.filter(s => s.ord < atual.ord);
      let delta = null;
      if (anteriores.length) {
        const prev = anteriores[anteriores.length - 1];
        const pval = ehMensal ? prev.mes : prev.acum;
        if (pval != null && !isNaN(pval)) delta = Math.round((val - pval) * 100) / 100;
      }
      return { valor: _fmtNumeroBR(val), trend: tendenciaTexto(delta, false) };
    }

    // TAXA DE REABERTURA (Analista)
    if (d.indexOf('reabertura') >= 0) {
      const serie = obterDadosTaxaReabertura(unit);
      if (!serie || !serie.length) return null;
      const refOrd = obterMesReferencia(unit).ord;
      let idx = serie.findIndex(s => s.ord === refOrd);
      if (idx < 0) idx = serie.length - 1;

      const pctAte = fim => {
        let f = 0, r = 0;
        for (let j = 0; j <= fim; j++) {
          if (!isNaN(serie[j].fechados)) f += serie[j].fechados;
          if (!isNaN(serie[j].reabertos)) r += serie[j].reabertos;
        }
        return f > 0 ? (r / f) * 100 : (f === 0 ? null : 0);
      };

      let valorNum, prevNum = null;
      if (ehMensal) {
        const f = serie[idx].fechados, r = serie[idx].reabertos;
        valorNum = (!isNaN(f) && f > 0) ? (r / f) * 100 : (f === 0 ? 0 : null);
        if (idx > 0) {
          const fp = serie[idx - 1].fechados, rp = serie[idx - 1].reabertos;
          prevNum = (!isNaN(fp) && fp > 0) ? (rp / fp) * 100 : (fp === 0 ? 0 : null);
        }
      } else {
        valorNum = pctAte(idx);
        if (idx > 0) prevNum = pctAte(idx - 1);
      }
      if (valorNum == null) return null;

      let delta = null;
      if (prevNum != null) delta = Math.round((valorNum - prevNum) * 100) / 100;
      return { valor: _fmtNumeroBR(Math.round(valorNum * 100) / 100), trend: tendenciaTexto(delta, true) };
    }

    // CUMPRIR ORÇAMENTO (Analista)
    if (d.indexOf('orcamento') >= 0) {
      const serie = obterDadosOrcamentoAnalista(unit);
      if (!serie || !serie.length) return null;
      const refOrd = obterMesReferencia(unit).ord;
      let idx = serie.findIndex(s => s.ord === refOrd);
      if (idx < 0) idx = serie.length - 1;

      const somaAte = (campo, fim) => serie.slice(0, fim + 1).reduce((s, m) => s + m[campo], 0);

      let orcVal, realVal, orcPrev = null, realPrev = null;
      if (ehMensal) {
        orcVal = serie[idx].orc; realVal = serie[idx].real;
        if (idx > 0) { orcPrev = serie[idx - 1].orc; realPrev = serie[idx - 1].real; }
      } else {
        orcVal = somaAte('orc', idx); realVal = somaAte('real', idx);
        if (idx > 0) { orcPrev = somaAte('orc', idx - 1); realPrev = somaAte('real', idx - 1); }
      }

      let delta = null;
      if (realPrev != null) delta = Math.round((realVal - realPrev) * 100) / 100;

      return {
        valor: _fmtMoedaSlideSemCentavos(realVal),
        metaValor: _fmtMoedaSlideSemCentavos(orcVal),
        trend: tendenciaTexto(delta, true)
      };
    }

    // ÍNDICE DE DISPONIBILIDADE — indicadores distintos para mês/acumulado
    // ("Índice de disponibilidade"/"Índice de disponibilidade - ACUMULADO",
    // aba CHAMADOS do HISTORICO GERENCIAL). Valor fica cru (sem arredondar/
    // sem "%"), igual à Apresentação Mensal.
    if (d.indexOf('disponibilidade') >= 0) {
      const disp = obterIndiceDisponibilidade(unit);
      if (!disp) return null;
      const val = ehMensal ? disp.mes : disp.acum;
      if (!val || val === '-') return null;
      const delta = deltaVsMesAnterior(unit, val, ehMensal ? 'Índice de disponibilidade' : 'Índice de disponibilidade - ACUMULADO');
      return { valor: String(val), trend: tendenciaTexto(delta, false) };
    }

    // CUSTO M² (menor = melhor)
    if (d.indexOf('custo') >= 0 && (d.indexOf('m²') >= 0 || d.indexOf('m2') >= 0)) {
      const cmRef = obterDadosCustoM2(unit); // também dá o mês de referência p/ o PPC
      let valorNum, metaNum, delta;
      if (ehMensal) {
        if (!cmRef) return null;
        valorNum = cmRef.realizado; metaNum = cmRef.orcado; delta = cmRef.delta;
      } else {
        const ac = obterCustoM2Acumulado(unit);
        if (!ac) return null;
        valorNum = ac.realizado; metaNum = ac.orcado; delta = ac.delta;
      }
      if (valorNum == null) return null;

      let valor = _fmtMoedaSlide(valorNum);
      let metaValor = metaNum != null ? _fmtMoedaSlide(metaNum) : null;
      // Meta composta (ex.: "R$ 4,21 / 80%") → a parte "% das manutenções
      // planejadas" vem da planilha de PPC (obterDadosPPC, unit.ppcId).
      // Unidade sem ppcId → mantém o valor digitado na aba METAS (0% / alvo
      // manual), como antes.
      const barra = String(metaAtual || '').indexOf('/');
      let delta2 = null;
      if (barra >= 0) {
        const ppc = obterDadosPPC(unit);
        const i = cmRef ? cmRef.refIndex : -1;
        const p = (ppc && i >= 0) ? ppc[i] : null;
        if (p && !isNaN(p.aderencia) && !isNaN(p.acumulado)) {
          const pctAtual = ehMensal ? p.aderencia : p.acumulado;
          valor += ' / ' + _fmtNumeroBR(Math.round(pctAtual * 100) / 100) + '%';
          if (metaValor != null && !isNaN(p.meta)) {
            metaValor += ' / ' + _fmtNumeroBR(Math.round(p.meta * 100) / 100) + '%';
          }
          const pAnt = i > 0 ? ppc[i - 1] : null;
          const pctAnt = pAnt ? (ehMensal ? pAnt.aderencia : pAnt.acumulado) : null;
          if (pctAnt != null && !isNaN(pctAnt)) delta2 = Math.round((pctAtual - pctAnt) * 100) / 100;
        } else {
          valor += ' / 0%';
          if (metaValor != null) metaValor += ' / ' + String(metaAtual).slice(barra + 1).trim();
        }
      }

      // Tendência composta: R$ (menor = melhor) + % planejado (maior = melhor),
      // dois selos unidos por "/" — mesmo formato da Apresentação Mensal.
      const t1 = tendenciaTexto(delta, true);
      const t2 = tendenciaTexto(delta2, false);
      let trend = t1;
      if (t2) {
        trend = t1
          ? { txt: [t1.txt, t2.txt].filter(Boolean).join(' / '), cor: t1.cor || t2.cor }
          : t2;
      }
      return { valor: valor, metaValor: metaValor, trend: trend };
    }
  } catch (e) {
    Logger.log(`⚠️ obterMetaAuto("${descricao}", ${unit.name}, ${qual}): ${e.message}`);
  }

  return null;
}
