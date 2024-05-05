// @ts-check

export const api = {
    /**
     * Make an API request
     * @param {string} url 
     * @param {object} params
     * @param {'GET' | 'POST' | 'DELETE'} method
     * @returns {Promise<{ ok: true, value: any } | { ok: false, error: string }>}
     */
    async request(url, params, method) {
        const paramsInUrl = method === 'GET';
        try {
            if (paramsInUrl) {
                url += '?' + new URLSearchParams(params);
            }
            // Never post csrf token through url params
            params['csrf_token'] = document.head.querySelector('[name~=csrf_token][content]')?.getAttribute('content');
            const res = await fetch(url, {
                method,
                body: !paramsInUrl ? JSON.stringify(params) : undefined,
                headers: {
                    'Content-type': 'application/json; charset=UTF-8'
                },
                credentials: 'same-origin'
            });
            const json = await res.json();
            if (!res.ok) {
                throw json.reason;
            }
            return { ok: true, value: json };
        }
        catch(e) {
            return { ok: false, error: `${e}` };
        }
    },

    /**
     * Make a GET request
     * @param {string} url 
     * @param {object} params
     * @returns {Promise<{ ok: true, value: any } | { ok: false, error: string }>}
     */
    async get(url, params = {}) {
        return await this.request(url, params, 'GET');
    },
    
    /**
     * Make a POST request
     * @param {string} url 
     * @param {object} params 
     * @returns {Promise<{ ok: true, value: any } | { ok: false, error: string }>}
     */
    async post(url, params = {}) {
        return await this.request(url, params, 'POST');
    },
    
    /**
     * Make a DELETE request
     * @param {string} url 
     * @param {object} params 
     * @returns {Promise<{ ok: true, value: any } | { ok: false, error: string }>}
     */
    async delete(url, params = {}) {
        return await this.request(url, params, 'DELETE');
    },
};
