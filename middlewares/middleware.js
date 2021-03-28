const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    try{
        req.decoded = jwt.verify(req.headers.authorization, process.env.JWT_SECRET);
        return next();
    } catch (err) {
        if(err.name === 'TokenExpiredError'){
            //유효기간 초과 
            return res.json({
                status: 100,
                message: '토큰이 만료되었습니다.',
            });
        }
        return res.json({
            status: 100,
            message: '유효하지 않은 토큰입니다.',
        });
    }
};