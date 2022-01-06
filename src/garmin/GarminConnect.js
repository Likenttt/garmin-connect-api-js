const appRoot = require('app-root-path');

let config = {};
try {
    // eslint-disable-next-line
    config = require(`${appRoot}/garmin.config.json`);
} catch (e) {
    // Do nothing
}

const CFClient = require('../common/CFClient');
const { Running } = require('./workouts');
const { toDateString } = require('../common/DateUtils');
const urls = require('./Urls');

const {
    username: configUsername,
    password: configPassword,
    domain: configDomain,
} = config;

const credentials = {
    username: configUsername,
    password: configPassword,
    domain: configDomain,
    embed: 'false',
};

class GarminConnect {
    constructor(domain = 'com') {
        if (domain && !['com', 'cn'].includes(domain)) {
            throw new Error('Only com and cn are valid for the parameter domain');
        }
        this.domain = domain;
        const headers = {
            origin: urls.convertUrl(this.domain, urls.GARMIN_SSO_ORIGIN),
            nk: 'NT',
        };
        this.client = new CFClient(headers);
        this.userHash = undefined;
        this.domain = 'com';
        this.csrf = '';
    }

    get sessionJson() {
        const cookies = this.client.serializeCookies();
        return { cookies, userHash: this.userHash };
    }

    set sessionJson(json) {
        const {
            cookies,
            userHash,
        } = json || {};
        if (cookies && userHash) {
            this.userHash = userHash;
            this.client.importCookies(cookies);
        }
    }

    /**
     * Login to Garmin Connect
     * @param username
     * @param password
     * @param domain The top domain of GC_MODERN,
     * only com(For the global, default) and cn(For China Mainland) are allowed
     * @returns {Promise<*>}
     */
    async login(username, password, domain = 'com') {
        if (domain && !['com', 'cn'].includes(domain)) {
            throw new Error('Only com and cn are valid for the parameter domain');
        }
        this.domain = domain;
        let tempCredentials = { ...credentials, rememberme: 'on' };
        if (username && password) {
            tempCredentials = {
                ...credentials, username, password, rememberme: 'on',
            };
        }
        this.csrf = this.getCsrfToken();
        await this.get(urls.SIGNIN_URL);
        await this.post(urls.SIGNIN_URL, tempCredentials);
        const userPreferences = await this.getUserInfo();
        const { displayName } = userPreferences;
        this.userHash = displayName;
        return this;
    }

    // A set of request query parameters that need to be present for Garmin to
    // accept our login attempt.
    getAuthParams() {
        return {
            service: urls.convertUrl(this.domain, urls.GC_MODERN),
            gauthHost: urls.convertUrl(this.domain, urls.GARMIN_SSO),
        };
    }

    async getCsrfToken() {
        const authResp = await this.get(urls.LOGIN_URL, this.getAuthParams());
        if (authResp.status_code !== 200) {
            throw Error(`Auth failure: could not load ${urls.convertUrl(this.domain, urls.LOGIN_URL)}`);
        }
        const re = /<input type="hidden" name="_csrf" value="(\w+)"/;
        const csrfToken = authResp.content.match(re);
        if (!csrfToken) {
            throw Error(`Auth failure: no CSRF token in ${urls.convertUrl(this.domain, urls.LOGIN_URL)}`);
        }
        return csrfToken[0];
    }

    // User info
    /**
     * Get basic user information
     * @returns {Promise<*>}
     */
    async getUserInfo() {
        return this.get(urls.userInfo());
    }

    /**
     * Get social user information
     * @returns {Promise<*>}
     */
    async getSocialProfile() {
        return this.get(urls.socialProfile(this.userHash));
    }

    /**
     * Get a list of all social connections
     * @returns {Promise<*>}
     */
    async getSocialConnections() {
        return this.get(urls.socialConnections(this.userHash));
    }

    // Devices
    /**
     * Get a list of all registered devices
     * @returns {Promise<*>}
     */
    async getDeviceInfo() {
        return this.get(urls.deviceInfo(this.userHash));
    }

    // Sleep data
    /**
     * Get detailed sleep data for a specific date
     * @param date
     * @returns {Promise<*>}
     */
    async getSleepData(date = new Date()) {
        const dateString = toDateString(date);
        return this.get(urls.dailySleepData(this.userHash), { date: dateString });
    }

    /**
     * Get sleep data summary for a specific date
     * @param date
     * @returns {Promise<*>}
     */
    async getSleep(date = new Date()) {
        const dateString = toDateString(date);
        return this.get(urls.dailySleep(), { date: dateString });
    }

    // Heart rate
    /**
     * Get heart rate measurements for a specific date
     * @param date
     * @returns {Promise<*>}
     */
    async getHeartRate(date = new Date()) {
        const dateString = toDateString(date);
        return this.get(urls.dailyHeartRate(this.userHash), { date: dateString });
    }

    // Weight
    /**
     * Post a new body weight
     * @param weight
     * @returns {Promise<*>}
     */
    async setBodyWeight(weight) {
        if (weight) {
            const roundWeight = Math.round(weight * 1000);
            const data = { userData: { weight: roundWeight } };
            return this.put(urls.userSettings(), data);
        }
        return Promise.reject();
    }

    // Activites
    /**
     * Get list of activites
     * @param start
     * @param limit
     * @returns {Promise<*>}
     */
    async getActivities(start, limit) {
        return this.get(urls.activities(), { start, limit });
    }

    /**
     * Get details about an activity
     * @param activity
     * @param maxChartSize
     * @param maxPolylineSize
     * @returns {Promise<*>}
     */
    async getActivity(activity, maxChartSize, maxPolylineSize) {
        const { activityId } = activity || {};
        if (activityId) {
            return this.get(urls.activityDetails(activityId), { maxChartSize, maxPolylineSize });
        }
        return Promise.reject();
    }

    /**
     * Get weather data from an activity
     * @param activity
     * @returns {Promise<*>}
     */
    async getActivityWeather(activity) {
        const { activityId } = activity || {};
        if (activityId) {
            return this.get(urls.weather(activityId));
        }
        return Promise.reject();
    }

    /**
     * Updates an activity
     * @param activity
     * @returns {Promise<*>}
     */
    async updateActivity(activity) {
        return this.put(urls.activity(activity.activityId), activity);
    }

    /**
     * Deletes an activity
     * @param activity
     * @returns {Promise<*>}
     */
    async deleteActivity(activity) {
        const { activityId } = activity || {};
        if (activityId) {
            const headers = { 'x-http-method-override': 'DELETE' };
            return this.client.postJson(urls.activity(activityId), undefined, undefined, headers);
        }
        return Promise.reject();
    }

    /**
     * Get list of activities in your news feed
     * @param start
     * @param limit
     * @returns {Promise<*>}
     */
    async getNewsFeed(start, limit) {
        return this.get(urls.newsFeed(), { start, limit });
    }

    // Steps
    /**
     * Get step count for a specific date
     * @param date
     * @returns {Promise<*>}
     */
    async getSteps(date = new Date()) {
        const dateString = toDateString(date);
        return this.get(urls.dailySummaryChart(this.userHash), { date: dateString });
    }

    // Workouts
    /**
     * Get list of workouts
     * @param start
     * @param limit
     * @returns {Promise<*>}
     */
    async getWorkouts(start, limit) {
        return this.get(urls.workouts(), { start, limit });
    }

    /**
     * Download original activity data to disk as zip
     * Resolves to absolute path for the downloaded file
     * @param activity : any
     * @param dir Will default to current working directory
     * @param type : string - Will default to zip
     * @returns {Promise<*>}
     */
    async downloadOriginalActivityData(activity, dir, type = '') {
        const { activityId } = activity || {};
        if (activityId) {
            const url = type === '' || type === 'zip'
                ? urls.originalFile(activityId)
                : urls.exportFile(activityId, type);
            return this.client.downloadBlob(dir, url);
        }
        return Promise.reject();
    }

    /**
     * Uploads an activity file ('gpx', 'tcx', or 'fit')
     * @param file the file to upload
     * @param format the format of the file. If undefined, the extension of the file will be used.
     * @returns {Promise<*>}
     */
    async uploadActivity(file, format) {
        throw new Error('uploadActivity method is disabled in this version');
        /*
        const detectedFormat = format || path.extname(file);
        if (detectedFormat !== '.gpx' && detectedFormat !== '.tcx' && detectedFormat !== '.fit') {
            Promise.reject();
        }

        const formData = new FormData();
        formData.append(path.basename(file), fs.createReadStream(file));
        return this.client.postBlob(urls.upload(format), formData);
         */
    }

    /**
     * Adds a running workout with one step of completing a set distance.
     * @param name
     * @param meters
     * @param description
     * @returns {Promise<*>}
     */
    async addRunningWorkout(name, meters, description) {
        const running = new Running();
        running.name = name;
        running.distance = meters;
        running.description = description;
        return this.addWorkout(running);
    }

    /**
     * Add a new workout preset.
     * @param workout
     * @returns {Promise<*>}
     */
    async addWorkout(workout) {
        if (workout.isValid()) {
            const data = { ...workout.toJson() };
            if (!data.description) {
                data.description = 'Added by garmin-connect for Node.js';
            }
            return this.post(urls.workout(), data);
        }
        return Promise.reject();
    }

    /**
     * Add a workout to your workout calendar.
     * @param workout
     * @param date
     * @returns {Promise<*>}
     */
    async scheduleWorkout(workout, date) {
        const { workoutId } = workout || {};
        if (workoutId && date) {
            const dateString = toDateString(date);
            return this.post(urls.schedule(workoutId), { date: dateString });
        }
        return Promise.reject();
    }

    /**
     * Delete a workout based on a workout object.
     * @param workout
     * @returns {Promise<*>}
     */
    async deleteWorkout(workout) {
        const { workoutId } = workout || {};
        if (workoutId) {
            const headers = { 'x-http-method-override': 'DELETE' };
            return this.client.postJson(urls.workout(workoutId), undefined, undefined, headers);
        }
        return Promise.reject();
    }

    // General methods
    // uri will be converted to the corresponding domain later.
    // please ensure the domains in the data are converted
    async get(url, data) {
        return this.client.get(url, this.domain, data);
    }

    async post(url, data) {
        return this.client.postJson(url, this.domain, data);
    }

    async put(url, data) {
        return this.client.putJson(url, this.domain, data);
    }
}

module.exports = GarminConnect;
