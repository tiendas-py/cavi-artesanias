// CAVI 2.2 FINAL - Parche v2 - Corrección real
// Subí este archivo a GitHub REEMPLAZANDO al cavi_parche.js viejo (mismo nombre).
// Ya tenés en index.html: <script src="cavi_parche.js"></script> - no hace falta tocar index.html.
(function(){
  var KEY='cavi20_products_v2';
  var ZW='\u200b';
  var DEFAULT_DESC='Pieza hecha a mano, con historia y mucho cariño. Consultá disponibilidad en tienda.';
  var DEFAULT_BADGE='Hecho a mano · Pieza única · Consultá disponibilidad en tienda.';
  function fmt(n){ try{ return 'Gs '+Number(n).toLocaleString('es-PY'); }catch(e){ return 'Gs '+n; } }
  function getProducts(){
    try{
      var s=localStorage.getItem(KEY); if(!s) return [];
      var a=JSON.parse(s); return Array.isArray(a)?a:[];
    }catch(e){ return []; }
  }
  // 1) Parchear fetch a Google: cuando viene la lista, convertir desc vacía en ZW
  // así React con "desc || default" usa ZW (invisible) y NO pone el texto automático.
  var origFetch = window.fetch;
  window.fetch = function(url, opts){
    var isGoogle = typeof url==='string' && url.indexOf('script.google.com')!==-1;
    // POST: antes de enviar, marcar vacíos para que no se pierdan
    if(isGoogle && opts && opts.body){
      try{
        var b=JSON.parse(opts.body);
        var list=b.products||b;
        if(Array.isArray(list)){
          list.forEach(function(p){
            if(p && (p.desc===''||p.desc==null)) p.desc=ZW;
            if(p && (p.badge===''||p.badge==null)) p.badge=ZW;
            // Asegurar salePrice exacto: entero, sin recalcular
            if(p && p.salePrice!==''&&p.salePrice!=null) p.salePrice=Math.floor(Number(p.salePrice));
          });
          opts.body=JSON.stringify(b);
        }
      }catch(e){}
    }
    return origFetch.call(this, url, opts).then(function(res){
      if(!isGoogle) return res;
      // Clonar respuesta para reescribirla
      return res.clone().json().then(function(data){
        try{
          var list=data && data.products;
          if(Array.isArray(list)){
            list.forEach(function(p){
              if(p && (p.desc===''||p.desc==null)) p.desc=ZW;
              if(p && (p.badge===''||p.badge==null)) p.badge=ZW;
              if(p && p.salePrice!==''&&p.salePrice!=null) p.salePrice=Math.floor(Number(p.salePrice));
            });
          }
        }catch(e){}
        return new Response(JSON.stringify(data), {headers:{'Content-Type':'application/json'}});
      }).catch(function(){ return res; });
    });
  };
  // 2) Parchear localStorage igual
  var origGet = Storage.prototype.getItem;
  Storage.prototype.getItem = function(k){
    var v=origGet.call(this,k);
    if(k===KEY && v){
      try{
        var arr=JSON.parse(v);
        if(Array.isArray(arr)){
          var ch=false;
          arr.forEach(function(p){
            if(p && (p.desc===''||p.desc==null)){ p.desc=ZW; ch=true; }
            if(p && (p.badge===''||p.badge==null)){ p.badge=ZW; ch=true; }
          });
          if(ch) return JSON.stringify(arr);
        }
      }catch(e){}
    }
    return v;
  };
  // 3) Corrección visual: después de que React dibuja, arreglar lo que muestra
  function fixScreen(){
    try{
      var prods=getProducts(); if(!prods.length) return;
      // Buscar el modal de detalle abierto por su título (h2 / nombre del producto)
      var titleEl=null;
      document.querySelectorAll('h1,h2,h3').forEach(function(el){
        var t=(el.textContent||'').trim();
        if(prods.some(function(p){ return p.name===t; })) titleEl=el;
      });
      if(!titleEl) return;
      var name=titleEl.textContent.trim();
      var prod=prods.find(function(p){ return p.name===name; });
      if(!prod) return;
      // Contenedor del modal: subir hasta el padre que contiene el precio
      var container=titleEl.parentElement;
      for(var i=0;i<5 && container;i++){ if(container.textContent.indexOf('Gs ')!==-1) break; container=container.parentElement; }
      if(!container) container=document.body;
      // a) Descripción: si guardada es vacía/ZW, ocultar el párrafo que muestra el texto automático
      var isDescEmpty = !prod.desc || prod.desc===ZW || prod.desc.trim()==='' || prod.desc===DEFAULT_DESC && false;
      // Ojo: si el admin dejó vacío, Google guardó ZW o "". Si el producto viejo tenía el texto automático
      // y el admin lo editó y lo dejó vacío, ahora viene como ZW. Si nunca se editó, viene con texto real.
      // Para el caso de la prueba: si el modal muestra DEFAULT_DESC y el producto guardado es ZW/vacío, ocultarlo.
      if(isDescEmpty){
        container.querySelectorAll('p,div,span').forEach(function(el){
          if(el.childNodes.length===1 && el.childNodes[0].nodeType===3){
            var t=el.textContent.trim();
            if(t===DEFAULT_DESC){ el.style.display='none'; }
            if(t===DEFAULT_BADGE && (!prod.badge || prod.badge===ZW)){ el.style.display='none'; }
          }
        });
      }
      // b) Precio con descuento: si el guardado es 85000 pero muestra 84995, corregirlo
      if(prod.salePrice!=='' && prod.salePrice!=null){
        var correcto=fmt(prod.salePrice);
        var correctoSinEspacio=correcto.replace(/\s/g,'');
        // Buscar todos los textos Gs xxx en el modal y corregir el que es el precio con descuento
        // El precio con descuento es el más grande / en negrita. Corregimos cualquier Gs que no coincida
        // con precio normal ni con salePrice correcto, si está cerca del salePrice (diferencia < 1000)
        container.querySelectorAll('*').forEach(function(el){
          if(el.childNodes.length===1 && el.childNodes[0].nodeType===3){
            var t=el.textContent.trim();
            if(t.indexOf('Gs ')===0){
              var num=parseInt(t.replace(/[^0-9]/g,''),10);
              if(!isNaN(num) && num!==Number(prod.price) && num!==Number(prod.salePrice) && Math.abs(num-Number(prod.salePrice))<2000){
                el.textContent=correcto;
              }
            }
          }
        });
        // También corregir "Ahorrás Gs X" => debe ser precio - salePrice exacto
        container.querySelectorAll('*').forEach(function(el){
          if(el.childNodes.length===1 && el.childNodes[0].nodeType===3){
            var t=el.textContent||'';
            if(t.indexOf('Ahorr')!==-1 && t.indexOf('Gs ')!==-1){
              var ahorro=Number(prod.price)-Number(prod.salePrice);
              el.textContent='Ahorrás '+fmt(ahorro)+' en esta pieza';
            }
          }
        });
        // Corregir el % OFF: debe ser round((1 - sale/price)*100)
        var pct=Math.round((1-Number(prod.salePrice)/Number(prod.price))*100);
        container.querySelectorAll('*').forEach(function(el){
          if(el.childNodes.length===1 && el.childNodes[0].nodeType===3){
            var t=el.textContent||'';
            if(t.indexOf('%')!==-1 && t.toUpperCase().indexOf('OFF')!==-1){
              el.textContent='-'+pct+'% OFF';
            }
          }
        });
      }
    }catch(e){}
  }
  var obs=new MutationObserver(function(){ fixScreen(); });
  if(document.body) obs.observe(document.body, {childList:true, subtree:true, characterData:true});
  document.addEventListener('DOMContentLoaded', fixScreen);
  setInterval(fixScreen, 800);
})();
