const Chat = require('../models/chatModel')
const Message = require('../models/messageModel')
const User = require('../models/userModel')
const { errorRespose, BadRespose } = require('../config/errorStatus');


const fetchallchatsCommon = async (req) => {
    let chats = await Chat.find(
        {
            users: { $elemMatch: { $eq: req.user.id } }
        })
        .populate('users', '-password')
        .populate('latestMessage')
        .populate('groupAdmin', '-password')
        .sort({ createdAt: -1 })

    chats = await User.populate(chats, {
        path: "latestMessage.sender",
        select: "name avatar email phone"
    })

    if (!chats) return BadRespose(res, false, "Some Error occured please try again later")
    return chats
}
const accesschat = async (req, res) => {
    const { userId } = req.body;
    if (!userId) return BadRespose(res, false, "UserId param not send with the request")

    try {
        let isChat = await Chat.find({
            isGroupchat: false,
            $and: [
                { users: { $elemMatch: { $eq: req.user.id } } },
                { users: { $elemMatch: { $eq: userId } } }
            ]
        }).populate('users', '-password').populate('latestMessage')

        isChat = await User.populate(isChat, {
            path: 'latestMessage.sender',
            select: 'name email avatar phone'
        })

        let status = true
        if (isChat.length < 1) {
            let newChat = {
                chatName: 'personalChat',
                users: [req.user.id, userId],
                isGroupchat: false
            }
            try {
                let createdChat = await Chat.create(newChat);
                res.status(201).json({ status, message: "Chat has been created Successfully", createdChat })
            } catch (error) {
                return errorRespose(res, false, error)
            }
        }
        else {
            res.status(201).json({ status, isChat })
        }
    } catch (error) {
        return errorRespose(res, false, error)
    }
}
const fetchallchats = async (req, res) => {
    let status = false
    try {

        let chats = await fetchallchatsCommon(req)

        res.status(200).json({ status: true, chats })
    } catch (error) {
        return errorRespose(res, status, error)
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

        return res.status(201).json({ status: true, message: "New Group created sucessfully", Fullgroup: Fullgroup[0] })
    } catch (error) {
        return errorRespose(res, status, error)
    }
}
const addGroupAdmin = async (req, res) => {
    try {
        let { userId, chatId } = req.body;
        if (!userId || !chatId) return BadRespose(res, false, "userId or chatId may not send with the request body!")

        let updated = await Chat.findByIdAndUpdate(chatId, { $addToSet: { groupAdmin: userId } })

        if (!updated) return BadRespose(res, false, "Some error occured try again later!")

        let chat = await Chat.find({ _id: chatId })
            .populate('users', '-password')
            .populate('groupAdmin', '-password')
            .populate('latestMessage');

        if (chat.length < 1) return BadRespose(res, false, "Some error occured try again!")

        let chats = await fetchallchatsCommon(req)

        return res.status(200).json({ status: true, message: "User updated as a GroupAdmin!", chat: chat[0], chats })
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

        let chat = await Chat.find({ _id: chatId })
            .populate('users', '-password')
            .populate('groupAdmin', '-password')
            .populate('latestMessage');

        if (chat.length < 1) return BadRespose(res, false, "Some error occured try again!")

        let chats = await fetchallchatsCommon(req)

        return res.status(200).json({ status: true, message: "User has removed from GroupAdmin!", chat: chat[0], chats })

    } catch (error) {
        return errorRespose(res, false, error)
    }
}
const renamegroup = async (req, res) => {
    const { chatId, groupname } = req.body
    let status = false
    if (!chatId || chatId == "") return res.status(400).json({ status, message: "ChatId params is not send with the request body" })
    if (!groupname) return res.status(400).json({ status, message: "Please provide the Groupname to update" })

    let chatWithUpdatedGroupname = await Chat.findByIdAndUpdate(chatId, { chatName: groupname }, { new: true })

    // let Fullgroup = await Chat.find({ _id: chatWithUpdatedGroupname.id })
    //     .populate('users', '-password')
    //     .populate('latestMessage')
    //     .populate('groupAdmin','-password')

    // Fullgroup = await User.populate(Fullgroup, {
    //     path: 'latestMessage.sender',
    //     select: 'name email avatar phone'
    // })

    res.status(200).json({ status: true, message: "Groupname updated successfully", chatWithUpdatedGroupname })

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

        let chat = await Chat.find({ _id: chatId })
            .populate('users', '-password')
            .populate('groupAdmin', '-password')
            .populate('latestMessage');

        if (chat.length < 1) return BadRespose(res, false, "Some error occured try again!")

        let chats = await fetchallchatsCommon(req)

        return res.status(200).json({ status: true, message: "User added to Group", chat:chat[0], chats })

    } catch (error) {
        return errorRespose(res, status, error)
    }

}
const removeFromgroup = async (req, res) => {
    const { chatId, userId } = req.body
    let status = false
    if (!chatId || !userId) return BadRespose(res, status, "userId or chatId not send with the request body")

    try {
        let updatedChat = await Chat.findByIdAndUpdate(chatId, { $pull: { users: userId } }, { new: true });

        if (!updatedChat) return errorRespose(res, false, { message: "Failed to add users into group" })

        return res.status(200).json({ status: true, message: "User remove from the group sucessfully", updatedChat })
    } catch (error) {
        return errorRespose(res, status, error)
    }
}

module.exports = { accesschat, fetchallchats, creategroup, renamegroup, addTogroup, removeFromgroup, addGroupAdmin, removeGroupAdmin } 