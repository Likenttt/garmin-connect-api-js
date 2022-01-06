/**
 *     Extracts an authentication ticket URL from the response of an
 *     authentication form submission. The auth ticket URL is typically
 *     of form:
 *
 *     https://connect.garmin.com/modern?ticket=ST-0123456-aBCDefgh1iJkLmN5opQ9R-cas
 * @param responseText
 * @returns {*}
 */
function authTicketUrl(responseText) {
    const re = /response_url\s*=\s*"(https:[^"]+)"/;
    const match = responseText.match(re);
    if (!match) {
        console.log('auth failure: unable to extract auth ticket URL. did you provide a correct username/password?');
    }
    return match[1].replace('\\', '');
}

module.exports = {
    authTicketUrl,
};
