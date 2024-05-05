// @ts-check

import { api } from "./api.mjs";

/**
 * @typedef {{ user_id: number, username: string, rating: number, body: string }} Review
 */

/**
 * @param {Element} target 
 */
async function loadReviewsTo(target, id, userID) {
    const res = await api.get(`/api/levels/${id}/reviews`);
    if (!res.ok) {
        return alert(`Unable to load levels: ${res.error}`);
    }

    // Clear target list if it had any levels previously
    target.replaceChildren();

    // There has to be a better way to do this but I'm too dumb to figure it out
    const starSVG = await (await fetch('/star-svg')).text();

    const reviews = /** @type {Review[]} */ (res.value);
    for (const review of reviews) {
        const article = document.createElement('article');
        article.classList.add('review');

        const column = document.createElement('div');
        column.classList.add('column');

        const rating = document.createElement('div');
        rating.classList.add('row', 'stars');
        for (let i = 0; i < 5; i += 1) {
            rating.innerHTML += starSVG;
        }
        for (let i = 0; i < review.rating; i += 1) {
            rating.children.item(i)?.classList.add('filled');
        }
        column.appendChild(rating);
        
        const body = document.createElement('p');
        body.classList.add('body');
        body.innerText = review.body;
        column.appendChild(body);

        const poster = document.createElement('p');
        poster.classList.add('name');
        poster.innerText = `by ${review.username}`;
        column.appendChild(poster);

        article.appendChild(column);

        const row = document.createElement('div');
        row.classList.add('row');

        if (review.user_id === userID) {
            const remove = document.createElement('a');
            remove.innerText = 'Unpublish';
            remove.addEventListener('click', async e => {
                const res = await api.delete(`/api/levels/${id}/reviews`);
                if (!res.ok) {
                    return alert(`Unable to delete review: ${res.error}`);
                }
                window.location.reload();
            });
            row.appendChild(remove);
        }

        article.appendChild(row);

        target.appendChild(article);
    }

    if (reviews.length === 0) {
        const none = document.createElement('p');
        none.innerText = 'This level has no reviews';
        none.classList.add('none-found');
        target.appendChild(none);
    }
}

const reviewList = document.querySelector('.reviews-list');
if (reviewList) {
    let levelID = reviewList.getAttribute('data-level-id');
    let userID = reviewList.getAttribute('data-user-id');
    if (levelID) {
        loadReviewsTo(reviewList, parseInt(levelID), userID ? parseInt(userID) : undefined);
    }
}
