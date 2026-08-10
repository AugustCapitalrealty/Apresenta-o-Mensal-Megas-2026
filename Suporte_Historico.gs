/**
 * ARQUIVO: Suporte_Historico.gs
 * SEÇÃO:   SUPORTE — Versionamento
 * DESCRIÇÃO: Versionamento VISUAL das apresentações (estratégia híbrida).
 *            Para o histórico CONSULTÁVEL dos números/indicadores,
 *            veja Suporte_RegistroDados.gs (aba HISTORICO na planilha).
 *
 *   SOB DEMANDA (quando uma versão "vale registrar"):
 *     ▸ marcarFinalCuritiba() / marcarFinalItajai() / marcarFinalEsteio()
 *       cria uma cópia da apresentação atual com nome
 *       "Mega [Cidade] — VERSÃO FINAL — [Data]" na mesma pasta.
 *
 *   registrarRevisaoAutomatica_() (marcar a revisão atual como "manter para
 *   sempre" no histórico nativo do Drive a CADA execução) DESLIGADA a pedido
 *   do usuário — não é mais chamada pelo pipeline (00_Main.gs). A função
 *   continua aqui, funcional, caso alguém queira religar um dia; só exige a
 *   Drive API habilitada no editor (Serviços (+) → Drive API).
 */


// ==========================================
// Chamada SOB DEMANDA, se algum dia quiserem religar o registro automático —
// hoje NENHUM ponto do pipeline chama esta função (ver nota acima).
// ==========================================
function registrarRevisaoAutomatica_() {
  const projeto = getProjetoAtivo();
  const fileId  = projeto.presentationId;

  try {
    // Drive Advanced Service (v2) — precisa ser habilitado no editor
    if (typeof Drive === 'undefined' || !Drive.Revisions) {
      Logger.log('  ⓘ Drive API não habilitada — versão automática pulada.');
      return;
    }

    const revs = Drive.Revisions.list(fileId);
    if (!revs.items || !revs.items.length) return;

    const ultima = revs.items[revs.items.length - 1];
    Drive.Revisions.update({ keepForever: true }, fileId, ultima.id);
    Logger.log('  ⚑ Revisão marcada no histórico do Drive (' + ultima.id + ').');
  } catch (e) {
    Logger.log('  ⓘ Versão automática não registrada: ' + e.message);
  }
}


// ==========================================
// SOB DEMANDA — cópia "VERSÃO FINAL"
// ==========================================
function marcarFinalCuritiba() { _marcarFinal('CURITIBA'); }
function marcarFinalItajai()   { _marcarFinal('ITAJAI');   }
function marcarFinalEsteio()   { _marcarFinal('ESTEIO');   }

function _marcarFinal(chave) {
  setProjetoAtivo(chave);
  const projeto = getProjetoAtivo();
  const orig    = DriveApp.getFileById(projeto.presentationId);

  const dataStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const nome    = projeto.nome + ' — VERSÃO FINAL — ' + dataStr;

  // Coloca a cópia na mesma pasta da apresentação original
  const pais = orig.getParents();
  const copia = pais.hasNext() ? orig.makeCopy(nome, pais.next()) : orig.makeCopy(nome);

  Logger.log('✔ Versão final salva: ' + nome);
  Logger.log('  ' + copia.getUrl());
  return copia.getUrl();
}
