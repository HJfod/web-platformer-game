
/**
 * @typedef {{ name: string, publisher: string, plays: number, url: string }} Level
 */

/**
 * @param {HTMLElement} target 
 */
async function loadLevelsTo(target) {
    const res = await fetch('/api/levels');
    const json = await res.json();
    if (!res.ok) {
        return alert(`Unable to load levels: ${json.reason}`);
    }

    // Clear target list if it had any levels previously
    target.replaceChildren();

    const levels = /** @type {Level[]} */ (json);
    for (const level of levels) {
        const article = document.createElement('article');
        article.classList.add('level');

        const column = document.createElement('div');
        column.classList.add('column');
        
        const title = document.createElement('p');
        title.classList.add('name');
        title.innerText = level.name;
        column.appendChild(title);
        
        const pub = document.createElement('p');
        pub.classList.add('publisher');
        pub.innerText = `by ${level.publisher}`;
        column.appendChild(pub);

        const plays = document.createElement('p');
        plays.classList.add('play-count');
        plays.innerText = `${level.plays} plays`;
        column.appendChild(plays);

        article.appendChild(column);

        const play = document.createElement('a');
        play.innerText = 'Play';
        play.href = level.url;
        article.appendChild(play);

        target.appendChild(article);
    }
}

const levelList = document.querySelector('#level-list');
if (levelList) {
    loadLevelsTo(levelList);
}
