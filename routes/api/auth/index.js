const router = require('express').Router();
const signupController = require('./signup.controller');
const loginController = require('./login.controller');
const eventContorller = require('./event.controller');
const walletController = require('./wallet.controller');

router.post('/signup', signupController.signup);
router.post('/login', loginController.login);
router.post('/event', eventContorller.processQRCodeForEvent);
router.post('/wallet', walletController.walletInfo);

//이메일 인증 부분
router.post('/resendAuthMail', signupController.resendAuthEmail);
router.post('/checkAuthMail',signupController.checkAuthEmail);

module.exports = router;