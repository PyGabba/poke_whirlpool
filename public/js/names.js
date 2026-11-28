// Logica "chi mangia cosa", separata da app.js per poterla testare in Node
function cleanName(s) {
  return String(s == null ? '' : s).trim().slice(0, 40).trim();
}

// Un nome per porzione; '' = nome principale
function peopleFor(item) {
  return Array.from({ length: item.qty || 1 }, (_, i) =>
    (item.people ? item.people[i] : item.person) || '');
}

// Una voce per piatto e persona, così la cucina vede chi e il rimborso resta per persona
function splitByPerson(cart, main) {
  return cart.flatMap(item => {
    const { people, person, ...rest } = item;
    const counts = new Map();
    peopleFor(item).forEach(p => counts.set(p || main, (counts.get(p || main) || 0) + 1));
    return [...counts].map(([who, qty]) => ({ ...rest, qty, person: who }));
  });
}

if (typeof module !== 'undefined') module.exports = { cleanName, peopleFor, splitByPerson };
