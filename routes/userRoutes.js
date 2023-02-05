const express = require('express');
const { createUser, authUser, searchUser, getUser, updateUser } = require('../controllers/userController');
const authorize = require('../middleware/authorization');

const router = express.Router();

router.post('/login', authUser)
router.post('/createuser', createUser)
router.put('/updateuser', authorize, updateUser);
router.get('/searchuser', authorize, searchUser)
router.get('/getuser', authorize, getUser)

module.exports = router;