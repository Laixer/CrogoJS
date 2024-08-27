const express = require('express');
var logger = require('morgan');
const { Client } = require('pg');

require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false,
    }
});

client.connect()
    .then(() => { })
    .catch(err => console.error('Connection error', err.stack));

var app = express();
app.set('trust proxy', true);

app.use(logger('dev'));
app.use(express.json());

app.use('/api', function (req, res, next) {
    const apiKey = process.env.API_KEY;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).end();
    }

    const basicCredentials = authHeader.split(' ')[1];
    if (basicCredentials !== apiKey) {
        return res.status(401).end();
    }

    next();
});

app.post('/api/v1/telemetry_host', async (req, res) => {
    const remoteAddress = req.ip;
    const data = req.body;

    if (!data.instance) {
        return res.status(400).json({ error: 'instance is required' });
    }

    await client.query('INSERT INTO public.telemetry_host("instance", remote_address, "data") VALUES($1, $2, $3)', [
        data.instance,
        remoteAddress,
        data
    ])

    res.status(202).end();
});

app.post('/api/v1/telemetry_gps', async (req, res) => {
    const remoteAddress = req.ip;
    const data = req.body;

    if (!data.instance) {
        return res.status(400).json({ error: 'instance is required' });
    }

    if (!data.lat) {
        return res.status(400).json({ error: 'latitude is required' });
    }

    if (!data.lon) {
        return res.status(400).json({ error: 'longitude is required' });
    }

    await client.query('INSERT INTO public.telemetry_gps("instance", remote_address, location, "data") VALUES($1, $2, POINT($3, $4), $5)', [
        data.instance,
        remoteAddress,
        data.lat,
        data.lon,
        data
    ])

    res.status(202).end();
});

app.post('/api2/v1/gateway_test', async (req, res) => {
    // const remoteAddress = req.ip;
    // const data = req.body;

    console.log('Request', req);

    // if (!data.instance) {
    //     return res.status(400).json({ error: 'instance is required' });
    // }

    // if (!data.lat) {
    //     return res.status(400).json({ error: 'latitude is required' });
    // }

    // if (!data.lon) {
    //     return res.status(400).json({ error: 'longitude is required' });
    // }

    // await client.query('INSERT INTO public.telemetry_gps("instance", remote_address, location, "data") VALUES($1, $2, POINT($3, $4), $5)', [
    //     data.instance,
    //     remoteAddress,
    //     data.lat,
    //     data.lon,
    //     data
    // ])

    res.status(202).end();
});

// error handler
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.json({ error: err.message });
});

// catch 404 and forward to error handler
app.use(function (req, res) {
    res.status(404);
    res.end();
});

module.exports = app;
