/**
 * ARQUIVO: Slide_IconesCapas.gs
 * ÍCONES DAS CAPAS DE SEÇÃO — pasta do Google Drive
 *
 * Mesma ideia dos logos de cliente (Slide_LogosClientes.gs): a imagem mora no
 * Drive e o código só a encaixa no slide. A diferença é que aqui NÃO tem mapa
 * de IDs de arquivo — o ícone é procurado pelo NOME dentro de UMA pasta. Para
 * trocar o ícone de uma seção basta substituir o arquivo na pasta; nada de
 * editar código e reimplantar.
 *
 * ┌─ COMO CONFIGURAR ────────────────────────────────────────────────────────┐
 * │ 1. Crie uma pasta no Drive (ex.: "Ícones — Capas de Seção") e compartilhe │
 * │    com a conta que roda o script.                                        │
 * │ 2. Cole o ID da pasta em ICONES_CAPAS_PASTA_ID abaixo (o ID é o trecho    │
 * │    depois de /folders/ na URL).                                          │
 * │ 3. Ponha um arquivo PNG por seção, com os nomes de _ICONES_CAPAS_ARQUIVO_ │
 * │    (preventiva.png, corretiva.png, ...).                                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * PNG, NÃO SVG. A API do Slides aceita apenas PNG, JPEG e GIF — um SVG na
 * pasta seria recusado com erro obscuro na hora de gerar. Por isso o tipo do
 * arquivo é conferido ANTES de inserir e um SVG vira um aviso claro no Logger
 * (ver _iconeCapaFormatoOk_).
 *
 * O ícone precisa ser CLARO (branco/quase branco) e com fundo transparente: a
 * capa é uma foto escurecida, e um ícone preto simplesmente some. Diferente do
 * motivo desenhado, uma imagem não pode ser recolorida pelo código.
 *
 * NADA É OBRIGATÓRIO. Sem pasta configurada, sem arquivo, arquivo inacessível
 * ou em formato errado, a capa desenha o motivo geométrico nativo de sempre
 * (_secDesenharMotivo_ em Slide_CapaSecao.gs) — que é vetorial e continua
 * sendo o padrão até alguém povoar a pasta.
 */

// ID da pasta do Drive com os ícones. DESLIGADO por opção: vazio = nenhuma
// chamada ao Drive e capas 100% no desenho nativo.
//
// Para religar, basta pôr o ID da pasta aqui (a pasta de assets do projeto é
// 1LDDbVpH0zAwUeQR7cu7bTOqg74Fa5Yks — onde já moram os logos Mega e as
// subpastas CR/, CLIENTES/, FOTOS MEGAS/) e colocar os PNGs com os nomes de
// _ICONES_CAPAS_ARQUIVO_. Só os arquivos SOLTOS na pasta são procurados.
const ICONES_CAPAS_PASTA_ID = '';

// Chave da seção (a mesma de _secDesenharMotivo_) → nome do arquivo na pasta,
// sem extensão. A extensão é resolvida por _ICONES_CAPAS_EXTENSOES_.
const _ICONES_CAPAS_ARQUIVO_ = {
  'PREVENTIVA'  : 'preventiva',
  'CORRETIVA'   : 'corretiva',
  'CONTRATADOS' : 'contratados',
  'INTERNOS'    : 'internos',
  'PATRIMONIAL' : 'patrimonial',
  'OPERACIONAL' : 'operacional',
  'UTILITIES'   : 'utilities',
  'SUSTENTAVEL' : 'sustentavel',
  'DOCUMENTACAO': 'documentacao'
};

// Extensões tentadas, em ordem. PNG primeiro: é o que preserva transparência
// e traço fino de ícone sem artefato de compressão.
const _ICONES_CAPAS_EXTENSOES_ = ['png', 'jpg', 'jpeg', 'gif'];

// Formatos que a API do Slides aceita em insertImage.
const _ICONES_CAPAS_MIMES_OK_ = ['image/png', 'image/jpeg', 'image/gif'];

// Lado da caixa (pt) onde o ícone é encaixado, centrada no mesmo ponto do
// motivo nativo. _insertLogoFit_ preenche o MÁXIMO da caixa sem distorcer,
// então ícone quadrado e ícone largo ocupam a mesma área visual.
const ICONE_CAPA_BOX_PT = 108;

// Cache por chave de seção, inclusive dos MISSES (valor null): sem isso, um
// deck das três cidades repetiria a mesma busca no Drive a cada capa.
const _iconeCapaCache_ = {};

// Índice nome→arquivo da pasta, montado UMA vez por execução.
//
// Vale a pena listar a pasta inteira em vez de perguntar arquivo por arquivo:
// com getFilesByName seriam 4 consultas (uma por extensão) × 9 seções = 36
// idas ao Drive quando a pasta ainda não tem ícone nenhum — que é justamente
// o estado inicial. Assim é 1 só. De quebra, o índice é minúsculo, então
// "Preventiva.PNG" também é encontrado (o Drive diferencia maiúsculas).
let _iconeCapaIndice_ = null;

function _iconesCapaIndice_() {
  if (_iconeCapaIndice_) return _iconeCapaIndice_;
  const idx = {};
  try {
    const it = DriveApp.getFolderById(ICONES_CAPAS_PASTA_ID).getFiles();
    while (it.hasNext()) {
      const f = it.next();
      idx[String(f.getName() || '').toLowerCase()] = f;
    }
  } catch (e) {
    Logger.log('Ícones das capas: pasta do Drive inacessível (' + e.message +
               ') — usando os motivos desenhados.');
  }
  _iconeCapaIndice_ = idx;
  return idx;
}

// Devolve o Blob do ícone da seção, ou null (sem pasta, sem arquivo, arquivo
// inacessível ou formato não suportado). Nunca lança.
function _getIconeCapaBlob_(chave) {
  if (!ICONES_CAPAS_PASTA_ID) return null;

  const nomeBase = _ICONES_CAPAS_ARQUIVO_[String(chave || '').toUpperCase()];
  if (!nomeBase) return null;

  if (nomeBase in _iconeCapaCache_) return _iconeCapaCache_[nomeBase];

  const idx = _iconesCapaIndice_();
  let achado = null;
  for (let i = 0; i < _ICONES_CAPAS_EXTENSOES_.length && !achado; i++) {
    achado = idx[nomeBase + '.' + _ICONES_CAPAS_EXTENSOES_[i]] || null;
  }
  if (!achado) {
    Logger.log('Ícone da capa "' + chave + '": nenhum arquivo "' + nomeBase +
               '.(png|jpg|gif)" na pasta — usando o motivo desenhado.');
  }

  let blob = null;
  if (achado) {
    try {
      const b = achado.getBlob();
      blob = _iconeCapaFormatoOk_(b, chave, achado.getName()) ? b : null;
    } catch (e) {
      Logger.log('Ícone da capa "' + chave + '": arquivo não abriu (' + e.message + ').');
    }
  }

  _iconeCapaCache_[nomeBase] = blob;
  return blob;
}

// O erro do Slides para formato não suportado não diz qual arquivo causou o
// problema — conferir aqui transforma isso num aviso acionável.
function _iconeCapaFormatoOk_(blob, chave, nomeArquivo) {
  const mime = String(blob.getContentType() || '').toLowerCase();
  if (_ICONES_CAPAS_MIMES_OK_.indexOf(mime) >= 0) return true;
  Logger.log('Ícone da capa "' + chave + '": "' + nomeArquivo + '" é ' + (mime || 'de tipo desconhecido') +
             '. O Slides só aceita PNG, JPEG e GIF' +
             (mime.indexOf('svg') >= 0 ? ' — converta o SVG para PNG (512px, traço branco, fundo transparente).' : '.') +
             ' Usando o motivo desenhado.');
  return false;
}

// Desenha o ícone da seção centrado em (cx, cy). Devolve true se desenhou —
// false manda o chamador cair no motivo geométrico nativo.
function _secIconeCapa_(slide, cx, cy, chave) {
  const blob = _getIconeCapaBlob_(chave);
  if (!blob) return false;
  try {
    const b = ICONE_CAPA_BOX_PT;
    _insertLogoFit_(slide, blob, cx - b / 2, cy - b / 2, b, b);
    return true;
  } catch (e) {
    Logger.log('Ícone da capa "' + chave + '": não inseriu no slide (' + e.message + ').');
    return false;
  }
}

// Diagnóstico manual: roda pela pasta e diz, seção a seção, o que está pronto
// e o que falta. Use depois de povoar a pasta, antes de gerar o deck.
function conferirIconesCapas() {
  if (!ICONES_CAPAS_PASTA_ID) {
    Logger.log('ICONES_CAPAS_PASTA_ID vazio — as capas usam o motivo desenhado (padrão atual).');
    return;
  }
  _iconeCapaIndice_ = null;   // relê a pasta: o arquivo pode ter acabado de entrar
  Object.keys(_ICONES_CAPAS_ARQUIVO_).forEach(chave => {
    delete _iconeCapaCache_[_ICONES_CAPAS_ARQUIVO_[chave]];
    const blob = _getIconeCapaBlob_(chave);
    Logger.log((blob ? '✓ ' : '· ') + chave + (blob ? ' → ' + blob.getContentType() : ' → motivo desenhado'));
  });
}
