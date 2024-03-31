// @ts-check

/**
 * Make a POST request
 * @param {string} url 
 * @param {any} body 
 * @returns {Promise<any>}
 */
export async function post(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    });
    const json = await res.json();
    if (!res.ok) {
        return Promise.reject(json);
    }
    return json;
}
