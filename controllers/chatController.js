const Chat = require('../models/chatModel')
const User = require('../models/userModel')
const Message = require('../models/messageModel')
const { errorRespose, BadRespose } = require('../config/errorStatus');
const { fetchallchatsCommon } = require('../config/chatConfig')

const Getfullchat = async (chatId) => {
    let chat = await Chat.find({ _id: chatId })
        .populate('users', '-password')
        .populate('groupAdmin', '-password')
        .populate('latestMessage');

    chat = await User.populate(chat, {
        path: 'latestMessage.sender',
        select: 'name email avatar phone'
    })

    if (chat.length < 1) return BadRespose(res, false, "Some error occured try again!")

    return chat;
}
const accesschat = async (req, res) => {
    const { userId } = req.body;
    if (!userId) return BadRespose(res, false, "UserId param not send with the request")

    try {
        let isChat = await Chat.find({
            isGroupchat: false,
            $and: [
                { users: { $elemMatch: { $eq: req.user._id } } },
                { users: { $elemMatch: { $eq: userId } } },
            ]
        }).select('-groupAvatar -groupAdmin').populate('users', '-password').populate('latestMessage')

        isChat = await User.populate(isChat, {
            path: 'latestMessage.sender',
            select: 'name email avatar phone'
        })

        isChat.length && await Chat.findByIdAndUpdate(isChat[0]._id, { $pull: { deletedFor: req.user._id } })

        let status = true

        if (isChat.length < 1) {
            let newChat = {
                chatName: 'personalChat',
                users: [req.user.id, userId],
                isGroupchat: false,
                createdBy:req.user._id
            }
            try {
                let createdChat = await Chat.create(newChat);

                let fullCreatedChat = await Getfullchat(createdChat._id);

                let chats = await fetchallchatsCommon(req);

                res.status(201).json({ status, message: "Chat has been created Successfully", chat: fullCreatedChat[0], chats })
            } catch (error) {
                return errorRespose(res, false, error)
            }
        }
        else {
            let chats = await fetchallchatsCommon(req);
            res.status(201).json({ status, message: "Chat has been created Successfully", chat: isChat[0], chats })
        }
    } catch (error) {
        return errorRespose(res, false, error)
    }
}
const deleteChat = async (req, res) => {
    try {
        let { chatId } = req.body;

        if (!chatId) return BadRespose(res, false, "ChatId not send with the request!");

        let chat = await Chat.findById(chatId);

        if (!chat) return BadRespose(res, false, "Chat with this ChatId not found..!");

        if (chat.deletedFor.length > 0) {

            await Chat.deleteOne({ _id: chatId });
            await Message.deleteMany({ chat: chatId });
            return res.status(200).json({ status: true, message: "Chat deleted" });
        }

        let deletedChat = await Chat.findByIdAndUpdate(chatId, { $push: { deletedFor: req.user._id } }, { new: true });

        if (!deletedChat) return BadRespose(res, false, "Failed to delete chat!");

        return res.status(200).json({ status: true, message: "Chat deleted" })
    } catch (error) {
        return errorRespose(res, false, error.message)
    }
}
const fetchallchats = async (req, res) => {
    let status = false
    try {

        let chats = await fetchallchatsCommon(req)

        res.status(200).json({ status: true, chats })
    } catch (error) {
        return errorRespose(res, status, { message: "Failed to load chats,Network unstable!" })
    }
}
const creategroup = async (req, res) => {

    const { groupName, users, groupAvatar } = req.body;
    let status = false;

    if (users.length < 2) return BadRespose(res, status, "More than 2 people's are required to form a group")

    let groupdata = {
        chatName: groupName,
        users: [req.user.id, ...users],
        isGroupchat: true,
        groupAdmin: [req.user.id]
    }

    if (groupAvatar) groupdata.groupAvatar = groupAvatar


    try {
        let newGroup = await Chat.create(groupdata)

        let Fullgroup = await Chat.find({ _id: newGroup.id })
            .populate('users', '-password')
            .populate('latestMessage')
            .populate('groupAdmin', '-password')

        Fullgroup = await User.populate(Fullgroup, {
            path: 'latestMessage.sender',
            select: 'name email avatar phone'
        })
        if (Fullgroup.length < 1) {
            return BadRespose(res, status, "Failed to create group try again later")
        }
        let chats = await fetchallchatsCommon(req)

        return res.status(201).json({ status: true, message: "New Group created sucessfully", Fullgroup: Fullgroup[0], chats })
    } catch (error) {
        return errorRespose(res, status, error)
    }
}
const updategroup = async (req, res) => {
    if (!req.body) return BadRespose(res, false, "reqBody not send with the request..!");

    let { chatId, detailsToUpdate } = req.body;

    if (!chatId) return BadRespose(res, false, "chatId not send with the request..!");

    try {
        let updatedGroup = await Chat.findByIdAndUpdate(chatId, { $set: detailsToUpdate }, { new: true });

        if (!updatedGroup) return BadRespose(res, false, "unable to update profile, Network Error..!");

        let chats = await fetchallchatsCommon(req)

        res.status(200).json({ status: true, chats, message: "Group Profile Updated Sucessfully 🎉" })

    } catch (error) {
        return errorRespose(res, false, error)
    }
}
const addGroupAdmin = async (req, res) => {
    try {
        let { userId, chatId } = req.body;
        if (!userId || !chatId) return BadRespose(res, false, "userId or chatId may not send with the request body!")

        let updated = await Chat.findByIdAndUpdate(chatId, { $addToSet: { groupAdmin: userId } })

        if (!updated) return BadRespose(res, false, "Some error occured try again later!")

        let chat = await Getfullchat(chatId)

        let chats = await fetchallchatsCommon(req)

        return res.status(200).json({ status: true, message: "Member updated as a GroupAdmin!", chat: chat[0], chats })
    } catch (error) {
        return errorRespose(res, false, error)
    }
}
const removeGroupAdmin = async (req, res) => {
    try {
        let { userId, chatId } = req.body;
        if (!userId || !chatId) return BadRespose(res, false, "userId or chatId may not send with the request body!")

        let updated = await Chat.findByIdAndUpdate(chatId, { $pull: { groupAdmin: userId } })
        if (!updated) return BadRespose(res, false, "Some error occured try again later!")

        let chat = await Getfullchat(chatId)

        let chats = await fetchallchatsCommon(req)

        return res.status(200).json({ status: true, message: "Member removed from GroupAdmin!", chat: chat[0], chats })

    } catch (error) {
        return errorRespose(res, false, error)
    }
}
const addTogroup = async (req, res) => {
    const { users, chatId } = req.body;
    let status = false

    if (!users) return BadRespose(res, status, "users list are not send with the body of the request")

    if (!chatId) return BadRespose(res, status, "chatId is not send with the body of the request")

    if (users.length < 1) return BadRespose(res, status, "Please select atleast one user to add into the Group")

    try {
        let updatedChat = await Chat.findByIdAndUpdate(chatId, { $addToSet: { users: [...users] } }, { new: true })

        if (!updatedChat) return errorRespose(res, false, { message: "Failed to add users into group" })

        let chat = await Getfullchat(chatId)

        let chats = await fetchallchatsCommon(req)

        return res.status(200).json({ status: true, message: users.length > 1 ? "New members added to Group" : "New member added to Group", chat: chat[0], chats })

    } catch (error) {
        return errorRespose(res, status, error)
    }

}
const removeFromgroup = async (req, res) => {
    const { chatId, userId } = req.body
    let status = false

    if (!chatId || !userId) return BadRespose(res, status, "userId or chatId not send with the request body")

    try {
        let updatedChat = await Chat.findByIdAndUpdate(chatId, { $pull: { users: userId, groupAdmin: userId } }, { new: true });

        if (!updatedChat) return errorRespose(res, false, { message: "Failed to add users into group" })

        let chat = await Getfullchat(chatId)

        let chats = await fetchallchatsCommon(req)

        return res.status(200).json({ status: true, message: "Member removed from group sucessfully", chat: chat[0], chats })
    } catch (error) {
        return errorRespose(res, status, error)
    }
}

module.exports = { accesschat, deleteChat, fetchallchats, creategroup, updategroup, addTogroup, removeFromgroup, addGroupAdmin, removeGroupAdmin } 