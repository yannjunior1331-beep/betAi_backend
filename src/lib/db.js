import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function connectDB(){
    try{
        await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB connected successfully")
    }catch(error){
        console.error("error connecting to MongoDB:", error)
        process.exit(1); // Exit the process with failure
    }
}


export default connectDB;