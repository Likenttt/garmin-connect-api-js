const url = 'connect.garmin.com/q?uri=garmin.com';
const result = url.replace(/garmin.com/g, 'garmin.cn') === 'connect.garmin.cn/q?uri=garmin.cn';
console.log(`replace all outcome: ${result}`);
