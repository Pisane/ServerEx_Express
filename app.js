
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const fs = require('fs');
const https = require('https');
//const config = require('./config');
require('dotenv').config();
const port = process.env.PORT || 443;

//api
const api = require('./routes/api');

const app = express();

const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/sir-i-us.net/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/sir-i-us.net/fullchain.pem')
};

//cors
/*
const corsOptions = {
    origin: 'localhost:8002'
}
*/
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(morgan('dev'));

//app.set('jwt-secret',config["jwt-secret"]);

// configure api router
app.use('/api', api);

https.createServer(options, app).listen(port, function(){
    console.log(`HTTPS Express is running on port ${port}`);
});

