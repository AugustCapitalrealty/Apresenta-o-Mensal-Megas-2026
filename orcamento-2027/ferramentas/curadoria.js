// Pares revisados à mão (manutenção de imóveis) entre o Orç 2026 e o Orç 2027
// de cada Mega (itens de comparacao_base.js). Gera as linhas da planilha de
// decisão do gestor (planilha_comparacao.py).
// Uso: node ferramentas/curadoria.js . <curitiba|itajai|esteio> ferramentas/comparacao_linhas_<cidade>.json
const fs = require('fs');
const { carregar } = require('./comparacao_base');
const D = process.argv[2], CIDADE = process.argv[3], SAIDA = process.argv[4];
const { G, it26, it27 } = carregar(D, CIDADE);
const N = G._orcNorm_;

// [trecho do item 2026, [trechos dos itens 2027], leitura, motivo]
// Leitura: Compara (vem SIM), Não compara (vem NÃO), Dúvida (o gestor marca).
// Item de 2026 fora daqui sai como "Só 2026"; de 2027, como "Só 2027".
const PARES = {
  // 06/10/2026
  curitiba: [
    ['CONTRATO — FIRECAM', ['CONTRATO — FIRECAM', 'SDAI FIRECAM'], 'Compara', 'Mesmo contrato (SDAI). Em 2027 o valor base cai e entra a ampliação para os armazéns 7A e 7B.'],
    ['CONTRATO — MIRIAD', ['CONTRATO — MIRIAD', 'COBERTURA MIRIAD'], 'Compara', 'Mesmo contrato de cobertura, com ampliação para os armazéns 6, 7A e 7B em 2027.'],
    ['CONTRATO — LEANDRO', ['LEANDRO CARVALHO'], 'Compara', 'Mesmo contrato (gerador), reajuste pelo IPCA.'],
    ['CONTRATO — FILTROIL', ['CONTRATO — FILTROIL'], 'Compara', 'Mesmo contrato (subestações), reajuste pelo IPCA.'],
    ['CONTRATO — EQUILIBRIO', ['CONTRATO — EQUILIBRIO'], 'Compara', 'Mesmo contrato (ETEs). Sobe 44%, bem acima do IPCA: confirmar se mudou o escopo.'],
    ['Provisão manutenção preventiva em VGAs', ['PREVENTIVA DAS VGAS'], 'Compara', 'Mesmo serviço: preventiva das VGAs.'],
    ['Preventiva bombas de incêndio', ['BOMBA DE INCÊNDIO - MECÂNICA'], 'Compara', 'Mesmo serviço: preventiva das bombas de incêndio.'],
    ['Preventiva sistema de PPCI com teste NFPA', ['CONFORME NFPA 25'], 'Compara', 'Mesmo serviço: inspeção anual do PPCI pela NFPA 25.'],
    ['Preventiva/PAE Brigada/extintores', ['BRIGADA DE INCÊNDIO', 'RECARGA DE EXTINTORES', 'PLANO DE AÇÃO E EMERGÊNCIA'], 'Compara',
     'Em 2026 era um item só; em 2027 virou três (brigada, extintores e PAE).'],
    ['Provisão manutenções emergências', ['MANUTENÇÃO NÃO PREVISTA'], 'Compara', 'As duas são a reserva para o que não foi previsto (em 2027, 3% do pacote).'],
    ['Preventiva condicionadores de ar', ['AR CONDICIONADO CONFORME PMOC'], 'Dúvida',
     'Mesmo serviço, mas em 2027 virou contrato (PMOC) e o valor mais que dobra. Comparar como o mesmo item?'],
    ['Guard-rail fase 2', ['PLATO 1 E 2 #14839525', 'PLATO 2 E 3 #14839525'], 'Dúvida',
     'Mesmo chamado (#14839525) orçado de novo em 2027. Se não foi feito em 2026, é o mesmo projeto adiado; se foi, são obras diferentes.'],
    ['Torniquete 4', ['4º TORNIQUETE', 'COMPRA DE TORNQUETE DIGICON'], 'Dúvida',
     'O 4º torniquete estava em 2026 e aparece de novo em 2027 (compra + instalação). Foi feito em 2026?'],
    ['Comunicação Horizontal - Demarcações', ['FRENTE DE ARMAZÉNS 1 A 7', 'TACHINHAS REFLETIVAS', 'BOLSÃO DE PESADOS', 'ÁREA DE ACESSOS', 'SEMESTRAL DESCIDA',
      'ROTATÓRIA', 'DEMARCAÇÃO DAS LOMBADAS', 'RUA LATERAL AMZ 1 E 2', 'EMBARQUE E DESEMBARQUE'], 'Dúvida',
     'Em 2026 era um pacote só; em 2027 a demarcação vem aberta por área (9 itens). Comparar o pacote com a soma?'],
    ['Provisão reparo sistemas de acesso', ['FM SECURITY'], 'Dúvida',
     'Em 2027 entra o contrato FM Security (segurança eletrônica). Ele substitui as provisões de acesso e CFTV de 2026?'],
    ['Provisão gastos CFTV', [], 'Dúvida', 'Ver a linha de cima: se o contrato FM Security cobre o CFTV, esta provisão entra na mesma comparação.'],
    ['Provisão para iluminação', ['ILUMINAÇÃO PERIMETRAL NA LATERAL DO ARMAZÉM 6/7', 'ILUMINAÇÃO PERIMETRAL NA LATERAL DO ARMAZÉM 3/4'], 'Dúvida',
     '2026 era provisão de manutenção elétrica; 2027 são duas obras de melhoria da iluminação. Natureza diferente.'],
    ['Provisão Plantação paisagismo 200', ['(FRENTE MELI AMZ 6)', '(FUNDOS RESTAURANTE)', '(FRENTE BOSCH)'], 'Dúvida',
     '2026: plantio em 200 m²; 2027: plantio de grama em 4,4 mil m² (três áreas). Mesmo tipo de serviço, escala bem maior.'],
    ['Provisão pacote serralheria', ['MANTERIAIS DE CONSTRUÇÃO PARA O ZELADOR'], 'Dúvida',
     'Os dois são verba para pequenos reparos, mas um é serralheria e o outro material de construção para o zelador.'],
    ['Provisão paisagismo', [], 'Não compara',
     '2026 era manutenção do paisagismo existente. Em 2027 não há item igual; a implantação de 1.500 m² é obra nova.'],
    ['Lavação em fechamentos metálico', [], 'Não compara', 'Lavagem dos fechamentos da fase 1. As lavagens de 2027 são de outras estruturas (portaria, pórtico, campo).'],
    ['Pintura da fachada cinza', [], 'Não compara', 'Obra pontual de 2026. As pinturas de 2027 são de subestações e áreas de convivência.'],
    ['Limpeza de cobertura armazéns 3 e 4', [], 'Não compara', 'Serviço pontual de 2026, sem item igual em 2027.'],
    ['Compra de duas cancelas', [], 'Não compara', 'Compra pontual de 2026.'],
    ['Compra de totem autoatedimento', [], 'Não compara', 'Compra pontual de 2026.'],
    ['Reforma dos  totens das cancelas', [], 'Não compara', 'Reforma pontual de 2026.'],
  ],

  // 07/10/2026
  itajai: [
    ['CONTRATO — PREVENTIVA E CORRETIVA DAS COBERTURAS', ['CONTRATO — PREVENTIVA E CORRETIVA DAS COBERTURAS'], 'Compara',
     'Mesmo contrato de cobertura. Cai 44% em 2027 (contrato renovado em set/26): confirmar se o escopo mudou.'],
    ['CONTRATO — RODRIGO ROHDE', ['CONTRATO — RODRIGO ROHDE'], 'Compara', 'Mesmo contrato (ITAC, subestações e SPDA). Sobe 24%, acima do IPCA.'],
    ['CONTRATO — MG GERADORES', ['CONTRATO — MG GERADORES'], 'Compara', 'Mesmo contrato (geradores). Cai 15% em 2027.'],
    ['Contrato Rentbrella', ['MAQUINA DE GUARDA-CHUVA RENTBRELLA'], 'Compara', 'Mesmo contrato (máquina de guarda-chuva), mesmo valor.'],
    ['Preventiva/PAE Brigada', ['PLANO DE EMERGÊNCIA E CURSO DE BRIGADA', 'RECARGA DE EXTINTORES'], 'Compara',
     'Em 2026 era um item só; em 2027 virou dois (brigada/PAE e extintores).'],
    ['Preventiva analise de efluentes', ['ANÁLISE LABORATORIAL SEMESTRAL DOS 20 STE'], 'Compara', 'Mesmo serviço: análise dos efluentes (STE).'],
    ['Limpeza pórtico prédio apoio', ['PINTURA PORTARIA E PREDIO APOIO'], 'Compara',
     'Mesma estrutura (pórtico e prédio de apoio); em 2027 inclui preparo e pintura.'],
    ['CONTRATO — ORBITAL', ['FM SECURITY'], 'Dúvida',
     'Orbital (sistemas de segurança) não segue em 2027 e entra o contrato FM Security (segurança eletrônica). Troca de fornecedor do mesmo serviço?'],
    ['Provisão reparo sistemas de acesso', [], 'Dúvida', 'Ver a linha de cima: se o contrato FM Security cobre o acesso, esta provisão entra na mesma comparação.'],
    ['Preventiva sistema de PPCI com teste NFPA', ['CONTRATO — FIRECAM'], 'Dúvida',
     'Em 2027 entra o contrato Firecam (preventiva de PPCI). Ele substitui a preventiva NFPA de 2026?'],
    ['Preventiva condicionadores de ar', ['AR CONDICIONADO CONFORME PMOC'], 'Dúvida',
     'Mesmo serviço, mas em 2027 virou contrato (PMOC) e o valor dobra. Comparar como o mesmo item?'],
    ['02 torniquetes digcon', ['COMPRA DE 3 TORNIQUETES TX1500'], 'Dúvida',
     'Torniquetes Digicon nos dois anos: 2 em 2026 (ampliação da portaria) e 3 em 2027. Os de 2026 foram comprados?'],
    ['Troca lona totem', ['MANUTENÇÃO E PINTURA DO TOTEM MEGA'], 'Dúvida',
     'Totem nos dois anos. O item de 2027 (R$ 11.500, jan) está no 090 mas não na METRAGEM: foi feito em 2026?'],
    ['Iluminação rua armazém 4/5', ['ILUMINAÇÃO ADICIONAL NA LATERAL DO AMZ 4 E 5'], 'Dúvida',
     'Iluminação do AMZ 4/5 nos dois anos. O item de 2027 (R$ 11.875, fev) está no 090 mas não na METRAGEM: foi feito em 2026?'],
    ['Iluminação bolsão externo', ['ILUMINAÇÃO PARA O BOLSÃO DE VEÍCULOS LEVES'], 'Dúvida',
     'Iluminação do bolsão nos dois anos. O item de 2027 (R$ 5.938, fev) está no 090 mas não na METRAGEM: foi feito em 2026?'],
    ['Organização quadro elétrico portaria', ['CIRCUITOS INOPERANTES QUADRO PORTARIA'], 'Dúvida',
     'Mesmo serviço (organização do quadro da portaria) orçado nos dois anos. Foi feito em 2026?'],
    ['Impermeabilização subestações', ['IMPERMEANILIZAÇÃO DA LAJE DA SUBESTAÇÃO 1', 'IMPERMEABILIZAÇÃO DA LAJE DA SUBESTAÇÃO 2'], 'Dúvida',
     'Impermeabilização das subestações em 2026 e de novo em 2027 — o item de 2027 diz "a cada 5 anos". Foi feita em 2026?'],
    ['Impermeabilização casa de bombas', ['IMPERMEABILIZAÇÃO DA LAJE DA CASA DE BOMBAS'], 'Dúvida',
     'Impermeabilização da casa de bombas em 2026 e de novo em 2027 — o item de 2027 diz "a cada 5 anos". Foi feita em 2026?'],
    ['Pintura alvenaria fase 01 e 02', ['PINTURA DA ALVENARIA DAS FACES EXTERNAS DO ARMAZÉM 1, 2 E 3'], 'Dúvida',
     'Pintura de alvenaria nos dois anos: 2026 fases 1 e 2; 2027 armazéns 1, 2 e 3. Continuação da obra ou repetição?'],
    ['Reforma reservatórios de água', ['TRATAMENTO E PINTURA DO RESERVATÓRIO SPK'], 'Dúvida',
     '2026: reforma dos reservatórios de água; 2027: tratamento e pintura do reservatório do sprinkler. Mesmo reservatório?'],
    ['Reparo recalque docas funcionais', ['NIVELAMENTO DAS DOCAS DO ARMAZÉM 4 E 5', 'ELEVAÇÃO DE PAVIMENTO NA DOCA DOS MÓDULOS 12 E 13'], 'Dúvida',
     'Recalque de docas nos dois anos: 2026 docas funcionais; 2027 nivelamento das docas do AMZ 4/5 e elevação nos módulos 12/13. Mesmo problema em outras docas?'],
    ['Limpeza vertical fase 3', ['LIMPEZA DAS ESTRUTURAS METÁLICAS DO ARMAZÉM 1, 2 E 3'], 'Dúvida',
     'Limpeza das estruturas nos dois anos: 2026 fase 3; 2027 armazéns 1, 2 e 3. Mesma frente de serviço em outra área?'],
    ['SEGURO MEGA ITAJAÍ 2026', [], 'Não compara', 'Seguro lançado na manutenção em 2026. Em 2027 o seguro está na conta Seguro.'],
    ['SEGURO MEGA ESTEIO', [], 'Não compara', 'Seguro do Mega Esteio lançado na manutenção de Itajaí em 2026. Não é despesa de Itajaí.'],
    ['Obra cancelas 2/2', [], 'Não compara', 'Obra pontual de 2026.'],
    ['Forro lambril galvanizado', [], 'Não compara', 'Obra pontual de 2026.'],
    ['Aquisição dilacerador cancela 4', [], 'Não compara', 'Compra pontual de 2026.'],
    ['Bicicletario externo', [], 'Não compara', 'Obra pontual de 2026.'],
    ['Semáforo cancelas', [], 'Não compara', 'Compra pontual de 2026.'],
    ['Botão Pânico clientes', [], 'Não compara', 'Compra pontual de 2026.'],
  ],

  // 07/10/2026
  esteio: [
    ['CONTRATO — ADS', ['CONTRATO — ADS', 'ADITIVO CONTRATO MANUTENÇÃO COBERTURA NO B1'], 'Compara',
     'Mesmo contrato de cobertura, com aditivo para o B1 em 2027.'],
    ['CONTRATO — ARC', ['ALTERAÇÃO DO CONTRATO SDAI'], 'Compara',
     'Mesmo serviço (SDAI): o contrato da ARC foi rescindido e entra um novo em 2027 (+22%).'],
    ['CONTRATO — Subestação Energia', ['CONTRATO — Subestação Energia'], 'Compara',
     'Mesmo contrato (subestação). Sobe de R$ 15 mil para R$ 67 mil: confirmar se 2026 teve só parte do ano.'],
    ['CONTRATO — MANUTENÇÃO GERADOR', ['CONTRATO — MANUTENÇÃO GERADOR'], 'Compara',
     'Mesmo contrato (gerador). Sobe de R$ 10 mil para R$ 28 mil: confirmar se 2026 teve só parte do ano.'],
    ['Provisão manutenções emergências', ['PROVISÃO DE 3% SOBRE A MANUTENÇÃO'], 'Compara', 'As duas são a reserva para o que não foi previsto (em 2027, 3% do pacote).'],
    ['Preventiva Limpeza fossas', ['FOSSA E FILTRO - ARMAZÉM A', 'FOSSA E FILTRO - ARMAZÉM B'], 'Compara', 'Mesmo serviço: limpeza das fossas (STE), em 2027 aberta por armazém.'],
    ['Preventiva/Limpeza das elevatórias', ['LIMPEZA SEMESTRAL DAS ELEVATÓRIAS'], 'Compara', 'Mesmo serviço: limpeza das elevatórias. Triplica em 2027 (semestral, armazéns A e B).'],
    ['Preventiva/PAE Brigada', ['TREINAMENTO ANUAL DE BRIGADA', 'RENOVAÇÃO DO PLANO DE EMERGÊNCIA DO ARMAZÉM A', 'RENOVAÇÃO DO PLANO DE EMERGÊNCIA DO ARMAZÉM B',
      'RENOVAÇÃO DE CARGA DE EXTINTORES'], 'Compara', 'Em 2026 era um item só; em 2027 virou quatro (brigada, PAE dos dois armazéns e extintores).'],
    ['Preventiva condicionadores de ar', ['ARES CONDICIONADOS CONFORME PMOC'], 'Compara', 'Mesmo serviço (preventiva PMOC); mais que dobra em 2027.'],
    ['Renovação SPDA', ['LAUDO DO SPDA'], 'Compara', 'Mesmo serviço: laudo do SPDA.'],
    ['Laudo linha de vida', ['LAUDO DE LINHA DE VIDA'], 'Compara', 'Mesmo serviço; em 2027 são cinco laudos (um por cobertura e alpendre).'],
    ['Provisão para demarcação de pátio', ['DEMARCAÇÃO SEMESTRAL ENTRADA', 'FRENTE DE DOCAS (FAIXAS)'], 'Compara',
     'Mesmo serviço: demarcação do pátio, em 2027 aberta por área.'],
    ['Provisão para iluminação', ['SUBSTITUIÇÃO DE LÂMPADAS'], 'Compara', 'As duas são verba para a iluminação da área comum.'],
    ['Pacote serralheira', ['INSUMOS DE MATERIAIS DE CONSTRUÇÃO ZELADORIA'], 'Dúvida',
     'Os dois são verba para pequenos reparos, mas um é serralheria e o outro material de construção para o zelador.'],
    ['Peças para painéis elétricos', ['COMPONENTES NOS QUADROS (ELEVATÓRIAS)'], 'Dúvida',
     '2026: peças para os painéis (sinistro); 2027: verba para componentes dos quadros das elevatórias. Mesma verba?'],
    ['Substituir lona totem', ['LONA DO MEGA (POSTO)'], 'Dúvida',
     'Troca de lona nos dois anos: 2026 a do totem, 2027 a do posto. É a mesma lona?'],
    ['Manutenção nas juntas de dilatação contenção', ['TERRAE AMRMAZÉM A', 'TERRAE ARMAZÉM B'], 'Dúvida',
     'Juntas de dilatação da contenção nos dois anos (2027: taludes dos armazéns A e B). Continuação do serviço ou repetição?'],
    ['Juntas das placas nas paredes', ['JUNTA DE DILATAÇÃO ENTRE PLACAS DE FECHAMENTO'], 'Dúvida',
     'Juntas das placas de fechamento nos dois anos: 2026 fundos dos módulos 07 a 11; 2027 lateral M12. Mesmo serviço em outra parede?'],
    ['Preventiva bombas de drenagem', ['PREVENTIVA ANUAL DA COMPORTA AMZ A', 'PREVENTIVA ANUAL DA COMPORTA AMZ B'], 'Dúvida',
     '2026: preventiva das bombas de drenagem; 2027: preventiva das comportas (A e B). Mesmo sistema?'],
    ['Provisão reparo sistemas de acesso', [], 'Dúvida',
     'Sem verba de acesso em 2027 (Curitiba e Itajaí passam a ter o contrato FM Security). Ficou de fora do orçamento?'],
    ['Provisão gastos CFTV', [], 'Dúvida', 'Sem verba de CFTV em 2027 (ver a linha de cima).'],
    ['Preventiva -  Av. Standard', ['CAIXAS DE PASSAGEM - ARMAZÉM A'], 'Não compara', 'Em 2027 o item existe com R$ 1 (retirado do orçamento).'],
    ['Preventiva PPCI/bomba SPK', ['BOMBA DE SPK - ARMAZÉM A', 'BOMBA DE SPK - ARMAZÉM B1'], 'Não compara', 'Em 2027 os itens existem com R$ 1 (retirados do orçamento).'],
    ['Pintura total do reservatório 02', ['ESTRUTURA METÁLICA DO RESERVATÓRIO B2'], 'Não compara', 'Pintura pontual de 2026; em 2027 o reservatório B2 está com R$ 1 (retirado).'],
    ['Cabeçote, juntas e pistões', [], 'Não compara', 'Trator: em 2027 os tratores não estão na manutenção de imóveis (ver Manutenção de máquinas e equipamentos, R$ 146 mil).'],
    ['Preventiva tratores', [], 'Não compara', 'Trator: em 2027 os tratores não estão na manutenção de imóveis (ver Manutenção de máquinas e equipamentos).'],
    ['Manutenção elétrica trator 01', [], 'Não compara', 'Trator: em 2027 os tratores não estão na manutenção de imóveis (ver Manutenção de máquinas e equipamentos).'],
    ['Provisão Manutenção corretiva tratores', [], 'Não compara', 'Trator: em 2027 os tratores não estão na manutenção de imóveis (ver Manutenção de máquinas e equipamentos).'],
    ['Manutenção/revisão bomba tratores', [], 'Não compara', 'Trator: em 2027 os tratores não estão na manutenção de imóveis (ver Manutenção de máquinas e equipamentos).'],
    ['Rota de Fuga', [], 'Não compara', 'Obra pontual de 2026.'],
    ['Escada para acesso espaço lazer', [], 'Não compara', 'Obra pontual de 2026.'],
    ['Equipamentos Espaço Lazer', [], 'Não compara', 'Compra pontual de 2026.'],
    ['Poste iluminação régua', [], 'Não compara', 'Obra pontual de 2026.'],
    ['Compra de ar condicionado', [], 'Não compara', 'Compra pontual de 2026.'],
  ]
};

if (!PARES[CIDADE]) throw new Error('Sem pares para ' + CIDADE);
const usados27 = new Set();
const achar27 = t => it27.map((x, j) => ({ x, j })).filter(o => N(o.x.desc).indexOf(N(t)) >= 0 && !usados27.has(o.j));
const linhas = [];
const usados26 = new Set();
PARES[CIDADE].forEach(([t26, t27s, leitura, motivo]) => {
  const a = it26.map((x, i) => ({ x, i })).filter(o => N(o.x.desc).indexOf(N(t26)) >= 0 && !usados26.has(o.i))[0];
  if (!a) throw new Error('2026 não achado: ' + t26);
  usados26.add(a.i);
  const bs = [];
  t27s.forEach(t => {
    const b = achar27(t);
    if (!b.length) throw new Error('2027 não achado: ' + t);
    b.forEach(o => { usados27.add(o.j); bs.push(o.x); });
  });
  linhas.push({ tipo: /^CONTRATO/.test(a.x.desc) ? 'Contrato' : 'Avulso', d26: a.x.desc, v26: a.x.total,
                d27: bs.map(b => b.desc).join(' + '), v27: bs.reduce((s, b) => s + b.total, 0), cat27: bs[0] ? bs[0].cat : '',
                leitura, motivo });
});
it26.forEach((x, i) => {
  if (usados26.has(i)) return;
  linhas.push({ tipo: /^CONTRATO/.test(x.desc) ? 'Contrato' : 'Avulso', d26: x.desc, v26: x.total, d27: '', v27: 0, cat27: '', leitura: 'Só 2026',
                motivo: 'Sem item parecido em 2027.' });
});
it27.forEach((x, j) => {
  if (usados27.has(j)) return;
  linhas.push({ tipo: /contrato/i.test(x.desc) || x.cat === 'CONTRATO' ? 'Contrato' : 'Avulso', d26: '', v26: 0, d27: x.desc, v27: x.total, cat27: x.cat,
                leitura: 'Só 2027', motivo: 'Item novo, sem par em 2026.' });
});
const soma = k => linhas.reduce((s, l) => s + l[k], 0);
console.log(CIDADE, 'linhas', linhas.length, 'tot26', Math.round(soma('v26')), 'tot27', Math.round(soma('v27')));
const c = {}; linhas.forEach(l => { c[l.leitura] = (c[l.leitura] || 0) + 1; }); console.log(c);
fs.writeFileSync(SAIDA, JSON.stringify(linhas, null, 1));
