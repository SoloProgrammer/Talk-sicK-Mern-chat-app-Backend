const Chat = require('../models/chatModel')
const Message = require('../models/messageModel')
const User = require('../models/userModel')
const { errorRespose, BadRespose } = require('../config/errorStatus');
const { fetchallchatsCommon } = require('../config/chatConfig')


const sendMessage = async (req, res) => {

    const { content, chatId } = req.body;

    if (!content || !chatId) return BadRespose(res, false, "Invalid data send with the request!");

    try {
        const newMessage = {
            content,
            sender: req.user._id,
            chat: chatId,
            seenBy: [req.user._id]
        }
        let message = await new Message(newMessage).save();

        await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id })

        // message = await Message.find({_id:message._id}).populate('sender','-password').populate('chat')

        message = await (await message.populate('sender', '-password')).populate('chat') // same as above commented line!

        const fullmessage = await User.populate(message, {
            path: "chat.users",
            select: "name avatar email phone about"
        })

        // needs to refresh the chats to show the updated chat by latestmessage at the top in the frontend!
        let chats = await fetchallchatsCommon(req)

        res.status(201).json({ status: true, message: "Message sent", fullmessage, chats })
    } catch (error) {
        errorRespose(res, false, error)
    }
}
const fetchallMessages = async (req, res) => {

    const chatId = req.params.chatId;

    if (!chatId) return BadRespose(res, false, "chatId param not send with the request!")

    try {

        let allMessages = await Message.find({
            chat: chatId
        }).populate('sender', '-password').populate('chat');

        res.status(200).json({ status: true, allMessages })

    } catch (error) {
        return errorRespose(res, false, error)
    }

}
const updateMessageSeenBy = async (req, res) => {
    try {

        const { msgId } = req.body;

        const updatedMsg = await Message.findByIdAndUpdate(msgId, { $addToSet: { seenBy: req.user._id } }, { new: true });

        if (!updatedMsg) return BadRespose(res, false, "Message unable to seen due to Network Error!")

        let chats = await fetchallchatsCommon(req) // refreshed chats will refresed the chats in the frontend to show that he seen the lastemsg !  

        res.status(200).json({ status: true, chats });

    } catch (error) {
        return errorRespose(res, flase, error)
    }

}

module.exports = { sendMessage, fetchallMessages, updateMessageSeenBy }