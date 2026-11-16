// node teste_semanal.js — a LEITURA da planilha "Propriedades — Semanal" (a fonte desde 16/11/2026).
//
// Por que existe: o gerador lia a planilha ANTIGA (1in5xw…), que parou de ser atualizada, enquanto o
// time preenchia a nova (1j5MBTB…). O sintoma: Análise de Projetos mostrava PORTA PALLETS "em andamento"
// (já concluído em 21/10) e faltavam 9 linhas. A planilha nova também mudou de FORMA: uma aba só para
// Recebimento de Obras (todos os empreendimentos), nomes de aba em maiúsculas, Gestão de Contratações
// numa lista única (a Etapa decide o histórico) e sem a coluna Prazo na Análise de Projetos.
// Dados: teste_semanal_fixture.json = as três abas como lidas em 16/11/2026 (com cabeçalho).
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

let falhas = 0, total = 0;
function checa(cond, nome) { total++; if (cond) console.log('  ✓ ' + nome); else { falhas++; console.log('  ✗ ' + nome); } }

const logs = [];
global.Logger = { log: m => logs.push(String(m)) };
global.SlidesApp = { PredefinedLayout: { BLANK: 'BLANK' } };
global.MimeType = { GOOGLE_SLIDES: 'slides' };
global.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null }) };

// ── Planilha dublada: SÓ as abas da planilha nova, com os nomes dela ─────
let ABAS = JSON.parse(fs.readFileSync(path.join(DIR, 'teste_semanal_fixture.json'), 'utf8'));
let abriu = [];
const mkAba = nome => ({
  getName: () => nome, getLastRow: () => ABAS[nome].length, getLastColumn: () => ABAS[nome][0].length,
  getRange: () => ({ getValues: () => ABAS[nome], getDisplayValues: () => ABAS[nome] })
});
global.SpreadsheetApp = { openById: id => {
  abriu.push(id);
  return { getName: () => 'dublê', getSheets: () => Object.keys(ABAS).map(mkAba),
           getSheetByName: n => (ABAS[n] ? mkAba(n) : null) };   // exato, como o Google: caixa diferente = null
} };
global.DriveApp = { getFileById: () => ({ getBlob: () => null }) };

const ARQUIVOS = fs.readdirSync(DIR).filter(f => /\.gs$/.test(f)).sort();
(0, eval)(ARQUIVOS.map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n').replace(/^(const|let) /gm, 'var '));
global.obterMesReferencia_ = () => ({ index: 9, nome: 'OUTUBRO', curto: 'Out', ano: 2026, fonte: 'dublê', label: 'OUTUBRO / 2026' });

console.log('\n== Fonte ==');
checa(PROPRIEDADES_SPREADSHEET_ID === '1j5MBTBMnBkyYt4uDNifrZyC0DedSKTTJG-v0bnKq8Zc', 'o gerador lê a planilha "Propriedades — Semanal" (1j5MBTB…)');
checa(PROPRIEDADES_SPREADSHEET_ID !== '1in5xwPsPBAQCRyuCZNdEmT_u4jOYADdGs0ABKeeovF4', 'e NÃO a planilha antiga (1in5xw…)');

console.log('\n== Nome da aba sem acento e caixa ==');
{
  const ss = SpreadsheetApp.openById('x');
  checa(ss.getSheetByName('Análise de Projetos') === null, '(o Google é exato: "Análise de Projetos" não acha "ANÁLISE DE PROJETOS")');
  checa(_tabAba_(ss, 'Análise de Projetos') && _tabAba_(ss, 'Análise de Projetos').getName() === 'ANÁLISE DE PROJETOS', '_tabAba_ acha pela forma normalizada');
  checa(_tabAba_(ss, 'gestao de contratacoes').getName() === 'GESTÃO DE CONTRATAÇÕES', '_tabAba_: sem acento, em minúsculas');
  checa(_tabAba_(ss, 'Aba que não existe') === null, '_tabAba_: aba inexistente → null');
  let erro = ''; try { _tabLerAba_('Aba que não existe', ['X']); } catch (e) { erro = e.message; }
  checa(/não encontrada/.test(erro) && /RECEBIMENTO DE OBRAS/.test(erro), 'erro de aba inexistente lista as abas que existem → ' + erro.slice(0, 110));
}

console.log('\n== Recebimento de Obras: uma aba, separada por empreendimento ==');
{
  const rels = _recRelatorios_();
  const por = n => rels.find(r => r.rel.nome === n);
  checa(rels.length === 2, 'dois relatórios (Esteio e Curitiba), nenhum extra → ' + rels.length);
  checa(por('Esteio').linhas.length === 10 && por('Curitiba').linhas.length === 7, 'Esteio 10 linhas, Curitiba 7 (as 17 da aba, sem repetir nenhuma)');
  checa(por('Esteio').linhas.every(r => /ESTEIO/.test(r[0])) && por('Curitiba').linhas.every(r => /CURITIBA/.test(r[0])), 'cada relatório só tem o seu empreendimento');
  checa(por('Esteio').linhas.filter(REL_RECEBIMENTO.esteio.testeConcluido).length === 1, 'Esteio: 1 concluído (ROTA DE FUGA) e 9 pendentes');
  const resumo = obterRecebimentoObrasResumo_();
  checa(resumo.total === 17 && resumo.concluidos === 1 && resumo.pendentes === 16, 'resumo do dashboard conta a aba UMA vez: 17 / 1 / 16 (não 34) → ' + resumo.total + '/' + resumo.concluidos + '/' + resumo.pendentes);

  // Empreendimento novo na planilha: ganha relatório próprio, não some calado.
  ABAS['RECEBIMENTO DE OBRAS'].push(['MEGA ITAJAÍ', 'ARMAZÉM 9', 'PISO (REPARO)', 'PENDENTE']);
  logs.length = 0;
  const rels2 = _recRelatorios_();
  checa(rels2.length === 3 && rels2[2].rel.titulo === 'RECEBIMENTO DE OBRAS · ITAJAÍ' && rels2[2].rel.subtitulo === 'Pendências da Obra · MEGA ITAJAÍ',
        'empreendimento novo (Mega Itajaí) ganha relatório "RECEBIMENTO DE OBRAS · ITAJAÍ"');
  checa(rels2[2].linhas.length === 1 && rels2[0].linhas.length === 10, 'a linha nova vai só para o relatório novo');
  checa(logs.some(l => /MEGA ITAJAÍ/.test(l) && /gerado automaticamente/.test(l)), 'o Logger avisa que gerou um relatório extra');
  ABAS['RECEBIMENTO DE OBRAS'].pop();
}

console.log('\n== Gestão de Contratações: a ETAPA decide o histórico ==');
{
  const d = _contLer_();
  checa(d.rows.length + d.historico.length === 32, '32 contratações lidas, nenhuma perdida → ' + (d.rows.length + d.historico.length));
  checa(d.rows.length === 15 && d.historico.length === 17, '15 em andamento e 17 no histórico (13 Contratado + 4 Replanejado) → ' + d.rows.length + ' / ' + d.historico.length);
  checa(d.rows.every(r => !CONTRAT_ETAPAS_FECHADAS.test(r[1])) && d.historico.every(r => CONTRAT_ETAPAS_FECHADAS.test(r[1])), 'nenhuma etapa fechada em andamento e nenhuma aberta no histórico');
  checa(d.emEdital === 5, '5 em edital (etapa "Edital Aberto") → ' + d.emEdital);
  const nome = o => d.historico.some(r => r[2] === o);
  checa(nome('Pingadeira janelas Armazém 03') && nome('Extravasores Calha'), 'Pingadeira (Replanejado) e Extravasores (Contratado) estão no histórico');
  checa(d.rows.some(r => r[2] === 'Lombadas de Concreto') && d.rows.some(r => r[2] === 'Reposicionamento Placas Pré Moldadas Armz 9'),
        'as 2 contratações novas (Lombadas, Placas Pré Moldadas) aparecem em andamento');
  // Compatível com a planilha antiga: a linha-marcador "Histórico" também vale.
  ABAS['GESTÃO DE CONTRATAÇÕES'].splice(5, 0, ['Histórico', '', '', '', '', '', '', '', '']);
  const d2 = _contLer_();
  // marcador depois das 4 primeiras linhas: 4 em andamento (acima) e as outras 28 no histórico (abaixo)
  checa(d2.rows.length === 4 && d2.historico.length === 28, 'linha "Histórico" no meio ainda vale (tudo abaixo dela vai para o histórico) → ' + d2.rows.length + ' / ' + d2.historico.length);
  ABAS['GESTÃO DE CONTRATAÇÕES'].splice(5, 1);
  const cs = _contLer_();
  checa(cs.rows.length === 15 && cs.historico.length === 17, 'tirando a linha "Histórico", volta ao normal (15 / 17)');
}

console.log('\n== Análise de Projetos: o que a planilha nova traz ==');
{
  const rel = REL_RECEBIMENTO.analise;
  const linhas = _tabLerAba_(rel.aba, rel.cabecalhoContem).rows;
  checa(linhas.length === 43, '43 projetos lidos (a planilha antiga tinha 34) → ' + linhas.length);
  checa(linhas[0].length === 9, 'a aba tem 9 colunas (não existe a coluna Prazo; ela é calculada) → ' + linhas[0].length);
  const ref = { index: 9, nome: 'OUTUBRO', curto: 'Out', ano: 2026 };
  const ind = _analiseIndicadores_(linhas, ref);
  checa(ind.abertos.length === 2 && ind.abertos.map(r => r[2]).sort().join('|') === 'ABERTURA DE PORTAS DE DOCAS, RAMPAS METÁLICAS|COMPACTADORA',
        '2 em andamento: COMPACTADORA (Itajaí) e ABERTURA DE PORTAS DE DOCAS (complemento, Curitiba) → ' + ind.abertos.map(r => r[2]).join(' | '));
  checa(!ind.abertos.some(r => r[2] === 'PORTA PALLETS'), 'PORTA PALLETS NÃO está mais em andamento (concluído em 21/10 e 26/10)');
  checa(ind.concMes === 15, '15 concluídas com entrega em outubro → ' + ind.concMes);
  checa(ind.semData === 0, 'nenhum concluído sem data de entrega (os 4 que faltavam agora têm data)');
  checa(ind.concAno === 41, '41 concluídas no ano (43 menos os 2 em andamento) → ' + ind.concAno);
  checa(ind.linhasTabela.length === 17, 'tabela do slide: 2 em andamento + 15 do mês → ' + ind.linhasTabela.length);
  const pp = ind.linhasTabela.filter(r => r[2] === 'PORTA PALLETS');
  checa(pp.length === 2 && pp.every(r => r[0] === 'MEGA ITAJAÍ'), 'PORTA PALLETS aparece 2x (original e complemento), em MEGA ITAJAÍ (e não Esteio)');
  checa(ind.porEmp.map(x => x[0]).join(',') === 'Mega Curitiba,Mega Itajaí,Mega Esteio,Lojas Garoto', 'por empreendimento mantém a ordem (Curitiba, Itajaí, Esteio, Garoto) → ' + ind.porEmp.map(x => x[0] + ' ' + x[1]).join(', '));
}

console.log(falhas ? '\n✗ ' + falhas + ' de ' + total + ' falharam' : '\n✓ ' + total + '/' + total + ' passaram');
process.exitCode = falhas ? 1 : 0;
