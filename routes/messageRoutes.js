const express = require('express')
const { sendMessage, fetchallMessages } = require('../controllers/messageController')
const router = express.Router()
const authorize = require('../middleware/authorization')


router.post("/sendmessage", authorize, sendMessage)
router.get("/fetchmessages/:chatId", authorize, fetchallMessages)


module.exports = router