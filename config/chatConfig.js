const Chat = require('../models/chatModel')
const User = require('../models/userModel')
const Message = require('../models/messageModel')
const { BadRespose, errorRespose } = require('./errorStatus')

const fetchallchatsWithPopulatedFields = async (req) => {
    try {
        let chats = await Chat.find(
            {
                users: { $elemMatch: { $eq: req.user._id } },
                $and: [
                    {
                        $or: [
                            { deletedFor: { $nin: [req.user._id] } },
                            // we can use this expression also works same as above ------ { deletedFor: { $elemMatch: { $ne: req.user._id } } },
                            { deletedFor: { $in: [null, []] } }
                        ]
                    },
                    {
                        $or: [
                            { latestMessage: { $exists: true } },
                            { createdBy: { $elemMatch: { $eq: req.user._id } } }
                        ]
                    }
                ]
            })
            .populate('users', '-password')
            .populate('latestMessage')
            .populate('groupAdmin', '-password')
            .sort({ updatedAt: -1 })

        chats = await User.populate(chats, {
            path: "latestMessage.sender",
            select: "name avatar email phone"
        });

        chats = await Message.populate(chats, [
            {
                path: "latestMessage.content.reactedToMsg"
            },
            {
                path: "latestMessage.content.lastregularMsg"
            }
        ])

        chats = await Chat.populate(chats, [
            {
                path: "latestMessage.content.reactedToMsg.chat"
            },
            {
                path: "latestMessage.content.lastregularMsg.chat"
            }
        ])

        chats = await User.populate(chats, [
            {
                path: "latestMessage.content.reactedToMsg.sender",
                select: "name avatar email phone"
            },
            {
                path: "latestMessage.content.lastregularMsg.sender",
                select: "name avatar email phone"
            }
        ])

        // needs to get the users who seen the lastetMessage inside seenBy aarry of lastestMessage and according to that at the first load of app if any of lastetMessage is not seen by user will gave him notification!

        // OR

        // populating the chat in the lastetMessage of user to show notifications details as the notification is a unseemnMessage itself so need to show the details of that uneen message in the notification menu in frontend at the first load if chats!

        chats = await Chat.populate(chats, {
            path: "latestMessage.chat"
        });

        if (!chats) return BadRespose(res, false, "Some Error occured please try again later")

        return chats

    } catch (error) {
        return errorRespose(res, false, { message: "Failed to load chats from server, Network issue!" })
    }
}

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

module.exports = { fetchallchatsWithPopulatedFields, Getfullchat }