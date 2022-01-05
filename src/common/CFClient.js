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

    async scraper(options, domain) {
        const newOptions = Object.create(options);
        newOptions.uri = urls.convertUrl(domain, options.uri);
        newOptions.headers.origin = urls.convertUrl(domain, newOptions.headers.origin);
        return new Promise((resolve) => {
            this.cloudscraper(
                newOptions,
                (err, res) => {
                    resolve(res);
                },
            );
        });
    }

    async get(url, domain, data) {
        const queryData = this.queryString.stringify(data);
        const queryDataString = queryData ? `?${queryData}` : '';
        const options = {
            method: 'GET',
            jar: this.cookies,
            uri: `${url}${queryDataString}`,
            headers: this.headers,
        };
        const { body } = await this.scraper(options, domain);
        return asJson(body);
    }

    async post(url, domain, data) {
        const options = {
            method: 'POST',
            uri: url,
            jar: this.cookies,
            formData: data,
            headers: this.headers,
        };
        const { body } = await this.scraper(options, domain);
        return asJson(body);
    }

    async postJson(url, domain, data, params, headers) {
        const options = {
            method: 'POST',
            uri: url,
            jar: this.cookies,
            json: data,
            headers: {
                ...this.headers,
                ...headers,
                'Content-Type': 'application/json',
            },
        };
        const { body } = await this.scraper(options, domain);
        return asJson(body);
    }

    async putJson(url, domain, data) {
        const options = {
            method: 'PUT',
            uri: url,
            jar: this.cookies,
            json: data,
            headers: {
                ...this.headers,
                'Content-Type': 'application/json',
            },
        };
        const { body } = await this.scraper(options, domain);
        return asJson(body);
    }
}

module.exports = CFClient;
