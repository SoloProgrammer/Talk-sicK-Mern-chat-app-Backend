const express = require('express')
const { sendMessage, fetchallMessages, updateMessageSeenBy, getUnseenmessageCountTesting } = require('../controllers/messageController')
const router = express.Router()
const authorize = require('../middleware/authorization')


router.post("/sendmessage", authorize, sendMessage)
router.get("/fetchmessages/:chatId", authorize, fetchallMessages)
router.post("/seenMessage", authorize, updateMessageSeenBy)
router.get("/getUnseenmessageCount",authorize,getUnseenmessageCountTesting)


module.exports = router