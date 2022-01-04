const cloudscraper = require('cloudscraper');
const qs = require('qs');
const request = require('request');
const urls = require('../garmin/Urls');

const asJson = (body) => {
    try {
        return JSON.parse(body);
    } catch (e) {
        // Do nothing
    }
    return body;
};

class CFClient {
    constructor(headers) {
        this.cloudscraper = cloudscraper;
        this.queryString = qs;
        this.cookies = request.jar();
        this.headers = headers || {};
    }

    async scraper(options) {
        return new Promise((resolve) => {
            this.cloudscraper(
                options,
                (err, res) => {
                    resolve(res);
                },
            );
        });
    }

    async get(url, domain, data) {
        const finalUrl = urls.convertUrl(domain, url);
        const queryData = this.queryString.stringify(data);
        const queryDataString = queryData ? `?${queryData}` : '';
        const options = {
            method: 'GET',
            jar: this.cookies,
            uri: `${finalUrl}${queryDataString}`,
            headers: this.headers,
        };
        const { body } = await this.scraper(options);
        return asJson(body);
    }

    async post(url, domain, data) {
        const finalUrl = urls.convertUrl(domain, url);
        const options = {
            method: 'POST',
            uri: finalUrl,
            jar: this.cookies,
            formData: data,
            headers: this.headers,
        };
        const { body } = await this.scraper(options);
        return asJson(body);
    }

    async postJson(url, domain, data, params, headers) {
        const finalUrl = urls.convertUrl(domain, url);
        const options = {
            method: 'POST',
            uri: finalUrl,
            jar: this.cookies,
            json: data,
            headers: {
                ...this.headers,
                ...headers,
                'Content-Type': 'application/json',
            },
        };
        const { body } = await this.scraper(options);
        return asJson(body);
    }

    async putJson(url, domain, data) {
        const finalUrl = urls.convertUrl(domain, url);
        const options = {
            method: 'PUT',
            uri: finalUrl,
            jar: this.cookies,
            json: data,
            headers: {
                ...this.headers,
                'Content-Type': 'application/json',
            },
        };
        const { body } = await this.scraper(options);
        return asJson(body);
    }
}

module.exports = CFClient;
