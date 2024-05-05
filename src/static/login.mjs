// @ts-check

import { api } from "./api.mjs";

const loginBtn         = /** @type {HTMLButtonElement | undefined} */ (document.querySelector('.login > #login'));
const logoutBtn        = /** @type {HTMLButtonElement | undefined} */ (document.querySelector('.login > #logout'));
const createAccountBtn = /** @type {HTMLButtonElement | undefined} */ (document.querySelector('.login > #create-account'));
const usernameInput    = /** @type {HTMLInputElement | undefined} */  (document.querySelector('.login > #username-input'));
const passwordInput    = /** @type {HTMLInputElement | undefined} */  (document.querySelector('.login > #password-input'));
const prevPageBtn      = /** @type {HTMLButtonElement | undefined} */ (document.querySelector('#prev-page'));

// todo: get rid of these dumb alerts

createAccountBtn?.addEventListener('click', async e => {
    const [un, pw] = [usernameInput?.value, passwordInput?.value];
    if (!un || !pw) {
        return alert(`Please enter username and password`);
    }
    const res = await api.post('/api/auth/create-account', {
        'username': un,
        'password': pw
    });
    if (!res.ok) {
        return alert(`Unable to create account: ${res.error}`);
    }
    else {
        location.reload();
    }
});
loginBtn?.addEventListener('click', async e => {
    const [un, pw] = [usernameInput?.value, passwordInput?.value];
    if (!un || !pw) {
        return alert(`Please enter username and password`);
    }
    const res = await api.post('/api/auth/login', {
        'username': un,
        'password': pw
    });
    if (!res.ok) {
        return alert(`Unable to log in: ${res.error}`);
    }
    else {
        location.reload();
    }
});
logoutBtn?.addEventListener('click', async e => {
    const res = await api.post('/api/auth/logout');
    if (!res.ok) {
        return alert(`Unable to log out: ${res.error}`);
    }
    else {
        location.reload();
    }
});
prevPageBtn?.addEventListener('click', e => {
    history.back();
});
