const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
server.listen(5008, () => console.log('Listening 5008'));
