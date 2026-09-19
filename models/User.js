import mongoose from "mongoose";


const userSchema = mongoose.Schema({
    name : {
        type : String,
        required : true
    },
    email : {
        type : String,
        required:true
    },
    password : {
      type : String,
      required:true  
    }
},
{
    timestamps:true,
    strict : "throw"
})

const User = mongoose.model("User" , userSchema)
export default User
