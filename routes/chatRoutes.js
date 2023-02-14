const express = require('express')
const { accesschat, fetchallchats, creategroup, updategroup, addTogroup, removeFromgroup, addGroupAdmin, removeGroupAdmin, deleteChat } = require('../controllers/chatController')
const authorize = require('../middleware/authorization')

const router = express.Router()

router.route('/').post(authorize, accesschat)
router.route('/allchats').get(authorize, fetchallchats);
router.put('/deletechat', authorize, deleteChat)
router.route('/creategroup').post(authorize, creategroup)
router.route('/updategroup').put(authorize, updategroup)
router.route('/addgroupAdmin').post(authorize, addGroupAdmin)
router.route('/removegroupAdmin').post(authorize, removeGroupAdmin)
router.route('/groupadd').post(authorize, addTogroup)
router.route('/groupremove').post(authorize, removeFromgroup)


module.exports = router