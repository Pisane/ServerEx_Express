const mysql = require('mysql2/promise');
const dbconfig = require('./db_info').local;

let pool;

module.exports = {
    getPool: function() {
        if (pool) return pool;
        pool = mysql.createPool({
            connectionLimit : 10,
            host: dbconfig.host,
            port: dbconfig.port,
            user: dbconfig.user,
            password: dbconfig.password,
            database: dbconfig.database
        });
        pool.getConnection();

        return pool;
    }
};
/*
function () {
    return {
        init: function () {
            return mysql.createPool({
                connectionLimit : 10,
                host: dbconfig.host,
                port: dbconfig.port,
                user: dbconfig.user,
                password: dbconfig.password,
                database: dbconfig.database
            })
        }
    }
};
*/
/*
    사용방법 
    var db = require('./app/util/database.js');
    var pool = db.getPool(); // re-uses existing if already created or creates new one
    pool.getConnection(function(err, connection) {
    // don't forget to check error
    connection.query('select 1+1', function(err, rows) {
        // don't forget to check error
        // ...
        // use your data - response from mysql is in rows    
    });
    });
*/