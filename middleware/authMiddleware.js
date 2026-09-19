import Session from "../models/Session.js"
import User from "../models/User.js"

async function authMiddleware(req , res , next){
    const sessionId = req.signedCookies.sid

    if(!sessionId){
        return res.json({message : "Please Login first"})
    }

    const session = await Session.findById(sessionId)

    if(!session){
        return res.status(404).json({message : "Session not found"})
    }

    if(session.expiresAt < Date.now()){
        await Session.findByIdAndDelete(session._id)
        return res.json({message : "Session Expired"})
    }

    const user = await User.findById(session.userId)

    if(!user){
        return res.json({message : "Session invalid"})
    }
   
    req.user = user

    next()
}

export default authMiddleware