const Chat = require('../models/chatModel')
const User = require('../models/userModel')

const fetchallchatsCommon = async (req) => {
    let chats = await Chat.find(
        {
            users: { $elemMatch: { $eq: req.user._id } }
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
    console.log(chats)
    return chats
}

module.exports = { fetchallchatsCommon }