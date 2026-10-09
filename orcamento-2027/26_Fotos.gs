/**
 * ARQUIVO: 26_Fotos.gs
 * SEÇÃO:   08 · Registro fotográfico (09/10/2026, rascunho aprovado pelo
 *          Guilherme): três moldes para o gestor pôr as fotos e escrever a
 *          descrição — 1, 2 e 3 fotos. Cada espaço de foto é uma imagem de
 *          exemplo ("FOTO - MOLDE <m> - <n>.png" na pasta de imagens,
 *          ferramentas/fotos_molde_imagem.py): botão direito → Substituir
 *          imagem, e a foto entra no tamanho e na posição certos.
 *
 * Os slides são do GESTOR: criados uma vez e nunca apagados nem recriados pela
 * geração. Eles levam nas anotações a marca ORC_FOTOS_MARCA com a chave do
 * Mega; a geração pula todo slide com a marca (00_Main.gs, 25_Facilities.gs).
 * Slide duplicado pelo gestor (Ctrl+D) leva a marca junto e também fica.
 */
const ORC_FOTOS_MARCA = '[REGISTRO FOTOGRÁFICO';
const ORC_FOTOS_TITULO = 'Registro fotográfico';

function _orcMarcaFotos_(chave) { return ORC_FOTOS_MARCA + ' · ' + chave + ']'; }

// Texto das anotações do slide; '' se não der para ler.
function _orcNotasSlide_(slide) {
  try { return slide.getNotesPage().getSpeakerNotesShape().getText().asString(); }
  catch (e) { return ''; }
}

// Chave do Mega dono do slide de fotos ('CURITIBA'…), ou null se não é slide de fotos.
function _orcDonoFotos_(slide) {
  const t = _orcNotasSlide_(slide);
  if (t.indexOf(ORC_FOTOS_MARCA) !== 0) return null;
  const m = t.match(/^\[REGISTRO FOTOGRÁFICO · ([A-Z]+)\]/);
  return m ? m[1] : '?';
}

// Slides de fotos do deck (de um Mega, ou de todos sem chave), na ordem do deck.
function _orcSlidesDeFotos_(deck, chave) {
  return deck.getSlides().filter(s => { const d = _orcDonoFotos_(s); return d && (!chave || d === chave); });
}

// { CURITIBA: [ids], … } — para a posição das partes no deck de Facilities.
function _orcFotosPorParte_(deck) {
  const out = {};
  deck.getSlides().forEach(s => { const d = _orcDonoFotos_(s); if (d) (out[d] = out[d] || []).push(s.getObjectId()); });
  return out;
}

// A seção no fim do Mega (depois do secao() que abre a 08). Já existem os
// slides do gestor: ficam como estão (o link do sumário vai para o primeiro).
// Não existem: cria os três moldes.
let _ORC_SLIDE_DO_GESTOR = false;   // _orcNovoSlide_: slide fora da lista da parte (Facilities)
function _orcSecaoFotos_(deck, W, H, cid, chave) {
  const existentes = _orcSlidesDeFotos_(deck, chave);
  if (existentes.length) {
    if (_ORC_UNICO) { _ORC_LINKS.alvos[ORC_FOTOS_TITULO] = existentes[0].getObjectId(); _ORC_UNICO.alvo = null; }
    Logger.log(cid.nome + ': ' + existentes.length + ' slides de fotos do gestor mantidos como estão');
    return;
  }
  _ORC_SLIDE_DO_GESTOR = true;
  try {
    [1, 2, 3].forEach(n => _orcPasso_(deck, W, H, ORC_FOTOS_TITULO + ' — ' + n + (n === 1 ? ' foto' : ' fotos'),
      s => gerarSlideFotos_(s, W, H, cid, chave, n)));
  } finally {
    _ORC_SLIDE_DO_GESTOR = false;
  }
  Logger.log(cid.nome + ': 3 slides de fotos criados para o gestor preencher');
}

function gerarSlideFotos_(slide, W, H, cid, chave, nFotos) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, MX = DS.layout.marginX;
  try {
    slide.getNotesPage().getSpeakerNotesShape().getText().setText(_orcMarcaFotos_(chave) + '\n' +
      'Slide do gestor: a geração do orçamento não apaga nem recria este slide. Para trocar a foto: botão direito na ' +
      'imagem → Substituir imagem. Para mais fotos, duplique o slide (Ctrl+D) — a cópia também fica. Não apague a ' +
      'primeira linha destas anotações.');
  } catch (e) { Logger.log('Anotações do slide de fotos não gravadas: ' + e.message); }

  _orcHeader_(slide, W, ORC_FOTOS_TITULO + ' — Título do assunto', 'Subtítulo: conta, local ou obra · ' + cid.nome);
  const cy = 74, ch = H - 31 - cy, cw = W - MX * 2;
  _orcCard_(slide, MX, cy, cw, ch, null);
  const px = MX + 10, py = cy + 10, pw = cw - 20;
  const legenda = (x, y, w, t) => _orcParagrafo_(slide, x, y, w, 14, t, { fs: 7.5, fsMin: 6, cor: C.textBody, fonte: T.body });
  const rotulo = (x, y, w, t) => _orcUmaLinha_(slide, x, y, w, 12, t,
    { align: 'L', fs: 7.5, bold: true, cor: C.textBody, fonte: T.titles, fsMin: 6, folga: 4 });
  const TXT_DESC = 'Escreva aqui a descrição: o que as fotos mostram e por que isso importa para o orçamento ' +
                   '(ex.: estado atual da cobertura, obra prevista, comparação antes × depois).';

  if (nFotos === 1) {
    const fw = 400, fh = ch - 20;
    _orcFotoMolde_(slide, px, py, fw, fh, 1, 1);
    const tx = px + fw + 16, tw = MX + cw - 12 - tx;
    _orcLinha_(slide, tx - 8, py + 8, tx - 8, py + fh - 8, C.lines, 0.75);
    rotulo(tx, py + 6, tw, 'O QUE MOSTRAR');
    _orcParagrafo_(slide, tx, py + 20, tw, 62, TXT_DESC, { fs: 8, fsMin: 6.5, cor: C.textBody, fonte: T.body });
    [['CONTA', 'Manutenção de imóveis'], ['LOCAL', 'Armazém, área ou equipamento'], ['VALOR NO ORÇ ' + ORC_ANO, 'R$ —']]
      .forEach((c, i) => {
        _orcUmaLinha_(slide, tx, py + 92 + i * 32, tw, 10, c[0],
          { align: 'L', fs: 6.5, bold: true, cor: C.textMuted, fonte: T.titles, fsMin: 6, folga: 4 });
        _orcUmaLinha_(slide, tx, py + 102 + i * 32, tw, 16, c[1],
          { align: 'L', fs: 9.5, bold: true, cor: C.brandDark, fonte: T.titles, fsMin: 7, folga: 4 });
      });
    legenda(tx, py + fh - 16, tw, 'Legenda: data e local da foto.');
  } else {
    const gap = 10, fw = (pw - gap * (nFotos - 1)) / nFotos, fh = nFotos === 2 ? 200 : 190;
    for (let i = 0; i < nFotos; i++) {
      const x = px + i * (fw + gap);
      _orcFotoMolde_(slide, x, py, fw, fh, nFotos, i + 1);
      legenda(x, py + fh + 4, fw, nFotos === 2 ? 'Legenda da foto: o que é, onde fica, quando.' : 'Legenda da foto ' + (i + 1) + '.');
    }
    const ly = py + fh + 24;
    _orcLinha_(slide, px, ly, px + pw, ly, C.lines, 0.75);
    rotulo(px, ly + 6, pw, 'DESCRIÇÃO');
    _orcParagrafo_(slide, px, ly + 20, pw, cy + ch - ly - 26, TXT_DESC, { fs: 8, fsMin: 6.5, cor: C.textBody, fonte: T.body });
  }
  _orcRodape_(slide, W, H, 'Fotos e textos preenchidos pelo gestor · ' + cid.nome);
}

// Espaço da foto: a imagem de exemplo da pasta (o gestor troca com "Substituir
// imagem"); sem ela, um retângulo cinza tracejado com o aviso — aí a foto
// entra por Inserir → Imagem e é ajustada à mão.
function _orcFotoMolde_(slide, x, y, w, h, molde, n) {
  const DS = CR_DESIGN_SYSTEM;
  const blob = _orcImagemDaPasta_('FOTO - MOLDE ' + molde + ' - ' + n + '.png');
  if (blob) {
    slide.insertImage(blob).setLeft(x).setTop(y).setWidth(w).setHeight(h);
    return;
  }
  Logger.log('Molde de fotos: "FOTO - MOLDE ' + molde + ' - ' + n + '.png" não está na pasta ' + ORC_PASTA_IMAGENS +
             ' (ferramentas/fotos_molde_imagem.py) — vai um retângulo no lugar.');
  _orcRet_(slide, x, y, w, h, '#E8EEF5', { borda: DS.colors.textMuted, peso: 0.75, semMoldura: true, semGrafico: true });
  _orcUmaLinha_(slide, x, y + h / 2 - 10, w, 12, 'FOTO ' + n,
    { align: 'C', fs: 8, bold: true, cor: DS.colors.textBody, fonte: DS.typography.titles, fsMin: 6 });
  _orcUmaLinha_(slide, x, y + h / 2 + 2, w, 11, 'Inserir → Imagem e ajustar a este espaço',
    { align: 'C', fs: 6.5, cor: DS.colors.textMuted, fonte: DS.typography.body, fsMin: 5 });
}
