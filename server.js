const express = require('express');
const path = require('path');
const contact = require('./api/contact');
const assistRequest = require('./api/assist-request');
const placePayLaterOrder = require('./api/place-pay-later-order');
const paymateCreateOrder = require('./api/paymate/create-order');
const paymateCallback = require('./api/paymate/callback');
const paymateStatus = require('./api/paymate/status');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function apiRoute(handler) {
  return (req, res) => handler(req, res);
}

app.post('/api/contact', apiRoute(contact));
app.post('/api/assist-request', apiRoute(assistRequest));
app.post('/api/place-pay-later-order', apiRoute(placePayLaterOrder));
app.post('/api/paymate/create-order', apiRoute(paymateCreateOrder));
app.post('/api/paymate/callback', apiRoute(paymateCallback));
app.get('/api/paymate/status', apiRoute(paymateStatus));

app.options('/api/contact', apiRoute(contact));
app.options('/api/assist-request', apiRoute(assistRequest));
app.options('/api/place-pay-later-order', apiRoute(placePayLaterOrder));
app.options('/api/paymate/create-order', apiRoute(paymateCreateOrder));
app.options('/api/paymate/callback', apiRoute(paymateCallback));

app.listen(PORT, () => {
  console.log(`SchengenEase server running on port ${PORT}`);
});
