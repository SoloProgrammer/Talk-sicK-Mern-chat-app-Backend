const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const chatSchema = new Schema({
    chatName: {
        type: String,
        trim: true,
        required: true
    },
    users: [{
        type: Schema.Types.ObjectId,
        ref: "users"
    }],
    deletedFor: [{
        type: Schema.Types.ObjectId,
        ref: "users"
    }],
    createdBy: [{
        type: Schema.Types.ObjectId,
        ref: "users"
    }],
    pinnedBy: [{
        type: Schema.Types.ObjectId,
        ref: "users"
    }],
    archivedBy:[{
        type: Schema.Types.ObjectId,
        ref: "users"
    }],
    mutedNotificationBy:[{
        type:Schema.Types.ObjectId,
        ref:"users",
    }],
    isGroupchat: {
        type: Boolean,
        default: false
    },
    groupAvatar: {
        type: String,
        default: "https://tse2.mm.bing.net/th?id=OIP.OtLqKEL4eIvyiNSJZ4pT-wHaHa&pid=Api&P=0"
    },
    latestMessage: {
        type: Schema.Types.ObjectId,
        ref: "messages"
    },
    totalMessages: {
        type: Number
    },
    unseenMsgsCountBy:{
        type:Object
    },
    groupAdmin: [{
        type: Schema.Types.ObjectId,
        ref: "users"
    }],
}, { timestamps: true })

module.exports = mongoose.model('chats', chatSchema)