module.exports = (function () {
    return {
        local: { //localhost
            host: '',
            port: '',
            user: '',
            password: '',
            database: '',            
        },
        real: { // real server db info
            host: '',
            port: '',
            user: '',
            password: '!',
            database: '',
        },
        dev: { // dev server db info
            host: '',
            port: '',
            user: '',
            password: '',
            database: ''
        }
    }
})();