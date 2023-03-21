const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    sender:{
        type:Schema.Types.ObjectId,
        require:true,
        ref:'users'
    },
    content:{
       type:Object
    },
    chat:{
        type:Schema.Types.ObjectId,
        ref:"chats"
    },
    seenBy:[{
        type: Schema.Types.ObjectId,
        ref: "users"
    }],
    msgType:{
        type:String
    }
},{timestamps:true})

module.exports = mongoose.model('messages',messageSchema)