/**
 * ARQUIVO: config.gs
 * Variáveis globais, cores, fontes e os IDs exatos.
 */
const CR_DESIGN_SYSTEM = {
  colors: {
    brandDark: '#151E49',
    brandMed: '#003D7B',
    brandLight: '#065CA9',
    brandSoft: '#93C5FD',
    bgSlide: '#F8FAFC',
    cardBg: '#FFFFFF',
    textMain: '#151E49',
    textBody: '#475569',
    lines: '#E2E8F0',
    accentGreen: '#10B981',
    accentOrange: '#F97316',
    accentRed: '#EF4444'
  },
  typography: {
    titles: 'Montserrat',
    body: 'Open Sans'
  },
  layout: {
    marginX: 50,
    marginY: 35
  },
  assets: {
    logoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4',
    logoW: 160,
    logoH: 45,
    presentationId: '1sujFf3QdfnoFHQQyJPeLEelIkn0JFp-cTv9EGyvmJY4',
    // ID da Planilha e Nome da Aba configurados conforme sua solicitação
    spreadsheetId: '1eRvNopH-6U87xyy9chERsROvyHf9ZpDs5veoB9H671I',
    sheetName: 'QUADRO COMPARATIVO',
    spreadsheetGraficosId: '1jj9_vA6sjUtXE3O5xBwOQ_0U-KxpCkHXMvdHlUx19j8'
  }
};

/**
 * ─────────────────────────────────────────────────────────────
 *  DETECTOR DE SEMANA DO BOLETIM (ISO 8601)
 *  Helpers globais — qualquer slide pode usar.
 *
 *  Regra: a semana ISO vai de SEGUNDA a DOMINGO. O número da semana
 *  é o padrão ISO 8601 (a semana 1 é a que contém a primeira quinta-feira
 *  do ano). Ex.: 14/06/2026 (domingo) => Semana 24, de 08/06 a 14/06.
 * ─────────────────────────────────────────────────────────────
 */

/** Converte um valor (Date, string ou serial) em Date; retorna null se inválido. */
function _paraData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : new Date(valor.getTime());
  const d = new Date(valor.toString());
  return isNaN(d.getTime()) ? null : d;
}

/** Número da semana ISO 8601 (1 a 53) para a data informada. */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;        // domingo = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // move p/ a quinta-feira da semana
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/** Segunda e domingo da semana ISO que contém 'date'. */
function intervaloSemanaISO(date) {
  const d   = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay() || 7;              // domingo = 7
  const seg = new Date(d); seg.setDate(d.getDate() - (dow - 1));
  const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
  return { inicio: seg, fim: dom };
}

/**
 * Detector principal — recebe uma data de referência (normalmente a ÚLTIMA
 * data com dados no boletim) e devolve o pacote pronto para exibir.
 * Retorna null se a data for inválida.
 */
function getSemanaBoletim(dataRef) {
  const ref = _paraData(dataRef);
  if (!ref) return null;
  const numero = getISOWeek(ref);
  const { inicio, fim } = intervaloSemanaISO(ref);
  const fmt = (dt) => String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0');
  const intervalo = fmt(inicio) + ' a ' + fmt(fim);
  return {
    numero:    numero,                       // 24
    inicio:    inicio,                        // Date (segunda)
    fim:       fim,                           // Date (domingo)
    intervalo: intervalo,                     // "08/06 a 14/06"
    label:     'Semana ' + numero,           // "Semana 24"
    completo:  'Semana ' + numero + ' • ' + intervalo // "Semana 24 • 08/06 a 14/06"
  };
}