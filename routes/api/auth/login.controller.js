const db = require('../../../db/db_con');
const isEmpty = require('../../../utils/util');
const jwt = require('jsonwebtoken');

/*
    POST /api/auth/login
    {
        email,
        password
    }

    async/await를 사용하기 위해서는 mysql2/promise 모듈을 사용해야 한다.
*/
const EventError = {
    DBError : 1,
    EmptyParams : 2,
    NotFoundUser : 3,
}
exports.login = async(req, res) => {
    const {email, password} = req.body;
    const pool = db.getPool();
    
    // email, password 길이, 패턴 체크 필요 
    const loginWithEmailPassword = async ( email, password ) => {
        try{
            if(email && password && email.length <= 50 && password.length <= 200){
                const connection = await pool.getConnection(async conn => conn);
                try{
                    // 로그인 성공 시 필요한 정보만 추출하면 됨
                    const query = 'SELECT nickname, isEmailAuth FROM Users WHERE Users.email like ? and Users.password like ?';
                    const params = [email, password];
                    const [rows] = await connection.query(query, params);
                    connection.release();
                    if(isEmpty(rows)){
                        // 사용자를 찾을 수 없음
                        throw new Error().msg = EventError.NotFoundUser;
                    } else {
                        return rows;
                    }

                } catch (err) {
                    connection.release();
                    if(err === EventError.NotFoundUser){
                        throw err;
                    } else {
                        throw new Error().msg = EventError.DBError;
                    }
                }
            } else {
                throw new Error().msg = EventError.EmptyParams;
            }
        } catch (err) {
            throw err;
        }
    }; 

    try{
        const loginResult = await loginWithEmailPassword(email, password);
        
        //로그인 성공
        const nickname = loginResult[0].nickname;
        const isEmailAuth = loginResult[0].isEmailAuth;

        //JWT 생성
        ///////////////////////////////////////////
        const token = jwt.sign({
            'email': email,
            'nickname': nickname,
        }, process.env.JWT_SECRET, {
            expiresIn: '1h',
            issuer: 'ADWARD',
        });
        ///////////////////////////////////////////

        // 지갑 정보 가져오기 
        // 'tokenBalance' : value
        
        return res.status(200).json({
            'status': '1',
            'msg': `${nickname}님 환영합니다.`,
            'email': email,
            'jwt': token,
            'isEmailAuth': isEmailAuth,
        });
        
    } catch(err){
        let returnMsg = {
            'status' : '0',
            'reason' : '',
        };

        switch(err){
            case EventError.DBError:
                returnMsg.reason = '서버에 문제가 있습니다.';
                break;
            case EventError.EmptyParams:
                returnMsg.reason = '이메일 혹은 비밀번호가 비어 있습니다.';
                break;
            case EventError.NotFoundUser:
                returnMsg.reason = '일치하는 계정이 없습니다. 다시 한번 확인해주세요.';
                break;
            default:
                return res.status(200).json({
                    'status': '0',
                    'msg' : err
                });            
        }
        return res.status(200).json(returnMsg);
    }
};

