/**
 * ARQUIVO: 31_VersaoFinal.gs
 * DECK:    A versão final num passo (12/10/2026): os slides gerados com os dados de agora + os slides do gestor, cada
 *          um no lugar em que ele pôs na v3 — sem copiar nada à mão.
 *
 *   ▸ gerarVersaoFinal() → cópia do deck de Facilities ("FACILITIES - ORÇAMENTO 2027 · VERSÃO FINAL (data hora)", na
 *                          pasta do orçamento) com:
 *       - os slides do gestor da v3 (obras, fotos, substituição da segurança) revisados como em 29_GestorRevisado.gs
 *         (subtítulo, português, Mega, trilha);
 *       - no lugar dos slides "Implantação Moked" da v3, os nove de 28_Moked.gs (a apresentação da Moked);
 *       - sem o slide interno "Revisar antes da versão final" e sem os moldes de fotos vazios do gerador.
 *     A posição de cada slide do gestor: logo depois do slide gerado que vem antes dele na v3 (mesmo título e mesmo
 *     Mega; sem o "(1/2)" se a paginação mudou; sem achar, no fim do Mega). Os links do sumário e da trilha que iam
 *     para os moldes de fotos passam para o primeiro slide do gestor do Mega (ou saem, se o Mega não tem nenhum).
 *
 * Antes: gere o deck de Facilities (as quatro partes) e rode gerarSlidesMoked(). O deck de Facilities, a v3 e a
 * apresentação da Moked só são LIDOS. Rodar de novo cria outra cópia; a anterior vira "PODE EXCLUIR - …".
 */

const ORC_VERSAO_FINAL = { nome: 'FACILITIES - ORÇAMENTO ' + ORC_ANO + ' · VERSÃO FINAL', prop: 'ORC_VERSAO_FINAL_DECK_ID' };

function gerarVersaoFinal() {
  const facId = _orcIdFacilities_();
  if (!facId) throw new Error('Falta o deck de Facilities: gere a abertura e os três Megas antes.');
  const props = PropertiesService.getScriptProperties();
  const mokedId = props.getProperty(ORC_MOKED.prop);
  if (!mokedId) throw new Error('Rode gerarSlidesMoked() antes: a apresentação da Moked ainda não existe.');

  const pasta = DriveApp.getFolderById(ORC_PASTA_ORCAMENTO_ID);
  const anterior = props.getProperty(ORC_VERSAO_FINAL.prop);
  if (anterior) {
    try { const f = DriveApp.getFileById(anterior); if (f.getName().indexOf('PODE EXCLUIR - ') !== 0) f.setName('PODE EXCLUIR - ' + f.getName()); }
    catch (e) { Logger.log('A versão final anterior (' + anterior + ') não foi renomeada: ' + e.message); }
  }
  const quando = Utilities.formatDate(new Date(), 'America/Sao_Paulo', "dd-MM-yyyy HH'h'mm");
  const copia = DriveApp.getFileById(facId).makeCopy(ORC_VERSAO_FINAL.nome + ' (' + quando + ')', pasta);
  props.setProperty(ORC_VERSAO_FINAL.prop, copia.getId());

  const deck = SlidesApp.openById(copia.getId());
  const res = _orcMontarVersaoFinal_(deck, SlidesApp.openById(ORC_DECK_VERSAO_GESTOR_ID), SlidesApp.openById(mokedId));
  _orcSalvarDeck_(deck, 'a versão final');
  res.log.forEach(l => Logger.log(l));
  Logger.log('Pronto: versão final com ' + res.total + ' slides (' + res.gestor + ' do gestor, ' + res.moked + ' da Moked) — ' +
             'https://docs.google.com/presentation/d/' + copia.getId() + '/edit');
}

// Monta a versão final na cópia do deck de Facilities. Devolve { total, gestor, moked, log: [...] }.
function _orcMontarVersaoFinal_(deck, v3, moked) {
  _ORC_BLOBS = {};
  _ORC_PASTA_IMG = undefined;
  _orcAplicarMarca_(null);
  const W = deck.getPageWidth(), H = deck.getPageHeight(), log = [];
  const tituloGerado = s => _orcTituloSlide_(s);

  // 1. O plano a partir da v3: cada slide do gestor com o slide gerado que vem antes dele (a âncora).
  const plano = [];
  let mega = null, ancora = null, mokedPosto = false;
  v3.getSlides().forEach((s, i) => {
    if (!_orcDonoFotos_(s)) {
      mega = _orcMegaDoSlide_(s) || mega;
      ancora = { mega: mega, titulo: tituloGerado(s) };
      return;
    }
    const titulo = _orcTituloGestor_(s);
    if (/Título do assunto/.test(titulo)) return;                                   // molde vazio
    if (/^Implantação Moked/i.test(titulo)) {                                       // os nove de 28_Moked.gs, uma vez
      if (!mokedPosto) moked.getSlides().forEach(m => plano.push({ ancora: ancora, origem: m, moked: true, n: i + 1 }));
      mokedPosto = true;
      return;
    }
    plano.push({ ancora: ancora, origem: s, mega: mega || 'Mega Esteio', n: i + 1, titulo: titulo });
  });
  if (!mokedPosto) log.push('A v3 não tem slide "Implantação Moked": os slides da Moked não entraram.');

  // 2. Sai da cópia o que não vai para a reunião: o "Revisar antes da versão final" e os moldes de fotos.
  const saiu = {};   // id do slide que saiu → Mega dele (para refazer os links)
  mega = null;
  deck.getSlides().forEach(s => {
    const dono = _orcDonoFotos_(s);
    if (!dono) mega = _orcMegaDoSlide_(s) || mega;
    if (dono || /^Revisar antes da versão final/.test(tituloGerado(s))) { saiu[s.getObjectId()] = dono ? mega : null; s.remove(); }
  });

  // 3. Onde fica cada âncora na cópia: mesmo Mega e título; sem o "(1/2)"; senão o último slide do Mega.
  const lista = [];
  mega = null;
  deck.getSlides().forEach((s, i) => { mega = _orcMegaDoSlide_(s) || mega; lista.push({ i: i, mega: mega, t: _orcNorm_(tituloGerado(s)) }); });
  const semPag = t => t.replace(/\s*\(\d+\/\d+\)\s*$/, '');
  const posicao = a => {
    if (!a) return -1;
    const t = _orcNorm_(a.titulo), doMega = lista.filter(x => x.mega === a.mega);
    const e = doMega.filter(x => x.t === t)[0] || doMega.filter(x => semPag(x.t) === semPag(t))[0];
    if (e) return e.i;
    log.push('Âncora "' + a.titulo + '" (' + a.mega + ') não está mais no deck: os slides do gestor vão para o fim do ' + a.mega + '.');
    return doMega.length ? doMega[doMega.length - 1].i : lista.length - 1;
  };
  plano.forEach(p => { p.pos = posicao(p.ancora); });

  // 4. Insere de baixo para cima (as posições de cima não mudam), na ordem da v3 dentro de cada âncora.
  const porPos = {};
  plano.forEach(p => (porPos[p.pos] = porPos[p.pos] || []).push(p));
  const primeiro = {};   // Mega → id do primeiro slide do gestor
  let nGestor = 0, nMoked = 0;
  Object.keys(porPos).map(Number).sort((a, b) => b - a).forEach(pos => {
    porPos[pos].forEach((p, k) => {
      const novo = deck.insertSlide(pos + 1 + k, p.origem);
      if (p.moked) { nMoked++; return; }
      const r = _orcRevisarSlideGestor_(novo, W, H, p.mega, p.n);
      nGestor++;
      if (r.avisos.length) log.push('Slide ' + p.n + ' da v3 (' + p.mega + ') — ' + r.titulo + ': CONFERIR ' + r.avisos.join('; '));
    });
  });
  mega = null;
  deck.getSlides().forEach(s => {
    const dono = _orcDonoFotos_(s);
    if (!dono) { mega = _orcMegaDoSlide_(s) || mega; return; }
    if (mega && !primeiro[mega]) primeiro[mega] = s;
  });

  // 5. Links que iam para os slides que saíram: para o primeiro slide do gestor do Mega, ou saem.
  let refeitos = 0, tirados = 0;
  deck.getSlides().forEach(s => s.getShapes().forEach(sh => {
    let link = null;
    try { link = sh.getLink(); } catch (e) { return; }
    if (!link) return;
    let alvo = null;
    try { alvo = link.getSlideId(); } catch (e) { return; }
    if (!alvo || !(alvo in saiu)) return;
    const novo = saiu[alvo] && primeiro[saiu[alvo]];
    try {
      if (novo) { sh.setLinkSlide(novo); refeitos++; } else { sh.removeLink(); tirados++; }
    } catch (e) { Logger.log('Link não refeito: ' + e.message); }
  }));
  log.push('Saíram ' + Object.keys(saiu).length + ' slides (Revisar e moldes de fotos); links refeitos: ' + refeitos +
           ', tirados: ' + tirados + '.');
  return { total: deck.getSlides().length, gestor: nGestor, moked: nMoked, log: log };
}

// "Mega X" do slide gerado ("… · Mega Itajaí …", ou um texto que começa com ele: capa, sumário, resumo), ou null.
function _orcMegaDoSlide_(slide) {
  const ts = slide.getShapes().map(sh => { try { return sh.getText().asString(); } catch (e) { return ''; } });
  for (let i = 0; i < ts.length; i++) {
    const m = ts[i].match(/(?:^|·\s*)(Mega (?:Esteio|Itajaí|Curitiba))(?![A-Za-zÀ-ú])/);
    if (m) return m[1];
  }
  return null;
}
