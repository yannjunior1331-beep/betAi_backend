import mongoose from "mongoose";

const fixtureSchema = new mongoose.Schema({},{strict: false});

export default mongoose.model("Fixture", fixtureSchema);    