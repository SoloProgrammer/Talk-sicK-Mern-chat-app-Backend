const Chat = require('../models/chatModel')
const Message = require('../models/messageModel')
const User = require('../models/userModel')
const { errorRespose, BadRespose } = require('../config/errorStatus');
const { fetchallchatsWithPopulatedFields } = require('../config/chatConfig');
const { default: mongoose } = require('mongoose');
const { cloudinaryDeleteImg } = require('../helpers/Cloudinary');

const prepareNewMessageObj = (content, sender, chat, seenBy, msgType) => {
    return { content, sender, chat, seenBy, msgType }
}
const getFullmessageById = async (msgId) => {
    let msg = await Message.findById(msgId).populate('sender', '-password').populate('chat')

    msg = await User.populate(msg, {
        path: 'reactions.user',
        select: '-password'
    })
    return msg
}

const saveMessage = async (req, msgPayload) => {
    const { content, chatId, receiverIds, msgType } = msgPayload

    const newMessage = prepareNewMessageObj(content, req.user._id, chatId, [req.user._id], msgType)

    let message = await new Message(newMessage).save();

    let chat = await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id, $set: { deletedFor: [] } });

    let unseenMsgCountObj = {}

    function isUserRemovedFromChat(chat, uId) {
        return chat?.leftFromGroup?.map(obj => String(obj.user)).includes(String(uId))
    }

    if (!chat.unseenMsgsCountBy) {

        receiverIds.forEach((id) => {
            unseenMsgCountObj[id] = 1
        })
        unseenMsgCountObj[req.user._id] = 0

    }
    else {

        unseenMsgCountObj = chat.unseenMsgsCountBy;

        Object.keys(unseenMsgCountObj).forEach(uId => { // k key := userId as the key!

            if (uId !== String(req.user._id)) {
                if (!isUserRemovedFromChat(chat, uId)) unseenMsgCountObj[uId] += 1
            }
            else {
                unseenMsgCountObj[uId] = 0
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

    chat = await Chat.findByIdAndUpdate(chatId, { totalMessages: (fullmessage.chat.totalMessages || 0) + 1 }, { new: true })

    fullmessage.chat.totalMessages = chat.totalMessages

    let allMessages = await Message.find({
        chat: chatId,
        msgType: { $ne: 'reaction' }
    }).populate('sender', '-password').populate('chat').populate('reactions.user');

    return { allMessages, fullmessage, chat }
}

const sendMessage = async (req, res) => {

    const { content, chatId, receiverIds } = req.body;

    if (!content || !chatId || !receiverIds) return BadRespose(res, false, "Invalid data send with the request!");

    try {

        const { fullmessage, allMessages } = await saveMessage(req, { ...req.body })

        // needs to refresh the chats to show the updated chat by latestmessage at the top in the frontend!
        let chats = await fetchallchatsWithPopulatedFields(req)
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

        const allMessages = await Message.find({ chat: chatId, msgType: { $ne: 'reaction' } })
            .skip(skip).limit(limit)
            .populate('sender', '-password')
            .populate('chat')
            .populate('reactions.user')

        res.status(200).json({ status: true, allMessages })

    } catch (error) {
        return errorRespose(res, false, { message: "Failed to load messages, Network unstable!" })
    }

}
const updateMessageSeenBy = async (req, res) => {
    try {

        const { chatId } = req.body;

        const updatedMsg = await Message.updateMany({ chat: chatId }, { $addToSet: { seenBy: req.user._id } }, { new: true });

        // unseenMsgsCountKeyToUpdate - user id of that unseenmsgscountBy object..!s
        let unseenMsgsCountKeyToUpdate = `unseenMsgsCountBy.${req.user._id}` // key - property of the user which seen all the messages 

        await Chat.updateOne({ _id: chatId }, { $set: { [unseenMsgsCountKeyToUpdate]: 0 } }, { multi: true }) // updating unseen count of the user who seen all the messages or click the chat to view all the messages so we can update all the messages as he view all of them by clicking on that particular chat once

        if (!updatedMsg) return BadRespose(res, false, "Message unable to seen due to Network Error!")

        let chats = await fetchallchatsWithPopulatedFields(req) // this newly updated chats will refreshed the chats in the frontend to show that he seen the laststmsg ! 

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

        // if deleted message has img as a content then del the image from the cloud as well...
        if (msg.content.img && req.query.for === 'everyone') {
            let imageSplit = msg.content.img.split('/')
            let fileName = imageSplit[imageSplit.length - 1].split('.')[0]
            try {
                cloudinaryDeleteImg(fileName)
            } catch (error) {
                console.log("Error while deleting image from cloud -", error.message)
            }
        }

    } catch (error) {
        return errorRespose(res, false, error)
    }
}
const deleteReactionMessages = async (chatId) => {
    try {
        await Message.deleteMany({ chat: chatId, msgType: 'reaction' })
    } catch (error) {
        console.log("Error while deletingAllReactMessages - ", error.message);
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

        let lastMsg, msgs, lastRegMsg;
        msgs = await Message.find({ chat: msg.chat })
        lastMsg = msgs[msgs.length - 1]

        lastRegMsg = msgs.filter(m => m.msgType !== 'reaction')
        lastRegMsg = lastRegMsg[lastRegMsg.length - 1]

        function isUserReactionMessage(msg) {
            return msg.msgType === 'reaction' && String(msg.sender) === String(req.user._id)
        }
        function isSameReaction(msg) {
            return msg.reactions.filter(rec => String(rec.user) === String(req.user._id))[0].reaction === reaction
        }
        // Deleting all the reaction message before adding new ones this is because as we are only showing the last reacted message as the latestmessage of the chat---

        if ((msg.reactions.map(rec => String(rec.user)).includes(String(req.user._id))
            &&
            isSameReaction(msg))) {

            msg = await Message.findByIdAndUpdate(id, { $pull: { reactions: { user: req.user._id } } }, { new: true })

            if (lastMsg.msgType === 'reaction' && String(lastMsg.content.reactedToMsg) === String(msg._id) && isUserReactionMessage(lastMsg)) {
                await deleteReactionMessages(msg.chat)
                // Here we are removing the reaction so we also have to remove reaction message as the latestmessage of the chat and put the very last message as the latestmessage---
                msgs = await Message.find({ chat: msg.chat })
                lastMsg = msgs[msgs.length - 1]
                await Chat.updateOne({ _id: lastMsg.chat }, { latestMessage: lastMsg._id })
            }

        }
        else {
            deleteReactionMessages(msg.chat)
            await Message.updateOne({ _id: id }, { $pull: { reactions: { user: req.user._id } } })
            msg = await Message.findByIdAndUpdate(id, { $push: { reactions: newReaction } }, { new: true })

            // Below code is to create newMessage that show (reaction to message) for eg- (reacted 🤣 to xyz..message) and update the latestmessage with this newly created reaction message----

            // Preparing new reaction message to save as latestMessage of the chat...
            let content = {};
            if (msg?.content?.message) {
                content.message = `Reacted ${reaction} to ${msg.content.message}`
            }
            else if (msg?.content.img) {
                content.message = `Reacted ${reaction} to image`
            }
            content.reactedToMsg = msg._id;
            content.lastregularMsg = lastRegMsg._id

            const newMessage = prepareNewMessageObj(content, req.user._id, msg.chat, [req.user._id], 'reaction')
            let newMsg = await new Message(newMessage).save()

            await Chat.updateOne({ _id: newMsg.chat }, { latestMessage: newMsg._id })
        }

        msg = await getFullmessageById(id)

        res.json({ status: true, msg })

    } catch (error) {
        console.log(error);
        errorRespose(res, false, error)
    }
}

// The below three controllers are for testing purpose...!

const deleteMessages = async (req, res) => {
    const { chatId, msgType } = req.params;
    try {
        let updatedData;
        if (msgType) {
            updatedData = await Message.deleteMany({ chat: mongoose.Types.ObjectId(chatId), msgType }, { new: true })
        }
        else {
            updatedData = await Message.deleteMany({ chat: chatId }, { new: true })
        }
        res.json({ status: true, msg: "Mesages deleted sucessfully", updatedData })
    } catch (error) {
        return errorRespose(res, false, error)
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
const getMessagesCount = async (req, res) => {
    try {
        const count = await Message.find({ chat: req.params.chatId, $or: [{ msgType: "info" }, { msgType: "regular" }] }).count()
        res.json({ count })
    } catch (error) {
        errorRespose(res, false, error)
    }
}

module.exports = {
    sendMessage,
    prepareNewMessageObj,
    saveMessage,
    fetchallMessages,
    updateMessageSeenBy,
    deleteMessage,
    reactMessage,
    deleteMessages,
    getMessagesCount,
    getUnseenmessageCountTesting,
}