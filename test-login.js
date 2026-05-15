const http = require('http');

const data = JSON.stringify({
  username: "jayakumar432008@gmail.com",
  password: "jks123"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response for jks123:', body));
});
req.write(data);
req.end();

const data2 = JSON.stringify({
  username: "jayakumar432008@gmail.com",
  password: "jks542008"
});

const options2 = { ...options, headers: { 'Content-Type': 'application/json', 'Content-Length': data2.length } };

const req2 = http.request(options2, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response for jks542008:', body));
});
req2.write(data2);
req2.end();
