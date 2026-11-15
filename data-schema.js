(function(root) {
 'use strict';
 const arrays = ['suppliers','categories','stockRequired','products','colours','orders','exportLog','stores','supplierPayments'];
 const maps = ['categoryColours','supplierCatalogs','categoryColorColumns'];
 const forbidden = new Set(['__proto__','prototype','constructor']);
 function inspect(value, depth = 0, budget = {count:0}) {
  if (++budget.count > 500000 || depth > 24) throw Error('Backup is too large or deeply nested.');
  if (typeof value === 'string' && value.length > 100000) throw Error('A backup field is too long.');
  if (typeof value === 'number' && !Number.isFinite(value)) throw Error('Invalid numeric value.');
  if (value && typeof value === 'object') for (const [key,item] of Object.entries(value)) {
   if (forbidden.has(key)) throw Error('Unsafe object key in backup.');
   inspect(item, depth + 1, budget);
  }
 }
 function normalise(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('A database object is required.');
  inspect(input);
  if (!Array.isArray(input.suppliers) || !Array.isArray(input.orders)) throw Error('Suppliers and orders must be lists.');
  const result = JSON.parse(JSON.stringify(input));
  for (const key of arrays) {
   if (result[key] === undefined) result[key] = [];
   if (!Array.isArray(result[key])) throw Error(key + ' must be a list.');
  }
  for (const key of maps) {
   if (result[key] === undefined) result[key] = {};
   if (!result[key] || typeof result[key] !== 'object' || Array.isArray(result[key])) throw Error(key + ' must be an object.');
  }
  for (const key of ['categories','colours','stores']) if (result[key].some(x => typeof x !== 'string')) throw Error(key + ' must contain text.');
  const safeID = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value) && !forbidden.has(value);
  for (const key of ['suppliers','orders','stockRequired','supplierPayments']) {
   const seen = new Set();
   for (const item of result[key]) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !safeID(item.id) || seen.has(item.id)) throw Error('Invalid or duplicate ID in ' + key + '.');
    seen.add(item.id);
    if (item.supplierId !== undefined && !safeID(item.supplierId)) throw Error('Invalid supplier reference.');
   }
  }
  const textFields=(item,keys)=>{for(const key of keys)if(item[key]!==undefined&&typeof item[key]!=='string')throw Error(key+' must be text.');};
  for (const sup of result.suppliers) {
   if (typeof sup.name !== 'string') throw Error('Supplier name must be text.');
   textFields(sup,['phone','email','contact','vat','address','notes','openingBalanceDate','openingBalanceNote']);
   if(sup.openingBalance!==undefined&&!Number.isFinite(Number(sup.openingBalance)))throw Error('Invalid opening balance.');
  }
  for(const product of result.products){
   if(!product||typeof product!=='object'||typeof product.name!=='string')throw Error('Invalid product.');
   textFields(product,['category','code','ean']);
  }
  for(const item of result.stockRequired)textFields(item,['product','category','code','model','note']);
  for(const entries of Object.values(result.supplierCatalogs)){
   if(!Array.isArray(entries))throw Error('Supplier catalog must be a list.');
   for(const item of entries){if(!item||typeof item!=='object'||typeof item.product!=='string')throw Error('Invalid catalog item.');textFields(item,['code','ean','supplierName']);}
  }
  for(const entries of Object.values(result.categoryColorColumns))if(!Array.isArray(entries)||entries.some(x=>typeof x!=='string'))throw Error('Invalid category colour columns.');
  for (const order of result.orders) {
   textFields(order,['ref','date','store','note']);
   if (!['order','return','faulty'].includes(order.type) || !Array.isArray(order.items)) throw Error('Invalid order type or items.');
   if (order.date && !/^\d{4}-\d{2}-\d{2}$/.test(order.date)) throw Error('Invalid order date.');
   for (const item of order.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw Error('Invalid order item.');
    for (const key of ['qty','cost','arrivedQty']) {
     if (item[key] === undefined || item[key] === '') item[key] = 0;
     if (!['number','string'].includes(typeof item[key]) || !Number.isFinite(Number(item[key])) || Number(item[key]) < 0) throw Error('Invalid item ' + key + '.');
     item[key] = Number(item[key]);
    }
    for (const key of ['product','category','colour','code','ean','store','supplierName']) {
     if (item[key] === undefined) item[key] = '';
     if (typeof item[key] !== 'string') throw Error('Item ' + key + ' must be text.');
    }
   }
   for (const key of ['deliveryCost','paidAmount']) if (order[key] !== undefined && (!Number.isFinite(Number(order[key])) || Number(order[key]) < 0)) throw Error('Invalid ' + key + '.');
  }
  for (const payment of result.supplierPayments) if (!Number.isFinite(Number(payment.amount)) || Number(payment.amount) < 0) throw Error('Invalid payment amount.');
  return result;
 }
 const api = {normalise, valid(input) { try { normalise(input); return true; } catch { return false; } }};
 if (typeof module !== 'undefined') module.exports = api;
 root.StockSchema = api;
})(typeof window !== 'undefined' ? window : globalThis);
