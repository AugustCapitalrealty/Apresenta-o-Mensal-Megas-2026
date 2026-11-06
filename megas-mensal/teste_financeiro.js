// Teste dos leitores do financeiro (planilha de apoio por Mega, 06/11/2026).
// Simula o export: valores como texto contábil, cabeçalho 'Orç Fev/25', B1 da DADOS = OUTUBRO 2026.
// Rodar: node megas-mensal/teste_financeiro.js
const fs=require("fs"),path=require("path"),dir=__dirname;
const M=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const hdr=['']; M.forEach((m,i)=>{hdr.push('Orç '+m+(i==1?'/25':'/26'), (i>9?'Ritmo ':'Real ')+m+'/26','Variação R$')}); hdr.push('Orç Ano/26','Ritmo Ano/26','Variação R$');
const lin=(nome,o,r)=>{const l=[nome];for(let i=0;i<12;i++)l.push('('+o+',00)','('+(r+i)+',00)','0,00');l.push('','','');return l;};
const tab=[hdr,lin('Despesa de pessoal',100,200),lin('energia eletrica',10,20),
 (()=>{const l=['TOTAL ÁREA - COM IPTU E SEGURO'];for(let i=0;i<12;i++)l.push('(110.000,00)','(220.000,00)','');return l;})(),
 (()=>{const l=['R$ M² MÊS- ESTEIO'];for(let i=0;i<12;i++)l.push('(5,00)','(10,00)','');return l;})(),
 (()=>{const l=['TOTAL ÁREA - COM SEGURO SEM IPTU'];for(let i=0;i<12;i++)l.push('(110.000,00)','(220.000,00)','');return l;})(),
 (()=>{const l=['R$ M² MÊS- ESTEIO'];for(let i=0;i<12;i++)l.push('(5,00)','(10,00)','');return l;})()];
const sheet={getDataRange:()=>({getValues:()=>tab,getDisplayValues:()=>tab}),getName:()=>'mega-esteio-outubro'};
const dados={getRange:()=>({getValue:()=>'OUTUBRO 2026',getDisplayValue:()=>'OUTUBRO 2026'})};
global.Logger={log:()=>{}};
global.SpreadsheetApp={openById:id=>({getSheets:()=>[sheet],getSheetByName:n=>n==='DADOS'?dados:null})};
let src='';for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.gs')).sort())src+=fs.readFileSync(path.join(dir,f),'utf8').replace(/^(const|let) /gm,'var ')+'\n';
(0,eval)(src);
setProjetoAtivo('ESTEIO');
const dre=obterDadosDRE_();
const ok=(n,c)=>console.log((c?'OK  ':'FALHA ')+n);
ok('DRE lido', !!dre);
const p=dre.rubricas.find(r=>/pessoal/i.test(r.nome));
ok('mês = out (real 200+9=209): '+p.mes.real, p.mes.real===209);
ok('acum jan-out = soma 200..209 = 2045: '+p.acum.real, p.acum.real===2045);
ok('meses acumulados = 10: '+dre.mesesAcum, dre.mesesAcum===10);
ok('anual inclui ritmo nov/dez: '+p.anual.real, p.anual.real===2045+210+211);
const c=obterDadosCustoM2();
ok('custo m² mês = Outubro: '+(c.mesRef?c.mesRef.nomeMesExtenso:JSON.stringify(Object.keys(c))), JSON.stringify(c).includes('Outubro'));
ok('área = 220000/10 = 22000: '+c.area, Math.round(c.area)===22000);
ok('custo m² referência = Outubro: '+c.referencia.mesExtenso, c.referencia.mesExtenso==='Outubro');
