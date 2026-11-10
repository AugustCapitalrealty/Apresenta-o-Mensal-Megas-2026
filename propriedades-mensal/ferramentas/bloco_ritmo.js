// Monta o bloco B3:AA42 da aba "RITMO 2026 - PROPRIEDADES" (PLANILHA PROPRIEDADES)
// a partir do export da controladoria por conta (Propriedades-Ritmo.csv: CC
// 1.01.01.016 GERÊNCIA DE PROPRIEDADES, empresas 11 e 61, Planejado/Realizado
// por mês). A aba é toda em valores colados, então os subtotais (06, 06.04, 07,
// 09, 11, 13 e as colunas Total) são recalculados aqui.
//
// Uso (precisa de `npm i xlsx@0.18.5` na pasta onde rodar):
//   1. Baixe a PLANILHA PROPRIEDADES como .xlsx e salve como planilha_prop.xlsx
//      na pasta corrente (só para ler os rótulos e comparar com o que já está lá).
//   2. node bloco_ritmo.js <Propriedades-Ritmo.csv> <saida.tsv>
//   3. Abra o .tsv, copie tudo e cole em B3 da aba.
// Lista as diferenças contra a aba em JAN–JUL (deve ser zero ou centavos de
// revisão do ritmo). Depreciação (08.xx) vai na linha 08, não em 06.
const fs=require("fs"),X=require("xlsx");
const a=X.utils.sheet_to_json(X.readFile("planilha_prop.xlsx").Sheets["RITMO 2026 - PROPRIEDADES"],{header:1,raw:true});
const t=fs.readFileSync(process.argv[2],"latin1").trim().split(/\r?\n/).slice(1).map(l=>l.split(";"));
const n=s=>parseFloat(String(s).replace(/\./g,"").replace(",","."))||0;
const chave=cod=>{const p=cod.split(".");if(p[0]==="06"&&/^0[123]$/.test(p[1]))return "06."+p[1];if(p[0]==="06")return "06.04."+p[2];return p[0];};
const leaf={};t.forEach(c=>{const k=chave(c[0].replace(/[="]/g,""));leaf[k]=leaf[k]||Array(24).fill(0);for(let i=0;i<24;i++)leaf[k][i]+=n(c[8+i]);});
const Z=()=>Array(24).fill(0),add=(x,y)=>x.map((v,i)=>v+y[i]);
const cod=r=>String(r[0]||"").trim().split(" - ")[0];
const v={};
a.slice(2).forEach(r=>{const k=cod(r);v[k]=leaf[k]||Z();});
v["06.04"]=Object.keys(v).filter(k=>/^06\.04\.\d+$/.test(k)).reduce((s,k)=>add(s,v[k]),Z());
v["06"]=["06.01","06.02","06.03","06.04"].reduce((s,k)=>add(s,v[k]),Z());
v["07"]=add(v["05"],v["06"]);v["09"]=add(v["07"],v["08"]);v["11"]=add(v["09"],v["10"]);v["13"]=add(v["11"],v["12"]);
const r2=x=>Math.round(x*100)/100;
const linhas=[];let dif=[];
a.slice(2).forEach((r,i)=>{const k=cod(r);const m=v[k].map(r2);let tp=0,tr=0;for(let j=0;j<12;j++){tp+=m[2*j];tr+=m[2*j+1];}
 const row=[...m,r2(tp),r2(tr)];
 for(let c=0;c<14;c++){const old=r[1+c]||0;if(Math.abs(old-row[c])>0.01)dif.push(k+" col"+(c+1)+": aba "+old+" → "+row[c]);}
 linhas.push(row.map(x=>x.toFixed(2).replace(".",",")).join("\t"));});
fs.writeFileSync(process.argv[3],linhas.join("\r\n")+"\r\n","utf8");
console.log("linhas:",linhas.length,"(B3:AA"+(2+linhas.length)+")");
console.log("Diferenças em JAN–JUL contra a aba atual:");dif.forEach(d=>console.log("  "+d));
console.log("06 Set real",r2(v["06"][17]),"Out real",r2(v["06"][19]),"| 13 Set",r2(v["13"][17]));
