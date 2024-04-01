// @ts-check

/**
 * @typedef {{ name: string, publisher: string, plays: number, clears: number, play_url: string, edit_url?: string }} Level
 * @typedef {{ name: string, url: string }} UnpublishedLevel
 */

/**
 * @param {Element} target 
 */
async function loadLevelsTo(target, my = false) {
    const res = await fetch(`/api/levels${my ? '/my' : ''}`);
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
        plays.innerText = `${level.plays} plays, ${level.clears} clears`;
        column.appendChild(plays);

        article.appendChild(column);

        const row = document.createElement('div');
        row.classList.add('row');

        if (level.edit_url) {
            const edit = document.createElement('a');
            edit.innerText = 'Edit';
            edit.href = level.edit_url;
            row.appendChild(edit);
        }

        const play = document.createElement('a');
        play.innerText = 'Play';
        play.href = level.play_url;
        row.appendChild(play);

        article.appendChild(row);

        target.appendChild(article);
    }
}

/**
 * @param {Element} target 
 */
async function loadEditableLevelsTo(target) {
    const res = await fetch('/api/levels/wip');
    const json = await res.json();
    if (!res.ok) {
        return alert(`Unable to load levels: ${json.reason}`);
    }

    // Clear target list if it had any levels previously
    target.replaceChildren();

    const levels = /** @type {UnpublishedLevel[]} */ (json);
    for (const level of levels) {
        const article = document.createElement('article');
        article.classList.add('level');

        const column = document.createElement('div');
        column.classList.add('column');
        
        const title = document.createElement('p');
        title.classList.add('name');
        title.innerText = level.name;
        column.appendChild(title);
        
        article.appendChild(column);

        const play = document.createElement('a');
        play.innerText = 'Edit';
        play.href = level.url;
        article.appendChild(play);

        target.appendChild(article);
    }
}

const levelList = document.querySelector('#levels-list');
if (levelList) {
    loadLevelsTo(levelList);
}

const myLevelList = document.querySelector('#my-levels-list');
if (myLevelList) {
    loadLevelsTo(myLevelList, true);
}

const createdLevelList = document.querySelector('#created-levels-list');
if (createdLevelList) {
    loadEditableLevelsTo(createdLevelList);
}
