const Chat = require('../models/chatModel')
const User = require('../models/userModel')
const { BadRespose, errorRespose } = require('./errorStatus')

const fetchallchatsCommon = async (req) => {
    try {
        let chats = await Chat.find(
            {
                users: { $elemMatch: { $eq: req.user._id } },
                $and: [
                    {
                        $or: [
                            { deletedFor: { $elemMatch: { $ne: req.user._id } } },
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
            .sort({ latestMessage: -1 })

        chats = await User.populate(chats, {
            path: "latestMessage.sender",
            select: "name avatar email phone"
        });

        // needs to get the users who seen the lastetMessage inside seenBy aarry of lastestMessage and according to that at the first load of app if any of lastetMessage is not seen by user will gave him notification!

        // OR

        // populating the chat in the lastetMessage of user to inplement the notification logic in frontend at the first load if chats !

        chats = await Chat.populate(chats, {
            path: "latestMessage.chat"
        });

        if (!chats) return BadRespose(res, false, "Some Error occured please try again later")

        return chats
    } catch (error) {
        return errorRespose(res, false, { message: "Failed to load chats from server, Network issue!" })
    }
}

module.exports = { fetchallchatsCommon }