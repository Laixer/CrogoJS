const express = require('express');
var logger = require('morgan');
const { Client } = require('pg');

require('dotenv').config();

// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');

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

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

app.use('/api', function (req, res, next) {
    const apiKey = process.env.API_KEY;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({ error: 'authorization header is required' });
    }

    const basicCredentials = authHeader.split(' ')[1];
    if (basicCredentials !== apiKey) {
        return res.status(401).json({ error: 'api-key is invalid' });
    }

    next();
});

app.post('/api/v1/telemetry_host', async (req, res) => {
    const remoteAddress = req.socket.remoteAddress;
    const data = req.body;

    if (!data.instance) {
        return res.status(400).json({ error: 'instance is required' });
    }

    await client.query('INSERT INTO public.telemetry_host("instance", remote_address, "data") VALUES($1, $2, $3)',
        [
            data.instance,
            remoteAddress,
            data
        ]
    )

    res.json({ status: 'ok' });
});

app.post('/api/v1/telemetry_gps', async (req, res) => {
    const remoteAddress = req.socket.remoteAddress;
    const data = req.body;

    if (!data.instance) {
        return res.status(400).json({ error: 'instance is required' });
    }

    await client.query('INSERT INTO public.telemetry_gps("instance", remote_address, "data") VALUES($1, $2, $3)',
        [
            data.instance,
            remoteAddress,
            data
        ]
    )

    res.json({ status: 'ok' });
});

// error handler
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.json({ error: err.message });
});

// catch 404 and forward to error handler
app.use(function (req, res) {
    res.status(404);
    res.json({ error: "Sorry, can't find that" })
});

module.exports = app;
