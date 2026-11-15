// Fictional examples are opt-in. Real workspaces start empty.
window.BUYER_EXAMPLE=async()=>{
 const d=structuredClone(BUYER_DATA_ADAPTER.capture());
 if(d.suppliers.some(x=>x.id==='example-supplier'))return;
 d.suppliers.push({id:'example-supplier',name:'Demo Wholesale',email:'supplier@example.invalid',contact:'Fictional contact',notes:'Fictional example — delete when ready',openingBalance:0});
 const date=new Date().toISOString().slice(0,10);
 d.categories.push(...['Accessories','Cables'].filter(x=>!d.categories.includes(x)));
 const items=[{product:'USB-C cable',category:'Cables',colour:'Black',code:'DEMO-C1',ean:'',store:'Demo shop',qty:20,cost:2.5,arrivedQty:20},{product:'Phone stand',category:'Accessories',colour:'Silver',code:'DEMO-S1',ean:'',store:'Demo shop',qty:10,cost:4,arrivedQty:8}];
 d.orders.push({id:'example-order',supplierId:'example-supplier',ref:'DEMO-001',type:'order',date,deliveryCost:5,items});
 d.orders.push({id:'example-return',supplierId:'example-supplier',ref:'DEMO-RETURN',type:'return',date,items:[{...items[0],qty:2,arrivedQty:0}]});
 d.supplierPayments.push({id:'example-payment',supplierId:'example-supplier',date,amount:40,method:'Demo bank transfer',ref:'Fictional payment'});
 await BUYER_DATA_ADAPTER.restore(d);
};
