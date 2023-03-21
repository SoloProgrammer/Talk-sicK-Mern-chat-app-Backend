const Chat = require('../models/chatModel')
const Message = require('../models/messageModel')
const User = require('../models/userModel')
const { errorRespose, BadRespose } = require('../config/errorStatus');
const { fetchallchatsCommon } = require('../config/chatConfig')

const sendMessage = async (req, res) => {

    const { content, chatId, receiverIds } = req.body;

    if (!content || !chatId || !receiverIds) return BadRespose(res, false, "Invalid data send with the request!");

    try {
        const newMessage = {
            content,
            sender: req.user._id,
            chat: chatId,
            seenBy: [req.user._id]
        }
        let message = await new Message(newMessage).save();

        let chat = await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id, $set: { deletedFor: [] } });

        let unseenMsgCountObj = {}

        if (!chat.unseenMsgsCountBy) {

            receiverIds.forEach((id) => {
                unseenMsgCountObj[id] = 1
            })
            unseenMsgCountObj[req.user._id] = 0

        }
        else {

            unseenMsgCountObj = chat.unseenMsgsCountBy;

            Object.keys(unseenMsgCountObj).forEach(k => {

                if (k !== String(req.user._id)) {
                    unseenMsgCountObj[k] = unseenMsgCountObj[k] + 1
                }
                else {
                    unseenMsgCountObj[k] = 0
                }
            })
        }

        await Chat.findByIdAndUpdate(chatId, { unseenMsgsCountBy: unseenMsgCountObj })

        // message = await Message.find({_id:message._id}).populate('sender','-password').populate('chat')

        message = await (await message.populate('sender', '-password')).populate('chat') // same as above commented line!

        const fullmessage = await User.populate(message, {
            path: "chat.users",
            select: "name avatar email phone about"
        });

        let allMessages = await Message.find({
            chat: chatId
        }).populate('sender', '-password').populate('chat');

        // updating total messages inthe chat model of id chatId..................
        let totalmessages = (await Message.find({ chat: chatId })).length;

        await Chat.findByIdAndUpdate(chatId, { totalMessages: totalmessages })

        // needs to refresh the chats to show the updated chat by latestmessage at the top in the frontend!
        let chats = await fetchallchatsCommon(req)

        res.status(201).json({ status: true, message: "Message sent", fullmessage, allMessages, chats })

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
        return errorRespose(res, false, { message: "Failed to load chats,Network unstable!" })
    }

}
const updateMessageSeenBy = async (req, res) => {
    try {

        const { chatId } = req.body;

        // console.log(chatId);

        const updatedMsg = await Message.updateMany({ chat: chatId }, { $addToSet: { seenBy: req.user._id } }, { new: true });

        // unseenMsgsCountKeyToUpdate - user id of that unseenmsgscountBy object..!s
        let unseenMsgsCountKeyToUpdate = `unseenMsgsCountBy.${req.user._id}` // key property of the user which seen all the messages 

        let updateStatus = await Chat.updateOne({ _id: chatId }, { $set: { [unseenMsgsCountKeyToUpdate]: 0 } }, { multi: true }) // updating unseen count of the user who seen all the messages or click the chat to view all the messages so we can update all the messages as he view all of them by clicking on that particular chat once

        console.log(updateStatus, "..");

        if (!updatedMsg) return BadRespose(res, false, "Message unable to seen due to Network Error!")

        let chats = await fetchallchatsCommon(req) // this newly updated chats will refreshed the chats in the frontend to show that he seen the laststmsg ! 

        let messages = await Message.find({
            chat: chatId
        }).populate('sender', '-password').populate('chat');

        res.status(200).json({ status: true, chats, messages });

    } catch (error) {
        return errorRespose(res, false, error)
    }

}


// This route is for testing purpose...!
const getUnseenmessageCountTesting = async (req, res) => {
    const { chatId } = req.body;
    const data = await Message.find({
        chat: chatId,
        $and: [
            { sender: { $ne: req.user._id } },
            { seenBy: { $nin: [req.user._id] } },
        ]
    }
    ).count();

    res.status(200).json({ unSeenMessages: data })
}

module.exports = { sendMessage, fetchallMessages, updateMessageSeenBy, getUnseenmessageCountTesting }