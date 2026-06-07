// ==========================================
// SLIDE 26: CUSTO DO M²
// ==========================================

function gerarSlideCustoM2() {
  const dados = obterDadosCustoM2();
  
  if (!dados) {
    Logger.log("Sem dados para o Slide 26 (Custo do M²).");
    return;
  }

  const deck = SlidesApp.getActivePresentation();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const pageW = deck.getPageWidth();
  const pageH = deck.getPageHeight();

  // 1. Cabeçalho 
  criarHeaderPadrao(
    slide,
    'CUSTO DO M²',
    `Monitoramento de Custo - ${dados.referencia.mesExtenso} ${dados.referencia.ano}`
  );

  // --- CONFIGURAÇÃO DE LAYOUT ---
  const marginX = 30;
  const topY = 85;
  const gap = 15;
  const bottomMargin = 20;

  const totalH = pageH - topY - bottomMargin;
  const kpiH = 70;
  const tableH = totalH - kpiH - gap;

  // --- ÁREA DE DESENHO ---
  
  // 2. Linha de KPIs (Topo)
  desenharKPIsCustoM2(slide, marginX, topY, pageW - (2 * marginX), kpiH, dados);
  
  // 3. Tabela de Detalhamento (Abaixo dos KPIs)
  const tableY = topY + kpiH + gap;
  desenharTabelaCustoM2(slide, marginX, tableY, pageW - (2 * marginX), tableH, dados);

  Logger.log('Slide 26 (Custo do M²) gerado com sucesso.');
}

// ==========================================
// COMPONENTE: CARDS DE KPI
// ==========================================

function desenharKPIsCustoM2(slide, x, y, containerW, h, dados) {
  const gap = 20;
  const cardW = (containerW - (2 * gap)) / 3;

  // Mapeamento dos 3 blocos de dados
  const kpis = [
    {
      label: 'CUSTO (R$/m²)',
      valor: formatarMoedaSlide(dados.kpis.custo),
      cor: CORES.darkBlue
    },
    {
      label: 'META ORÇADA',
      valor: formatarMoedaSlide(dados.kpis.meta),
      cor: CORES.textGray
    },
    {
      label: dados.kpis.status,
      valor: formatarMoedaSlide(dados.kpis.variacao),
      cor: dados.kpis.corStatus
    }
  ];

  kpis.forEach((kpi, i) => {
    const cx = x + (i * (cardW + gap));

    // Sombra
    const sombra = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx + 3, y + 3, cardW, h);
    sombra.getFill().setSolidFill(CORES.shadow);
    sombra.getBorder().setTransparent();
    sombra.sendToBack();

    // Fundo Branco
    const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, y, cardW, h);
    bg.getFill().setSolidFill(CORES.white);
    bg.getBorder().setTransparent();

    // Faixa Lateral Colorida
    const strip = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, y + 8, 4, h - 16);
    strip.getFill().setSolidFill(kpi.cor);
    strip.getBorder().setTransparent();

    // Título do KPI
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 18, y + 10, cardW - 30, 20);
    lbl.getText().setText(kpi.label)
      .getTextStyle().setFontSize(9).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');

    // Valor do KPI
    const val = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 18, y + 30, cardW - 30, 30);
    val.getText().setText(kpi.valor)
      .getTextStyle().setFontSize(18).setBold(true).setForegroundColor(kpi.cor).setFontFamily('Montserrat');
    val.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });
}

// ==========================================
// COMPONENTE: TABELA DE DETALHAMENTO
// ==========================================

function desenharTabelaCustoM2(slide, x, y, w, h, dados) {
  // Container Fundo Branco
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white);
  bg.getBorder().setTransparent();

  // Título da Tabela
  const title = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 20, y + 8, w - 40, 20);
  title.getText().setText('DETALHAMENTO MENSAL (TABELA)')
    .getTextStyle().setFontSize(10).setBold(true).setForegroundColor(CORES.darkBlue).setFontFamily('Montserrat');

  // --- PREPARAÇÃO DOS DADOS (REMOVENDO ANO E CALCULANDO IPTU) ---
  let meses = [...dados.meses];
  let tabela = {};
  for (let k in dados.tabela) {
    tabela[k] = [...dados.tabela[k]];
  }

  // 1. Encontrar e remover a coluna "Ano" se ela existir
  const idxAno = meses.findIndex(m => m.toLowerCase().trim() === 'ano');
  if (idxAno !== -1) {
    meses.splice(idxAno, 1);
    for (let k in tabela) {
      tabela[k].splice(idxAno, 1);
    }
  }

  // Helper interno seguro para extrair números
  const parseNum = (val) => {
    if (val === null || val === undefined || val === '') return NaN;
    if (typeof val === 'number') return val;
    return Number(String(val).replace(',', '.')); // Lida com vírgulas brasileiras
  };

  // 2. Calcular a nova linha "IPTU/m²" dinamicamente
  const keySemIptu = Object.keys(tabela).find(k => k.toLowerCase().includes('sem iptu'));
  if (keySemIptu) {
    // Pega o ano para garantir que comparamos com o Real certo
    const anoMatch = keySemIptu.match(/\d{4}/);
    const ano = anoMatch ? anoMatch[0] : '';
    
    // Acha a linha "Real" correspondente
    const keyReal = Object.keys(tabela).find(k => 
      k.toLowerCase().includes('real') && 
      !k.toLowerCase().includes('sem iptu') && 
      (ano === '' || k.includes(ano))
    );
    
    if (keyReal) {
      const iptuRow = [];
      let temIptu = false;

      for (let i = 0; i < meses.length; i++) {
        const valReal = parseNum(tabela[keyReal][i]);
        const valSemIptu = parseNum(tabela[keySemIptu][i]);
        
        if (!isNaN(valReal) && !isNaN(valSemIptu)) {
          const diff = valReal - valSemIptu;
          // Só adiciona valor se a diferença for maior que 1 centavo
          if (diff > 0.01) {
            iptuRow.push(diff);
            temIptu = true;
          } else {
            iptuRow.push(null);
          }
        } else {
          iptuRow.push(null);
        }
      }
      
      // Só cria a linha na tabela se houver cobrança em algum mês
      if (temIptu) {
        tabela['IPTU/m²'] = iptuRow;
      }
    }
  }

  // Define as linhas finais a serem desenhadas
  const linhas = Object.keys(tabela);

  // --- ÁREA ÚTIL DA TABELA ---
  const areaX = x + 10;
  const areaY = y + 35;
  const areaW = w - 20;
  const areaH = h - 50;

  // Moldura tracejada
  const moldura = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, areaX, areaY, areaW, areaH);
  moldura.getFill().setSolidFill('#FFFFFF');
  moldura.getBorder().setDashStyle(SlidesApp.DashStyle.DASH).setWeight(1).getLineFill().setSolidFill('#CBD5E1');

  // Dimensões das Células
  const labelW = 115; 
  const mediaW = 55;  
  const monthGap = 1;
  const usableW = areaW - labelW - mediaW - 10; 
  const monthW = usableW / meses.length; // Agora divide perfeitamente em 12
  const rowH = 24;

  const startX = areaX + 5;
  const startY = areaY + 18;

  // --- CABEÇALHO: MESES ---
  meses.forEach((mes, i) => {
    const cellX = startX + labelW + (i * monthW);

    const head = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cellX, startY, monthW - monthGap, 20);
    head.getFill().setSolidFill(CORES.lightBlue);
    head.getBorder().setTransparent();

    const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cellX, startY + 1, monthW - monthGap, 18);
    txt.getText().setText(mes)
      .getTextStyle().setFontSize(8).setBold(true).setForegroundColor(CORES.white).setFontFamily('Montserrat');
    txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  // --- CABEÇALHO: MÉDIA ---
  const mediaX = startX + labelW + (meses.length * monthW) + 5;

  const mediaHead = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, mediaX, startY, mediaW, 20);
  mediaHead.getFill().setSolidFill(CORES.lightBlue);
  mediaHead.getBorder().setTransparent();

  const mediaTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mediaX, startY + 1, mediaW, 18);
  mediaTxt.getText().setText('Média')
    .getTextStyle().setFontSize(8).setBold(true).setForegroundColor(CORES.white).setFontFamily('Montserrat');
  mediaTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  mediaTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  // --- LINHAS DA TABELA (DADOS) ---
  linhas.forEach((label, r) => {
    const rowY = startY + 28 + (r * rowH);
    const valores = tabela[label];

    // Nome da Linha (Esquerda)
    const lab = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, startX, rowY, labelW - 5, 18);
    lab.getText().setText(label)
      .getTextStyle().setFontSize(8).setBold(true).setForegroundColor('#111827').setFontFamily('Montserrat');

    // Valores dos Meses
    valores.forEach((v, i) => {
      const cellX = startX + labelW + (i * monthW);

      const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cellX, rowY, monthW - monthGap, 18);
      
      // Formata: Se for null (como meses sem IPTU), deixa o espaço em branco (" ")
      txt.getText().setText(formatarNumeroTabela(v))
        .getTextStyle().setFontSize(8).setForegroundColor('#111827').setFontFamily('Montserrat');
      txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

      // Destaque (Borda Vermelha) para o mês de referência atual
      if (i === dados.referencia.index) {
        const destaque = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cellX - 1, rowY - 2, monthW - monthGap + 2, 22);
        destaque.getFill().setTransparent();
        destaque.getBorder().setWeight(2).getLineFill().setSolidFill('#EF4444');
      }
    });

    // Valor da Média (exclui células vazias/nulas do cálculo)
    const media = calcularMediaSlide(valores);
    const mediaBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mediaX, rowY, mediaW, 18);
    mediaBox.getText().setText(formatarNumeroTabela(media))
      .getTextStyle().setFontSize(8).setBold(true).setForegroundColor('#111827').setFontFamily('Montserrat');
    mediaBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });
}

// ==========================================
// FUNÇÕES AUXILIARES (HELPERS SEGUROS PARA MATH)
// ==========================================

function formatarMoedaSlide(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const num = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (isNaN(num)) return '-';
  return 'R$ ' + num.toFixed(2).replace('.', ',');
}

function formatarNumeroSlide(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const num = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (isNaN(num)) return '-';
  return num.toFixed(2).replace('.', ',');
}

// Formatador específico para a tabela (CORREÇÃO: Retorna espaço em branco " " em vez de string vazia "")
function formatarNumeroTabela(valor) {
  if (valor === null || valor === undefined || valor === '') return ' ';
  const num = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (isNaN(num)) return ' ';
  return num.toFixed(2).replace('.', ',');
}

function calcularMediaSlide(arr) {
  // Converte texto com vírgula para math format e ignora inválidos
  const nums = arr.map(v => {
    if (v === null || v === undefined || v === '') return NaN;
    return typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  }).filter(v => !isNaN(v));
  
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
