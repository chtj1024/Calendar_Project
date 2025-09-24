import React from 'react';
// fullcalendar
import Fullcalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import allLocales from '@fullcalendar/core/locales-all';
// Modal 컴포넌트
import {ModalCal, EventOpen, SettingsMenu, ResizeButton, TransparencyControl } from './ModalCal';
// Modal 컨트롤 컴포넌트를 위한 Hooks
import { useState, useEffect, useRef } from 'react';
// calendar css
import './index.css';
// electron 실행 시 표시되는 메뉴 버튼 경로
import gearImg from '../images/gear.png';

import axios from 'axios';

const isElectron = () => { // electron이 실행될 때 메뉴 버튼을 보여주는 함수
  // Renderer process
  if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
      return true;
  }
  // Main process
  if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
      return true;
  }
  // Detect the user agent when the `nodeIntegration` option is set to true
  if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
      return true;
  }
  return false;
}

function Calendar(props) {
  const [show, setShow] = useState(false);  // useState에서 [A, B] A는 값, B는 A의 상태를 변환시켜주는 Hooks다 + 변동 시 자동으로 반영되게 만들고 싶으면 state 써라
  const [selectedInfo, setSelectedInfo] = useState(); // 클릭한 날짜들의 정보

  const [eventTitle, setEventTitle] = useState(); // 클릭한 이벤트의 제목
  const [showEvent, setShowEvent] = useState(false); // 이벤트 모달창 on, off
  const [eventInfo, setEventInfo] = useState([]); // 클릭한 이벤트 모든 정보 (오브젝트 형태라 []를 사용.)

  const [settingsMenuVisible, setSettingsMenuVisible] = useState(false); // 톱니바퀴 버튼이 클릭 되었을 때 메뉴창 출력 및 닫기

  const [showTransparencyModal, setShowTransparencyModal] = useState(false); // 투명도 조절 모달의 상태 추가

  const [selectedEventId, setSelectedEventId] = useState(null); // 클릭된 Event ID 저장

  const [eventArg, setEventArg] = useState(); // Event의 arg.view.calendar를 담을 것임.

  const [menuPosition, setMenuPosition] = useState({ left: '0px', top: '0px' }); // 메뉴 클릭 시 커서 위치 저장하는 변수 선언
  const handleSettingsClick = (event) => {
    event.preventDefault();
    setSettingsMenuVisible((prevState) => !prevState); // 버튼 클릭 했을 때 실행한 함수니 true로 바꾸겠다는 뜻

    // 메뉴 너비 (메뉴의 실제 크기에 따라 조정)
    const menuWidth = 120;

    const rect = settingsButtonRef.current.getBoundingClientRect();

    // x 값을 버튼의 왼쪽 경계 좌표에서 메뉴 너비를 뺀 값으로 설정
    let x = rect.left - menuWidth;
  
    // y 값을 버튼 하단 경계 좌표로 설정
    let y = rect.bottom;

    setMenuPosition({ left: `${x}px`, top: `${y}px` });

  };

  function customDayCellContent({ date }) { // locale을 ko로 받으면 날짜 뒤에 '일'이란 문구가 붙어, 그것을 삭제하기 위해 만든 함수
    return date.getDate().toString(); // 날짜만 반환하도록 수정
  }

  // 메뉴 외부의 창 클릭 시 메뉴 닫게 하는 설정
  const settingsButtonRef = useRef(); // 설정 버튼의 ref // ref는 변경 가능한 값을 가지고 있는 상자로서 객체다. 해당 DOM을 참조하고 current 명령어로 상태조회와 값을 변경할 수 있다. // https://velog.io/@kysung95/%EC%A7%A4%EB%A7%89%EA%B8%80-useRef%EA%B0%80-%EB%AD%94%EA%B0%80%EC%9A%94
  const dropdownMenuRef = useRef(); // Dropdown 메뉴의 ref
  useEffect(() => {
    function handleClickOutside(event) {
      // 메뉴창이 열려있고, 설정 버튼이 존재하고(settingsButtonRef.current) 클릭한 요소(event.target)가 설정 버튼 내부에 없을 때, 메뉴창이 존재하고, 클릭한 요소(메뉴창 내)가 없을 때 메뉴창을 닫겠다.
      if (settingsMenuVisible &&
          settingsButtonRef.current && !settingsButtonRef.current.contains(event.target) && // 이처럼 ref의 객체의 기능이나 값을 이용하는 경우 current를 사용해야 한다.
          dropdownMenuRef.current && !dropdownMenuRef.current.contains(event.target)) { // contains는 한 노드가 다른 노드를 포함하고 있는지 여부. 괄호 안에 노드가 자손이거나 그 자체일 경우 true를 반환
        setSettingsMenuVisible(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside); // mousedown(클릭할 때) handleClickOutside 함수를 실행하는 이벤트를 추가함. 어느상황에서의 클릭도 실행함.
    return () => { // 이 return 되는 부분을 clean-up 함수라고 함. 메모리 누수를 막기위해서 사용. 컴포넌트가 unmount되거나 배열의 명시된 값이 변경될 때만 실행. -> 맨 처음에는 실행 안된다는 뜻
      document.removeEventListener("mousedown", handleClickOutside); // 클릭 감지기를 제거 역할
    };
  }, [settingsMenuVisible]); // 이 배열안에 즉, settingsMenuVisible의 상태가 바뀔 때 마다(true->false, false->true) mousedown 이벤트 리스너를 제거한 후 다시 추가한다는 뜻. 즉, cleanup함수 실행 시킨 뒤 useEffect 다시 실행.

  // resize-mode(크기 및 위치 변경 모드)일 때 설정버튼을 감추위한 boolean
  const [ifResizeModeShowButton, setIfResizeModeShowButton] = useState(true);
  useEffect(() => {
    // MutationObserver 초기화
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isResizeMode = document.body.classList.contains('resize-mode');
          setIfResizeModeShowButton(!isResizeMode);
          setSettingsMenuVisible(false); // 메뉴도 감춤
        }
      });
    });

    // body 요소에 대한 관찰 시작
    observer.observe(document.body, { attributes: true });

    // 컴포넌트 unmount 시 관찰 중단
    return () => observer.disconnect();
  }, []);

  // DB에서 이벤트 가져와 보여주기
  const [events, setEvents] = useState([]); // 오브젝트 형태는 []로 초기화를 해야 하나보네.
  useEffect(() => {
    axios.get('/events')
      .then(response => {
        const fetchedEvents = response.data.map(e => {
          const info = JSON.parse(e.info);
          return {
            id: e.id,
            start: new Date(info.start),
            end: new Date(info.end),
            allDay: info.allDay,
            title: e.title
          };
        });
        setEvents(fetchedEvents);
      })
      .catch(error => console.error(error));
  }, []);

  // Event의 제목을 실시간으로 초기화 하기위한 함수
  const fetchEvents = () => {
    axios.get('/events')
      .then(response => {
        const fetchedEvents = response.data.map(e => {
          const info = JSON.parse(e.info);
          return {
            id: e.id,
            start: new Date(info.start),
            end: new Date(info.end),
            allDay: info.allDay,
            title: e.title
          };
        });
        setEvents(fetchedEvents);
      })
      .catch(error => console.error(error));
  };
  useEffect(() => {
    fetchEvents();
  }, []);

  return <div className="calendarMain">
    {isElectron() && ifResizeModeShowButton && ( // electron이 실행될 때 isElectron 함수가 실행되며 톱니바퀴를 보여주며 누를 수 있다.
        <button
          className="settings-button"
          onClick={handleSettingsClick}
          ref={settingsButtonRef} // 메뉴 외부의 창 클릭 시 메뉴 닫게 하는 ref
        >
          <img src={gearImg} alt="image_error" style={{ width: '35px', height: '35px'  }} />
        </button>
    )}
    {!ifResizeModeShowButton && <div class="ResizeButton">
                                                        <ResizeButton/>
                                                        </div>}

    <Fullcalendar
    locales={allLocales}
    locale={'ko'}
    dayCellContent={customDayCellContent} // day 셀 안에 내용 설정. '일'문구 삭제를 위해.
    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
    initialView={'dayGridMonth'}
    headerToolbar={{
      start: 'prev,next today',
      center: 'title',
      end: 'dayGridMonth,timeGridWeek,timeGridDay'
    }}
    height="100%" // 화면 채우기 위해 사용. css 에 100vh까지 해줘야지 창의 크기를 바꿔도 전체로 채워진다
    events={events} // DB에서 이벤트 가져와 보여주기
    selectable={true} // 연속된 날짜 선택
    select={(arg) => { // select 사용 시 함수로 한 번 감싸야 한다. 단일날짜 클릭 및 연속된 날짜 선택시 발동
      setShow(true);
      setSelectedInfo(arg);


    }}
    eventClick={(arg) => {
      setEventTitle(arg.event.title);
      setShowEvent(true);
      setEventInfo({
        allDay: arg.event.allDay,
        end: arg.event.end,
        endStr: arg.event.endStr,
        start: arg.event.start,
        startStr: arg.event.startStr,
        view: arg.view.type,
      });
      setSelectedEventId(arg.event.id);
      setEventArg(arg);
    }}
    />
  {/* 그냥 모달창을 불러오면 캘린더 실행 시 켜지기 때문에 show가 true이면서 조건도 추가하면 클릭할 때 모달창을 보여줄 수 있다. */}
  {show && <ModalCal setShow={setShow}
                                      show={show}
                                      selectedInfo={selectedInfo} 
                                      setEvents={setEvents}
                                      fetchEvents={fetchEvents}/>}
  {showEvent && <EventOpen setShowEvent={setShowEvent}
                                                  showEvent={showEvent}
                                                  setEvents={setEvents}
                                                  eventTitle={eventTitle}
                                                  eventInfo={eventInfo}
                                                  selectedEventId={selectedEventId}
                                                  eventArg={eventArg}
                                                  fetchEvents={fetchEvents}/>}

                                      {/* div로 묶어서 이런 옵션을 추가 해야 메뉴가 커서위치를 파악해서 그 위치에 나타남 */}                                        {/* 메뉴 외부의 창 클릭 시 메뉴 닫게 하는 ref */}
  {settingsMenuVisible && <div class="settingsMenu" style={{ position: 'absolute', left: menuPosition.left, top: menuPosition.top}} ref={dropdownMenuRef}>
                                           <SettingsMenu settingsMenuVisible={settingsMenuVisible}
                                                                    setSettingsMenuVisible={setSettingsMenuVisible}
                                                                    setShowTransparencyModal={setShowTransparencyModal}/> {/* 투명도 조절 모달의 상태 변경 함수 전달 */}
                                           </div>}
  {showTransparencyModal && <TransparencyControl onClose={() => setShowTransparencyModal(false)} />} {/* 투명도 조절 모달 보여주기/숨기기 */}
  </div>
}

export default Calendar