function toggleMenu() {
    const menu = document.getElementById('menu');
    if (menu.classList.contains('open')) {
        menu.classList.remove('open');
    } else {
        menu.classList.add('open');
    }
}

/** Up to `count` distinct items of `items` in random order (a partial Fisher–Yates shuffle of a copy). */
function pickRandom(items, count) {
    const pool = Array.from(items);
    const picked = Math.min(count, pool.length);
    for (let i = 0; i < picked; i++) {
        const j = i + Math.floor(Math.random() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, picked);
}

/** How many photos the Random page shows. */
const randomPhotoCount = 12;

// Each time the Random page's grid is inserted, show a random pick of the photo boxes stored in its attribute.
// Only the picked boxes become elements, so only their Previews are loaded.
up.compiler('.random-photos', function (element) {
    const boxes = JSON.parse(element.dataset.photoBoxes);
    element.querySelector('.columns').innerHTML = pickRandom(boxes, randomPhotoCount).join('');
});
