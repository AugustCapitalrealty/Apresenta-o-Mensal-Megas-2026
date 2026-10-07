// Pares revisados à mão (manutenção de imóveis) entre o Orç 2026 e o Orç 2027
// de cada Mega (itens de comparacao_base.js). Gera as linhas da planilha de
// decisão do gestor (planilha_comparacao.py).
// Uso: node ferramentas/curadoria.js . <curitiba|itajai|esteio> ferramentas/comparacao_linhas_<cidade>.json
//
// Os pares foram escritos sobre os itens do Orç 2026 (a versão que o gestor
// leu em 07/10/2026). Com BASE26=ritmo (padrão), cada item do orçado é casado
// com o(s) item(ns) do ritmo 2026 — apelido à mão, mesmo fornecedor (contrato),
// mesmo chamado ou nome parecido — e o lado 2026 da linha passa a ser o ritmo;
// o orçado fica como referência (dOrc/vOrc). Item que só existe no ritmo entra
// por PARES_RITMO ou como "Só 2026". Com BASE26=orcado, sai como antes.
const fs = require('fs');
const { carregar } = require('./comparacao_base');
const D = process.argv[2], CIDADE = process.argv[3], SAIDA = process.argv[4];
const RITMO = (process.env.BASE26 || 'ritmo') === 'ritmo';
const { G, it26, it27, metragem } = carregar(D, CIDADE, 'orcado');
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
    // Gestor, 07/10/2026: "Orbital é PPCI e FM é Segurança Eletrônica… Orbital foi rescindido e entrou a
    // Firecam para SDAI (PPCI). FM é contrato novo" e "NFPA tem todo o ano".
    ['CONTRATO — ORBITAL', ['CONTRATO — FIRECAM'], 'Compara',
     'Mesmo serviço (PPCI/SDAI): a Orbital foi rescindida e entrou a Firecam, desde jul/2026 (gestor). A FM Security é contrato novo.'],
    ['Provisão reparo sistemas de acesso', [], 'Dúvida', 'Provisão de acesso de 2026. Em 2027 entra o contrato FM Security (segurança eletrônica, contrato novo) e a provisão de 3%.'],
    ['Preventiva sistema de PPCI com teste NFPA', [], 'Não compara',
     'Em 2027 a NFPA está dentro da Firecam o ano todo (gestor); em 2026 foi avulsa.'],
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
    ['SEGURO MEGA ESTEIO', [], 'Não compara', 'Erro de digitação no Orç 2026 (confirmado pelo Guilherme em 07/10/2026): seguro do Mega Esteio lançado na manutenção de Itajaí. Não é despesa de Itajaí.'],
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

// Ritmo 2026: item do orçado (trecho) → item(ns) do ritmo (trechos; [] = sem
// gasto no ritmo), quando o nome mudou e o casamento automático não acha ou
// acha errado. Com { ritmo, nota }, a nota vai para "O que mudou".
const SEGURO_TROCADO = 'No ritmo o nome está como "%s" (mesmo valor e mês do orçado). Erro de digitação no sistema.';
const APELIDOS_RITMO = {
  curitiba: {
    'Provisão gastos CFTV': ['Provisão gastos CFTV - LANÇADO']
  },
  itajai: {
    // O ritmo traz "SEGURO MEGA …" com o valor e o mês exatos destes dois
    // itens do orçado; os seguros do orçado não têm gasto no ritmo.
    'SEGURO MEGA ITAJAÍ 2026': [],
    'SEGURO MEGA ESTEIO': [],
    'Provisão gastos com comunicação visual': { ritmo: ['SEGURO MEGA ITAJAÍ 2026'], nota: SEGURO_TROCADO.replace('%s', 'SEGURO MEGA ITAJAÍ 2026') },
    'Instalação vídeo porteiro': { ritmo: ['SEGURO MEGA ESTEIO'], nota: SEGURO_TROCADO.replace('%s', 'SEGURO MEGA ESTEIO - ÁRMAZEM A') },
    'Semáforo cancelas': [],
    'CONTRATO — ORBITAL': ['CONTRATO — FIRECAM'],
    'Preventiva sistema de PPCI com teste NFPA': ['NFPA 25 casa de bombas'],
    'Preventiva condicionadores de ar': ['Contrato de condicionadores de ar'],
    'Preventiva trator/tratorito': ['Preventiva trator']
  },
  esteio: {
    'Preventiva tratores': ['Preventiva tratores (substituição'],
    'Pintura total do reservatório 02': ['Reservatório 02: Prever tratamento'],
    'Manutenção nas juntas de dilatação contenção': ['Juntas de contenção']
  }
};
// Ritmo 2026: item que só existe no ritmo (trecho) → itens do Orç 2027 que
// sobraram, com a leitura e o motivo.
const PARES_RITMO = {
  curitiba: [],
  itajai: [
    ['Preventiva Limpeza fossas', ['LIMPEZA E SUCÇÃO ANUAL DAS FOSSAS'], 'Compara',
     'Mesmo serviço: limpeza das fossas. Não estava no orçado 2026; o gestor marcou SIM no item de 2027.'],
    ['Material de construção', ['MATERIAL DE CONSTRUÇÃO PARA USO PELO ZELADOR'], 'Compara',
     'Mesma verba: material de construção para pequenos reparos.']
  ],
  esteio: []
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
                leitura, motivo, i26: a.i });
});
it26.forEach((x, i) => {
  if (usados26.has(i)) return;
  linhas.push({ tipo: /^CONTRATO/.test(x.desc) ? 'Contrato' : 'Avulso', d26: x.desc, v26: x.total, d27: '', v27: 0, cat27: '', leitura: 'Só 2026',
                motivo: 'Sem item parecido em 2027.', i26: i });
});

let ritmo26 = null;
if (RITMO) {
  const R = carregar(D, CIDADE, 'ritmo').it26;
  ritmo26 = R;
  const usadosR = new Set();
  const acharR = t => R.map((x, j) => ({ x, j })).filter(o => N(o.x.desc).indexOf(N(t)) >= 0 && !usadosR.has(o.j))[0];
  const deOrc = {}, notas = {};
  // 1) Apelidos à mão.
  Object.keys(APELIDOS_RITMO[CIDADE]).forEach(tOrc => {
    const i = it26.findIndex(x => N(x.desc).indexOf(N(tOrc)) >= 0);
    if (i < 0) throw new Error('Orç 2026 não achado (apelido): ' + tOrc);
    const ap = APELIDOS_RITMO[CIDADE][tOrc];
    if (ap.nota) notas[i] = ap.nota;
    deOrc[i] = (ap.ritmo || ap).map(t => {
      const o = acharR(t);
      if (!o) throw new Error('Ritmo 2026 não achado: ' + t);
      usadosR.add(o.j); return o.j;
    });
  });
  // 2) Contratos: todos os do mesmo fornecedor (um contrato pode ter dois cadastros no ano).
  it26.forEach((x, i) => {
    if (deOrc[i] || !x.contrato) return;
    const k = G._orcChaveFornecedor_(x.forn);
    deOrc[i] = R.map((y, j) => j).filter(j => !usadosR.has(j) && R[j].contrato && G._orcChaveFornecedor_(R[j].forn) === k);
    deOrc[i].forEach(j => usadosR.add(j));
  });
  // 3) Avulsos: mesmo chamado, ou o nome mais parecido (Dice ≥ 0,6 nas palavras).
  const PARE = new Set(('de da do das dos e em para no na nos nas com a o as os ao por sem ate fase ' +
    'servico servicos manutencao manutencoes mao obra material materiais compra provisao preventiva').split(' '));
  const toks = s => new Set(N(s).replace(/#\d+/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').split(' ')
    .filter(t => t.length >= 3 && !PARE.has(t) && !/^\d+$/.test(t)).map(t => t.slice(0, 6)));
  const chamados = s => (String(s).match(/[#*]\s*[#*]?\s*(\d{6,})/g) || []).map(x => x.replace(/\D/g, ''));
  const parecido = (a, b) => {
    if (chamados(a).some(c => chamados(b).indexOf(c) >= 0)) return 2;
    const A = toks(a), B = toks(b), inter = [...A].filter(t => B.has(t)).length;
    return A.size + B.size ? 2 * inter / (A.size + B.size) : 0;
  };
  const cand = [];
  it26.forEach((x, i) => {
    if (deOrc[i] || x.contrato) return;
    R.forEach((y, j) => { if (!usadosR.has(j) && !y.contrato) { const s = parecido(x.desc, y.desc); if (s >= 0.6) cand.push({ i, j, s }); } });
  });
  cand.sort((a, b) => b.s - a.s).forEach(o => {
    if (deOrc[o.i] || usadosR.has(o.j)) return;
    deOrc[o.i] = [o.j]; usadosR.add(o.j);
  });
  linhas.forEach(l => {
    const js = deOrc[l.i26] || [];
    l.dOrc = l.d26; l.vOrc = l.v26; l.nota = notas[l.i26] || '';
    l.d26 = js.map(j => R[j].desc).join(' + ');
    l.v26 = js.reduce((s, j) => s + R[j].total, 0);
    if (l.leitura === 'Só 2026' && !js.length) {
      l.leitura = 'Não executado'; l.motivo = 'Orçado em 2026, sem gasto no ritmo 2026 e sem item parecido em 2027.';
    }
  });
  // 4) Itens que só existem no ritmo.
  PARES_RITMO[CIDADE].forEach(([tR, t27s, leitura, motivo]) => {
    const o = acharR(tR);
    if (!o) throw new Error('Ritmo 2026 não achado: ' + tR);
    usadosR.add(o.j);
    const bs = [];
    t27s.forEach(t => { const b = achar27(t); if (!b.length) throw new Error('2027 não achado: ' + t); b.forEach(q => { usados27.add(q.j); bs.push(q.x); }); });
    linhas.push({ tipo: o.x.contrato ? 'Contrato' : 'Avulso', d26: o.x.desc, v26: o.x.total, dOrc: '', vOrc: 0,
                  d27: bs.map(b => b.desc).join(' + '), v27: bs.reduce((s, b) => s + b.total, 0), cat27: bs[0] ? bs[0].cat : '', leitura, motivo });
  });
  R.forEach((y, j) => {
    if (usadosR.has(j)) return;
    linhas.push({ tipo: y.contrato ? 'Contrato' : 'Avulso', d26: y.desc, v26: y.total, dOrc: '', vOrc: 0, d27: '', v27: 0, cat27: '',
                  leitura: 'Só 2026', motivo: 'Sem item parecido em 2027.' });
  });
}
it27.forEach((x, j) => {
  if (usados27.has(j)) return;
  linhas.push({ tipo: /contrato/i.test(x.desc) || x.cat === 'CONTRATO' ? 'Contrato' : 'Avulso', d26: '', v26: 0, d27: x.desc, v27: x.total, cat27: x.cat,
                leitura: 'Só 2027', motivo: 'Item novo, sem par em 2026.', dOrc: '', vOrc: 0 });
});
// O que mudou do orçado para o ritmo, linha a linha.
const moeda = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
// Os motivos foram escritos com a variação do orçado ("Cai 44%", "dobra"):
// na base ritmo essas frases saem e entra a variação contra o ritmo.
const semVariacaoDoOrcado = m => m
  .replace(/ e o valor (mais que )?dobra/, '').replace(/; mais que dobra em 2027/, '').replace(/, mesmo valor/, '')
  .replace(/ \([+−-]?\d+%\)/, '')
  .split(/(?<=[.?!])\s+/).filter(f => !/\d+%|R\$ \d|Triplica|\bSobe\b|\bCai\b/.test(f)).join(' ');
if (RITMO) linhas.forEach(l => {
  delete l.i26;
  if (l.d26 && l.d27) {
    const p = l.v26 > 0.5 ? Math.round((l.v27 / l.v26 - 1) * 100) : null;
    l.motivo = (semVariacaoDoOrcado(l.motivo) + (p === null ? '' : ' Ritmo 2026 → Orç 2027: ' + (p >= 0 ? '+' : '') + p + '%.')).trim();
  }
  const nota = l.nota || ''; delete l.nota;
  if (nota) l.mudou = nota;
  else if (l.dOrc && !l.d26) l.mudou = 'Sem gasto no ritmo 2026 (orçado ' + moeda(l.vOrc) + ').';
  else if (!l.dOrc && l.d26) l.mudou = 'Novo: está no ritmo 2026, não estava no orçado.';
  else if (l.dOrc && Math.abs(l.v26 - l.vOrc) > Math.max(1000, 0.1 * l.vOrc))
    l.mudou = 'Ritmo ' + moeda(l.v26) + ' × orçado ' + moeda(l.vOrc) + ' (' + (l.v26 >= l.vOrc ? '+' : '') +
              Math.round((l.v26 / l.vOrc - 1) * 100) + '%).';
  else l.mudou = '';
});
else linhas.forEach(l => { delete l.i26; delete l.nota; });
const soma = k => linhas.reduce((s, l) => s + (l[k] || 0), 0);
console.log(CIDADE, RITMO ? 'base Ritmo 2026' : 'base Orç 2026', 'linhas', linhas.length, 'tot26', Math.round(soma('v26')),
            RITMO ? 'totOrc26 ' + Math.round(soma('vOrc')) : '', 'tot27', Math.round(soma('v27')));
if (ritmo26) console.log('ritmo 2026 itens', Math.round(ritmo26.reduce((s, x) => s + x.total, 0)), '× METRAGEM ritmo', Math.round(metragem.ritmo));
const c = {}; linhas.forEach(l => { c[l.leitura] = (c[l.leitura] || 0) + 1; }); console.log(c);
fs.writeFileSync(SAIDA, JSON.stringify(RITMO ? { base26: 'Ritmo 2026', metragem, linhas } : linhas, null, 1));
