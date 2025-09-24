import React from 'react';
import { Dropdown, Button, Modal, Form, FormControl } from 'react-bootstrap';
// bootstrap css
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './bootstrapIndex.css'; // bootstrap design cover

import { useState, useEffect, useCallback } from 'react';

// DB와 클라이언트 소통을 위해
import axios from 'axios';

// electron과 통신을 위한
let ipcRenderer;
if (window.require) { // 에러 때문에 if문 처리
  const electron = window.require("electron"); // 밖에 두면 window.require 인식못해서 웹에서 캘린더가 안 나옴. 
  ipcRenderer = electron.ipcRenderer;
}

// event나 달력칸을 클릭한 뒤 Modal창에 띄우기 위해 날짜의 형태를 변환해주는 함수.
const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 1을 더해줍니다.
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  return `${y}-${m}-${d}T${hh}:${mm}`;
}
// 날짜 형태를 변환 시켜 start, end에 재할당 해주는 함수
const getSelectedDate = (selectedInfo) => {
  const start = selectedInfo.start;
  const end = selectedInfo.end;

  const formattedStart = formatDate(start);
  const formattedEnd = formatDate(end);

  return { start: formattedStart, end: formattedEnd };
}

function ModalCal(props) {

  const handleClose = () => props.setShow(false); // Modal창 닫는 함수

  const [title, setTitle] = useState();
  const titleChange = (event) => { // onChange로 받은 내용을 업데이트하는 함수
    setTitle(event.target.value);
  }
  const [contents, setContents] = useState();
  const contentsChange = (event) => {
    setContents(event.target.value);
  }

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // 받은 날짜값을 상시로 출력 형태로 변환함
  useEffect(() => {
    if (props.selectedInfo) {
      const formattedDate = getSelectedDate(props.selectedInfo);
      setStartTime(formattedDate.start);
      setEndTime(formattedDate.end);
    }
  }, [props.selectedInfo]);

  // 시작 시간과 종료 시간을 업데이트 하는 함수
  const startTimeChange = (event) => {
    setStartTime(event.target.value);
  }
  const endTimeChange = (event) => {
    setEndTime(event.target.value);
  }

  const insertEvent = () => {
    let arg = props.selectedInfo;
    const startTimeDate = new Date(startTime); // 원래 형태로 변환시켜 DB에 저장하기위해 선언
    const endTimeDate = new Date(endTime);
    if (title) {
      axios.post('/events/add', {
        info: {
          allDay: arg.allDay,
          end: endTimeDate,
          enStr: arg.endStr,
          jsEvent: arg.jsEvent,
          start: startTimeDate,
          startStr: arg.startStr,
          view: arg.view
        },
        title: title,
        contents: contents
      })
        .then(response => {
          props.fetchEvents();
        })
        .catch(error => console.error(error));
    }
    handleClose();
  };

  return (
    // show : show가 true일 때 모달창을 보여준다, onHide : Modal창 외부 클릭시 함수 실행
    // onHide, onClick, onChange등 사용 시 무조건 함수로 한 번 감싸서 사용해야 한다.
    <div>
      <Modal show={props.show} onHide={handleClose}>
        <Modal.Header>
          <Modal.Title>일정등록</Modal.Title>
          <Button variant="secondary" onClick={handleClose} style={{ position: 'absolute', right: 0, marginRight: "10px" }}>
            X
          </Button>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label>제목</Form.Label>
              <Form.Control // <input />과 같은 기능
                type="text"
                placeholder="제목을 입력하세요"
                autoFocus
                onChange={titleChange} // Form.Control의 내용이 바뀔 때 마다 함수 실행
                name='title'
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput2">
              <Form.Label>시작시간</Form.Label>
              <Form.Control
                type="datetime-local"
                onChange={startTimeChange}
                value={startTime}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput3">
              <Form.Label>종료시간</Form.Label>
              <Form.Control
                type="datetime-local"
                onChange={endTimeChange}
                value={endTime}
              />
            </Form.Group>
            {/* {props.startDate} ~ {props.endDate} */}
            <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
              <Form.Label>내용</Form.Label>
              <Form.Control
                as="textarea"
                placeholder="내용을 입력하세요"
                rows={3}
                onChange={contentsChange}
                name='contents'
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={insertEvent}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

function EventOpen(props) {
  const handleClose = () => props.setShowEvent(false);

  const [title, setTitle] = useState(props.eventTitle); // 초기값을 받아온 eventTitle로 설정
  const modifyTitle = (event) => { // 값을 수정할 때 마다 업데이트
    setTitle(event.target.value);
  }

  const [contents, setContents] = useState('');
  const modifyContents = (event) => {
    setContents(event.target.value);
  }

  const fetchContents = useCallback(() => { // 내용을 최신화. 
    axios.get(`/events/${props.selectedEventId}`) // 해당 ID에서
      .then(response => {
        setTitle(response.data.title); // 제목과
        setContents(response.data.contents); // 내용을 받아옴
      })
      .catch(error => console.error(error));
  }, [props.selectedEventId]);

  useEffect(() => { // 컴포넌트가 마운트되면 contents 정보를 불러옴
    if (props.selectedEventId) {
      fetchContents();
    }
  }, [props.selectedEventId, fetchContents]);

  // 시작 시간과 종료 시간을 상태로 관리
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // 받은 날짜값을 상시로 출력 형태로 변환함
  useEffect(() => {
    if (props.eventInfo) {
      const formattedDate = getSelectedDate(props.eventInfo);
      setStartTime(formattedDate.start);
      setEndTime(formattedDate.end);
    }
  }, [props.eventInfo]);

  // 시작 시간과 종료 시간을 업데이트 하는 함수
  const modifyStartTime = (event) => {
    setStartTime(event.target.value);
  }
  const modifyEndTime = (event) => {
    setEndTime(event.target.value);
  }

  const updateEvent = () => {
    let info = props.eventInfo
    const startTimeDate = new Date(startTime); // 원래 형태로 변환시켜 DB에 저장하기위해 선언
    const endTimeDate = new Date(endTime);
    axios.put(`/events/${props.selectedEventId}`, {
      // info: info,
      info: {
        allDay: info.allDay,
        end: endTimeDate, // 수정된 부분
        enStr: info.endStr,
        jsEvent: info.jsEvent,
        start: startTimeDate, // 수정된 부분
        startStr: info.startStr,
        view: info.view
      },
      title: title,
      contents: contents
    })
      .then(response => {
        setTitle(title);
        setContents(contents);
        props.fetchEvents(); // 이벤트를 수정한 후 캘린더 갱신
      })
      .catch(error => console.error(error));
    handleClose();
  }

  const handleDelete = () => {
    if (window.confirm('이 이벤트를 삭제하시겠습니까?')) {
      axios.delete(`/events/${props.selectedEventId}`)
        .then(response => {
          let arg = props.eventArg
          // 클라이언트에서 이벤트를 캘린더에서 제거
          arg.event.remove();
        })
        .catch(error => console.error(error));
    }
    handleClose();
  };

  return (
    <Modal show={props.showEvent} onHide={handleClose}>
      <Modal.Header>
        <Button variant="secondary" onClick={handleClose} style={{ position: 'absolute', right: 0, marginRight: "10px" }}>
          X
        </Button>
        <Modal.Title>이벤트 수정</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form.Label>제목</Form.Label>
        <Form.Control
          type="text"
          placeholder="제목을 입력하세요"
          autoFocus
          onChange={modifyTitle}
          value={title} // value에 한 번 입력된 값은 절대로 변하지 않기 때문에 onChange에서 실시간 업데이트하는 과정이 필요
        />
        <Form.Group className="mb-3" controlId="exampleForm.ControlInput2">
          <Form.Label>시작시간</Form.Label>
          <Form.Control
            type="datetime-local"
            onChange={modifyStartTime}
            value={startTime}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="exampleForm.ControlInput3">
          <Form.Label>종료시간</Form.Label>
          <Form.Control
            type="datetime-local"
            onChange={modifyEndTime}
            value={endTime}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
          <Form.Label>내용</Form.Label>
          <Form.Control
            as="textarea"
            placeholder="내용을 입력하세요"
            rows={3}
            onChange={modifyContents}
            value={contents}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="danger" onClick={handleDelete}>Delete</Button>
        <Button variant="secondary" onClick={handleClose}>Close</Button>
        <Button variant="primary" onClick={updateEvent}>Save changes</Button>
      </Modal.Footer>
    </Modal>
  )
}

// 최소화 함수
const minimizeApp = () => {
  if (ipcRenderer) {
    ipcRenderer.send('minimizeApp');
  }
};

// 종료 함수
const closeApp = () => {
  if (ipcRenderer) {
    ipcRenderer.send('closeApp');
  }
};

const toggleResizeMode = () => {
  const electron = window.require("electron");
  electron.ipcRenderer.send('save-window'); // 현재 위치와 크기를 저장.
  if (ipcRenderer) {
    ipcRenderer.send('toggleResizeMode'); // toggleResizeMode라는 메세지를 보냄 // Renderer 로 보내고 Main로 수신하는 매커니즘 인듯?
  }
};

const ResizeCancel = () => {
  const electron = window.require("electron");
  electron.ipcRenderer.send('reset-window');
  if (ipcRenderer) {
    ipcRenderer.send('toggleResizeMode');
  }
};

function SettingsMenu(props) {

  const handleClose = () => props.setSettingsMenuVisible(false);

  return (
    <div>
      <Dropdown show={props.settingsMenuVisible} onHide={handleClose}>
        <Dropdown.Menu>
          <Dropdown.Item href="#/action-1" onClick={toggleResizeMode}>크기 및 위치 조정</Dropdown.Item>
          <Dropdown.Item href="#/action-2" onClick={() => props.setShowTransparencyModal(true)}>투명도 조절</Dropdown.Item>
          <Dropdown.Item href="#/action-3" onClick={() => { minimizeApp(); props.setSettingsMenuVisible(false); }}>최소화</Dropdown.Item>
          <Dropdown.Item href="#/action-4" onClick={closeApp}>종료</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>

    </div>
  )
}

function ResizeButton() {
  return (
    <div>
      <Button variant="danger" onClick={ResizeCancel}>취소</Button>
      <Button variant="success" onClick={toggleResizeMode}>저장</Button>
    </div>
  )
}

const TransparencyControl = ({ onClose }) => {
  const [transparency, setTransparency] = useState(1.0);

  useEffect(() => {
    (async () => {
      const initialTransparency = await ipcRenderer.invoke('get-transparency');
      setTransparency(initialTransparency);
    })();
  }, []);

  const handleRangeChange = (e) => {
    let newTransparency = parseFloat(e.target.value);
    setTransparency(newTransparency);
    ipcRenderer.send('update-opacity', newTransparency); // 투명도 업데이트
    ipcRenderer.send('transparency-changed', newTransparency); // 변경된 투명도 값 Electron Store에 저장 요청
  };

  return (
    <Modal show={true} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>투명도 조절</Modal.Title>
      </Modal.Header>

      <Form.Range
        type="range"
        min="0.3"
        max="1"
        step=".01"
        value={transparency}
        onChange={handleRangeChange} />

      <FormControl
        type="number"
        min="0.3"
        max="1"
        step=".01"
        // onBlur={handleNumberBlur} // 입력칸의 커서가 깜빡일 때 다른 창을 클릭하면 발동.
        value={transparency}
        onChange={handleRangeChange}
      />
    </Modal>
  );
};

export { ModalCal, EventOpen, SettingsMenu, ResizeButton, TransparencyControl };