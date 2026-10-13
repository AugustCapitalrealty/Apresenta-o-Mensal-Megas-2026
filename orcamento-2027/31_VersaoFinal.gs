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
  const mokedId = PropertiesService.getScriptProperties().getProperty(ORC_MOKED.prop);
  if (!mokedId) throw new Error('Rode gerarSlidesMoked() antes: a apresentação da Moked ainda não existe.');

  const copia = _orcCopiaVersaoFinal_(facId, ORC_VERSAO_FINAL.nome, ORC_VERSAO_FINAL.prop);
  const deck = SlidesApp.openById(copia.getId());
  const res = _orcMontarVersaoFinal_(deck, SlidesApp.openById(ORC_DECK_VERSAO_GESTOR_ID), SlidesApp.openById(mokedId));
  _orcSalvarDeck_(deck, 'a versão final');
  res.log.forEach(l => Logger.log(l));
  Logger.log('Pronto: versão final com ' + res.total + ' slides (' + res.gestor + ' do gestor, ' + res.moked + ' da Moked) — ' +
             'https://docs.google.com/presentation/d/' + copia.getId() + '/edit');
}

/**
 * A versão final de UM Mega (13/10/2026 — Guilherme: "uma função só pra gerar o Mega Esteio completo"; cabe folgado
 * nos 6 min): "MEGA <X> - ORÇAMENTO 2027 · VERSÃO FINAL (data hora)", com só a parte do Mega do deck de Facilities e
 * os slides do gestor desse Mega na v3 (no Esteio, também os nove da Moked). Antes: gerarFacilities<Mega>() e, no
 * Esteio, gerarSlidesMoked(). Rodar de novo cria outra cópia; a anterior vira "PODE EXCLUIR - …".
 */
function gerarVersaoFinalEsteio()   { _orcGerarVersaoFinalMega_('ESTEIO'); }
function gerarVersaoFinalItajai()   { _orcGerarVersaoFinalMega_('ITAJAI'); }
function gerarVersaoFinalCuritiba() { _orcGerarVersaoFinalMega_('CURITIBA'); }

function _orcGerarVersaoFinalMega_(chave) {
  const cid = ORC_CIDADES[chave], facId = _orcIdFacilities_();
  if (!facId) throw new Error('Falta o deck de Facilities: rode criarDeckFacilities() (25_Facilities.gs) uma vez.');
  const funcao = 'gerarFacilities' + chave.charAt(0) + chave.slice(1).toLowerCase() + '()';
  // A cópia tem a mesma ordem do deck de Facilities: as posições dos slides da parte do Mega dizem o que fica.
  const idsParte = _orcListaFacilities_(chave), manter = {};
  SlidesApp.openById(facId).getSlides().forEach((s, i) => { if (idsParte.indexOf(s.getObjectId()) >= 0) manter[i] = true; });
  if (!Object.keys(manter).length) throw new Error('O ' + cid.nome + ' não está no deck de Facilities: rode ' + funcao + ' (25_Facilities.gs) antes.');
  const mokedId = PropertiesService.getScriptProperties().getProperty(ORC_MOKED.prop);
  if (chave === 'ESTEIO' && !mokedId) throw new Error('Rode gerarSlidesMoked() (28_Moked.gs) antes: a apresentação da Moked ainda não existe.');

  const copia = _orcCopiaVersaoFinal_(facId, cid.nome.toUpperCase() + ' - ORÇAMENTO ' + ORC_ANO + ' · VERSÃO FINAL',
                                      'ORC_VERSAO_FINAL_' + chave + '_DECK_ID');
  const deck = SlidesApp.openById(copia.getId());
  deck.getSlides().forEach((s, i) => { if (!manter[i]) s.remove(); });   // a abertura e os outros Megas
  const res = _orcMontarVersaoFinal_(deck, SlidesApp.openById(ORC_DECK_VERSAO_GESTOR_ID), mokedId ? SlidesApp.openById(mokedId) : null, cid.nome);
  _orcSalvarDeck_(deck, 'a versão final do ' + cid.nome);
  res.log.forEach(l => Logger.log(l));
  Logger.log('Pronto: versão final do ' + cid.nome + ' com ' + res.total + ' slides (' + res.gestor + ' do gestor, ' + res.moked +
             ' da Moked) — https://docs.google.com/presentation/d/' + copia.getId() + '/edit');
}

// Cópia do deck de Facilities na pasta do orçamento, com a data e a hora no nome; a cópia anterior (ID na propriedade
// prop) vira "PODE EXCLUIR - …".
function _orcCopiaVersaoFinal_(facId, nome, prop) {
  const props = PropertiesService.getScriptProperties();
  const anterior = props.getProperty(prop);
  if (anterior) {
    try { const f = DriveApp.getFileById(anterior); if (f.getName().indexOf('PODE EXCLUIR - ') !== 0) f.setName('PODE EXCLUIR - ' + f.getName()); }
    catch (e) { Logger.log('A versão final anterior (' + anterior + ') não foi renomeada: ' + e.message); }
  }
  const quando = Utilities.formatDate(new Date(), 'America/Sao_Paulo', "dd-MM-yyyy HH'h'mm");
  const copia = DriveApp.getFileById(facId).makeCopy(nome + ' (' + quando + ')', DriveApp.getFolderById(ORC_PASTA_ORCAMENTO_ID));
  props.setProperty(prop, copia.getId());
  return copia;
}

// Monta a versão final na cópia do deck de Facilities. Devolve { total, gestor, moked, log: [...] }.
// soMega ("Mega Esteio"…): só os slides do gestor desse Mega entram (a versão final de um Mega só).
function _orcMontarVersaoFinal_(deck, v3, moked, soMega) {
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
    if (soMega && (mega || 'Mega Esteio') !== soMega) return;                       // versão de um Mega só
    if (/^Implantação Moked/i.test(titulo)) {                                       // os nove de 28_Moked.gs, uma vez
      if (!mokedPosto && moked) moked.getSlides().forEach(m => plano.push({ ancora: ancora, origem: m, moked: true, n: i + 1 }));
      mokedPosto = true;
      return;
    }
    plano.push({ ancora: ancora, origem: s, mega: mega || 'Mega Esteio', n: i + 1, titulo: titulo });
  });
  if (!mokedPosto && (!soMega || soMega === 'Mega Esteio')) log.push('A v3 não tem slide "Implantação Moked": os slides da Moked não entraram.');

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
      const r = _orcRevisarSlideGestor_(novo, W, H, p.mega, p.n, p.ancora);
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

// ==========================================
// MEGA COMPLETO (00_Gerar.gs): os slides do gestor da v3 dentro da parte do Mega no deck de Facilities
// ==========================================
// Cada slide do gestor do Mega na v3 (Moked, substituição da segurança, obras…) é copiado logo depois do slide gerado
// que vem antes dele lá (a âncora: mesmo título; sem o "(1/2)" se a paginação mudou; sem achar, no fim do Mega),
// revisado como em 29_GestorRevisado.gs, e entra na lista da parte — a próxima geração do Mega troca também esses. Os
// moldes de fotos vazios do Mega saem. Perto dos 6 min do Apps Script, para e agenda completarSlidesDoGestor().
function _orcGestorNaParte_(deckId, parte, inicio) {
  const cid = ORC_CIDADES[parte], props = PropertiesService.getScriptProperties();
  const propLista = 'ORC_FAC_' + parte, propFeitos = 'ORC_FAC_GESTOR_FEITOS_' + parte;
  const feitos = JSON.parse(props.getProperty(propFeitos) || '[]');
  props.setProperty('ORC_FAC_GESTOR_PENDENTE', parte);
  const deck = SlidesApp.openById(deckId), W = deck.getPageWidth(), H = deck.getPageHeight();
  const textosDe = s => s.getShapes().map(sh => { try { return sh.getText().asString(); } catch (e) { return ''; } });
  const megaDe = ts => {
    for (let i = 0; i < ts.length; i++) {
      const m = ts[i].match(/(?:^|·\s*)(Mega (?:Esteio|Itajaí|Curitiba))(?![A-Za-zÀ-ú])/);
      if (m) return m[1];
    }
    return null;
  };
  const tituloDe = ts => ts.map(t => t.trim()).filter(String)[0] || '';

  // 1. Saem os slides do gestor deste Mega que não estão na lista da parte: os moldes de fotos vazios e o que sobrou de
  //    uma rodada que parou no meio (no Mega completo os slides do gestor vêm da v3, copiados de novo).
  let nMoldes = 0;
  const naLista = JSON.parse(props.getProperty(propLista) || '[]');
  (_orcFotosPorParte_(deck)[parte] || []).forEach(id => {
    if (naLista.indexOf(id) >= 0) return;
    const s = deck.getSlideById(id);
    if (!s) return;
    const t = _orcTituloGestor_(s);
    if (!/Título do assunto/.test(t)) Logger.log(cid.nome + ' · saiu um slide do gestor que tinha sobrado no deck: ' + t);
    s.remove();
    nMoldes++;
  });

  // 2. O plano: os slides do gestor deste Mega na v3, cada um com a âncora. A seção do Mega vai do sumário dele ao
  //    sumário do Mega seguinte.
  const v3 = SlidesApp.openById(ORC_DECK_VERSAO_GESTOR_ID);
  const plano = [];
  let mega = null, ancora = null, dentro = false;
  const sv3 = v3.getSlides();
  for (let i = 0; i < sv3.length; i++) {
    const s = sv3[i];
    if (!_orcDonoFotos_(s)) {
      const ts = textosDe(s), t = tituloDe(ts);
      mega = megaDe(ts) || mega;
      if (t === 'Sumário') { if (dentro && mega !== cid.nome) break; if (mega === cid.nome) dentro = true; }
      ancora = { mega: mega, titulo: t };
      continue;
    }
    if ((mega || 'Mega Esteio') !== cid.nome) continue;
    const titulo = _orcTituloGestor_(s);
    if (/Título do assunto/.test(titulo)) continue;                                  // molde vazio
    plano.push({ ancora: ancora, origem: s, n: i + 1, titulo: titulo, feito: feitos.indexOf(s.getObjectId()) >= 0 });
  }

  // 3. A posição de cada âncora entre os slides gerados da parte.
  const lista = JSON.parse(props.getProperty(propLista) || '[]');
  const slides = deck.getSlides(), ids = slides.map(s => s.getObjectId());
  const daParte = lista.map(id => ids.indexOf(id)).filter(i => i >= 0).sort((a, b) => a - b);
  const titulos = {};
  daParte.forEach(i => { titulos[i] = _orcNorm_(tituloDe(textosDe(slides[i]))); });
  const semPag = t => t.replace(/\s*\(\d+\/\d+\)\s*$/, '');
  const ultimo = daParte.length ? daParte[daParte.length - 1] : ids.length - 1;
  const log = [];
  const posicao = a => {
    const t = _orcNorm_((a && a.titulo) || '');
    let e = daParte.filter(i => titulos[i] === t)[0];
    if (e === undefined) e = daParte.filter(i => semPag(titulos[i]) === semPag(t))[0];
    if (e !== undefined) return e;
    log.push('âncora "' + ((a && a.titulo) || '—') + '" não está no ' + cid.nome + ': o slide do gestor foi para o fim do Mega');
    return ultimo;
  };

  // 4. Insere de baixo para cima (as posições de cima não mudam), na ordem da v3 em cada âncora; os já copiados numa
  //    rodada que parou contam na posição.
  const grupos = {};
  plano.forEach(p => { p.pos = posicao(p.ancora); (grupos[p.pos] = grupos[p.pos] || []).push(p); });
  let n = 0, parou = false;
  Object.keys(grupos).map(Number).sort((a, b) => b - a).forEach(pos => {
    grupos[pos].forEach((p, k) => {
      if (parou || p.feito) return;
      if (Date.now() - inicio > 5 * 60 * 1000) { parou = true; return; }
      const novo = deck.insertSlide(pos + 1 + k, p.origem);
      // Na lista logo ao entrar: se a execução parar no meio, a próxima geração do Mega tira este slide também.
      lista.push(novo.getObjectId());
      feitos.push(p.origem.getObjectId());
      n++;
      props.setProperty(propLista, JSON.stringify(lista));
      props.setProperty(propFeitos, JSON.stringify(feitos));
      // A revisão que falha não para a geração: o slide fica como está na v3 e o log pede para conferir.
      try {
        const r = _orcRevisarSlideGestor_(novo, W, H, cid.nome, p.n, p.ancora);
        if (r.avisos.length) log.push('slide ' + p.n + ' da v3 — ' + r.titulo + ': CONFERIR ' + r.avisos.join('; '));
      } catch (e) {
        // A revisão pode ter parado no meio (tabela tirada e não desenhada): sai a cópia e entra outra, sem revisão.
        try {
          novo.remove();
          const cru = deck.insertSlide(pos + 1 + k, p.origem);
          lista[lista.length - 1] = cru.getObjectId();
          props.setProperty(propLista, JSON.stringify(lista));
          cru.getNotesPage().getSpeakerNotesShape().getText().setText(_orcMarcaFotos_(parte) + '\nCopiado da v3 (slide ' + p.n +
            ') sem a revisão de 29_GestorRevisado.gs, que falhou: ' + e.message + '. Não apague a primeira linha destas anotações.');
        } catch (e2) { log.push('slide ' + p.n + ' da v3: a cópia sem revisão também falhou (' + e2.message + ')'); }
        log.push('slide ' + p.n + ' da v3 — ' + p.titulo + ': CONFERIR, a revisão falhou (' + e.message + ') — entrou como está na v3');
      }
    });
  });
  _orcSalvarDeck_(deck, 'os slides do gestor do ' + cid.nome);
  log.forEach(l => Logger.log(cid.nome + ' · ' + l));
  const nMoked = plano.filter(p => /^Implantação Moked/i.test(p.titulo)).length;
  Logger.log(cid.nome + ' · slides do gestor da v3: ' + (plano.filter(p => p.feito).length + n) + ' de ' + plano.length +
             ' no Mega (' + nMoked + ' da Moked) · ' + nMoldes + ' moldes de fotos vazios saíram');
  if (parou) {
    ScriptApp.newTrigger('completarSlidesDoGestor').timeBased().after(60 * 1000).create();
    Logger.log('Sem tempo para todos os slides do gestor do ' + cid.nome + ': continua sozinho em 1 minuto — se não começar, ' +
               'rode completarSlidesDoGestor() (00_Gerar.gs).');
  } else props.deleteProperty('ORC_FAC_GESTOR_PENDENTE');
  return { n: n, total: plano.length, parou: parou };
}
