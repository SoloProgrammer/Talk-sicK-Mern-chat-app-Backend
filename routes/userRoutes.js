const express = require('express');
const { createUser, authUser, searchuser, getUser } = require('../controllers/userController');
const authorize = require('../middleware/authorization');

const router = express.Router();

router.post('/login', authUser)
router.post('/createuser', createUser)
router.get('/searchuser', authorize, searchuser)
router.get('/getuser',authorize,getUser)

module.exports = router;