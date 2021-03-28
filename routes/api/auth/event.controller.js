const db = require('../../../db/db_con');
const isEmpty = require('../../../utils/util');

/*
확인 작업
1. 이벤트 활성화 여부
2. 사용자의 이벤트 참여 여부
3. 상품 확인
4. 해당 상품을 받은 적 있는지 확인

처리할 것
1. 상품 수량 줄이기
2. (옵션) 사용자 토큰량 증가
3. 이벤트 로그 갱신
4. 트레이드 로그 갱신
*/

const EventError = {
    DBError : 1,
    EventNotActivate : 2,
    UserNotFoundInEvent : 3,
    ProductNoAvailable : 4,
    hasAlready : 5,
};


exports.processQRCodeForEvent = async(req, res) => {
    const {Event_id, Event_Product_seq, email} = req.body;
    const pool = db.getPool();
    
    const isActivatedEvent = async (Event_id) => {
        try{
            const connection = await pool.getConnection(async conn => conn);
            try{
                const query = 'select name from Event where (Event.startDate <= now() and Event.endDate >= now()) and (Event.id = ?)';
                const params = [Event_id];
                const [rows] = await connection.query(query, params);
                connection.release();
                if(isEmpty(rows)){
                    throw new Error().msg = EventError.EventNotActivate;
                }else{
                    return rows[0].name;
                }
            }catch (err){
                connection.release();
                throw err;   
            }           
        }catch(err){
            throw err;
        }
    };

    //사용자에 대한 이벤트 참여 여부 확인 => 사용자 고유번호 (Users_seq), 토큰 양(tokenAmount)
    const isUserParticipated = async (Event_id, email) => {
        try{
            const connection = await pool.getConnection(async conn => conn);
            try{
                const query = 'select Event_Participant.Users_seq as Users_seq, User.tokenAmount as tokenAmount from Event_Participant, (select seq, tokenAmount from Users where Users.email like ? ) as User where (Event_Participant.Event_id = ?) and (User.seq = Event_Participant.seq)';
                const params = [email, Event_id];
                const [rows] = await connection.query(query, params);
                connection.release();
                if(isEmpty(rows)){
                    throw new Error().msg = EventError.UserNotFoundInEvent;
                }else{
                    return { 
                        Users_seq : rows[0].Users_seq, 
                        tokenAmount : rows[0].tokenAmount
                    }
                }

            }catch (err){
                connection.release();
                throw err; 
            }          
        }catch(err){
            throw err;
        }
    };

    // 상품 확인 => 상품고유번호(Product_id)
    const isProductAvailable = async (Event_Product_seq) => {
        try{
            const connection = await pool.getConnection(async conn => conn);
            try{
                const query = 'select Product_id from Event_Product where Event_Product.seq = ? and remain > 0';
                const params = [Event_Product_seq];
                const [rows] = await connection.query(query, params);
                connection.release();
                if(isEmpty(rows)){
                    throw new Error().msg = EventError.ProductNoAvailable;
                }else{
                    return rows[0].Product_id;
                }
            }catch (err){
                
                connection.release();
                throw err;   
            }          
        }catch(err){
            throw err;
        }
    }
    
    //해당 상품을 받은 적 있는지 확인 => true, false
    const hasAlready = async (Event_id, Product_id, email) => {
        try{
            const connection = await pool.getConnection(async conn => conn);
            try{
                const query = 'select * from Event_Log, (select seq as seq from Users where Users.email like ?) as UsersSeq where (Event_Log.Users_seq = UsersSeq.seq) and (Event_Log.Event_id = ?) and (Event_Log.Product_id = ?)';
                const params = [email, Event_id, Product_id];
                const [rows] = await connection.query(query, params);
                connection.release();
                if(isEmpty(rows)){
                    return true;
                }else{
                    throw new Error().msg = EventError.hasAlready;
                }
            }catch (err){
                connection.release();
                throw err;   
            }          
        }catch(err){
            throw err;
        }
    };

    //상품 수량 줄이기 => nothing
    const decreaseProductAmount = async (Event_Product_seq) => {
        try{
            const connection = await pool.getConnection(async conn => conn);
            try{
                const query = 'update Event_Product set remain = remain-1 where seq = ?';
                const params = [Event_Product_seq];
                await connection.query(query, params);
                connection.release();
  
            }catch (err){
                connection.release();
                throw new Error().msg = EventError.DBError;   
            }          
        }catch(err){
            throw err;
        }
    };

    //상품 종류 확인 => type
    const checkProductType = (Product_id) => {
        const type = parseInt(Product_id/10000);
        if(type === 1){
            //토큰
            return 1;
        } else {
            //경품
            return 2;
        }
        
    };

    //상품 이름, 수량 받아오기 => Product_name, Product_amount
    const getProductInfo = async(Product_id) => {
        try{
            const connection = await pool.getConnection(async conn => conn);
            try{
                const query = 'select prod.name as name, prod.amount as amount, description from (select name, amount,type from Product where id=?) as prod, Product_Type where prod.type=Product_Type.type';
                const params = [Product_id];
                const [rows] = await connection.query(query, params);
                connection.release();
                return {
                    Product_name : rows[0].name,
                    Product_amount : rows[0].amount,
                    Product_description : rows[0].description
                };
            }catch (err){
                connection.release();
                throw new Error().msg = EventError.DBError;   
            }          
        }catch(err){
            throw err;
        }
    };
    
    //사용자 토큰량 증가
    const increaseUserTokenAmount = async (Product_id, Users_seq) => {
        try{
            const connection = await pool.getConnection(async conn => conn);
            try{
                const query = 'update Users set tokenAmount = tokenAmount + (select amount from Product where id = ?) where seq = ?';
                const params = [Product_id, Users_seq];
                await connection.query(query, params);
                connection.release();
  
            }catch (err){
                connection.release();
                throw new Eerror().msg = EventError.DBError;   
            }          
        }catch(err){
            throw err;
        }
    };

    //이벤트 로그 갱신
    const updateEventLog = async (Users_seq, Event_id, Product_id) => {
        try{
            const connection = await pool.getConnection(async conn => conn);
            try{
                const query = 'insert into Event_Log(Users_seq, Event_id, Product_id, date) values (?,?,?,now())';
                const params = [Users_seq, Event_id, Product_id];
                await connection.query(query, params);
                connection.release();
  
            }catch (err){
                connection.release();
                throw new Error().msg = EventError.DBError;   
            }          
        }catch(err){
            throw err;
        }
    };

    //트레이드 로그 갱신 
    const updateTradeLog = async (Users_seq, Users_email, Event_name, Product_name, Product_amount, tokenAmount) => {
        try{
            const connection = await pool.getConnection(async conn => conn);
            try{
                const query = 'insert into Trade_Log(Users_seq, Users_email, Event_name, Product_name, Product_amount, tokenAmount, date, action) values (?,?,?,?,?,?,now(),3)';
                const params = [Users_seq, Users_email, Event_name, Product_name, Product_amount, tokenAmount];
                await connection.query(query, params);
                connection.release();
  
            }catch (err){
                connection.release();
                throw new Error().msg = EventError.DBError;   
            }          
        }catch(err){
            throw err;
        }    
    };
 
    try{
        // 상태 확인
        const Event_name = await isActivatedEvent(Event_id);
        const {Users_seq, tokenAmount} = await isUserParticipated(Event_id, email);
        const Product_id = await isProductAvailable(Event_Product_seq);
        await hasAlready(Event_id, Product_id, email);

        // 상태 갱신
        await decreaseProductAmount(Event_Product_seq);
        const {Product_name, Product_amount, Product_description} = await getProductInfo(Product_id);
        const type = await checkProductType(Product_id);
        let resultMessage = "";
        if(type===1){
            await increaseUserTokenAmount(Product_id, Users_seq);
            resultMessage = `${Product_name} ${Product_amount}`
        }else if(type===2){
            resultMessage = `${Product_name}`;
        }
        updateEventLog(Users_seq, Event_id, Product_id);
        updateTradeLog(Users_seq, email, Event_name, Product_name, Product_amount, tokenAmount+Product_amount );

        return res.status(200).json({
            'status': '1',
            'Product_name' : `${resultMessage}`,
            'description' : `${Product_description}` 
        });

    }catch(err){

        let returnMsg = {'status': '0', 'error':''};
        switch(err){
            case EventError.DBError:
                returnMsg.error = 'DB 오류입니다.';
                break;
            case EventError.EventNotActivate:
                returnMsg.error = '활성화되지 않은 이벤트입니다.';
                break;
            case EventError.UserNotFoundInEvent:
                returnMsg.error = '해당 이벤트에 참여하지 않은 사용자입니다.';
                break;
            case EventError.ProductNoAvailable:
                returnMsg.error = '등록된 상품이 아닙니다.';
                break;
            case EventError.hasAlready:
                returnMsg.error = '기존에 수령한 상품입니다.';
                break;
            default:
                return res.status(200).json({
                    'status' : '0',
                    'msg' : '알 수 없는 오류입니다.',
                });
        }
        return res.status(200).json(returnMsg);
    }
   

    /*
    async.parallel([
        asyncFunc1, 
        asyncFunc2, 
        ... , 
        asyncFuncN
    ],
    function(err, results){

    });
    */

}