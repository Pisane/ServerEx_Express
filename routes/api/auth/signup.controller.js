const db = require('../../../db/db_con');
const isEmpty = require('../../../utils/util');
const createWalletToken = require('../../../web3/wallet');
const nodemailer = require('nodemailer');
const smtpPool = require('nodemailer-smtp-pool');
const fs = require('fs');
/*
    POST /api/auth/signup
    {
        email,
        nickname,
        password
    }
    async/await를 사용하기 위해서는 mysql2/promise 모듈을 사용해야 한다.
*/

/*
클라이언트에서 인증메일 다시 보내기 버튼 클릭 시 처리할 함수
exports.sendAuthMail = (req, res) => {
    
}
*/

//에러 이벤트
const EventError = {
    DBError : 1,
    EmptyParams : 2,
    NameIsDuplicated : 3,
    FailToCreateWallet: 4,

    //인증메일에러
    NotFoundUser: 5,
    NotReadHTML:6,
};

// 회원가입 인증 메일 보내는 구간
const transporter = nodemailer.createTransport(smtpPool({
    service: process.env.MAIL_SERVICE,
    host:process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_AUTH_USER,
        pass: process.env.MAIL_AUTH_PASS
    },
    
}));



exports.signup = async (req, res) => {
    const { email, nickname, password } = req.body;
    const pool = db.getPool(); 

    // 1단계 기존 사용자 중 동일한 아이디 / 닉네임이 있는가 확인
    const checkEmailNickname = async (email, nickname) => {
        try{
            //console.log(pool);
            if(email && nickname && email.length <= 50 && nickname.length <= 50){
                // 보안문제 
                // email 길이, 패턴 
                // nickname 길이, 패턴
                const connection = await pool.getConnection(async conn => conn);
                try{
    
                    const query = 'SELECT * FROM Users WHERE Users.email like ? or Users.nickname like ?';
                    const params = [email, nickname];
                    const [rows] = await connection.query(query, params);
                    connection.release();
                    if(!isEmpty(rows)){
            
                        throw new Error().msg = EventError.NameIsDuplicated;
                    }
                    
                }catch(err){
                    connection.release();
                    if(err === EventError.NameIsDuplicated){
                        throw err;
                    } else {
                        throw new Error().msg = EventError.DBError;
                    }
                }

            }else{
                throw new Error().msg = EventError.EmptyParams;
            }
        }catch(err){
            throw err;
        }

    }
    
    // 계정 생성하는 쿼리
    const createUser = async () => {
        try{
            const connection = await pool.getConnection(async conn => conn);
            try{
                //지갑 생성 
                const address = 'address';
                const privateKey = "privatekey";
                //const {address, privateKey} = await createWalletToken();
                if(address=='' || privateKey==''){
                    throw new Error().msg = EventError.FailToCreateWallet;
                }
                
                const query = 'INSERT INTO Users (email, nickname, password, ethAddress, privateKey, tokenAmount, isEmailAuth) VALUES(?,?,?,?,?,0,0)';
                const params = [email, nickname, password, address, privateKey];

                const [rows] = await connection.query(query, params);


                const mailOptions = {
                    from : process.env.MAIL_AUTH_USER,
                    to: 'diablo461@naver.com',
                    subject: '이메일 인증 테스트입니다.',
                    html:
                    `
                    <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
                    <html>
                    <head>
                    <title> ADWARD </title>
                    <style type="text/css">
                    </style>
                    
                    <meta http-equiv="content-type" content="text/html"; charset="utf-8">
                    
                    <body style="margin-top:0px; margin-left:0px; margin-right:0px; margin-bottom:0px;
                    font-family:"굴림"; font-size:9pt; color:#525252; line-height:18px;background-color: #DDDDDD">
                        
                    <div style="margin-left:60px;margin-right:60px;margin-top:20px;margin-bottom:100px;background:#ffffff;" align="center" ><p><strong><br>
                                <br>
                        ${nickname}</strong> 회원님!</p>
                            <p>회원가입을 위한 인증메일입니다.</p>
                            <p>아래의 버튼을 클릭하시면 회원가입이 완료됩니다.    
                                
                    <div style="margin-top:20px;margin-bottom:100px;background:#ffffff;"> 
                        <form action="https://sir-i-us.net/api/auth/checkAuthMail" method='post' target='_blank'>
                            <input type='hidden' name='email' value=${email}>
                            <button align="center" style="height:50px; width:220px; background-color: #077acb; padding: 15px; color: white;" type='submit' value=${email}>계정활성화</button>
                        </form>
                    </div>
                    </body>
                    </html>
                    `
                };        
                    
                    /*
                    `<!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8">
                      <title>email form</title>
                    </head>
                    
                    <body>
                    <h2>이메일 인증</h2>
                    <form action="http://localhost:8002/api/auth/checkAuthMail" method='post' target='_blank'>
                        <input type='hidden' name='email' value=${email}>
                        <button type='submit' value=${email}>클릭</button>
                    </form>
                    </body>
                    </html>`
                };
                */
       
                transporter.sendMail(mailOptions, function(err, info){
                    if(err){
                        console.log(err);
                    } else{
                        console.log('Email send: '+info.response);
                    }
                });
                
                //mail을 보냈다는 쿼리
                const mailQuery = 'INSERT INTO EmailAuth (Users_email, date) VALUES(?, now())';
                const mailParams = [email];
                await connection.query(mailQuery, mailParams);
                

                connection.release();

                return true;
            }catch(err){
                if(err == EventError.FailToCreateWallet){
                    throw err;
                } else if(err == EventError.NotReadHTML){
                    throw err;
                } else {
                    throw new Error().msg = EventError.DBError;
                }
                
            }

        }catch(err){
            throw err;      
        }

    }
    
    //실제 함수 실행하는 구간
    try{
        await checkEmailNickname(email, nickname);
        await createUser();
        return res.status(200).json({
            'status': '1',                
            'msg': `${nickname}님 애드워드 서비스에 가입하신 걸 환영합니다`,
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
                returnMsg.reason = '이메일 혹은 닉네임이 비어 있습니다.';
                break;
            case EventError.NameIsDuplicated:
                returnMsg.reason = '중복된 이메일 혹은 닉네임이 있습니다.';
                break;
            case EventError.FailToCreateWallet:
                returnMsg.reason = '블록체인 지갑을 생성하는데 실패 하였습니다.'
                break;
            default:
                return res.status(500).json({
                    'status': '0',
                    'msg' : '알 수 없는 오류입니다.'
                });            
        }
        return res.status(200).json(returnMsg);
    }
}

exports.resendAuthEmail = async (req, res) => {
    const { email } = req.body;
    const pool = db.getPool(); 

    // 1단계 기존 사용자 중 동일한 아이디 / 닉네임이 있는가 확인
    const resendAuthEmail = async (email) => {
        try{
            //console.log(pool);
            if(email  && email.length <= 50){
                // 보안문제 
                // email 길이, 패턴 
                const connection = await pool.getConnection(async conn => conn);
                try{
                    // 인증 메일 보낸적 있나 확인하기
                    const query = 'SELECT isEmailAuth, nickname FROM Users WHERE Users.email like ? ';
                    const params = [email];
                    const [rows] = await connection.query(query, params);
                
                    if(!isEmpty(rows)){
                        throw new Error().msg = EventError.NotFoundUser;
                    }

                    const nickname = rows[0].nickname;
                    const mailOptions = {
                        from : process.env.MAIL_AUTH_USER,
                        to: 'diablo461@naver.com',
                        subject: '이메일 인증 테스트입니다.',
                        html:
                        `
                        <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
                        <html>
                        <head>
                        <title> ADWARD </title>
                        <style type="text/css">
                        </style>
                        
                        <meta http-equiv="content-type" content="text/html"; charset="utf-8">
                        
                        <body style="margin-top:0px; margin-left:0px; margin-right:0px; margin-bottom:0px;
                        font-family:"굴림"; font-size:9pt; color:#525252; line-height:18px;background-color: #DDDDDD">
                            
                        <div style="margin-left:60px;margin-right:60px;margin-top:20px;margin-bottom:100px;background:#ffffff;" align="center" ><p><strong><br>
                                    <br>
                            ${nickname}</strong> 회원님!</p>
                                <p>회원가입을 위한 인증메일입니다.</p>
                                <p>아래의 버튼을 클릭하시면 회원가입이 완료됩니다.    
                                    
                        <div style="margin-top:20px;margin-bottom:100px;background:#ffffff;"> 
                            <form action="https://sir-i-us.net/api/auth/checkAuthMail" method='post' target='_blank'>
                                <input type='hidden' name='email' value=${email}>
                                <button align="center" style="height:50px; width:220px; background-color: #077acb; padding: 15px; color: white;" type='submit' value=${email}>계정활성화</button>
                            </form>
                        </div>
                        </body>
                        </html>
                        `
                    };    

                    transporter.sendMail(mailOptions, function(err, info){
                        if(err){
                            console.log(err);
                        } else{
                            console.log('Email send: '+info.response);
                        }
                    });

                    if(rows.isEmailAuth == 0){
                        const query = 'update EmailAuth set date = now() where Users_email = ?';
                        const params = [email];
                        await connection.query(query, params);
                    }

                    connection.release();

                }catch(err){
                    connection.release();
                    if(err === EventError.NotFoundUser){
                        throw err;
                    } else {
                        throw new Error().msg = EventError.DBError;
                    }
                }

            }else{
                throw new Error().msg = EventError.EmptyParams;
            }
        }catch(err){
            throw err;
        }

    }

    //본문
    try{
        await resendAuthEmail(email);
        return res.status(200).json({
            'status': '1',                
            'msg': `성공`,
        });
    }catch(err){
        let returnMsg = {
            'status' : '0',
            'reason' : '',
        };

        switch(err){
            case EventError.DBError:
                returnMsg.reason = '서버에 문제가 있습니다.';
                break;
            case EventError.EmptyParams:
                returnMsg.reason = '이메일 혹은 닉네임이 비어 있습니다.';
                break;
            case EventError.NotFoundUser:
                returnMsg.reason = '해당 이메일을 찾을 수 없습니다.'
                break;
            default:
                return res.status(500).json({
                    'status': '0',
                    'msg' : '알 수 없는 오류입니다.'
                });            
        }
        return res.status(200).json(returnMsg);
    }
}

exports.checkAuthEmail = async (req, res) => {
    const { email } = req.body;
    const pool = db.getPool(); 
    console.log(email);
    // 1단계 기존 사용자 중 동일한 아이디 / 닉네임이 있는가 확인
 
    try{
        //console.log(pool);
        if(email  && email.length <= 50){
            // 보안문제 
            // email 길이, 패턴 
            const connection = await pool.getConnection(async conn => conn);
            try{
                // 회원가입이 되어 있고 인증한 적이 없는지
                const query = 'update Users set isEmailAuth = 1 where email = ?';
                const params = [email];
                await connection.query(query, params);

                connection.release();

                res.writeHead(200, {'Content-Type': 'text/html'});
                fs.readFile(__dirname+'/html/joinCompleteForm.html',(err, data)=>{
                    if(err){
                        throw new Error().msg = EventError.NotReadHTML;
                    }
                    res.end(data, 'utf-8');
                });

               
            }catch(err){
                connection.release();
                throw new Error().msg = EventError.DBError;
            }

        }else{
            throw new Error().msg = EventError.EmptyParams;
        }
    }catch(err){
        let returnMsg = {
            'status' : '0',
            'reason' : '',
        };

        switch(err){
            case EventError.DBError:
                returnMsg.reason = '서버에 문제가 있습니다.';
                break;
            case EventError.EmptyParams:
                returnMsg.reason = '이메일 혹은 닉네임이 비어 있습니다.';
                break;
            case EventError.NotReadHTML:
                returnMsg.reason = 'HTML 파일을 읽을 수 없습니다.';
                break;
            default:
                return res.status(500).json({
                    'status': '0',
                    'msg' : '알 수 없는 오류입니다.'
                });            
        }
        res.statusCode = 404;
        return res.end('인증에 실패하였습니다. 이메일을 인증을 다시 시도해주세요');
    }



}