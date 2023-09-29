const getJoinUserNames = (users) => {
    return users.map(u => u.name.split(' ')[0]).join(', ')
}
module.exports = { getJoinUserNames }