/** SLIDE 03 — Receitas Demercado. */
function gerarSlideReceitasDemercado() {
  const d=obterReceitasDemercado_(), c=_dmNovoSlide_('Receitas — Demercado','Realizado, orçamento e variações');
  _dmTabelaComparativa_(c.slide,c.W,c.H,c.H*0.23,c.W*0.055,c.W*0.43,'OFENSORES',d.ofensores,false);
  _dmTabelaComparativa_(c.slide,c.W,c.H,c.H*0.23,c.W*0.515,c.W*0.43,'DEFENSORES',d.defensores,false);
}

function _dmTabelaComparativa_(slide,W,h,y,x,w,titulo,linhas,despesa) {
  const DS=CR_DESIGN_SYSTEM, rowH=Math.min(h*0.052,h*0.57/Math.max(1,linhas.length+1));
  _rrUmaLinha_(slide,x,y,w,h*0.055,titulo,{fs:W*0.015,bold:true,cor:DS.colors.brandMed,align:'L',folga:0}); y+=h*0.06;
  const cols=['Descrição','Real ant.','Orçamento','Real atual','Variação'], widths=[.34,.165,.165,.165,.165];
  cols.forEach((v,i)=>{const xx=x+w*widths.slice(0,i).reduce((a,b)=>a+b,0);_rrCelula_(slide,xx,y,w*widths[i],rowH,DS.colors.brandDark);_rrUmaLinha_(slide,xx,y,w*widths[i],rowH,v,{fs:W*.0088,bold:true,cor:'#FFFFFF'});}); y+=rowH;
  linhas.slice(0,9).forEach(l=>{const vals=[l.nome,l.anterior||'',l.orcamento||'',l.atual||l.realizado||'',l.variacao||''];const fav=_dmVariacaoFavoravel_(l,despesa);vals.forEach((v,i)=>{const xx=x+w*widths.slice(0,i).reduce((a,b)=>a+b,0);_rrCelula_(slide,xx,y,w*widths[i],rowH,'#FFFFFF');_rrUmaLinha_(slide,xx,y,w*widths[i],rowH,v,{fs:W*.0085,cor:i===4?(fav?DS.colors.accentGreen:DS.colors.accentRed):DS.colors.textMain,align:i?'C':'L',bold:i===4});});y+=rowH;});
}
function _dmVariacaoFavoravel_(l,despesa){const n=_dmNumero_(l.variacao);const defensor=l.grupo==='defensores';return despesa ? (defensor||n<=0) : (defensor||n>=0);}

function _dmNovoSlide_(titulo,subtitulo){const deck=getDeckMensal_(),slide=deck.appendSlide(SlidesApp.PredefinedLayout.BLANK),W=deck.getPageWidth(),H=deck.getPageHeight(),DS=CR_DESIGN_SYSTEM;slide.getBackground().setSolidFill('#FFFFFF');const e=slide.insertShape(SlidesApp.ShapeType.ELLIPSE,W*.66,-H*.38,W*.52,W*.52);e.getFill().setSolidFill(DS.colors.brandLight,.045);e.getBorder().setTransparent();_rrUmaLinha_(slide,W*.045,H*.05,W*.62,H*.07,titulo,{fs:W*.028,bold:true,cor:DS.colors.textMain,align:'L',folga:0});_rrUmaLinha_(slide,W*.045,H*.13,W*.62,H*.045,subtitulo,{fs:W*.014,cor:DS.colors.brandMed,fonte:DS.typography.body,align:'L',folga:0});try{const b=DriveApp.getFileById(DS.assets.logoId).getBlob();slide.insertImage(b,W-W*.045-DS.assets.logoW,H*.055,DS.assets.logoW,DS.assets.logoH);}catch(e){Logger.log('Logo não carregado: '+e.message);}return{slide:slide,W:W,H:H};}
