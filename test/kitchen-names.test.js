const a = require('assert');
const h = require('fs').readFileSync(__dirname + '/../public/kitchen.html', 'utf8');
const js = h.slice(h.indexOf('<script>') + 8, h.lastIndexOf('</script>'));
const { rowsForOrder } = new Function('document', 'setInterval', 'fetch', js + ';return {rowsForOrder}')(
  { getElementById: () => ({}) }, () => 0, () => new Promise(() => {}));
const order = items => ({ id: 'x', orderNumber: 1, status: 'pending', createdAt: new Date().toISOString(), total: '9', customerName: 'Gabri', items });
const poke  = person => ({ id: 'pt1', name: 'Pokai', price: 9.9, qty: 1, person });
const other = person => ({ id: 'a1', name: 'Involtino', price: 2, qty: 1, person });

let html = rowsForOrder(order([poke('Anna'), poke('Gabri')]));
a(html.includes('Anna') && html.includes('ordine di Gabri'));
a.equal(html.split('ordine di').length, 2);
html = rowsForOrder(order([other('Luca')]));
a(html.includes('Luca') && html.includes('ordine di Gabri'));
html = rowsForOrder(order([poke('Anna'), other('Luca')]));
// ogni piatto, anche non poke in un ordine misto, ha la sua cella Nome
const names = h => [...h.matchAll(/<td class="td-name">([^<]*)/g)].map(m => m[1]);
a.deepEqual(names(html), ['Anna', 'Luca']);
a(!html.includes('Altro'));
a(html.includes('rowspan="2"'));
a.equal(html.split('class="td-allergy"').length, 2);
a.equal(html.split('order-first-row').length, 2);
html = rowsForOrder(order([poke('<b>"x\''), other('<b>')]));
a(!html.includes('<b>') && html.includes('&lt;b&gt;'));
html = rowsForOrder(order([poke(undefined)]));
a(html.includes('Gabri') && !html.includes('ordine di'));
// poke con quantità: una riga per porzione, nomi numerati, un solo rimborso per voce
html = rowsForOrder(order([{ ...poke('Jack'), qty: 2 }, other('Jack')]));
a.deepEqual(names(html), ['Jack-1', 'Jack-2', 'Jack-3']);
a(html.includes('rowspan="3"'));
a.equal(html.split("refundItem('x', 0,").length, 2);
a(html.includes('Rimborsa tutti (2)') && !html.includes('19,80'));
// due voci poke diverse della stessa persona: numerate anche loro
html = rowsForOrder(order([poke('Jack'), poke('Jack'), poke('Anna')]));
a.deepEqual(names(html), ['Jack-1', 'Jack-2', 'Anna']);
// anche burger e altri piatti: una riga per porzione, numerazione unica per persona
const burger = person => ({ id: 'burger-1', name: 'Hamburger', price: 12.9, qty: 2, person, detail: 'Pane: Nero · Proteina: Wagyu' });
html = rowsForOrder(order([burger('Jack'), { ...other('Jack'), qty: 2 }, other('Anna')]));
a.deepEqual(names(html), ['Jack-1', 'Jack-2', 'Jack-3', 'Jack-4', 'Anna']);
a.equal(html.split('Rimborsa tutti (2)').length, 3);
a.equal(html.split("refundItem('x',").length, 4);
a(!html.includes('2×'));
console.log('kitchen names ok');
