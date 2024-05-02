const Chat = require("../models/chatModel");
const User = require("../models/userModel");
const Message = require("../models/messageModel");
const { errorRespose, BadRespose } = require("../config/errorStatus");
const {
  fetchallchatsWithPopulatedFields,
  Getfullchat,
} = require("../config/chatConfig");
const {
  saveMessage: saveInitialGroupMsg,
  saveMessage,
} = require("./messageController");

const getUserById = async (userId) => {
  return await User.findById(userId).select("-password");
};
const accesschat = async (req, res) => {
  const { userId } = req.body;
  if (!userId)
    return BadRespose(res, false, "UserId param not send with the request");

  try {
    let isChat = await Chat.find({
      isGroupchat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .select("-groupAvatar -groupAdmin")
      .populate("users", "-password")
      .populate("latestMessage");

    isChat = await User.populate(isChat, {
      path: "latestMessage.sender",
      select: "name email avatar phone",
    });

    isChat.length &&
      (await Chat.findByIdAndUpdate(isChat[0]._id, {
        $pull: { deletedFor: req.user._id },
        $push: { createdBy: req.user._id },
      }));

    let status = true;

    let chats = await fetchallchatsWithPopulatedFields(req);

    if (isChat.length < 1) {
      let newChat = {
        chatName: "personalChat",
        users: [req.user.id, userId],
        isGroupchat: false,
        createdBy: [req.user._id],
      };
      try {
        let createdChat = await Chat.create(newChat);

        let fullCreatedChat = await Getfullchat(createdChat._id);

        chats = await fetchallchatsWithPopulatedFields(req);

        res
          .status(201)
          .json({
            status,
            message: "Chat has been created Successfully",
            chat: fullCreatedChat[0],
            chats,
          });
      } catch (error) {
        return errorRespose(res, false, error);
      }
    } else {
      res
        .status(201)
        .json({
          status,
          message: "Chat has been created Successfully",
          chat: isChat[0],
          chats,
        });
    }
  } catch (error) {
    return errorRespose(res, false, error);
  }
};
const deleteChat = async (req, res) => {
  try {
    let { chatId } = req.body;

    if (!chatId)
      return BadRespose(res, false, "ChatId not send with the request!");

    let chat = await Chat.findById(chatId);

    if (!chat)
      return BadRespose(res, false, "Chat with this ChatId not found..!");

    if (
      chat.deletedFor.length > 0 ||
      (!chat.latestMessage && chat.createdBy.length === 1)
    ) {
      await Chat.deleteOne({ _id: chatId });
      await Message.deleteMany({ chat: chatId });
      return res.status(200).json({ status: true, message: "Chat deleted" });
    }

    let deletedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $push: { deletedFor: req.user._id },
        $pull: {
          createdBy: req.user._id,
          pinnedBy: req.user._id,
          archivedBy: req.user._id,
          mutedNotificationBy: req.user._id,
        },
      },
      { new: true }
    );

    if (!deletedChat) return BadRespose(res, false, "Failed to delete chat!");

    return res.status(200).json({ status: true, message: "Chat deleted" });
  } catch (error) {
    return errorRespose(res, false, error.message);
  }
};
const pinOrUnpinChat = async (req, res) => {
  let { chatId } = req.body;

  if (!chatId)
    return BadRespose(res, false, "ChatId not send with the request!");

  try {
    let chat = await Chat.findById(chatId);

    if (!chat)
      return BadRespose(res, false, "Chat with this ChatId not found..!");

    if (chat.pinnedBy.includes(req.user._id)) {
      await Chat.findByIdAndUpdate(
        chatId,
        { $pull: { pinnedBy: req.user._id } },
        { new: true }
      );
      return res.status(200).json({ status: true, message: "Chat unpinned" });
    } else {
      await Chat.findByIdAndUpdate(
        chatId,
        { $push: { pinnedBy: req.user._id } },
        { new: true }
      );
      return res.status(200).json({ status: true, message: "Chat pinned" });
    }
  } catch (error) {
    errorRespose(res, false, error);
  }
};
const archiveOrUnarchiveChat = async (req, res) => {
  let { chatId } = req.body;

  if (!chatId)
    return BadRespose(res, false, "ChatId not send with the request!");

  try {
    let chat = await Chat.findById(chatId);

    if (!chat)
      return BadRespose(res, false, "Chat with this ChatId not found..!");

    if (chat.archivedBy.includes(req.user._id)) {
      await Chat.findByIdAndUpdate(
        chatId,
        { $pull: { archivedBy: req.user._id } },
        { new: true }
      );
      return res.status(200).json({ status: true, message: "Chat Unarchived" });
    } else {
      await Chat.findByIdAndUpdate(
        chatId,
        { $push: { archivedBy: req.user._id } },
        { new: true }
      );
      return res.status(200).json({ status: true, message: "Chat archived" });
    }
  } catch (error) {
    errorRespose(res, false, error);
  }
};
const muteOrUnmuteNotification = async (req, res) => {
  let { chatId } = req.body;

  if (!chatId)
    return BadRespose(res, false, "ChatId not send with the request!");

  try {
    let chat = await Chat.findById(chatId);

    if (!chat)
      return BadRespose(res, false, "Chat with this ChatId not found..!");

    if (chat.mutedNotificationBy.includes(req.user._id)) {
      await Chat.findByIdAndUpdate(
        chatId,
        { $pull: { mutedNotificationBy: req.user._id } },
        { new: true }
      );
      return res
        .status(200)
        .json({ status: true, message: "Notification unMuted" });
    } else {
      await Chat.findByIdAndUpdate(
        chatId,
        { $push: { mutedNotificationBy: req.user._id } },
        { new: true }
      );
      return res
        .status(200)
        .json({ status: true, message: "Notification Muted" });
    }
  } catch (error) {
    errorRespose(res, false, error);
  }
};
const fetchallchats = async (req, res) => {
  let status = false;
  try {
    let chats = await fetchallchatsWithPopulatedFields(req);

    res.status(200).json({ status: true, chats });
  } catch (error) {
    return errorRespose(res, status, {
      message: "Failed to load chats,Network unstable!",
    });
  }
};
const creategroup = async (req, res) => {
  const { groupName, users, groupAvatar, userNames } = req.body;
  let status = false;

  if (users.length < 2)
    return BadRespose(
      res,
      status,
      "More than 2 people's are required to form a group"
    );

  let groupdata = {
    chatName: groupName,
    users: [req.user.id, ...users],
    isGroupchat: true,
    groupAdmin: [req.user.id],
    createdBy: [req.user._id],
  };

  if (groupAvatar) groupdata.groupAvatar = groupAvatar;

  try {
    let newGroup = await Chat.create(groupdata);

    let Fullgroup = await Chat.find({ _id: newGroup._id })
      .populate("users", "-password")
      .populate("latestMessage")
      .populate("groupAdmin", "-password");

    Fullgroup = await User.populate(Fullgroup, {
      path: "latestMessage.sender",
      select: "name email avatar phone",
    });
    if (Fullgroup.length < 1) {
      return BadRespose(res, status, "Failed to create group try again later");
    }

    // { chatId: selectedChat?._id, content, receiverIds: selectedChat.users.filter(u => u._id !== user?._id).map(u => u._id), msgType }
    let createdGroup = Fullgroup[0];

    const content = {
      message: `${
        createdGroup.groupAdmin[0].name.split(" ")[0]
      } created group "${createdGroup.chatName}" and added ${userNames}`,
    };
    const receiverIds = createdGroup.users
      .filter((u) => String(u._id) !== String(req.user._id))
      .map((u) => u._id);
    const msgPayload = {
      chatId: createdGroup._id,
      content,
      receiverIds,
      msgType: "info",
    };

    await saveInitialGroupMsg(req, msgPayload);

    let chats = await fetchallchatsWithPopulatedFields(req);

    createdGroup = chats.filter(
      (c) => String(c._id) === String(createdGroup._id)
    )[0];

    return res
      .status(201)
      .json({
        status: true,
        message: "New Group created sucessfully",
        Fullgroup: createdGroup,
        chats,
      });
  } catch (error) {
    console.log(error);
    return errorRespose(res, status, error);
  }
};
const updategroup = async (req, res) => {
  if (!req.body)
    return BadRespose(res, false, "reqBody not send with the request..!");

  let { chatId, detailsToUpdate } = req.body;

  if (!chatId)
    return BadRespose(res, false, "chatId not send with the request..!");

  try {
    let updatedGroup = await Chat.findByIdAndUpdate(
      chatId,
      { $set: detailsToUpdate },
      { new: true }
    );

    if (!updatedGroup)
      return BadRespose(
        res,
        false,
        "unable to update profile, Network Error..!"
      );

    let chats = await fetchallchatsWithPopulatedFields(req);

    res
      .status(200)
      .json({
        status: true,
        chats,
        message: "Group Profile Updated Sucessfully 🎉",
      });
  } catch (error) {
    return errorRespose(res, false, error);
  }
};
const addGroupAdmin = async (req, res) => {
  try {
    let { userId, chatId } = req.body;
    if (!userId || !chatId)
      return BadRespose(
        res,
        false,
        "userId or chatId may not send with the request body!"
      );

    let updated = await Chat.findByIdAndUpdate(chatId, {
      $addToSet: { groupAdmin: userId },
    });

    if (!updated)
      return BadRespose(res, false, "Some error occured try again later!");

    let chat = await Getfullchat(chatId);

    let chats = await fetchallchatsWithPopulatedFields(req);

    return res
      .status(200)
      .json({
        status: true,
        message: "Member updated as a GroupAdmin!",
        chat: chat[0],
        chats,
      });
  } catch (error) {
    return errorRespose(res, false, error);
  }
};
const removeGroupAdmin = async (req, res) => {
  try {
    let { userId, chatId } = req.body;
    if (!userId || !chatId)
      return BadRespose(
        res,
        false,
        "userId or chatId may not send with the request body!"
      );

    let updated = await Chat.findByIdAndUpdate(chatId, {
      $pull: { groupAdmin: userId },
    });
    if (!updated)
      return BadRespose(res, false, "Some error occured try again later!");

    let chat = await Getfullchat(chatId);

    let chats = await fetchallchatsWithPopulatedFields(req);

    return res
      .status(200)
      .json({
        status: true,
        message: "Member removed from GroupAdmin!",
        chat: chat[0],
        chats,
      });
  } catch (error) {
    return errorRespose(res, false, error);
  }
};
const addTogroup = async (req, res) => {
  const { users, chatId } = req.body;
  let status = false;

  if (!users)
    return BadRespose(
      res,
      status,
      "users list are not send with the body of the request"
    );

  if (!chatId)
    return BadRespose(
      res,
      status,
      "chatId is not send with the body of the request"
    );

  if (users.length < 1)
    return BadRespose(
      res,
      status,
      "Please select atleast one user to add into the Group"
    );

  try {
    let chat = await Chat.findById(chatId).populate("latestMessage");

    let leftFromGroup = chat.leftFromGroup;

    let updatedLeftFromGroup = [];

    leftFromGroup.forEach((obj) => {
      if (!users.includes(String(obj.user))) {
        updatedLeftFromGroup.push(obj);
      }
    });

    let updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $set: { leftFromGroup: updatedLeftFromGroup },
        $addToSet: { users: [...users] },
      },
      { new: true }
    );

    if (!updatedChat)
      return errorRespose(res, false, {
        message: "Failed to add users into group",
      });

    chat = await Getfullchat(chatId);

    let chats = await fetchallchatsWithPopulatedFields(req);

    res
      .status(200)
      .json({
        status: true,
        message: `New ${
          users.length > 1 ? "members" : "member"
        } added to Group`,
        chat: chat[0],
        chats,
      });

    // The below code is needed because suppose if any of the user from the group is removed/left from the group but we still have to add the new message count for that user as well bcz in future if that user will be added in the group again than we have to show him the exact count of new messages that he has not seen!
    let unseenMsgCountObj = {};

    users.forEach(async (userId, i) => {
      const count = await Message.find({
        chat: chatId,
        msgType: { $ne: "reaction" },
        $and: [{ sender: { $ne: userId } }, { seenBy: { $nin: [userId] } }],
      }).count();

      //  The below lines of code will be executed after Each DB call to get the unseenMsgCount of each user that want to be added in the group!

      unseenMsgCountObj[userId] = count;

      // Only update the chat when for loop reaches the end!
      if (i === users.length - 1) {
        unseenMsgCountObj = {
          ...chat[0].unseenMsgsCountBy,
          ...unseenMsgCountObj,
        };
        updatedChat = await Chat.findByIdAndUpdate(
          chatId,
          { unseenMsgsCountBy: unseenMsgCountObj },
          { new: true }
        );
        // console.log(updatedChat)
      }
    });
  } catch (error) {
    return errorRespose(res, status, error);
  }
};
const removeFromgroup = async (req, res) => {
  const { chatId, userId, message } = req.body;
  let status = false;

  if (!chatId || !userId)
    return BadRespose(
      res,
      status,
      "userId or chatId not send with the request body"
    );

  try {
    const content = { message };
    const chatById = await Chat.findById(chatId);
    const receiverIds = chatById.users.filter(
      (u) => String(u) !== String(req.user._id)
    );
    const msgPayload = { content, chatId, receiverIds, msgType: "info" };
    let { fullmessage: grpRemovedMsg, chat } = await saveMessage(
      req,
      msgPayload
    );

    let leftUserObj = {
      user: userId,
      totalMsgCount: chat.totalMessages,
      latestMessage: grpRemovedMsg._id,
    };
    let updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $pull: { groupAdmin: userId },
        $push: { leftFromGroup: leftUserObj },
      },
      { new: true }
    );

    if (!updatedChat)
      return errorRespose(res, false, {
        message: "Failed to remove from group",
      });

    chat = await Getfullchat(chatId);

    let chats = await fetchallchatsWithPopulatedFields(req);

    return res
      .status(200)
      .json({
        status: true,
        message: "Member removed from group sucessfully",
        chat: chat[0],
        chats,
        grpRemovedMsg,
      });
  } catch (error) {
    return errorRespose(res, status, error);
  }
};

module.exports = {
  accesschat,
  deleteChat,
  pinOrUnpinChat,
  muteOrUnmuteNotification,
  archiveOrUnarchiveChat,
  fetchallchats,
  creategroup,
  updategroup,
  addTogroup,
  removeFromgroup,
  addGroupAdmin,
  removeGroupAdmin,
};
