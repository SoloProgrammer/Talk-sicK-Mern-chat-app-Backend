const express = require('express') 
const { accesschat, fetchallchats, creategroup, renamegroup, addTogroup, removeFromgroup } = require('../controllers/chatController')
const authorize = require('../middleware/authorization')

const router = express.Router()

router.route('/').post(authorize, accesschat)
router.route('/allchats').get(authorize, fetchallchats)
router.route('/creategroup').post(authorize, creategroup)
router.route('/renamegroup').post(authorize, renamegroup)
router.route('/groupadd').post(authorize, addTogroup)
router.route('/groupremove').post(authorize, removeFromgroup)


module.exports = router