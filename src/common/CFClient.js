const cloudscraper = require('cloudscraper');
const qs = require('qs');
const request = require('request');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

    serializeCookies() {
        // eslint-disable-next-line no-underscore-dangle
        return this.cookies._jar.serializeSync();
    }

    importCookies(cookies) {
        // eslint-disable-next-line no-underscore-dangle
        const deserialized = this.cookies._jar.constructor.deserializeSync(cookies);
        this.cookies = request.jar();
        // eslint-disable-next-line no-underscore-dangle
        this.cookies._jar = deserialized;
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

    /**
     * @param {string} downloadDir
     * @param {string} url
     * @param {*} data
     */
    async downloadBlob(downloadDir = '', url, data) {
        const queryData = this.queryString.stringify(data);
        const queryDataString = queryData ? `?${queryData}` : '';
        const options = {
            method: 'GET',
            jar: this.cookies,
            uri: `${url}${queryDataString}`,
            headers: this.headers,
            encoding: 0,
        };
        return new Promise((resolve) => {
            this.cloudscraper(
                options,
                async (err, response, body) => {
                    const { headers } = response || {};
                    const { 'content-disposition': contentDisposition } = headers || {};
                    const downloadDirNormalized = path.normalize(downloadDir);
                    if (contentDisposition) {
                        const defaultName = `garmin_connect_download_${Date.now()}`;
                        const [, fileName = defaultName] = contentDisposition.match(/filename="(.+)"/);
                        const filePath = path.resolve(downloadDirNormalized, fileName);
                        fs.writeFileSync(filePath, body);
                        resolve(filePath);
                    }
                },
            );
        });
    }

    async get(url, data) {
        const queryData = this.queryString.stringify(data);
        const queryDataString = queryData ? `?${queryData}` : '';
        const options = {
            method: 'GET',
            jar: this.cookies,
            uri: `${url}${queryDataString}`,
            headers: this.headers,
        };
        const { body } = await this.scraper(options);
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
        const { body } = await this.scraper(options);
        return asJson(body);
    }

    /**
     * @param url
     * @param data
     * @param params are the URL parameters to be sent with the request
     * Must be a plain object or a URLSearchParams object
     * @param headers
     * @returns {Promise<void>}
     */
    async postJson(url, data, params, headers) {
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
        const { body } = await this.scraper(options);
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
        const { body } = await this.scraper(options);
        return asJson(body);
    }
}

module.exports = CFClient;
