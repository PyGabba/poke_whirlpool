const a = require('assert');
const { cleanName, peopleFor, splitByPerson } = require('../public/js/names.js');
a.equal(cleanName('  Anna  '), 'Anna');
a.equal(cleanName('x'.repeat(50)).length, 40);
a.deepEqual(peopleFor({ qty: 2 }), ['', '']);
a.deepEqual(peopleFor({ qty: 1, people: ['Anna', 'Luca'] }), ['Anna']);
a.deepEqual(peopleFor({ qty: 2, person: 'Anna' }), ['Anna', 'Anna']);
a.deepEqual(
  splitByPerson([{ id: 'c3', price: 3, qty: 3, people: ['Anna', '', 'Anna'] }], 'Gabri'),
  [{ id: 'c3', price: 3, qty: 2, person: 'Anna' }, { id: 'c3', price: 3, qty: 1, person: 'Gabri' }]);
console.log('names ok');
