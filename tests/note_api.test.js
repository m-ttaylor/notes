const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const helper = require('./test_helper')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const Note = require('../models/note')
const User = require('../models/user')

beforeEach(async () => {
  await Note.deleteMany({})
  await User.deleteMany({})

  const noteObjects = helper.initialNotes
    .map(note => new Note(note))
  const notePromiseArray = noteObjects.map(note => note.save())
  await Promise.all(notePromiseArray)

  const saltRound = 10

  const passwordHashes = []
  for (let user of helper.initialUsers) {
    passwordHashes.push(
      await bcrypt.hash(user.password, saltRound)
    )
  }

  const userObjects = helper.initialUsers
    .map((user, i) => {

      return new User({
        username: user.username,
        name: user.name,
        passwordHash: passwordHashes[i]
      })
    })

  const userPromiseArray = userObjects.map(user => user.save())
  await Promise.all(userPromiseArray)
})

describe('when there are initially some saved notes', () => {
  test('notes are returned as json', async () => {
    await api
      .get('/api/notes')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('all notes are returned', async () => {
    const response = await api.get('/api/notes')
  
    expect(response.body).toHaveLength(helper.initialNotes.length)
  })

  test('a specific note is within the returned notes', async () => {
    const response = await api.get('/api/notes')
  
    const contents = response.body.map(r => r.content)
    expect(contents).toContain(
      'Browser can execute only Javascript'
    )
  })
})

describe('viewing a specific note', () => {
  test('with a valid id succeeds', async () => {
    const notesAtStart = await helper.notesInDb()
  
    const noteToView = notesAtStart[0]
  
    const resultNote = await api
      .get(`/api/notes/${noteToView.id}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)
  
    const processedNoteToView = JSON.parse(JSON.stringify(noteToView))
  
    expect(resultNote.body).toEqual(processedNoteToView)
  })

  test('fails with statuscode 404 if note does not exist', async () => {
    const validNonexistingId = await helper.nonExistingId()

    console.log(validNonexistingId)

    await api
      .get(`/api/notes/${validNonexistingId}`)
      .expect(404)
  })

  test('fails with statuscode 400 if id is invalid', async () => {
    const invalidId = '324fd123fxcvz213'

    await api
      .get(`/api/notes/${invalidId}`)
      .expect(400)
  })
})

describe('addition of a new note', () => {
  const credentials = {
    username: 'royboy',
    password: 'roystheboy'
  }
  
  test('succeeds with valid data', async () => {

    const loginResponse = await api
      .post('/api/login')
      .send(credentials)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const token = loginResponse.body.token

    const newNote = {
      content: 'async/await simplifies making async calls',
      important: true,
    }
  
    const response = await api
      .post('/api/notes')
      .set({ Authorization: `bearer ${token}` })
      .send(newNote)
      .expect(201)
      .expect('Content-Type', /application\/json/)
    
    const notesAtEnd = await helper.notesInDb()
  
    expect(notesAtEnd).toHaveLength(helper.initialNotes.length + 1)
    
    const contents = notesAtEnd.map(n => n.content)
    expect(contents).toContain(
      'async/await simplifies making async calls'
    )
  })

  test('fails with status code 401 if authorization is not included', async () => {
    const newNote = {
      important: true
    }

    await api
      .post('/api/notes')
      .send(newNote)
      .expect(401)

    const notesAtEnd = await helper.notesInDb()
    expect(notesAtEnd).toHaveLength(helper.initialNotes.length)
  })

  test('fails with status code 400 if data is invalid', async () => {

    const loginResponse = await api
      .post('/api/login')
      .send(credentials)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const token = loginResponse.body.token

    const newNote = {
      important: true
    }

    await api
      .post('/api/notes')
      .set({ Authorization: `bearer ${token}` })
      .send(newNote)
      .expect(400)

    const notesAtEnd = await helper.notesInDb()
    expect(notesAtEnd).toHaveLength(helper.initialNotes.length)
  })
})

describe('deletion of a note', () => {

  test('succeeds with status code 204 if id is valid', async () => {
    const notesAtStart = await helper.notesInDb()
    const noteToDelete = notesAtStart[0]
  
    await api
      .delete(`/api/notes/${noteToDelete.id}`)
      .expect(204)
  
    const notesAtEnd = await helper.notesInDb()
  
    expect(notesAtEnd).toHaveLength(
      helper.initialNotes.length - 1
    )
  
    const contents = notesAtEnd.map(r => r.content)
  
    expect(contents).not.toContain(noteToDelete.content)
  })
})

afterAll(() => {
  mongoose.connection.close()
})