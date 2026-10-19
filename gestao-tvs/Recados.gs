/**
 * ARQUIVO: Recados.gs
 * DESCRIÇÃO: O QUE APARECE NO SLIDE DE RECADOS — o último da TV.
 *
 * ESTE É O ARQUIVO PARA EDITAR À MÃO, direto no editor do Apps Script:
 *   1. Mude os recados abaixo (ou acrescente um copiando um bloco { … }).
 *   2. Salve (Ctrl+S).
 *   3. Rode ATUALIZAR_RECADOS — o slide muda nas três TVs na hora.
 *
 * Cada recado:
 *   ativo     true = pode aparecer; false = guardado, não aparece.
 *   megas     'TODOS', ou só alguns: ['CURITIBA'], ['ITAJAI', 'ESTEIO'].
 *   etiqueta  palavra curta em cima do título: 'Aviso', 'Notícia', 'Evento',
 *             'Boas-vindas', 'Segurança'…
 *   titulo    o título (até ~2 linhas).
 *   texto     o corpo. Para pular linha, use \n dentro do texto.
 *   destaque  (opcional) data, hora ou número em letra grande: '23/10 · 10h'.
 *   fotoId    (opcional) ID de uma foto no Drive — o trecho do link entre
 *             /d/ e /view. Só aparece quando há UM recado na tela.
 *   de, ate   (opcionais) 'dd/mm/aaaa'. Fora do período o recado não
 *             aparece, sem precisar desligar: ele entra e sai sozinho
 *             (na próxima atualização das TVs).
 *
 * Na tela: 1 recado valendo = página inteira (com a foto, se tiver); 2 ou 3 =
 * lado a lado; mais de 3 = os 3 primeiros da lista. Nenhum valendo = o
 * RECADO_PADRAO, para a TV nunca mostrar slide vazio.
 *
 * ⚠ Quem publica o projeto com clasp tem que trazer este arquivo do editor
 * ANTES de publicar (gestao-tvs/README.md) — senão o push apaga os recados
 * editados aqui.
 */

const RECADOS = [
  {
    ativo: true,
    megas: 'TODOS',
    etiqueta: 'Segurança',
    titulo: 'Viu algo fora do lugar? Abra um chamado',
    texto: 'Lâmpada queimada, vazamento, porta que não fecha, piso solto: todo problema registrado no Infraspeak chega à equipe de Facilities e entra na fila que você vê nesta TV.',
    destaque: '',
    fotoId: '',
    de: '',
    ate: ''
  },
  {
    ativo: false,
    megas: ['ESTEIO'],
    etiqueta: 'Evento',
    titulo: 'Simulado de abandono de área',
    texto: 'Participe! Ao ouvir o alarme, siga a brigada até o ponto de encontro.',
    destaque: '23/10 · 10h',
    fotoId: '',
    de: '20/10/2026',
    ate: '23/10/2026'
  }
];

// Aparece quando nenhum recado acima está valendo.
const RECADO_PADRAO = {
  etiqueta: 'Facilities',
  titulo: 'Bom trabalho, equipe!',
  texto: 'Este painel mostra em tempo real o que está aberto, em aprovação e em execução no Mega. Dúvidas ou sugestões: fale com a equipe de Facilities.',
  destaque: ''
};
