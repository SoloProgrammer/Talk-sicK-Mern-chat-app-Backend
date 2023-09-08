const express = require('express')
const {
    sendMessage,
    fetchallMessages,
    updateMessageSeenBy,
    getUnseenmessageCountTesting,
    deleteMessages,
    deleteMessage,
    reactMessage } = require('../controllers/messageController')
    
const router = express.Router()
const authorize = require('../middleware/authorization')


router.post("/sendmessage", authorize, sendMessage)
router.get("/fetchmessages/:chatId/", authorize, fetchallMessages)
router.post("/seenMessage", authorize, updateMessageSeenBy)
router.put("/:id/delete", authorize, deleteMessage)
router.put("/:id/react", authorize, reactMessage)

router.post("/delete/messages/:chatId/:msgType", authorize, deleteMessages)
router.get("/getUnseenmessageCount", authorize, getUnseenmessageCountTesting)


module.exports = router