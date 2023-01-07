const Chat = require('../models/chatModel')
const Message = require('../models/messageModel')
const User = require('../models/userModel')
const { errorRespose, BadRespose } = require('../config/errorStatus')

const accesschat = async (req, res) => {
    const { userId } = req.body;
    if (!userId) return errorRespose(res, false, { message: "UserId param not send with the request" })

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
        let chats = await Chat.find(
            {
                users: { $elemMatch: { $eq: req.user.id } }
            })
            .populate('users', '-password')
            .populate('latestMessage')
            .populate('groupAdmin')
            .sort({ createdAt: -1 })

        chats = await User.populate(chats, {
            path: "latestMessage.sender",
            select: "name avatar email phone"
        })

        res.status(200).json({ status: true, chats })
    } catch (error) {
        return errorRespose(res, status, error)
    }
}
const creategroup = async (req, res) => {

    const { groupname, users } = req.body;
    let status = false;

    if (users.length < 2) return BadRespose(res, status, "More than 2 people are required to form a group")

    groupdata = {
        chatName: groupname,
        users: [...users, req.user.id],
        isGroupchat: true,
        groupAdmin: req.user.id
    }

    try {
        let newGroup = await Chat.create(groupdata)

        let Fullgroup = await Chat.find({ _id: newGroup.id })
            .populate('users', '-password')
            .populate('latestMessage')
            .populate('groupAdmin')

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
const renamegroup = async (req, res) => {
    const { chatId, groupname } = req.body
    let status = false
    if (!chatId) return res.status(400).json({ status, message: "ChatId params is not send with the request body" })
    if (!groupname) return res.status(400).json({ status, message: "Please provide the Groupname to update" })

    let chatWithUpdatedGroupname = await Chat.findByIdAndUpdate(chatId, { chatName: groupname }, { new: true })

    // let Fullgroup = await Chat.find({ _id: chatWithUpdatedGroupname.id })
    //     .populate('users', '-password')
    //     .populate('latestMessage')
    //     .populate('groupAdmin')

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

        if (!updatedChat) errorRespose(res, false, { message: "Failed to add users into group" })

        return res.status(200).json({ status: true, message: "User added to Group", updatedChat })

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

        return res.status(204).json({ status: true, message: "User remove from the group sucessfully", updatedChat })
    } catch (error) {
        return errorRespose(res, status, error)
    }
}

module.exports = { accesschat, fetchallchats, creategroup, renamegroup, addTogroup, removeFromgroup }