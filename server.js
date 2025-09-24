const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.listen(port, () => console.log(`Listening on port ${port}`));

// SQLite DB 연결
let db = new sqlite3.Database('./events.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the events database.');
});

// events 테이블 없을 경우 생성
db.run(`CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  info TEXT,
  title TEXT,
  contents TEXT
)`, (err) => {
  if (err) {
      console.error(err.message);
  } else {
      console.log("Successfully created 'events' table.");
  }
});

// 이벤트 가져오기
app.get('/events', (req, res) => {
  const sql = 'SELECT * FROM events';
  db.all(sql, [], (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

// 이벤트 생성
// app.post('/events/add', (req, res) => {
//   const sql = "INSERT INTO events(info, title, contents) VALUES(?, ?, ?)";
//   const event = [JSON.stringify(req.body.info), req.body.title, req.body.contents];
//   db.run(sql, event, function (err) {
//     if (err) throw err;
//     res.send({ id: this.lastID });
//   });
// });

app.post('/events/add', (req, res) => {
  const sql = "INSERT INTO events(info, title, contents) VALUES(?, ?, ?)";
  const event = [JSON.stringify(req.body.info), req.body.title, req.body.contents];

  // 새로운 데이터베이스 연결 생성
  let db = new sqlite3.Database('./events.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).send({ message: 'Database error' });
    }
  });

  // 쿼리 실행
  db.run(sql, event, function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send({ message: 'Database error' });
    } else {
      res.send({ id: this.lastID });
    }

    // 데이터베이스 연결 닫기
    db.close((err) => {
      if (err) {
        console.error(err.message);
      }
    });
  });
});

// GET요청 처리하는 라우터. put을 처리하려면 get으로 id를 가져와 줘야 함.
app.get('/events/:id', (req, res) => {
  const sql = 'SELECT * FROM events WHERE id = ?';
  db.get(sql, req.params.id, (err, row) => {
    if (err) throw err;
    if (row) {
      res.send(row);
    } else {
      res.status(404).send({ message: 'Not found' });
    }
  });
});

// 이벤트 수정
app.put('/events/:id', (req, res) => {
  const sql = 'UPDATE events SET info = ?, title = ?, contents = ? WHERE id = ?';
  const event = [JSON.stringify(req.body.info), req.body.title, req.body.contents, req.params.id];
  db.run(sql, event, function (err) {
    if (err) throw err;
    res.send({ changes: this.changes });
  });
});

// 이벤트 삭제
app.delete('/events/:id', (req, res) => {
  const sql = 'DELETE FROM events WHERE id = ?';
  db.run(sql, req.params.id, function (err) {
    if (err) throw err;
    res.send({ changes: this.changes });
  });
});
