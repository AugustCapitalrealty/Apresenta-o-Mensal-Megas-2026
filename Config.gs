/**
 * ARQUIVO: Config.gs
 * DESCRIÇÃO: Paleta de cores, projetos por cidade e header padrão.
 */

// ==========================================
// PROJETOS POR CIDADE
// ==========================================
// Para gerar a apresentação de outra cidade, troque PROJETO_ATIVO
// para 'CURITIBA', 'ITAJAI' ou 'ESTEIO' e rode o orquestrador.
// ==========================================

const PROJETOS = {
  CURITIBA: {
    nome           : 'Mega Curitiba',
    spreadsheetId  : '160_zGacZ5c4Y9uPnJbmP9Ca5vMMQTm8sjmFI5WvOg8Q',
    presentationId : '1Cd2_D-Ht1nBJJ6dqPcXdvi-osTd_WkMDn3HvRZBdNL0'
  },
  ITAJAI: {
    nome           : 'Mega Itajaí',
    spreadsheetId  : '1UQXY1bNS-w4PuLOILpemiXRuMu3ao2mguVgsiO-14k4',
    presentationId : '1kc23ue7SdKFqIZRJdZaE-X5T2BhdE7eZKFRE4zz_bnY'
  },
  ESTEIO: {
    nome           : 'Mega Esteio',
    spreadsheetId  : '1wbtzAqiv7fhXiwmxaAmQb5Nc0UV0EaDZwPoJqknhvYY',
    presentationId : '15NZFgHNEwuXVijhCFPsNSHnm-cTpXCQho-BuVuG78kc'
  }
};

const PROJETO_ATIVO = 'CURITIBA';

function getProjetoAtivo() {
  const p = PROJETOS[PROJETO_ATIVO];
  if (!p) throw new Error('PROJETO_ATIVO inválido: ' + PROJETO_ATIVO);
  return p;
}

function getSpreadsheetIdAtivo()  { return getProjetoAtivo().spreadsheetId;  }
function getPresentationIdAtivo() { return getProjetoAtivo().presentationId; }


// Paleta de Cores Global
const CORES = {
  // Cores Base
  darkBlue: '#151E49', mediumBlue: '#003D7B', lightBlue: '#065CA9',
  bgSlide: '#F4F6F9', white: '#FFFFFF', shadow: '#D1D5DB',
  textHeader: '#FFFFFF', textDark: '#1E293B', textGray: '#64748B', textPrev: '#9CA3AF',
  lineSeparator: '#E2E8F0',

  // --- CORES TEMÁTICAS (SLIDE 4 - DASHBOARD) ---
  themeAtivos: '#1E3A8A', // 1. AZUL (Forte/Institucional)
  themePrev: '#10B981',   // 2. VERDE (Sucesso/Preventiva)
  themeCorr: '#F59E0B',   // 3. AMARELO (Alerta/Corretiva) - Tom Âmbar para leitura
  themeAcesso: '#0EA5E9', // 4. AZUL CLARO (Céu/Acesso)

  // Cores Específicas Slide 5 (Mantive compatibilidade)
  cardBlue: '#065CA9', cardGreen: '#10B981', cardRed: '#EF4444',
  textPurple: '#9333EA', textOrange: '#D97706'
};

// Função para criar o cabeçalho padrão azul
function criarHeaderPadrao(slide, titulo, subtitulo) {
  // Pega a apresentação ativa diretamente para evitar erros
  const deck = SlidesApp.getActivePresentation();
  const W = deck.getPageWidth();

  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, W, 60);
  bg.getFill().setSolidFill(CORES.darkBlue); bg.getBorder().setTransparent();

  const b = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 60, W, 4);
  b.getFill().setSolidFill(CORES.lightBlue); b.getBorder().setTransparent();

  const txt1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 30, 8, 400, 25);
  txt1.getText().setText(titulo).getTextStyle().setFontSize(18).setBold(true).setForegroundColor(CORES.white).setFontFamily('Montserrat');

  if(subtitulo) {
    const txt2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 30, 32, 500, 20);
    txt2.getText().setText(subtitulo).getTextStyle().setFontSize(9).setBold(true).setForegroundColor('#94A3B8').setFontFamily('Montserrat');
  }
}
