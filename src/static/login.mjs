// @ts-check

const loginBtn         = /** @type {HTMLButtonElement | undefined} */ (document.querySelector('.login > #login'));
const logoutBtn        = /** @type {HTMLButtonElement | undefined} */ (document.querySelector('.login > #logout'));
const createAccountBtn = /** @type {HTMLButtonElement | undefined} */ (document.querySelector('.login > #create-account'));
const usernameInput    = /** @type {HTMLInputElement | undefined} */  (document.querySelector('.login > #username-input'));
const passwordInput    = /** @type {HTMLInputElement | undefined} */  (document.querySelector('.login > #password-input'));

// todo: get rid of these dumb alerts

createAccountBtn?.addEventListener('click', async e => {
    const [un, pw] = [usernameInput?.value, passwordInput?.value];
    if (!un || !pw) {
        return alert(`Please enter username and password`);
    }
    const res = await fetch('/api/auth/create-account', {
        method: 'POST',
        body: JSON.stringify({
            'username': un,
            'password': pw
        }),
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    });
    const obj = await res.json();
    if (!res.ok) {
        return alert(`Unable to create account: ${obj.reason}`);
    }
    location.reload();
});
loginBtn?.addEventListener('click', async e => {
    const [un, pw] = [usernameInput?.value, passwordInput?.value];
    if (!un || !pw) {
        return alert(`Please enter username and password`);
    }
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            'username': un,
            'password': pw
        }),
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    });
    const obj = await res.json();
    if (!res.ok) {
        return alert(`Unable to log in: ${obj.reason}`);
    }
    location.reload();
});
logoutBtn?.addEventListener('click', async e => {
    const res = await fetch('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    });
    const obj = await res.json();
    if (!res.ok) {
        return alert(`Unable to log out: ${obj.reason}`);
    }
    location.reload();
});
