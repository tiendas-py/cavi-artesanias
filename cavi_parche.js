// CAVI 2.2 FINAL - Parche v3 SEGURO (sin bucle, sin colgar)
// Subilo a GitHub como cavi_parche.js (ya borraste el viejo, así que subilo nuevo)
// En index.html ya tenés: <script src="cavi_parche.js"></script> - no toques index.html
(function(){
  var KEY='cavi20_products_v2';
  var INV='\u2060'; // WORD JOINER: invisible, no lo borra trim() ni el cleanStr de la tienda
  // 1) Cuando Admin GUARDA (POST a Google), convertir desc/badge vacíos en INV
  var origFetch = window.fetch;
  window.fetch = function(url, opts){
    try{
      if(typeof url==='string' && url.indexOf('script.google.com')!==-1 && opts && opts.body){
        var b=JSON.parse(opts.body);
        var list=b.products||b;
        if(Array.isArray(list)){
          list.forEach(function(p){
            if(p){
              if(p.desc===''||p.desc==null) p.desc=INV;
              if(p.badge===''||p.badge==null) p.badge=INV;
            }
          });
          opts.body=JSON.stringify(b);
        }
      }
    }catch(e){}
    return origFetch.apply(this, arguments);
  };
  // 2) Cuando Admin guarda en localStorage, lo mismo
  var origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(k, v){
    try{
      if(k===KEY && v){
        var arr=JSON.parse(v);
        if(Array.isArray(arr)){
          arr.forEach(function(p){
            if(p){
              if(p.desc===''||p.desc==null) p.desc=INV;
              if(p.badge===''||p.badge==null) p.badge=INV;
            }
          });
          v=JSON.stringify(arr);
        }
      }
    }catch(e){}
    return origSet.call(this, k, v);
  };
  // 3) Corrección del precio SOLO cuando se abre el detalle, UNA vez, sin observador
  var corrigiendo=false;
  function fmt(n){ return 'Gs '+Number(n).toLocaleString('es-PY'); }
  function corregirDetalle(){
    if(corrigiendo) return;
    corrigiendo=true;
    try{
      var raw=localStorage.getItem(KEY); if(!raw){ corrigiendo=false; return; }
      var prods=JSON.parse(raw); if(!Array.isArray(prods)){ corrigiendo=false; return; }
      // Buscar el título del detalle abierto
      var titleEl=null;
      document.querySelectorAll('h1,h2,h3').forEach(function(el){
        var t=(el.textContent||'').trim();
        if(prods.some(function(p){ return p.name===t; })) titleEl=el;
      });
      if(!titleEl){ corrigiendo=false; return; }
      var prod=prods.find(function(p){ return p.name===titleEl.textContent.trim(); });
      if(!prod || prod.salePrice==='' || prod.salePrice==null){ corrigiendo=false; return; }
      var sale=Number(prod.salePrice), price=Number(prod.price);
      // Subir hasta el contenedor del modal
      var cont=titleEl.parentElement;
      for(var i=0;i<6 && cont;i++){ if(cont.textContent.indexOf('Gs ')!==-1) break; cont=cont.parentElement; }
      if(!cont) cont=document.body;
      // Corregir el precio que está cerca de sale pero no es exacto (ej: 84995 -> 85000)
      cont.querySelectorAll('*').forEach(function(el){
        if(el.childNodes.length===1 && el.childNodes[0].nodeType===3){
          var t=el.textContent.trim();
          if(t.indexOf('Gs ')===0){
            var num=parseInt(t.replace(/[^0-9]/g,''),10);
            if(!isNaN(num) && num!==price && num!==sale && Math.abs(num-sale)<2000){
              el.textContent=fmt(sale);
            }
          }
          if(t.indexOf('Ahorr')!==-1 && t.indexOf('Gs ')!==-1){
            el.textContent='Ahorrás '+fmt(price-sale)+' en esta pieza';
          }
        }
      });
    }catch(e){}
    setTimeout(function(){ corrigiendo=false; }, 500);
  }
  // Solo al hacer clic en el ojito / en una tarjeta, esperar a que abra y corregir una vez
  document.addEventListener('click', function(){
    setTimeout(corregirDetalle, 400);
    setTimeout(corregirDetalle, 900);
  });
})();
