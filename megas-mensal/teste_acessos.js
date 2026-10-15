// Teste do slide de Acesso e Segurança: o gráfico e o card seguem o MÊS DA
// APRESENTAÇÃO, não o último mês da aba Dados do Controle de Acessos.
// Números do Mega Itajaí como estavam em 15/10/2026. Rodar: node megas-mensal/teste_acessos.js
const fs=require('fs'),D=__dirname+'/';
let ok=0,falha=0;const t=(c,m)=>{c?ok++:(falha++,console.log('FALHOU: '+m));};
const rows=[['Fonte'],['Mês','Empreendimento','Fluxo Total','Colab','Tempo Médio (MM:SS)','x','x','x','x','x','x','x','Fluxo Acum. (ano)','Tempo Acum. (ano)']];
const itj={'08/2026':[27461,'05:15',169572,'04:57'],'07/2026':[31623,'04:39',142111,'06:26'],'06/2026':[31754,'05:17',110488,'06:53'],'05/2026':[25631,'05:05',78734,'07:22'],'04/2026':[14934,'07:12',53103,'7:32'],'03/2026':[13738,'08:43',38169,''],'02/2026':[10944,'08:55',24431,''],'01/2026':[13487,'10:11',13487,''],'12/2025':[16346,'09:05',117383,'09:05'],'11/2025':[15120,'09:10',101037,'09:10'],'10/2025':[12849,'06:54',85917,'06:54'],'09/2025':[11378,'',0,''],'08/2025':[10548,'',0,'']};
function montar(extra){const r=rows.slice();if(extra)r.push(extra);for(const m in itj){const v=itj[m];r.push([m,'Mega Itajaí',String(v[0]),'0',v[1],'','','','','','','',String(v[2]),v[3]]);r.push([m,'Mega Curitiba','99999','0','01:00','','','','','','','','1','01:00']);}return r;}
let dadosPlanilha;
const textos=[];
const chain=new Proxy(function(){},{get:(o,k)=>k==='setText'?(s=>{textos.push(String(s));return chain;}):(k==='getRange'?()=>chain:chain),apply:()=>chain});
global.SpreadsheetApp={openById:id=>({getSheetByName:n=>n==='Dados'?{getDataRange:()=>({getDisplayValues:()=>dadosPlanilha})}:null})};
global.SlidesApp=new Proxy({},{get:()=>new Proxy({},{get:()=>'x'})});
global.Logger={log:m=>{if(/Acessos:/.test(m))console.log('  log: '+m)}};
let src='';for(const f of ['00_Helpers.gs','01_Config.gs','02_Dados.gs','19_Slide_AcessoSeguranca.gs'])src+=fs.readFileSync(D+f,'utf8')+'\n';
(0,eval)(src.replace(/^(const|let) /gm,'var '));
global.getDeckAtivo=()=>({getPageWidth:()=>720,getPageHeight:()=>405,appendSlide:()=>chain});
global.criarHeaderPadrao=()=>{};global.criarCardPainel=(s,x,y)=>y+20;
global.getProjetoAtivo=()=>({nome:'Mega Itajaí'});global._projetoAtivoChave='ITAJAI';
global.getSpreadsheetIdAtivo=()=>'x';
global.obterMesReferencia_=()=>({ano:2026,index:8,siglaAno:'SET/26'});
global.lerHistoricoValidado=()=>[];
function rodar(){textos.length=0;gerarSlideTempo();return textos.slice();}
console.log('Cenário 1: aba Dados só até 08/2026, apresentação SET/26');
dadosPlanilha=montar();let tx=rodar();
const meses=tx.filter(s=>/^\d\d\/\d{4}$/.test(s));
t(meses.length===13,'13 meses no eixo: '+meses.length);t(meses[0]==='09/2025'&&meses[12]==='09/2026','eixo 09/2025→09/2026: '+meses[0]+'→'+meses[12]);
t(tx.includes('sem dado'),'setembro aparece como "sem dado"');
const cardFluxo=tx.filter(s=>/^27\.461/.test(s));console.log('  textos com 27.461:',JSON.stringify(cardFluxo));
t(!tx.some(s=>/^5m15s/.test(s)),'card não mostra o tempo de agosto');
t(!tx.some(s=>/4\.162/.test(s)),'card não mostra delta agosto-julho');
console.log('Cenário 2: setembro lançado (28.000)');
dadosPlanilha=montar(['09/2026','Mega Itajaí','28000','0','05:00','','','','','','','','197572','04:58']);tx=rodar();
t(!tx.includes('sem dado'),'sem "sem dado" quando setembro existe');
t(tx.some(s=>/^28\.000\s+▲ \+539/.test(s)),'card: 28.000 ▲ +539 → '+tx.filter(s=>/^28\.000/.test(s)).join(' | '));
t(tx.includes('197.572'),'acumulado de setembro');t(tx.includes('5m00s'),'tempo de setembro');
console.log(ok+' ok, '+falha+' falha(s)');
process.exitCode=falha?1:0;
