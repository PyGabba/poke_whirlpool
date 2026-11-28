const a = require('assert');
const h = require('fs').readFileSync(__dirname + '/../public/kitchen.html', 'utf8');
const js = h.slice(h.indexOf('<script>') + 8, h.lastIndexOf('</script>'));
const { rowsForOrder } = new Function('document', 'setInterval', 'fetch', js + ';return {rowsForOrder}')(
  { getElementById: () => ({}) }, () => 0, () => new Promise(() => {}));
const order = items => ({ id: 'x', orderNumber: 1, status: 'pending', createdAt: new Date().toISOString(), total: '9', customerName: 'Gabri', items });
const poke  = person => ({ id: 'pt1', name: 'Pokai', price: 9.9, qty: 1, person });
const other = person => ({ id: 'a1', name: 'Involtino', price: 2, qty: 1, person });

let html = rowsForOrder(order([poke('Anna'), poke('Gabri')]));
a(html.includes('Anna') && html.includes('paga: Gabri'));
a.equal(html.split('paga:').length, 2);
html = rowsForOrder(order([other('Luca')]));
a(html.includes('Luca') && html.includes('paga: Gabri'));
html = rowsForOrder(order([poke('Anna'), other('Luca')]));
a(html.includes('Anna') && html.includes('(Luca)'));
html = rowsForOrder(order([poke('<b>"x\''), other('<b>')]));
a(!html.includes('<b>') && html.includes('&lt;b&gt;'));
html = rowsForOrder(order([poke(undefined)]));
a(html.includes('Gabri') && !html.includes('paga:'));
console.log('kitchen names ok');
