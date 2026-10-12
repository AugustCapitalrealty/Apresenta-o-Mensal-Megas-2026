// Roda o teste inteiro e grava a mensagem de cada asserção (sem os números entre parênteses), para comparar duas versões.
// Uso: node lista_asserts.js <pasta teste> <saida.txt>
const fs = require('fs'), path = require('path');
const TESTE = process.argv[2], SAIDA = process.argv[3];
let src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').replace(/__dirname/g, JSON.stringify(TESTE));
src = src.replace('function ok(cond, msg) {', 'function ok(cond, msg) { MSGS.push(String(msg).replace(/\\s*\\(.*$/, ""));')
  .replace("process.exit(falhas ? 1 : 0);", "require('fs').writeFileSync(" + JSON.stringify(SAIDA) + ", MSGS.join('\\n')); process.exit(0);");
const MSGS = [];
eval(src);
