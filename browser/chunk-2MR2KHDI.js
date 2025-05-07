import{a as V}from"./chunk-OBBL2PXA.js";import{p as T,q as M}from"./chunk-R2HQ5A7A.js";import"./chunk-LJ5XHLMQ.js";import{h as k,i as C,k as F,n as E}from"./chunk-SCDD2VSH.js";import{Aa as I,Fa as m,La as l,Oa as t,Pa as i,Qa as D,Ta as b,U as x,V as u,W as _,Wa as f,Xa as c,bb as a,cb as v,db as d,nb as h,pb as y,ra as r,wa as S}from"./chunk-DNO7NU24.js";import{f as $,h as g}from"./chunk-FK42CRUA.js";var j=$(V());function O(n,o){if(n&1&&(t(0,"li",17)(1,"span",18),a(2),i(),t(3,"span",19),a(4),i()()),n&2){let e=o.$implicit;r(2),v(e.nombre),r(2),d(" ",e.cantidad,"x ")}}function z(n,o){if(n&1&&(t(0,"li",20),a(1),i()),n&2){let e=c().$implicit;r(),d(" +",e.productos.length-3," productos m\xE1s... ")}}function N(n,o){if(n&1){let e=b();t(0,"div",7),f("click",function(){let p=x(e).$implicit,P=c();return u(P.abrirModal(p))}),t(1,"div",8)(2,"div",9)(3,"h3",10),a(4),i(),t(5,"span",11),a(6),h(7,"date"),i()(),t(8,"p",12),a(9),i()(),t(10,"div",13)(11,"ul",14),m(12,O,5,2,"li",15)(13,z,2,1,"li",16),i()()()}if(n&2){let e=o.$implicit;r(4),d("Mesa ",e.mesa_id,""),r(2),d(" \u{1F552} ",y(7,5,e.fecha,"shortTime")," "),r(3),d("Mesero: ",e.mesero_nombre,""),r(3),l("ngForOf",e.productos.slice(0,3)),r(),l("ngIf",e.productos.length>3)}}function B(n,o){if(n&1&&(t(0,"li",36)(1,"div",37)(2,"p",38),a(3),i()(),t(4,"span",39),a(5),i()()),n&2){let e=o.$implicit;r(3),v(e.nombre),r(2),d(" ",e.cantidad,"x ")}}function H(n,o){if(n&1){let e=b();t(0,"div",21)(1,"div",22)(2,"div",23)(3,"div",9)(4,"h3",24),a(5),i(),t(6,"button",25),f("click",function(){x(e);let p=c();return u(p.cerrarModal())}),a(7,"\xD7"),i()(),t(8,"div",26)(9,"span",27),a(10),i(),t(11,"span",28),a(12),h(13,"date"),i()()(),t(14,"div",29)(15,"ul",30),m(16,B,6,2,"li",31),i()(),t(17,"div",32)(18,"button",33),f("click",function(){x(e);let p=c();return u(p.imprimirTicket())}),_(),t(19,"svg",34),D(20,"path",35),i(),a(21," Imprimir Ticket "),i()()()()}if(n&2){let e=c();r(5),d("Ticket Cocina - Mesa ",e.pedidoSeleccionado.mesa_id,""),r(5),d("Mesero: ",e.pedidoSeleccionado.mesero_nombre,""),r(2),d("\u{1F552} ",y(13,4,e.pedidoSeleccionado.fecha,"shortTime"),""),r(4),l("ngForOf",e.pedidoSeleccionado.productos)}}var w=class n{constructor(o){this.supabaseService=o}pedidosDelDia=[];pedidoSeleccionado=null;ngOnInit(){return g(this,null,function*(){yield this.cargarPedidosDelDia()})}cargarPedidosDelDia(){return g(this,null,function*(){let o=yield this.supabaseService.getFacturasDelDia();this.pedidosDelDia=o.filter(e=>e.estado==="ocupada"),console.log("pedidos",this.pedidosDelDia)})}abrirModal(o){this.pedidoSeleccionado=o}cerrarModal(){this.pedidoSeleccionado=null}imprimirTicket(){if(!this.pedidoSeleccionado)return;let o=`
      <div id="ticket-termico">
        <h3 class="text-center font-bold mb-1">Ticket Cocina</h3>
        <p class="text-center mb-1">Mesa ${this.pedidoSeleccionado.mesa_id}</p>
        <p class="mb-2 text-center">\u{1F552} ${new Date(this.pedidoSeleccionado.fecha).toLocaleTimeString()}</p>
        <p class="mb-1">Mesero: ${this.pedidoSeleccionado.mesero_nombre}</p>
        <hr>
        ${this.pedidoSeleccionado.productos.map(e=>`
          <div class="row">
            <span class="col-producto">${e.nombre}</span>
            <span class="col-cant">${e.cantidad}x</span>
          </div>
        `).join("")}
        <div class="espacio-corte"></div>
      </div>
    `;(0,j.default)({printable:o,type:"raw-html",style:`
        @page {
          size: 80mm auto;
          margin: 0;
        }
  
        html, body {
          margin: 0;
          padding: 0;
          width: 80mm;
          font-family: monospace;
          font-size: 14px;
        }
  
        #ticket-termico {
          padding: 0 6px;
          margin: 0;
        }
  
        .text-center {
          text-align: center;
        }
  
        .font-bold {
          font-weight: bold;
        }
  
        .mb-1 {
          margin-bottom: 4px;
        }
  
        .mb-2 {
          margin-bottom: 8px;
        }
  
        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
          word-wrap: break-word;
        }
  
        .col-producto {
          flex-grow: 1;
          text-align: left;
          padding-right: 5px;
          white-space: normal;
          word-wrap: break-word;
        }
  
        .col-cant {
          width: 40%;
          text-align: right;
          padding-left: 15px;
          padding-right: 25px;
          white-space: nowrap;
        }
  
        .espacio-corte {
          height: 80px;
        }
  
        hr {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
      `,scanStyles:!1}),this.cerrarModal()}static \u0275fac=function(e){return new(e||n)(S(M))};static \u0275cmp=I({type:n,selectors:[["app-imprimir-facturas"]],decls:9,vars:2,consts:[[1,"px-4","py-6"],[1,"mb-6","text-center"],[1,"text-3xl","font-bold","text-gray-800"],[1,"text-gray-500","mt-2"],[1,"grid","grid-cols-1","md:grid-cols-2","lg:grid-cols-3","gap-5"],["class","cursor-pointer bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 border border-gray-100 overflow-hidden",3,"click",4,"ngFor","ngForOf"],["class","fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4",4,"ngIf"],[1,"cursor-pointer","bg-white","rounded-xl","shadow-lg","hover:shadow-2xl","transition-all","duration-300","ease-in-out","transform","hover:-translate-y-1","border","border-gray-100","overflow-hidden",3,"click"],[1,"bg-blue-600","px-4","py-3"],[1,"flex","justify-between","items-center"],[1,"text-xl","font-bold","text-white"],[1,"text-xs","bg-white","text-blue-600","px-2","py-1","rounded-full","font-semibold"],[1,"text-sm","text-blue-100","mt-1"],[1,"p-4"],[1,"space-y-2"],["class","flex justify-between items-start border-b border-gray-100 pb-2",4,"ngFor","ngForOf"],["class","text-center text-sm text-gray-500 italic pt-1",4,"ngIf"],[1,"flex","justify-between","items-start","border-b","border-gray-100","pb-2"],[1,"font-medium","text-gray-700"],[1,"bg-gray-100","text-gray-800","text-xs","font-bold","px-2","py-1","rounded-full"],[1,"text-center","text-sm","text-gray-500","italic","pt-1"],[1,"fixed","inset-0","bg-black","bg-opacity-70","flex","items-center","justify-center","z-50","p-4"],[1,"bg-white","rounded-2xl","w-full","max-w-md","shadow-2xl","overflow-hidden","animate-fade-in"],[1,"bg-gray-800","text-white","px-6","py-4"],[1,"text-xl","font-bold"],[1,"text-gray-300","hover:text-white","text-2xl",3,"click"],[1,"flex","justify-between","text-sm","mt-2"],[1,"text-gray-300"],[1,"text-gray-400"],[1,"max-h-[60vh]","overflow-y-auto","p-6"],[1,"divide-y","divide-gray-200"],["class","py-3 flex justify-between",4,"ngFor","ngForOf"],[1,"border-t","border-gray-200","px-6","py-4"],[1,"w-full","bg-blue-600","hover:bg-blue-700","text-white","font-bold","py-3","px-4","rounded-lg","transition-colors","duration-300","flex","items-center","justify-center",3,"click"],["xmlns","http://www.w3.org/2000/svg","fill","none","viewBox","0 0 24 24","stroke","currentColor",1,"h-5","w-5","mr-2"],["stroke-linecap","round","stroke-linejoin","round","stroke-width","2","d","M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"],[1,"py-3","flex","justify-between"],[1,"flex-1"],[1,"font-medium","text-gray-800"],[1,"ml-4","bg-gray-100","text-gray-800","text-sm","font-semibold","px-3","py-1","rounded-full"]],template:function(e,s){e&1&&(t(0,"div",0)(1,"div",1)(2,"h2",2),a(3,"Pedidos para Imprimir"),i(),t(4,"p",3),a(5,"Seleccione un pedido para generar el ticket de cocina"),i()(),t(6,"div",4),m(7,N,14,8,"div",5),i()(),m(8,H,22,7,"div",6)),e&2&&(r(7),l("ngForOf",s.pedidosDelDia),r(),l("ngIf",s.pedidoSeleccionado))},dependencies:[E,k,C,F,T],encapsulation:2})};export{w as default};
