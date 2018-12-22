var net = require('net');
var client = new net.Socket();

const host = '35.157.111.68';
const port = 10225;

const conn = net.createConnection(port, host);
conn.setEncoding('utf-8');

conn.on('connect', function() {
  conn.on('data', function(data) {
    console.log("Response from server: " + data);

    if (data.indexOf('flag') != -1) {
      console.log('Found flag. Destroying connection.');
      conn.destroy();
    }

    if (data.indexOf(":") != -1) {
      const split = parseInt(data.toString().split(':')[1]).toString();
      conn.write(split + '\n');
    }
  });
});