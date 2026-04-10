const http = require('http');
const https = require('https');

const requestJson = (urlString, { method = 'GET', headers = {}, timeoutMs = 10000, body } = {}) =>
  new Promise((resolve, reject) => {
    let requestUrl;
    try {
      requestUrl = new URL(urlString);
    } catch (error) {
      reject(new Error('请求地址不合法'));
      return;
    }

    const client = requestUrl.protocol === 'https:' ? https : http;
    const request = client.request(
      requestUrl,
      {
        method,
        headers,
      },
      (response) => {
        let rawBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          rawBody += chunk;
        });
        response.on('end', () => {
          const statusCode = Number(response.statusCode) || 0;
          if (statusCode < 200 || statusCode >= 300) {
            const error = new Error(`HTTP 请求失败（${statusCode}）`);
            error.statusCode = statusCode;
            error.body = rawBody;
            reject(error);
            return;
          }

          try {
            resolve(rawBody ? JSON.parse(rawBody) : null);
          } catch (error) {
            reject(new Error('HTTP 响应不是合法 JSON'));
          }
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error('HTTP 请求超时'));
    });

    request.on('error', reject);

    if (body !== undefined && body !== null) {
      request.write(body);
    }

    request.end();
  });

module.exports = {
  requestJson,
};
