const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
let bodyParser = require('body-parser');
let mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({ username: { type: String, required: true } });
const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

let userModel = mongoose.model('user', userSchema);
let exerciseModel = mongoose.model('exercise', exerciseSchema);

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  let username = req.body.username;
  let newUser = new userModel({ username: username });
  await newUser.save();
  res.json(newUser);
});

app.get('/api/users', async (req, res) => {
  let users = await userModel.find({});
  res.json(users);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  let userId = req.params._id;
  let exerciseObj = {
    userId: userId,
    description: req.body.description,
    duration: req.body.duration,
    date: req.body.date ? new Date(req.body.date) : new Date()
  };

  let newExercise = new exerciseModel(exerciseObj);
  let userFound = await userModel.findById(userId);

  if (!userFound) {
    return res.status(404).json({ error: 'User not found' });
  }

  await newExercise.save();
  res.json({
    _id: userFound._id,
    username: userFound.username,
    description: newExercise.description,
    duration: newExercise.duration,
    date: newExercise.date.toDateString()
  });
});

app.get('/api/users/:_id/logs', async (req, res) => {
  let userId = req.params._id;
  let fromParam = req.query.from ? new Date(req.query.from) : null;
  let toParam = req.query.to ? new Date(req.query.to) : null;
  let limitParam = req.query.limit ? parseInt(req.query.limit) : null;

  let userFound = await userModel.findById(userId);

  if (!userFound) {
    return res.status(404).json({ error: 'User not found' });
  }

  let queryObj = { userId: userId };
  if (fromParam || toParam) {
    queryObj.date = {};
    if (fromParam) queryObj.date['$gte'] = fromParam;
    if (toParam) queryObj.date['$lte'] = toParam;
  }

  let exercises = await exerciseModel.find(queryObj).limit(limitParam).exec();

  exercises = exercises.map(exercise => ({
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString()
  }));

  res.json({
    _id: userFound._id,
    username: userFound.username,
    count: exercises.length,
    log: exercises
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
