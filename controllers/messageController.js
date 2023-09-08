const Chat = require('../models/chatModel')
const Message = require('../models/messageModel')
const User = require('../models/userModel')
const { errorRespose, BadRespose } = require('../config/errorStatus');
const { fetchallchatsCommon } = require('../config/chatConfig')

const sendMessage = async (req, res) => {

    const { content, chatId, receiverIds, msgType } = req.body;

    if (!content || !chatId || !receiverIds) return BadRespose(res, false, "Invalid data send with the request!");

    try {
        const newMessage = {
            content,
            sender: req.user._id,
            chat: chatId,
            seenBy: [req.user._id],
            msgType
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

            Object.keys(unseenMsgCountObj).forEach(k => { // k key := userId as the key!

                if (k !== String(req.user._id)) {
                    unseenMsgCountObj[k] += 1
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
        }).populate('sender', '-password').populate('chat').populate('reactions.user');

        // updating total messages inthe chat model of id chatId..................
        let totalmessages = allMessages.length;

        await Chat.findByIdAndUpdate(chatId, { totalMessages: totalmessages })

        // needs to refresh the chats to show the updated chat by latestmessage at the top in the frontend!
        let chats = await fetchallchatsCommon(req)

        res.status(201).json({ status: true, message: "Message sent", fullmessage, allMessages, chats })

    } catch (error) {
        errorRespose(res, false, error)
    }
}
const fetchallMessages = async (req, res) => {

    const { chatId } = req.params;
    const { skip, limit } = req.query

    if (!chatId) return BadRespose(res, false, "chatId param not send with the request!")

    try {

        const allMessages = await Message.find({ chat: chatId })
            .skip(skip).limit(limit)
            .populate('sender', '-password')
            .populate('chat')
            .populate('reactions.user')

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
        let unseenMsgsCountKeyToUpdate = `unseenMsgsCountBy.${req.user._id}` // key - property of the user which seen all the messages 

        let updateStatus = await Chat.updateOne({ _id: chatId }, { $set: { [unseenMsgsCountKeyToUpdate]: 0 } }, { multi: true }) // updating unseen count of the user who seen all the messages or click the chat to view all the messages so we can update all the messages as he view all of them by clicking on that particular chat once

        console.log(updateStatus, "..");

        if (!updatedMsg) return BadRespose(res, false, "Message unable to seen due to Network Error!")

        let chats = await fetchallchatsCommon(req) // this newly updated chats will refreshed the chats in the frontend to show that he seen the laststmsg ! 

        let messages = await Message.find({
            chat: chatId
        }).populate('sender', '-password').populate('chat').populate('reactions.user');

        res.status(200).json({ status: true, chats, messages });

    } catch (error) {
        return errorRespose(res, false, error)
    }

}
const deleteMessage = async (req, res) => {
    try {
        let deletedObj = {
            value: true,
            for: req.query.for
        }
        let msg = await Message.updateOne({ _id: req.params.id }, { $set: { deleted: deletedObj } }, { new: true })

        msg = await Message.findById(req.params.id).populate('sender', '-password').populate('chat')

        msg = await User.populate(msg, {
            path: 'reactions.user',
            select: '-password'
        })

        res.json({ msg })

    } catch (error) {
        return errorRespose(res, false, error)
    }
}
const reactMessage = async (req, res) => {
    try {
        let { id } = req.params
        let { reaction } = req.query

        let msg = await Message.findById(id)

        const newReaction = {
            user: req.user._id,
            reaction
        }
        if ((msg.reactions.map(rec => String(rec.user)).includes(String(req.user._id))
            &&
            msg.reactions.filter(rec => String(rec.user) === String(req.user._id))[0].reaction === reaction)) {
            msg = await Message.findByIdAndUpdate(id, { $pull: { reactions: { user: req.user._id } } }, { new: true })
        }
        else {
            await Message.updateOne({ _id: id }, { $pull: { reactions: { user: req.user._id } } })
            msg = await Message.findByIdAndUpdate(id, { $push: { reactions: newReaction } }, { new: true })
        }

        msg = await Message.findById(req.params.id).populate('sender', '-password').populate('chat')

        msg = await User.populate(msg, {
            path: 'reactions.user',
            select: '-password'
        })

        res.json({ status: true, msg, reacted_user: req.user._id })

    } catch (error) {
        errorRespose(res, false, error)
    }
}


// The below two controllers are for testing purpose...!

const deleteMessages = async (req, res) => {
    const { chatId, msgType } = req.params;
    try {
        let updatedData;
        if (msgType) {
            updatedData = await Message.deleteMany({ chat: chatId, msgType }, { new: true })
        }
        else {
            updatedData = await Message.deleteMany({ chat: chatId }, { new: true })
        }
        res.json({ status: true, msg: "Mesages deleted sucessfully", updatedData })
    } catch (error) {

    }
}
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

module.exports = {
    sendMessage,
    fetchallMessages,
    updateMessageSeenBy,
    deleteMessage,
    reactMessage,
    deleteMessages,
    getUnseenmessageCountTesting
}