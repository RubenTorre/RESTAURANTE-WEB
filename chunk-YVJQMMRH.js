import{a as M}from"./chunk-AKHQNOT6.js";import{r as k}from"./chunk-V4S5BHXF.js";import{Bc as $,Ca as o,Ha as S,Ma as I,Qa as s,Xa as d,aa as x,ba as f,ca as w,db as n,eb as r,fb as C,hc as F,ic as E,jb as h,kb as g,lb as c,uc as D,vb as a,wb as b,xb as l}from"./chunk-YGAPY4LI.js";import"./chunk-LMZWYZYD.js";import{h as P,j as v}from"./chunk-K4ALXBGI.js";var T=P(M());function j(t,i){t&1&&(n(0,"span"),a(1," - Pedidos Ya"),r())}function O(t,i){t&1&&(n(0,"span"),a(1," - Pedidos Beez"),r())}function z(t,i){if(t&1&&(n(0,"li",18)(1,"span",19),a(2),r(),n(3,"span",20),a(4),r()()),t&2){let e=i.$implicit;o(2),b(e.nombre),o(2),l(" ",e.cantidad,"x ")}}function V(t,i){if(t&1&&(n(0,"li",21),a(1),r()),t&2){let e=c().$implicit;o(),l(" +",e.productos.length-3," productos m\xE1s... ")}}function H(t,i){if(t&1){let e=h();n(0,"div",7),g("click",function(){let u=x(e).$implicit,m=c();return f(m.abrirModal(u))}),n(1,"div",8)(2,"div",9)(3,"h3",10),a(4),s(5,j,2,0,"span",11)(6,O,2,0,"span",11),r(),n(7,"span",12),a(8),r()(),n(9,"p",13),a(10),r()(),n(11,"div",14)(12,"ul",15),s(13,z,5,2,"li",16)(14,V,2,1,"li",17),r()()()}if(t&2){let e=i.$implicit,p=c();o(4),l(" Mesa ",e.mesa_id," "),o(),d("ngIf",e.mesa_id===30),o(),d("ngIf",e.mesa_id===31),o(2),l(" \u{1F552} ",p.getHoraCruda(e.fecha)," "),o(2),l("Mesero: ",e.mesero_nombre,""),o(3),d("ngForOf",e.productos.slice(0,3)),o(),d("ngIf",e.productos.length>3)}}function N(t,i){if(t&1&&(n(0,"span",37),a(1),r()),t&2){let e=c(2);o(),l(" ",e.pedidoSeleccionado.mesa_id===30?"Pedidos Ya":"Pedidos Beez"," ")}}function B(t,i){if(t&1&&(n(0,"li"),a(1),r()),t&2){let e=i.$implicit;o(),b(e)}}function Y(t,i){if(t&1&&(n(0,"div",43)(1,"ul",44),s(2,B,2,1,"li",45),r()()),t&2){let e=c().$implicit;o(2),d("ngForOf",e.modificaciones)}}function G(t,i){if(t&1&&(n(0,"li"),a(1),r()),t&2){let e=i.$implicit;o(),l(" ",e.nombre," ")}}function J(t,i){if(t&1&&(n(0,"div")(1,"ul",44),s(2,G,2,1,"li",45),r()()),t&2){let e=c().$implicit;o(2),d("ngForOf",e.extras)}}function q(t,i){if(t&1&&(n(0,"div",38)(1,"div",39)(2,"div")(3,"p",40),a(4),r()(),n(5,"span",41),a(6),r()(),s(7,Y,3,1,"div",42)(8,J,3,1,"div",11),r()),t&2){let e=i.$implicit;o(4),b(e.nombre),o(2),l(" ",e.cantidad,"x "),o(),d("ngIf",e.modificaciones==null?null:e.modificaciones.length),o(),d("ngIf",e.extras==null?null:e.extras.length)}}function A(t,i){if(t&1){let e=h();n(0,"div",22)(1,"div",23)(2,"div",24)(3,"div",9)(4,"h3",25),a(5),s(6,N,2,1,"span",26),r(),n(7,"button",27),g("click",function(){x(e);let u=c();return f(u.cerrarModal())}),a(8,"\xD7"),r()(),n(9,"div",28)(10,"span",29),a(11),r(),n(12,"span",30),a(13),r()()(),n(14,"div",31),s(15,q,9,4,"div",32),r(),n(16,"div",33)(17,"button",34),g("click",function(){x(e);let u=c();return f(u.imprimirTicket())}),w(),n(18,"svg",35),C(19,"path",36),r(),a(20," Imprimir Ticket "),r()()()()}if(t&2){let e=c();o(5),l(" Ticket Cocina - Mesa ",e.pedidoSeleccionado.mesa_id," "),o(),d("ngIf",e.pedidoSeleccionado.mesa_id===30||e.pedidoSeleccionado.mesa_id===31),o(5),l("Mesero: ",e.pedidoSeleccionado.mesero_nombre,""),o(2),l(" \u{1F552} ",e.getHoraCruda(e.pedidoSeleccionado.fecha)," "),o(2),d("ngForOf",e.pedidoSeleccionado.productos)}}var y=class t{constructor(i){this.supabaseService=i}pedidosDelDia=[];pedidoSeleccionado=null;ngOnInit(){return v(this,null,function*(){yield this.cargarPedidosDelDia()})}cargarPedidosDelDia(){return v(this,null,function*(){let i=yield this.supabaseService.getFacturasDelDia();this.pedidosDelDia=i.filter(e=>e.estado==="ocupada"),console.log(this.pedidosDelDia)})}getHoraCruda(i){return i?typeof i=="string"?i.substring(11,19):i.toISOString().substring(11,19):""}abrirModal(i){this.pedidoSeleccionado=i}cerrarModal(){this.pedidoSeleccionado=null}getNombrePlataforma(i){return i===30?"Pedidos Ya":i===31?"Pedidos Beez":""}imprimirTicket(){if(!this.pedidoSeleccionado)return;let i=this.getHoraCruda(this.pedidoSeleccionado.fecha),e=this.getNombrePlataforma(this.pedidoSeleccionado.mesa_id),p=e?` - ${e}`:"",u=`
      <div id="ticket-termico">
        <h3 class="text-center font-bold mb-1">Ticket Cocina</h3>
       <p class="text-center mb-1">Mesa ${this.pedidoSeleccionado.mesa_id}${p}</p>
        <p class="mb-2 text-center">\u{1F552} ${i}</p>
        <p class="mb-1">Mesero: ${this.pedidoSeleccionado.mesero_nombre}</p>
        <hr>
  
        <!-- Encabezado de columnas -->
        <div class="row header">
          <span class="col-producto font-bold underline">Producto</span>
          <span class="col-cant font-bold underline text-right">Cantidad</span>
        </div>
  
        ${this.pedidoSeleccionado.productos.map(m=>`
          <div class="row">
            <span class="col-producto">${m.nombre}</span>
            <span class="col-cant">${m.cantidad}x</span>
          </div>
  
          ${m.modificaciones?.length?`
            <div class="sub-info">
              <ul>
                ${m.modificaciones.map(_=>`<li>${_}</li>`).join("")}
              </ul>
            </div>
          `:""}
  
          ${m.extras?.length?`
            <div class="sub-info">
              <ul>
                ${m.extras.map(_=>`
                  <li>${_.nombre}</li>
                `).join("")}
              </ul>
            </div>
          `:""}
  
          <div class="product-separator"></div>
        `).join("")}
        <div class="espacio-corte"></div>
      </div>
    `;(0,T.default)({printable:u,type:"raw-html",style:`
        @page {
          size: 80mm auto;
          margin: 0;
        }
  
        html, body {
          margin: 0;
          padding: 0;
          width: 80mm;
          font-family: monospace;
          font-size: 12px;
          color: #000;
        }
  
        #ticket-termico {
          padding: 0 6px;
        }
  
        .text-center {
          text-align: center;
        }
  
        .font-bold {
          font-weight: bold;
        }
  
        .underline {
          text-decoration: underline;
        }
  
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
  
        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
  
        .header {
          margin-top: 6px;
          margin-bottom: 6px;
        }
  
        .col-producto {
          flex-grow: 1;
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
  
        .sub-info {
          margin-left: 8px;
          font-size: 11px;
          margin-bottom: 3px;
        }
  
        .sub-info ul {
          padding-left: 12px;
          margin: 0;
        }
  
        .product-separator {
          border-bottom: 1px dashed #000;
          margin: 6px 0;
        }
  
        .espacio-corte {
          height: 80px;
        }
  
        hr {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
      `,scanStyles:!1}),this.cerrarModal()}static \u0275fac=function(e){return new(e||t)(S($))};static \u0275cmp=I({type:t,selectors:[["app-imprimir-facturas"]],decls:9,vars:2,consts:[[1,"px-4","py-6"],[1,"mb-6","text-center"],[1,"text-3xl","font-bold","text-gray-800"],[1,"text-gray-500","mt-2"],[1,"grid","grid-cols-1","md:grid-cols-2","lg:grid-cols-3","gap-5"],["class","cursor-pointer bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 border border-gray-100 overflow-hidden",3,"click",4,"ngFor","ngForOf"],["class","fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-4",4,"ngIf"],[1,"cursor-pointer","bg-white","rounded-xl","shadow-lg","hover:shadow-2xl","transition-all","duration-300","ease-in-out","transform","hover:-translate-y-1","border","border-gray-100","overflow-hidden",3,"click"],[1,"bg-blue-600","px-4","py-3"],[1,"flex","justify-between","items-center"],[1,"text-xl","font-bold","text-white"],[4,"ngIf"],[1,"text-xs","bg-white","text-blue-600","px-2","py-1","rounded-full","font-semibold"],[1,"text-sm","text-blue-100","mt-1"],[1,"p-4"],[1,"space-y-2"],["class","flex justify-between items-start border-b border-gray-100 pb-2",4,"ngFor","ngForOf"],["class","text-center text-sm text-gray-500 italic pt-1",4,"ngIf"],[1,"flex","justify-between","items-start","border-b","border-gray-100","pb-2"],[1,"font-medium","text-gray-700"],[1,"bg-gray-100","text-gray-800","text-xs","font-bold","px-2","py-1","rounded-full"],[1,"text-center","text-sm","text-gray-500","italic","pt-1"],[1,"fixed","inset-0","bg-transparent","backdrop-blur-sm","flex","items-center","justify-center","z-50","p-4"],[1,"bg-white","rounded-2xl","w-full","max-w-md","shadow-2xl","overflow-hidden","animate-fade-in"],[1,"bg-gray-800","text-white","px-6","py-4"],[1,"text-xl","font-bold","flex","items-center","gap-2"],["class","text-sm font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full",4,"ngIf"],[1,"text-gray-300","hover:text-red-600","cursor-pointer","text-2xl",3,"click"],[1,"flex","justify-between","text-sm","mt-2"],[1,"text-gray-300"],[1,"text-gray-400"],[1,"max-h-[60vh]","overflow-y-auto","p-6","space-y-6"],["class","bg-white shadow-sm rounded-lg p-4 border border-gray-200",4,"ngFor","ngForOf"],[1,"border-t","border-gray-200","px-6","py-4"],[1,"w-full","bg-blue-600","hover:bg-blue-700","text-white","font-bold","py-3","px-4","rounded-lg","transition-colors","duration-300","cursor-pointer","flex","items-center","justify-center",3,"click"],["xmlns","http://www.w3.org/2000/svg","fill","none","viewBox","0 0 24 24","stroke","currentColor",1,"h-5","w-5","mr-2"],["stroke-linecap","round","stroke-linejoin","round","stroke-width","2","d","M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"],[1,"text-sm","font-semibold","text-blue-600","bg-blue-100","px-2","py-0.5","rounded-full"],[1,"bg-white","shadow-sm","rounded-lg","p-4","border","border-gray-200"],[1,"flex","justify-between","items-start","mb-3"],[1,"text-base","font-semibold","text-gray-800"],[1,"bg-gray-100","text-gray-800","text-xs","font-medium","px-3","py-1","rounded-full"],["class","mb-3",4,"ngIf"],[1,"mb-3"],[1,"list-disc","list-inside","text-sm","text-gray-700","space-y-0.5"],[4,"ngFor","ngForOf"]],template:function(e,p){e&1&&(n(0,"div",0)(1,"div",1)(2,"h2",2),a(3,"Pedidos para Imprimir"),r(),n(4,"p",3),a(5,"Seleccione un pedido para generar el ticket de cocina"),r()(),n(6,"div",4),s(7,H,15,7,"div",5),r()(),s(8,A,21,5,"div",6)),e&2&&(o(7),d("ngForOf",p.pedidosDelDia),o(),d("ngIf",p.pedidoSeleccionado))},dependencies:[D,F,E,k],encapsulation:2})};export{y as default};
