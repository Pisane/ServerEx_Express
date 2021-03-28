/* 
    지갑 관련한 api 처리 부분
*/

const db = require('../../../db/db_con');
const isEmpty = require('../../../utils/util');

const EventError = {
    DBError : 1,
    EmailNotFound : 2,

};


exports.walletInfo = async(req, res) => {
    const {email} = req.body;
    const pool = db.getPool();
    const getUserInfo = async (email) => {
        try{
            const connection = await pool.getConnection(async conn => conn);
            try{
                const query = 'select nickname, tokenAmount, seq from Users where Users.email like ?';
                const params = [email];
                const [rows] = await connection.query(query, params);
                connection.release();
                if(isEmpty(rows)){
                    throw new Error().msg = EventError.EmailNotFound;
                }else{
                    return {
                        nickname: rows[0].nickname,
                        tokenAmount: rows[0].tokenAmount,
                        Users_seq: rows[0].seq
                    };
                }

               
            }catch (err){
                console.log(err)
                connection.release();
                throw err;   
            }           
        }catch(err){
            throw err;
        }
    };

    const getTradeLog = async (Users_seq) => {
        try{
            const connection = await pool.getConnection(async conn => conn);
            try{
                const query = 'select * from Trade_Log where Trade_Log.Users_seq = ?';
                const params = [Users_seq];
                const [rows] = await connection.query(query, params);
                connection.release();
                if(isEmpty(rows)){
                    let result = new Object();
                    result.date='';
                    result.eventName ='';
                    result.productName = '';
                    result.productAmount = '';
                    result.tokenAmount = '';
                    return result;  
                 }else{
                    let resultArray = new Array();
                    for(let i = 0 ; i<rows.length ; ++i){
                        let result = new Object();
                        result.date = rows[i].date;
                        result.eventName = rows[i].Event_name;
                        result.productName = rows[i].Product_name;
                        result.productAmount = rows[i].Product_amount;
                        result.tokenAmount = rows[i].tokenAmount;
                        resultArray.push(result);
                    }
                    return resultArray;
                }
            }catch (err){
                console.log("트레이드 : " + params)
                connection.release();
                throw err;   
            }           
        }catch(err){
            throw err;
        }
    };

    try{
        const user = await getUserInfo(email);
       
        const tradeLog = await getTradeLog(user.Users_seq);
        
        let results = {
            'status': '1',
            'nickname': `${user.nickname}`,
            'tokenAmount': `${user.tokenAmount}`,
            'tradelog':[]
        };

        for(let i = 0 ; i < tradeLog.length ; ++i){
            results.tradelog.push(tradeLog[i]);
        }
        return res.status(200).json(results);

    }catch(err){
        let returnMsg = {'status': '0', 'error':''};
        switch(err){
            case EventError.DBError:
                returnMsg.error = 'DB 오류입니다.';
                break;
            case EventError.EmailNotFound:
                returnMsg.error = '이메일을 찾을 수 없습니다.';
                break;
            default:
                return res.status(200).json({
                    'status' : '0',
                    'msg' : '알 수 없는 오류입니다.',
                });
        }
        return res.status(200).json(returnMsg);
    }

}