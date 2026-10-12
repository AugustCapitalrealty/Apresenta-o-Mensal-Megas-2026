// Gera os três Megas com o que vale em 13/10/2026 (modelos de 12/10 + cadastro rev01, propostas aplicadas) e
// procura nos textos dos slides palavras comuns sem acento ou com erro de digitação (lista abaixo).
// Mostra a palavra, o texto inteiro e onde aparece. Uso: node ortografia.js <pasta teste>
const fs = require('fs'), path = require('path');
const TESTE = process.argv[2];
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
// Errado → certo (palavra inteira, sem diferenciar maiúscula).
const ERROS = {
  MANUTENCAO: 'MANUTENÇÃO', INSTALACAO: 'INSTALAÇÃO', SERVICO: 'SERVIÇO', SERVICOS: 'SERVIÇOS', AGUA: 'ÁGUA',
  ELETRICA: 'ELÉTRICA', ELETRICO: 'ELÉTRICO', ELETRICAS: 'ELÉTRICAS', ELETRICOS: 'ELÉTRICOS', HIDRAULICA: 'HIDRÁULICA',
  HIDRAULICO: 'HIDRÁULICO', PREDIO: 'PRÉDIO', PREDIOS: 'PRÉDIOS', ARMAZEM: 'ARMAZÉM', ARMAZENS: 'ARMAZÉNS',
  TRIFASICO: 'TRIFÁSICO', MONOFASICO: 'MONOFÁSICO', ANALITICO: 'ANALÍTICO', SANITARIO: 'SANITÁRIO', SANITARIOS: 'SANITÁRIOS',
  VEICULO: 'VEÍCULO', VEICULOS: 'VEÍCULOS', PORTAO: 'PORTÃO', PORTOES: 'PORTÕES', CAMERA: 'CÂMERA', CAMERAS: 'CÂMERAS',
  ESTACAO: 'ESTAÇÃO', SUBESTACAO: 'SUBESTAÇÃO', SUBESTACOES: 'SUBESTAÇÕES', IMPERMEABILIZACAO: 'IMPERMEABILIZAÇÃO',
  MECANICO: 'MECÂNICO', MECANICA: 'MECÂNICA', METALICA: 'METÁLICA', METALICO: 'METÁLICO', METALICAS: 'METÁLICAS',
  TECNICO: 'TÉCNICO', TECNICA: 'TÉCNICA', PERIODICO: 'PERIÓDICO', PERIODICA: 'PERIÓDICA', AQUISICAO: 'AQUISIÇÃO',
  REPOSICAO: 'REPOSIÇÃO', SUBSTITUICAO: 'SUBSTITUIÇÃO', EXECUCAO: 'EXECUÇÃO', CONSERVACAO: 'CONSERVAÇÃO',
  VIGILANCIA: 'VIGILÂNCIA', 'VIGILÃNCIA': 'VIGILÂNCIA', SEGURANCA: 'SEGURANÇA', LICENCA: 'LICENÇA', ILUMINACAO: 'ILUMINAÇÃO',
  CALCADA: 'CALÇADA', CALCADAS: 'CALÇADAS', AREA: 'ÁREA', AREAS: 'ÁREAS', CONDOMINIO: 'CONDOMÍNIO', AUTONOMO: 'AUTÔNOMO',
  DIAGNOSTICO: 'DIAGNÓSTICO', SOLIICITAR: 'SOLICITAR', CONTINUA: 'CONTÍNUA (se adjetivo)', VIARIA: 'VIÁRIA',
  PAVIMENTACAO: 'PAVIMENTAÇÃO', SINALIZACAO: 'SINALIZAÇÃO', DEMARCACAO: 'DEMARCAÇÃO', PROTECAO: 'PROTEÇÃO',
  DETECCAO: 'DETECÇÃO', MANUTENCOES: 'MANUTENÇÕES', REVISAO: 'REVISÃO', INSPECAO: 'INSPEÇÃO', LOCACAO: 'LOCAÇÃO',
  PRESTACAO: 'PRESTAÇÃO', AUTOMACAO: 'AUTOMAÇÃO', AUTOMATICO: 'AUTOMÁTICO', AUTOMATICA: 'AUTOMÁTICA', GERACAO: 'GERAÇÃO',
  RESERVATORIO: 'RESERVATÓRIO', RESERVATORIOS: 'RESERVATÓRIOS', CONTENCAO: 'CONTENÇÃO', DRENAGEM: null, ACESSORIOS: 'ACESSÓRIOS',
  ESCRITORIO: 'ESCRITÓRIO', TELEFONICA: 'TELEFÔNICA', ELETRONICO: 'ELETRÔNICO', ELETRONICA: 'ELETRÔNICA', ELETRONICOS: 'ELETRÔNICOS',
  INCENDIO: 'INCÊNDIO', HIDRANTE: null, BOMBEIRO: null, EXTINTORES: null, MEDICAO: 'MEDIÇÃO', MEDICOES: 'MEDIÇÕES',
  ANALISE: 'ANÁLISE', ANALISES: 'ANÁLISES', LAMPADA: 'LÂMPADA', LAMPADAS: 'LÂMPADAS', RESIDUOS: 'RESÍDUOS', ORGANICO: 'ORGÂNICO',
  QUIMICO: 'QUÍMICO', QUIMICA: 'QUÍMICA', ACAO: 'AÇÃO', ACOES: 'AÇÕES', CONSTRUCAO: 'CONSTRUÇÃO', COBERTURA: null,
  ELETRICAAS: 'ELÉTRICAS', 'CHICOTE ELÉTRICA': 'CHICOTE ELÉTRICO', METEREOLOGICA: 'METEOROLÓGICA', 'METEREOLÓGICA': 'METEOROLÓGICA',
  CONTINUO: 'CONTÍNUO', PREVIO: 'PRÉVIO', PROXIMO: 'PRÓXIMO', UNICO: 'ÚNICO', UNICA: 'ÚNICA', ANUNCIO: 'ANÚNCIO',
  ESPECIFICO: 'ESPECÍFICO', HIDROSSANITARIO: 'HIDROSSANITÁRIO', HIDROSANITARIO: 'HIDROSSANITÁRIO', 'HIDROSANITÁRIO': 'HIDROSSANITÁRIO',
  REPARACAO: 'REPARAÇÃO', SUBSTITUIÇAO: 'SUBSTITUIÇÃO', MANUTENÇAO: 'MANUTENÇÃO', INSTALAÇAO: 'INSTALAÇÃO'
};
const lista = Object.keys(ERROS).filter(k => ERROS[k]);
const re = new RegExp('(^|[^A-Za-zÀ-ÿ])(' + lista.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?=$|[^A-Za-zÀ-ÿ])', 'gi');
const diag = `
porId[G.ORC_MODELO_090_ID] = fixture('fixture_090_megas_2027.json');
porId[G.ORC_MODELO_070_ID] = fixture('fixture_070_megas_2027.json');
porId[G.ORC_CONTRATOS_ANO_IDS[0]] = fixture('fixture_contratos_2027_rev01.json');
const achados = {};
[['CURITIBA', 'curitiba'], ['ITAJAI', 'itajai'], ['ESTEIO', 'esteio']].forEach(([chave, c]) => {
  const cid = G.ORC_CIDADES[chave];
  cid.despesasGeraisId = G.ORC_MODELO_090_ID; cid.servicosTerceirosId = G.ORC_MODELO_070_ID;
  cid.relatorios.orcDosModelos = true;
  porId[cid.relatorios.metragemId] = fixture('fixture_metragem_' + c + '.json');
  porId[cid.relatorios.mensalId] = fixture('fixture_mensal_' + c + '.json');
  porIdFinanceiro[cid.relatorios.financeiroMegasId] = fixture('fixture_financeiro2025_' + c + '.json');
  decks = {}; G._orcGerar_([chave]); G.aplicarPropostasTextos(); decks = {}; G._orcGerar_([chave]);
  decks[cid.deckId].getSlides().forEach((s, i) => s.shapes.filter(r => r.texto).forEach(r => {
    let m; re.lastIndex = 0;
    while ((m = re.exec(r.texto))) {
      const k = m[2].toUpperCase(), chaveA = k + ' | ' + r.texto;
      (achados[chaveA] = achados[chaveA] || { k: k, texto: r.texto, onde: {} }).onde[cid.nome] = true;
    }
  }));
});
const porPalavra = {};
Object.keys(achados).forEach(a => { const x = achados[a]; (porPalavra[x.k] = porPalavra[x.k] || []).push(x); });
Object.keys(porPalavra).sort().forEach(k => {
  console.log(k + ' → ' + (ERROS[k] || ERROS[Object.keys(ERROS).filter(e => e.toUpperCase() === k)[0]]) + ' (' + porPalavra[k].length + ')');
  porPalavra[k].forEach(x => console.log('    ' + x.texto.replace(/\\n/g, ' / ').slice(0, 140) + '  [' + Object.keys(x.onde).join(', ') + ']'));
});
`;
eval(src + diag);
