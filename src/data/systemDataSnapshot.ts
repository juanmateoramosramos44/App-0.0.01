import { TechnicianSchedule, HotelRequest, Incident, MeterDefinition, MeterReadingRecord, User, RoundCheckpoint } from "../types";

export const SNAPSHOT_SCHEDULES: TechnicianSchedule[] = [
  {
    "endTime": "22:00",
    "technicianRole": "admin",
    "notes": "",
    "technicianId": "usr-1789230683226",
    "technicianName": "Juan Mateo Ramos",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "date": "2026-09-01",
    "shiftType": "tarde",
    "isOnCall": false,
    "id": "sched-1790557886393-54yh7",
    "createdAt": "2026-09-28T01:11:26.393Z",
    "startTime": "13:00",
    "updatedAt": "2026-09-28T01:11:26.393Z"
  },
  {
    "technicianId": "usr-1789435937593",
    "id": "sched-1790621879100-3267a",
    "isOnCall": false,
    "shiftType": "diurno",
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "date": "2026-10-01",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T18:57:59.100Z",
    "startTime": "08:00",
    "updatedAt": "2026-09-28T18:57:59.100Z",
    "technicianName": "Carlos Manuel/ Técnico",
    "endTime": "17:00",
    "notes": ""
  },
  {
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "usr-1789437863324",
    "date": "2026-10-01",
    "shiftType": "tarde",
    "endTime": "22:00",
    "technicianRole": "técnico",
    "id": "sched-1790622559404-5o9p6",
    "updatedAt": "2026-09-28T19:09:19.404Z",
    "isOnCall": false,
    "technicianName": "Ferney Alonso/Supervisor",
    "notes": "",
    "createdAt": "2026-09-28T19:09:19.404Z",
    "startTime": "13:00"
  },
  {
    "technicianId": "usr-1789246875257",
    "shiftType": "manana",
    "id": "sched-1790621500390-tz3wk",
    "updatedAt": "2026-09-28T22:27:59.151Z",
    "createdAt": "2026-09-28T18:51:40.390Z",
    "startTime": "06:00",
    "endTime": "14:00",
    "breakDurationMinutes": 60,
    "technicianName": "Ferney Machado",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "date": "2026-10-01",
    "technicianRole": "técnico",
    "notes": ""
  },
  {
    "startTime": "00:00",
    "createdAt": "2026-09-28T18:49:50.236Z",
    "technicianRole": "Administrador de Mantenimiento",
    "department": "Mantenimiento e Ingeniería",
    "updatedAt": "2026-09-28T18:50:10.927Z",
    "notes": "",
    "status": "programado",
    "date": "2026-10-01",
    "technicianName": "Juan Mateo Ramos",
    "endTime": "00:00",
    "shiftType": "descanso",
    "technicianId": "usr-1789230683226",
    "assignedAreas": [
      "Cuarto de Bombas",
      "Zona Apartamentos",
      "Hotel General"
    ],
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "id": "sched-usr-1789230683226-2026-10-01"
  },
  {
    "technicianId": "usr-1789435937593",
    "shiftType": "diurno",
    "id": "sched-1790621884045-lugg3",
    "date": "2026-10-02",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-09-28T18:58:04.045Z",
    "startTime": "08:00",
    "createdAt": "2026-09-28T18:58:04.045Z",
    "breakDurationMinutes": 60,
    "technicianName": "Carlos Manuel/ Técnico",
    "isOnCall": false,
    "endTime": "17:00",
    "notes": "",
    "technicianRole": "técnico"
  },
  {
    "date": "2026-10-02",
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T19:09:14.238Z",
    "startTime": "13:00",
    "endTime": "22:00",
    "updatedAt": "2026-09-28T19:09:14.238Z",
    "technicianId": "usr-1789437863324",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "shiftType": "tarde",
    "technicianName": "Ferney Alonso/Supervisor",
    "notes": "",
    "technicianRole": "técnico",
    "id": "sched-1790622554238-ldq2w"
  },
  {
    "shiftType": "manana",
    "technicianRole": "técnico",
    "id": "sched-1790621508061-bq7j6",
    "endTime": "14:00",
    "technicianId": "usr-1789246875257",
    "updatedAt": "2026-09-28T22:18:08.168Z",
    "date": "2026-10-02",
    "technicianName": "Ferney Machado/Técnico",
    "startTime": "06:00",
    "createdAt": "2026-09-28T18:51:48.061Z",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": ""
  },
  {
    "technicianRole": "Administrador de Mantenimiento",
    "createdAt": "2026-09-28T18:49:50.236Z",
    "startTime": "00:00",
    "updatedAt": "2026-09-28T18:50:16.662Z",
    "status": "programado",
    "id": "sched-usr-1789230683226-2026-10-02",
    "department": "Mantenimiento e Ingeniería",
    "technicianName": "Juan Mateo Ramos",
    "shiftType": "descanso",
    "technicianId": "usr-1789230683226",
    "endTime": "00:00",
    "assignedAreas": [
      "Cuarto de Bombas",
      "Zona Apartamentos",
      "Hotel General"
    ],
    "notes": "",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "date": "2026-10-02"
  },
  {
    "createdAt": "2026-09-28T18:58:37.363Z",
    "startTime": "08:00",
    "date": "2026-10-03",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-09-28T18:58:37.363Z",
    "id": "sched-1790621917363-kqshl",
    "shiftType": "diurno",
    "technicianId": "usr-1789435937593",
    "technicianName": "Carlos Manuel/ Técnico",
    "isOnCall": false,
    "technicianRole": "técnico",
    "endTime": "17:00",
    "breakDurationMinutes": 60
  },
  {
    "endTime": "14:00",
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "id": "sched-1790622509073-hb6o3",
    "technicianId": "usr-1789437863324",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "technicianName": "Ferney Alonso/Supervisor",
    "isOnCall": false,
    "shiftType": "manana",
    "createdAt": "2026-09-28T19:08:29.073Z",
    "startTime": "06:00",
    "date": "2026-10-03",
    "updatedAt": "2026-09-28T19:08:29.073Z"
  },
  {
    "technicianId": "usr-1789246875257",
    "shiftType": "descanso",
    "createdAt": "2026-09-28T19:00:27.260Z",
    "startTime": "00:00",
    "breakDurationMinutes": 60,
    "notes": "",
    "date": "2026-10-03",
    "updatedAt": "2026-09-28T22:18:13.584Z",
    "technicianRole": "técnico",
    "id": "sched-1790622027260-p27lu",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Ferney Machado/Técnico",
    "endTime": "00:00",
    "isOnCall": false
  },
  {
    "technicianRole": "Administrador de Mantenimiento",
    "updatedAt": "2026-09-28T18:50:24.283Z",
    "isOnCall": false,
    "endTime": "22:00",
    "createdAt": "2026-09-28T18:49:50.236Z",
    "startTime": "13:00",
    "technicianId": "usr-1789230683226",
    "shiftType": "tarde",
    "technicianName": "Juan Mateo Ramos",
    "assignedAreas": [
      "Cuarto de Bombas",
      "Zona Apartamentos",
      "Hotel General"
    ],
    "department": "Mantenimiento e Ingeniería",
    "breakDurationMinutes": 60,
    "date": "2026-10-03",
    "status": "programado",
    "id": "sched-usr-1789230683226-2026-10-03",
    "notes": ""
  },
  {
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "technicianName": "Carlos Manuel/ Técnico",
    "endTime": "00:00",
    "updatedAt": "2026-09-28T18:58:45.445Z",
    "isOnCall": false,
    "startTime": "00:00",
    "createdAt": "2026-09-28T18:58:45.445Z",
    "date": "2026-10-04",
    "technicianId": "usr-1789435937593",
    "shiftType": "descanso",
    "id": "sched-1790621925445-38t56"
  },
  {
    "isOnCall": false,
    "endTime": "14:00",
    "date": "2026-10-04",
    "updatedAt": "2026-09-28T19:08:08.224Z",
    "technicianName": "Ferney Alonso/Supervisor",
    "startTime": "06:00",
    "createdAt": "2026-09-28T19:06:37.980Z",
    "shiftType": "manana",
    "breakDurationMinutes": 60,
    "technicianId": "usr-1789437863324",
    "technicianRole": "técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "id": "sched-1790622397980-p6obl"
  },
  {
    "technicianRole": "técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "00:00",
    "createdAt": "2026-09-28T19:00:31.256Z",
    "updatedAt": "2026-09-28T22:18:17.633Z",
    "technicianName": "Ferney Machado/Técnico",
    "breakDurationMinutes": 60,
    "endTime": "00:00",
    "shiftType": "descanso",
    "technicianId": "usr-1789246875257",
    "date": "2026-10-04",
    "notes": "",
    "id": "sched-1790622031256-bfyun",
    "isOnCall": false
  },
  {
    "isOnCall": false,
    "technicianId": "usr-1789230683226",
    "endTime": "22:00",
    "notes": "",
    "assignedAreas": [
      "Cuarto de Bombas",
      "Zona Apartamentos",
      "Hotel General"
    ],
    "department": "Mantenimiento e Ingeniería",
    "updatedAt": "2026-09-28T18:50:50.683Z",
    "status": "programado",
    "technicianRole": "Administrador de Mantenimiento",
    "breakDurationMinutes": 60,
    "startTime": "13:00",
    "createdAt": "2026-09-28T18:49:50.236Z",
    "id": "sched-usr-1789230683226-2026-10-04",
    "shiftType": "tarde",
    "technicianName": "Juan Mateo Ramos",
    "date": "2026-10-04"
  },
  {
    "id": "sched-1790621937509-gm5fv",
    "technicianName": "Carlos Manuel/ Técnico",
    "notes": "",
    "shiftType": "tarde",
    "isOnCall": false,
    "technicianRole": "técnico",
    "createdAt": "2026-09-28T18:58:57.509Z",
    "startTime": "13:00",
    "updatedAt": "2026-09-28T18:58:57.509Z",
    "breakDurationMinutes": 60,
    "endTime": "22:00",
    "date": "2026-10-05",
    "technicianId": "usr-1789435937593",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "updatedAt": "2026-09-28T22:29:27.825Z",
    "id": "sched-1790622200620-8sj67",
    "technicianName": "Ferney Alonso",
    "startTime": "00:00",
    "createdAt": "2026-09-28T19:03:20.620Z",
    "shiftType": "descanso",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "date": "2026-10-05",
    "technicianId": "usr-1789437863324",
    "isOnCall": false,
    "endTime": "00:00",
    "breakDurationMinutes": 60,
    "notes": ""
  },
  {
    "updatedAt": "2026-09-28T19:00:37.319Z",
    "date": "2026-10-05",
    "endTime": "14:00",
    "breakDurationMinutes": 60,
    "startTime": "06:00",
    "createdAt": "2026-09-28T19:00:37.319Z",
    "shiftType": "manana",
    "isOnCall": false,
    "technicianId": "usr-1789246875257",
    "technicianName": "Ferney Machado/Técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "technicianRole": "técnico",
    "id": "sched-1790622037319-3o4sb"
  },
  {
    "technicianName": "Juan Mateo/Técnico",
    "technicianId": "usr-1789230683226",
    "technicianRole": "admin",
    "date": "2026-10-05",
    "notes": "",
    "endTime": "17:00",
    "shiftType": "diurno",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "startTime": "08:00",
    "createdAt": "2026-09-28T18:50:57.326Z",
    "id": "sched-1790621457326-7bu29",
    "updatedAt": "2026-09-28T18:50:57.326Z",
    "breakDurationMinutes": 60
  },
  {
    "breakDurationMinutes": 60,
    "id": "sched-1790621944564-6n131",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "endTime": "22:00",
    "shiftType": "tarde",
    "technicianRole": "técnico",
    "date": "2026-10-06",
    "technicianId": "usr-1789435937593",
    "updatedAt": "2026-09-28T18:59:04.564Z",
    "createdAt": "2026-09-28T18:59:04.564Z",
    "startTime": "13:00",
    "technicianName": "Carlos Manuel/ Técnico",
    "isOnCall": false
  },
  {
    "technicianName": "Ferney Alonso/Supervisor",
    "shiftType": "descanso",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "usr-1789437863324",
    "endTime": "00:00",
    "updatedAt": "2026-09-28T22:29:42.704Z",
    "technicianRole": "técnico",
    "isOnCall": false,
    "id": "sched-1790622194852-2k2cl",
    "createdAt": "2026-09-28T19:03:14.852Z",
    "startTime": "00:00",
    "date": "2026-10-06",
    "notes": "",
    "breakDurationMinutes": 60
  },
  {
    "shiftType": "manana",
    "createdAt": "2026-09-28T19:00:46.509Z",
    "startTime": "06:00",
    "updatedAt": "2026-09-28T19:00:46.509Z",
    "date": "2026-10-06",
    "endTime": "14:00",
    "id": "sched-1790622046508-mzqfx",
    "technicianName": "Ferney Machado/Técnico",
    "technicianId": "usr-1789246875257",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "technicianRole": "técnico"
  },
  {
    "technicianName": "Juan Mateo/Técnico",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "technicianRole": "admin",
    "date": "2026-10-06",
    "id": "sched-1790621461947-eqoaw",
    "endTime": "17:00",
    "technicianId": "usr-1789230683226",
    "notes": "",
    "shiftType": "diurno",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T18:51:01.947Z",
    "startTime": "08:00",
    "updatedAt": "2026-09-28T18:51:01.947Z"
  },
  {
    "endTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-07",
    "id": "sched-1790621955877-fzuk7",
    "technicianRole": "técnico",
    "notes": "",
    "startTime": "00:00",
    "createdAt": "2026-09-28T18:59:15.877Z",
    "updatedAt": "2026-09-28T18:59:15.877Z",
    "isOnCall": false,
    "technicianName": "Carlos Manuel/ Técnico",
    "breakDurationMinutes": 60,
    "technicianId": "usr-1789435937593",
    "shiftType": "descanso"
  },
  {
    "technicianRole": "técnico",
    "startTime": "13:00",
    "createdAt": "2026-09-28T19:03:03.986Z",
    "technicianId": "usr-1789437863324",
    "updatedAt": "2026-09-28T22:29:58.473Z",
    "notes": "",
    "technicianName": "Ferney Alonso/Supervisor",
    "shiftType": "tarde",
    "breakDurationMinutes": 60,
    "endTime": "22:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "id": "sched-1790622183986-a3ue5",
    "date": "2026-10-07"
  },
  {
    "id": "sched-1790622078957-iuno0",
    "date": "2026-10-07",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "usr-1789246875257",
    "breakDurationMinutes": 60,
    "endTime": "14:00",
    "isOnCall": false,
    "updatedAt": "2026-09-28T19:01:18.957Z",
    "technicianName": "Ferney Machado/Técnico",
    "createdAt": "2026-09-28T19:01:18.957Z",
    "startTime": "06:00",
    "notes": "",
    "shiftType": "manana",
    "technicianRole": "técnico"
  },
  {
    "technicianName": "Juan Mateo/Técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "usr-1789230683226",
    "isOnCall": false,
    "technicianRole": "admin",
    "date": "2026-10-07",
    "endTime": "17:00",
    "breakDurationMinutes": 60,
    "notes": "",
    "updatedAt": "2026-09-28T18:51:05.926Z",
    "startTime": "08:00",
    "createdAt": "2026-09-28T18:51:05.926Z",
    "id": "sched-1790621465926-9fy4z",
    "shiftType": "diurno"
  },
  {
    "endTime": "22:00",
    "notes": "",
    "breakDurationMinutes": 60,
    "technicianId": "usr-1789435937593",
    "id": "sched-1790621964532-4kuqj",
    "isOnCall": false,
    "technicianName": "Carlos Manuel/ Técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "tarde",
    "technicianRole": "técnico",
    "date": "2026-10-08",
    "updatedAt": "2026-09-28T18:59:24.532Z",
    "startTime": "13:00",
    "createdAt": "2026-09-28T18:59:24.532Z"
  },
  {
    "createdAt": "2026-09-28T19:02:46.631Z",
    "startTime": "06:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-09-28T22:30:10.544Z",
    "breakDurationMinutes": 60,
    "notes": "",
    "endTime": "14:00",
    "date": "2026-10-08",
    "shiftType": "manana",
    "technicianName": "Ferney Alonso/Supervisor",
    "id": "sched-1790622166631-s28l7",
    "isOnCall": false,
    "technicianRole": "técnico",
    "technicianId": "usr-1789437863324"
  },
  {
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-08",
    "shiftType": "descanso",
    "createdAt": "2026-09-28T19:01:22.422Z",
    "startTime": "00:00",
    "technicianId": "usr-1789246875257",
    "updatedAt": "2026-09-28T19:01:22.422Z",
    "id": "sched-1790622082422-e0x7k",
    "notes": "",
    "breakDurationMinutes": 60,
    "technicianName": "Ferney Machado/Técnico",
    "endTime": "00:00",
    "technicianRole": "técnico"
  },
  {
    "date": "2026-10-08",
    "endTime": "17:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "shiftType": "diurno",
    "createdAt": "2026-09-28T18:51:13.126Z",
    "startTime": "08:00",
    "technicianId": "usr-1789230683226",
    "notes": "",
    "isOnCall": false,
    "updatedAt": "2026-09-28T18:51:13.126Z",
    "technicianRole": "admin",
    "id": "sched-1790621473126-j4mpx",
    "technicianName": "Juan Mateo/Técnico"
  },
  {
    "breakDurationMinutes": 60,
    "shiftType": "noche",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "09:00",
    "createdAt": "2026-09-28T18:53:03.288Z",
    "technicianId": "usr-1789435937593",
    "isOnCall": false,
    "updatedAt": "2026-09-28T18:53:54.092Z",
    "technicianName": "Carlos Manuel/ Técnico",
    "id": "sched-1790621583288-3lu5q",
    "date": "2026-10-09",
    "technicianRole": "técnico",
    "endTime": "06:00"
  },
  {
    "technicianRole": "técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1790622151286-nedbf",
    "technicianName": "Ferney Alonso/Supervisor",
    "date": "2026-10-09",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "shiftType": "tarde",
    "technicianId": "usr-1789437863324",
    "notes": "",
    "updatedAt": "2026-09-28T22:30:15.263Z",
    "createdAt": "2026-09-28T19:02:31.286Z",
    "startTime": "13:00",
    "endTime": "22:00"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "technicianId": "usr-1789246875257",
    "date": "2026-10-09",
    "technicianRole": "técnico",
    "id": "sched-1790622086803-v9hdc",
    "shiftType": "descanso",
    "endTime": "00:00",
    "technicianName": "Ferney Machado/Técnico",
    "createdAt": "2026-09-28T19:01:26.803Z",
    "startTime": "00:00",
    "updatedAt": "2026-09-28T19:01:26.803Z"
  },
  {
    "id": "sched-1790621479363-ayfsn",
    "endTime": "14:00",
    "technicianId": "usr-1789230683226",
    "breakDurationMinutes": 60,
    "date": "2026-10-09",
    "shiftType": "manana",
    "technicianName": "Juan Mateo/Técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "06:00",
    "createdAt": "2026-09-28T18:51:19.363Z",
    "notes": "",
    "updatedAt": "2026-09-28T19:02:26.077Z",
    "isOnCall": false,
    "technicianRole": "admin"
  },
  {
    "notes": "",
    "id": "sched-1790621588823-pj347",
    "technicianId": "usr-1789435937593",
    "endTime": "06:00",
    "isOnCall": false,
    "date": "2026-10-10",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "shiftType": "noche",
    "technicianName": "Carlos Manuel/ Técnico",
    "startTime": "09:00",
    "createdAt": "2026-09-28T18:53:08.823Z",
    "technicianRole": "técnico",
    "updatedAt": "2026-09-28T18:54:06.605Z"
  },
  {
    "updatedAt": "2026-09-28T22:30:21.960Z",
    "technicianRole": "técnico",
    "endTime": "14:00",
    "technicianId": "usr-1789437863324",
    "startTime": "06:00",
    "createdAt": "2026-09-28T18:55:35.419Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "manana",
    "technicianName": "Ferney Alonso/Supervisor",
    "date": "2026-10-10",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "id": "sched-1790621735419-p5656",
    "notes": ""
  },
  {
    "isOnCall": false,
    "updatedAt": "2026-09-28T18:55:22.772Z",
    "createdAt": "2026-09-28T18:55:22.772Z",
    "startTime": "13:00",
    "technicianName": "Ferney Machado/Técnico",
    "breakDurationMinutes": 60,
    "shiftType": "tarde",
    "technicianRole": "técnico",
    "id": "sched-1790621722772-j45uw",
    "date": "2026-10-10",
    "technicianId": "usr-1789246875257",
    "notes": "",
    "endTime": "22:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "endTime": "00:00",
    "startTime": "00:00",
    "createdAt": "2026-09-28T18:54:36.604Z",
    "updatedAt": "2026-09-28T18:54:36.605Z",
    "date": "2026-10-10",
    "notes": "",
    "isOnCall": false,
    "shiftType": "descanso",
    "id": "sched-1790621676604-cj9km",
    "technicianRole": "admin",
    "breakDurationMinutes": 60,
    "technicianId": "usr-1789230683226",
    "technicianName": "Juan Mateo/Técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "id": "sched-1790621594118-f2r2j",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-11",
    "notes": "",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "endTime": "06:00",
    "technicianName": "Carlos Manuel/ Técnico",
    "shiftType": "noche",
    "startTime": "09:00",
    "createdAt": "2026-09-28T18:53:14.118Z",
    "technicianRole": "técnico",
    "technicianId": "usr-1789435937593",
    "updatedAt": "2026-09-28T18:54:15.645Z"
  },
  {
    "technicianName": "Ferney Alonso/Supervisor",
    "technicianId": "usr-1789437863324",
    "date": "2026-10-11",
    "technicianRole": "técnico",
    "isOnCall": false,
    "startTime": "06:00",
    "createdAt": "2026-09-28T18:56:08.679Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-09-28T22:30:25.609Z",
    "id": "sched-1790621768679-g2csr",
    "endTime": "14:00",
    "breakDurationMinutes": 60,
    "notes": "",
    "shiftType": "manana"
  },
  {
    "technicianId": "usr-1789246875257",
    "date": "2026-10-11",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "endTime": "22:00",
    "isOnCall": false,
    "id": "sched-1790621779332-32lw1",
    "technicianName": "Ferney Machado/Técnico",
    "shiftType": "tarde",
    "startTime": "13:00",
    "createdAt": "2026-09-28T18:56:19.332Z",
    "technicianRole": "técnico",
    "updatedAt": "2026-09-28T18:56:19.332Z"
  },
  {
    "shiftType": "descanso",
    "endTime": "00:00",
    "id": "sched-1790621787879-cab6j",
    "technicianId": "usr-1789230683226",
    "technicianName": "Juan Mateo/Técnico",
    "date": "2026-10-11",
    "isOnCall": false,
    "updatedAt": "2026-09-28T18:56:27.879Z",
    "technicianRole": "admin",
    "createdAt": "2026-09-28T18:56:27.879Z",
    "startTime": "00:00",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60
  },
  {
    "technicianRole": "técnico",
    "technicianName": "Carlos Manuel/ Técnico",
    "breakDurationMinutes": 60,
    "date": "2026-10-12",
    "shiftType": "noche",
    "technicianId": "usr-1789435937593",
    "isOnCall": false,
    "createdAt": "2026-09-28T18:53:22.272Z",
    "startTime": "09:00",
    "notes": "",
    "id": "sched-1790621602272-ldtsb",
    "endTime": "06:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-09-28T18:55:46.800Z"
  },
  {
    "id": "sched-1790623822029-bnqer",
    "technicianRole": "técnico",
    "endTime": "00:00",
    "notes": "",
    "isOnCall": false,
    "technicianName": "Ferney Alonso",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-09-28T22:30:39.550Z",
    "technicianId": "usr-1789437863324",
    "startTime": "00:00",
    "createdAt": "2026-09-28T19:30:22.029Z",
    "date": "2026-10-12",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "descanso"
  },
  {
    "createdAt": "2026-09-28T19:32:19.551Z",
    "startTime": "13:00",
    "id": "sched-1790623939551-odlob",
    "updatedAt": "2026-09-28T19:32:19.551Z",
    "isOnCall": false,
    "date": "2026-10-12",
    "endTime": "22:00",
    "shiftType": "tarde",
    "technicianId": "usr-1789246875257",
    "notes": "",
    "technicianName": "Ferney Machado/Técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "technicianRole": "técnico"
  },
  {
    "technicianRole": "admin",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1790623831662-tatgh",
    "technicianName": "Juan Mateo/Técnico",
    "endTime": "14:00",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "createdAt": "2026-09-28T19:30:31.662Z",
    "startTime": "06:00",
    "date": "2026-10-12",
    "updatedAt": "2026-09-28T19:30:31.662Z",
    "technicianId": "usr-1789230683226",
    "notes": "",
    "shiftType": "manana"
  },
  {
    "isOnCall": false,
    "technicianRole": "técnico",
    "endTime": "00:00",
    "breakDurationMinutes": 60,
    "technicianId": "usr-1789435937593",
    "id": "sched-1790621979774-xq859",
    "technicianName": "Carlos Manuel/ Técnico",
    "updatedAt": "2026-09-28T18:59:39.775Z",
    "startTime": "00:00",
    "createdAt": "2026-09-28T18:59:39.774Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "descanso",
    "notes": "",
    "date": "2026-10-13"
  },
  {
    "technicianRole": "técnico",
    "shiftType": "descanso",
    "createdAt": "2026-09-28T19:33:05.385Z",
    "startTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "technicianName": "Ferney Alonso/Supervisor",
    "updatedAt": "2026-09-28T22:30:57.398Z",
    "date": "2026-10-13",
    "id": "sched-1790623985385-1eyxu",
    "technicianId": "usr-1789437863324",
    "endTime": "00:00",
    "notes": "",
    "isOnCall": false
  },
  {
    "technicianRole": "técnico",
    "date": "2026-10-13",
    "notes": "",
    "technicianId": "usr-1789246875257",
    "technicianName": "Ferney Machado/Técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "endTime": "22:00",
    "shiftType": "tarde",
    "breakDurationMinutes": 60,
    "id": "sched-1790623875374-rvx57",
    "updatedAt": "2026-09-28T19:31:15.374Z",
    "startTime": "13:00",
    "createdAt": "2026-09-28T19:31:15.374Z"
  },
  {
    "updatedAt": "2026-09-28T19:30:50.413Z",
    "breakDurationMinutes": 60,
    "id": "sched-1790623850413-fuoug",
    "createdAt": "2026-09-28T19:30:50.413Z",
    "startTime": "06:00",
    "endTime": "14:00",
    "notes": "",
    "shiftType": "manana",
    "technicianName": "Juan Mateo/Técnico",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "usr-1789230683226",
    "technicianRole": "admin",
    "date": "2026-10-13"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "00:00",
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "updatedAt": "2026-09-28T18:59:49.157Z",
    "isOnCall": false,
    "startTime": "00:00",
    "createdAt": "2026-09-28T18:59:44.391Z",
    "notes": "",
    "shiftType": "descanso",
    "date": "2026-10-14",
    "technicianId": "usr-1789435937593",
    "technicianName": "Carlos Manuel/ Técnico",
    "id": "sched-1790621984391-p0i3m"
  },
  {
    "technicianId": "usr-1789437863324",
    "shiftType": "supervisor",
    "technicianName": "Ferney Alonso/Supervisor",
    "endTime": "19:00",
    "createdAt": "2026-09-28T19:33:10.454Z",
    "startTime": "10:00",
    "notes": "",
    "id": "sched-1790623990454-sugfu",
    "technicianRole": "técnico",
    "updatedAt": "2026-09-28T22:31:10.493Z",
    "breakDurationMinutes": 60,
    "date": "2026-10-14",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false
  },
  {
    "shiftType": "tarde",
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "updatedAt": "2026-09-28T19:33:38.617Z",
    "createdAt": "2026-09-28T19:33:38.616Z",
    "startTime": "13:00",
    "technicianName": "Ferney Machado/Técnico",
    "endTime": "22:00",
    "notes": "",
    "id": "sched-1790624018616-z103g",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-14",
    "technicianId": "usr-1789246875257"
  },
  {
    "createdAt": "2026-09-28T19:30:53.857Z",
    "startTime": "06:00",
    "id": "sched-1790623853857-sdiqj",
    "updatedAt": "2026-09-28T19:30:53.857Z",
    "technicianName": "Juan Mateo/Técnico",
    "notes": "",
    "endTime": "14:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-14",
    "technicianRole": "admin",
    "shiftType": "manana",
    "technicianId": "usr-1789230683226",
    "isOnCall": false,
    "breakDurationMinutes": 60
  },
  {
    "technicianName": "Carlos Manuel/ Técnico",
    "technicianId": "usr-1789435937593",
    "isOnCall": false,
    "technicianRole": "técnico",
    "notes": "",
    "endTime": "22:00",
    "date": "2026-10-15",
    "breakDurationMinutes": 60,
    "startTime": "13:00",
    "createdAt": "2026-09-28T19:34:18.351Z",
    "id": "sched-1790624058351-iqk7w",
    "updatedAt": "2026-09-28T19:34:18.351Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "tarde"
  },
  {
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "usr-1789437863324",
    "breakDurationMinutes": 60,
    "shiftType": "supervisor",
    "notes": "",
    "technicianRole": "técnico",
    "endTime": "19:00",
    "id": "sched-1790623995389-oa5gt",
    "date": "2026-10-15",
    "updatedAt": "2026-09-28T22:31:19.407Z",
    "technicianName": "Ferney Alonso/Supervisor",
    "createdAt": "2026-09-28T19:33:15.389Z",
    "startTime": "10:00"
  },
  {
    "notes": "",
    "id": "sched-1790624026064-doo7g",
    "breakDurationMinutes": 60,
    "endTime": "00:00",
    "technicianId": "usr-1789246875257",
    "updatedAt": "2026-09-28T19:33:46.064Z",
    "createdAt": "2026-09-28T19:33:46.064Z",
    "startTime": "00:00",
    "technicianRole": "técnico",
    "date": "2026-10-15",
    "shiftType": "descanso",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Ferney Machado/Técnico",
    "isOnCall": false
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Juan Mateo/Técnico",
    "id": "sched-1790623857293-psk3g",
    "technicianId": "usr-1789230683226",
    "shiftType": "manana",
    "notes": "",
    "createdAt": "2026-09-28T19:30:57.293Z",
    "startTime": "06:00",
    "breakDurationMinutes": 60,
    "technicianRole": "admin",
    "isOnCall": false,
    "updatedAt": "2026-09-28T19:30:57.293Z",
    "date": "2026-10-15",
    "endTime": "14:00"
  },
  {
    "startTime": "13:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "createdAt": "2026-09-29T14:37:08.868Z",
    "technicianName": "Juan Mateo",
    "date": "2026-09-29",
    "technicianRole": "admin",
    "technicianId": "pers-1",
    "updatedAt": "2026-09-29T15:08:03.779Z",
    "breakDurationMinutes": 60,
    "id": "sched-1790692628868-joe5m",
    "notes": "",
    "endTime": "22:00",
    "shiftType": "tarde"
  },
  {
    "technicianId": "pers-2",
    "notes": "",
    "technicianName": "Ferney Machado",
    "date": "2026-09-29",
    "technicianRole": "técnico",
    "shiftType": "manana",
    "endTime": "15:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "06:00",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "updatedAt": "2026-09-29T15:08:10.631Z",
    "id": "sched-1790692662627-u0k0a",
    "createdAt": "2026-09-29T14:37:42.627Z"
  },
  {
    "endTime": "00:00",
    "startTime": "00:00",
    "technicianName": "Carlos Manuel",
    "updatedAt": "2026-09-29T15:08:18.199Z",
    "isOnCall": false,
    "date": "2026-09-29",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-29T15:08:18.199Z",
    "technicianRole": "técnico",
    "technicianId": "pers-3",
    "shiftType": "descanso",
    "id": "sched-1790694498199-k641o",
    "breakDurationMinutes": 60,
    "notes": ""
  },
  {
    "shiftType": "supervisor",
    "technicianId": "pers-4",
    "breakDurationMinutes": 60,
    "id": "sched-1790694504944-9w2mk",
    "technicianName": "Ferney Alonso",
    "endTime": "19:00",
    "isOnCall": false,
    "createdAt": "2026-09-29T15:08:24.944Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-09-29T15:08:24.944Z",
    "technicianRole": "técnico",
    "date": "2026-09-29",
    "startTime": "10:00",
    "notes": ""
  },
  {
    "endTime": "22:00",
    "shiftType": "tarde",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "date": "2026-09-30",
    "isOnCall": false,
    "notes": "",
    "startTime": "13:00",
    "id": "sched-1790694515924-zc2rh",
    "updatedAt": "2026-09-29T15:08:35.924Z",
    "technicianRole": "admin",
    "technicianId": "pers-1",
    "technicianName": "Juan Mateo",
    "createdAt": "2026-09-29T15:08:35.924Z"
  },
  {
    "date": "2026-09-30",
    "technicianId": "pers-2",
    "technicianRole": "técnico",
    "isOnCall": false,
    "shiftType": "manana",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "technicianName": "Ferney Machado",
    "endTime": "15:00",
    "startTime": "06:00",
    "createdAt": "2026-09-29T15:08:56.165Z",
    "notes": "",
    "id": "sched-1790694536165-zsjm0",
    "updatedAt": "2026-09-29T15:08:56.165Z"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-29T15:09:04.675Z",
    "date": "2026-09-30",
    "updatedAt": "2026-09-29T15:09:04.675Z",
    "technicianId": "pers-3",
    "startTime": "08:00",
    "id": "sched-1790694544675-9n9aw",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "endTime": "17:00",
    "notes": "",
    "technicianName": "Carlos Manuel",
    "shiftType": "diurno",
    "technicianRole": "técnico"
  },
  {
    "createdAt": "2026-09-29T15:09:13.532Z",
    "date": "2026-09-30",
    "updatedAt": "2026-09-29T15:09:13.532Z",
    "breakDurationMinutes": 60,
    "endTime": "19:00",
    "id": "sched-1790694553532-ci8py",
    "startTime": "10:00",
    "notes": "",
    "shiftType": "supervisor",
    "technicianId": "pers-4",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "technicianName": "Ferney Alonso"
  },
  {
    "createdAt": "2026-09-28T19:09:55.504Z",
    "isOnCall": false,
    "updatedAt": "2026-09-28T19:09:55.504Z",
    "startTime": "13:00",
    "breakDurationMinutes": 60,
    "id": "sched-1790622595504-w3diy",
    "technicianId": "usr-1790620816372",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Adrián Arturo",
    "endTime": "22:00",
    "notes": "",
    "shiftType": "tarde",
    "technicianRole": "Técnico de Mantenimiento",
    "date": "2026-10-01"
  },
  {
    "technicianId": "usr-1790632899774",
    "technicianRole": "Técnico de Mantenimiento",
    "shiftType": "tarde",
    "technicianName": "Adrián",
    "endTime": "22:00",
    "date": "2026-10-01",
    "updatedAt": "2026-09-28T22:36:48.226Z",
    "id": "sched-1790635008226-iht0r",
    "notes": "",
    "createdAt": "2026-09-28T22:36:48.226Z",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "13:00",
    "breakDurationMinutes": 60
  },
  {
    "breakDurationMinutes": 60,
    "endTime": "00:00",
    "shiftType": "descanso",
    "notes": "",
    "technicianRole": "admin",
    "technicianName": "Juan Mateo Ramos",
    "isOnCall": false,
    "createdAt": "2026-09-28T22:51:02.335Z",
    "updatedAt": "2026-09-28T22:51:02.335Z",
    "date": "2026-10-01",
    "startTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1790635862335-lqx3t",
    "technicianId": "pers-1"
  },
  {
    "createdAt": "2026-09-28T22:55:29.375Z",
    "updatedAt": "2026-09-28T22:55:29.375Z",
    "startTime": "06:00",
    "breakDurationMinutes": 60,
    "endTime": "14:00",
    "isOnCall": false,
    "technicianName": "Ferney Machado",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "shiftType": "manana",
    "technicianId": "pers-2",
    "id": "sched-1790636129375-ah340",
    "date": "2026-10-01"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "08:00",
    "isOnCall": false,
    "date": "2026-10-01",
    "updatedAt": "2026-09-28T22:58:26.735Z",
    "createdAt": "2026-09-28T22:58:26.735Z",
    "technicianName": "Carlos Manuel",
    "technicianId": "pers-3",
    "technicianRole": "técnico",
    "endTime": "17:00",
    "shiftType": "diurno",
    "id": "sched-1790636306735-5ul00",
    "notes": "",
    "breakDurationMinutes": 60
  },
  {
    "breakDurationMinutes": 60,
    "id": "sched-1790636941398-f7qy7",
    "shiftType": "tarde",
    "technicianId": "pers-4",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Alonso Supervisor",
    "notes": "",
    "technicianRole": "técnico",
    "date": "2026-10-01",
    "updatedAt": "2026-09-28T23:09:01.398Z",
    "createdAt": "2026-09-28T23:09:01.398Z",
    "endTime": "22:00",
    "startTime": "13:00",
    "isOnCall": false
  },
  {
    "shiftType": "tarde",
    "endTime": "22:00",
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "id": "sched-1790637229851-95152",
    "updatedAt": "2026-09-28T23:13:49.851Z",
    "isOnCall": false,
    "date": "2026-10-01",
    "technicianId": "pers-5",
    "createdAt": "2026-09-28T23:13:49.851Z",
    "technicianRole": "Técnico de Mantenimiento",
    "technicianName": "Adrián",
    "startTime": "13:00"
  },
  {
    "isOnCall": false,
    "notes": "",
    "shiftType": "tarde",
    "date": "2026-10-02",
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T19:10:00.830Z",
    "technicianId": "usr-1790620816372",
    "updatedAt": "2026-09-28T19:10:00.830Z",
    "startTime": "13:00",
    "id": "sched-1790622600830-8p986",
    "technicianRole": "Técnico de Mantenimiento",
    "technicianName": "Adrián Arturo",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "22:00"
  },
  {
    "updatedAt": "2026-09-28T22:36:54.113Z",
    "technicianName": "Adrián",
    "technicianId": "usr-1790632899774",
    "technicianRole": "Técnico de Mantenimiento",
    "createdAt": "2026-09-28T22:36:54.113Z",
    "isOnCall": false,
    "startTime": "13:00",
    "shiftType": "tarde",
    "notes": "",
    "date": "2026-10-02",
    "id": "sched-1790635014113-yxymm",
    "endTime": "22:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60
  },
  {
    "startTime": "00:00",
    "technicianName": "Juan Mateo Ramos",
    "createdAt": "2026-09-28T22:51:13.031Z",
    "technicianRole": "admin",
    "updatedAt": "2026-09-28T22:51:13.031Z",
    "date": "2026-10-02",
    "notes": "",
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-1",
    "endTime": "00:00",
    "id": "sched-1790635873031-4yaqe",
    "shiftType": "descanso",
    "isOnCall": false
  },
  {
    "endTime": "14:00",
    "date": "2026-10-02",
    "isOnCall": false,
    "startTime": "06:00",
    "technicianId": "pers-2",
    "createdAt": "2026-09-28T22:55:35.001Z",
    "updatedAt": "2026-09-28T22:55:35.001Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1790636135001-1lrwi",
    "breakDurationMinutes": 60,
    "notes": "",
    "technicianRole": "técnico",
    "shiftType": "manana",
    "technicianName": "Ferney Machado"
  },
  {
    "id": "sched-1790636364873-fajzj",
    "endTime": "17:00",
    "technicianName": "Carlos Manuel",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "notes": "",
    "shiftType": "diurno",
    "startTime": "08:00",
    "date": "2026-10-02",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-3",
    "createdAt": "2026-09-28T22:59:24.873Z",
    "updatedAt": "2026-09-28T22:59:24.873Z"
  },
  {
    "notes": "",
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "startTime": "13:00",
    "technicianId": "pers-4",
    "id": "sched-1790636946259-ex7zh",
    "technicianName": "Alonso Supervisor",
    "updatedAt": "2026-09-28T23:09:06.259Z",
    "createdAt": "2026-09-28T23:09:06.259Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-02",
    "endTime": "22:00",
    "shiftType": "tarde",
    "isOnCall": false
  },
  {
    "id": "sched-1790637233876-rvr3q",
    "date": "2026-10-02",
    "notes": "",
    "technicianId": "pers-5",
    "technicianRole": "Técnico de Mantenimiento",
    "shiftType": "tarde",
    "breakDurationMinutes": 60,
    "technicianName": "Adrián",
    "startTime": "13:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "22:00",
    "updatedAt": "2026-09-28T23:13:53.876Z",
    "createdAt": "2026-09-28T23:13:53.876Z",
    "isOnCall": false
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "00:00",
    "technicianId": "usr-1790620816372",
    "startTime": "00:00",
    "date": "2026-10-03",
    "technicianName": "Adrián Arturo",
    "technicianRole": "Técnico de Mantenimiento",
    "createdAt": "2026-09-28T19:12:42.711Z",
    "updatedAt": "2026-09-28T19:26:19.168Z",
    "notes": "",
    "isOnCall": false,
    "id": "sched-1790622762711-o1g5j",
    "breakDurationMinutes": 60,
    "shiftType": "descanso"
  },
  {
    "shiftType": "descanso",
    "id": "sched-1790635026014-n0qxu",
    "breakDurationMinutes": 60,
    "notes": "",
    "technicianId": "usr-1790632899774",
    "updatedAt": "2026-09-28T22:37:06.014Z",
    "endTime": "00:00",
    "isOnCall": false,
    "createdAt": "2026-09-28T22:37:06.014Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "Técnico de Mantenimiento",
    "technicianName": "Adrián",
    "date": "2026-10-03",
    "startTime": "00:00"
  },
  {
    "technicianName": "Juan Mateo Ramos",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "technicianRole": "admin",
    "startTime": "13:00",
    "updatedAt": "2026-09-28T22:51:23.487Z",
    "endTime": "22:00",
    "createdAt": "2026-09-28T22:51:23.487Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1790635883487-dz6b1",
    "date": "2026-10-03",
    "technicianId": "pers-1",
    "shiftType": "tarde",
    "notes": ""
  },
  {
    "date": "2026-10-03",
    "id": "sched-1790636181352-y67n5",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-2",
    "notes": "",
    "breakDurationMinutes": 60,
    "shiftType": "descanso",
    "startTime": "00:00",
    "technicianName": "Ferney Machado",
    "endTime": "00:00",
    "updatedAt": "2026-09-28T22:56:21.352Z",
    "createdAt": "2026-09-28T22:56:21.352Z",
    "technicianRole": "técnico",
    "isOnCall": false
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-3",
    "shiftType": "diurno",
    "id": "sched-1790636368442-n5zbv",
    "startTime": "08:00",
    "date": "2026-10-03",
    "notes": "",
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T22:59:28.442Z",
    "technicianRole": "técnico",
    "endTime": "17:00",
    "updatedAt": "2026-09-28T22:59:32.713Z",
    "technicianName": "Carlos Manuel",
    "isOnCall": false
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "06:00",
    "technicianId": "pers-4",
    "notes": "",
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "createdAt": "2026-09-28T23:09:11.659Z",
    "id": "sched-1790636951659-qhox8",
    "updatedAt": "2026-10-16T13:29:49.647Z",
    "technicianName": "Alonso Supervisor",
    "isOnCall": false,
    "date": "2026-10-03",
    "endTime": "14:30",
    "shiftType": "manana"
  },
  {
    "createdAt": "2026-09-28T23:13:57.979Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1790637237979-k17mp",
    "isOnCall": false,
    "updatedAt": "2026-09-28T23:13:57.979Z",
    "startTime": "00:00",
    "endTime": "00:00",
    "date": "2026-10-03",
    "breakDurationMinutes": 60,
    "notes": "",
    "technicianId": "pers-5",
    "shiftType": "descanso",
    "technicianRole": "Técnico de Mantenimiento",
    "technicianName": "Adrián"
  },
  {
    "id": "sched-1790622769990-349e3",
    "technicianId": "usr-1790620816372",
    "startTime": "00:00",
    "updatedAt": "2026-09-28T19:26:50.204Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T19:12:49.990Z",
    "date": "2026-10-04",
    "breakDurationMinutes": 60,
    "shiftType": "descanso",
    "technicianName": "Adrián Arturo",
    "notes": "",
    "endTime": "00:00",
    "isOnCall": false,
    "technicianRole": "Técnico de Mantenimiento"
  },
  {
    "isOnCall": false,
    "technicianName": "Adrián",
    "technicianRole": "Técnico de Mantenimiento",
    "date": "2026-10-04",
    "id": "sched-1790635021595-33jfd",
    "shiftType": "descanso",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "00:00",
    "technicianId": "usr-1790632899774",
    "breakDurationMinutes": 60,
    "endTime": "00:00",
    "createdAt": "2026-09-28T22:37:01.595Z",
    "updatedAt": "2026-09-28T22:37:01.595Z"
  },
  {
    "date": "2026-10-04",
    "isOnCall": false,
    "technicianName": "Juan Mateo Ramos",
    "endTime": "22:00",
    "technicianRole": "admin",
    "shiftType": "tarde",
    "breakDurationMinutes": 60,
    "startTime": "13:00",
    "id": "sched-1790635888950-aie8a",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T22:51:28.950Z",
    "notes": "",
    "updatedAt": "2026-09-28T22:51:28.950Z",
    "technicianId": "pers-1"
  },
  {
    "updatedAt": "2026-09-28T22:56:26.112Z",
    "date": "2026-10-04",
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T22:56:26.112Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "00:00",
    "shiftType": "descanso",
    "id": "sched-1790636186112-aq90w",
    "technicianId": "pers-2",
    "notes": "",
    "technicianRole": "técnico",
    "isOnCall": false,
    "endTime": "00:00",
    "technicianName": "Ferney Machado"
  },
  {
    "date": "2026-10-04",
    "endTime": "00:00",
    "technicianName": "Carlos Manuel",
    "updatedAt": "2026-09-28T22:59:42.411Z",
    "isOnCall": false,
    "technicianId": "pers-3",
    "technicianRole": "técnico",
    "createdAt": "2026-09-28T22:59:42.411Z",
    "notes": "",
    "startTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "descanso",
    "breakDurationMinutes": 60,
    "id": "sched-1790636382411-9o2kr"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T23:09:15.295Z",
    "technicianName": "Alonso Supervisor",
    "technicianRole": "técnico",
    "notes": "",
    "updatedAt": "2026-10-16T15:26:36.379Z",
    "id": "sched-1790636955295-yhwrm",
    "startTime": "06:00",
    "isOnCall": false,
    "endTime": "14:30",
    "date": "2026-10-04",
    "shiftType": "manana",
    "breakDurationMinutes": 60,
    "technicianId": "pers-4"
  },
  {
    "startTime": "00:00",
    "createdAt": "2026-09-28T23:14:03.102Z",
    "breakDurationMinutes": 60,
    "id": "sched-1790637243102-ar7l1",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-5",
    "updatedAt": "2026-09-28T23:14:03.102Z",
    "notes": "",
    "isOnCall": false,
    "date": "2026-10-04",
    "technicianName": "Adrián",
    "endTime": "00:00",
    "technicianRole": "Técnico de Mantenimiento",
    "shiftType": "descanso"
  },
  {
    "technicianRole": "Técnico de Mantenimiento",
    "technicianName": "Adrián Arturo",
    "notes": "",
    "technicianId": "usr-1790620816372",
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "manana",
    "isOnCall": false,
    "startTime": "06:00",
    "endTime": "14:00",
    "date": "2026-10-05",
    "createdAt": "2026-09-28T19:28:58.669Z",
    "updatedAt": "2026-09-28T19:28:58.669Z",
    "id": "sched-1790623738669-59w9l"
  },
  {
    "breakDurationMinutes": 60,
    "notes": "",
    "shiftType": "manana",
    "technicianId": "usr-1790632899774",
    "isOnCall": false,
    "updatedAt": "2026-09-28T22:37:18.246Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T22:37:18.246Z",
    "date": "2026-10-05",
    "id": "sched-1790635038246-ibtkj",
    "technicianRole": "Técnico de Mantenimiento",
    "endTime": "14:00",
    "startTime": "06:00",
    "technicianName": "Adrián"
  },
  {
    "date": "2026-10-05",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "diurno",
    "id": "sched-1790635897607-aj2nb",
    "technicianId": "pers-1",
    "updatedAt": "2026-09-28T22:51:37.607Z",
    "endTime": "17:00",
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T22:51:37.607Z",
    "isOnCall": false,
    "technicianName": "Juan Mateo Ramos",
    "notes": "",
    "technicianRole": "admin",
    "startTime": "08:00"
  },
  {
    "createdAt": "2026-09-28T22:56:32.559Z",
    "id": "sched-1790636192559-9seb2",
    "technicianName": "Ferney Machado",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "technicianId": "pers-2",
    "updatedAt": "2026-09-28T22:56:32.559Z",
    "startTime": "06:00",
    "isOnCall": false,
    "shiftType": "manana",
    "breakDurationMinutes": 60,
    "date": "2026-10-05",
    "endTime": "14:00",
    "notes": ""
  },
  {
    "date": "2026-10-05",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "endTime": "22:00",
    "notes": "",
    "shiftType": "tarde",
    "startTime": "13:00",
    "technicianName": "Carlos Manuel",
    "technicianId": "pers-3",
    "technicianRole": "técnico",
    "createdAt": "2026-09-28T23:00:00.184Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-09-28T23:00:00.184Z",
    "id": "sched-1790636400184-c3wf9"
  },
  {
    "endTime": "00:00",
    "technicianName": "Alonso Supervisor",
    "isOnCall": false,
    "technicianId": "pers-4",
    "shiftType": "descanso",
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "id": "sched-1790636961896-rnzv8",
    "notes": "",
    "createdAt": "2026-09-28T23:09:21.896Z",
    "date": "2026-10-05",
    "updatedAt": "2026-09-28T23:09:21.896Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "00:00"
  },
  {
    "createdAt": "2026-09-28T23:14:18.920Z",
    "id": "sched-1790637258920-sbb3q",
    "notes": "",
    "updatedAt": "2026-09-28T23:14:18.920Z",
    "isOnCall": false,
    "startTime": "06:00",
    "breakDurationMinutes": 60,
    "technicianName": "Adrián",
    "date": "2026-10-05",
    "technicianRole": "Técnico de Mantenimiento",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-5",
    "shiftType": "manana",
    "endTime": "14:00"
  },
  {
    "createdAt": "2026-09-28T19:28:55.638Z",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "updatedAt": "2026-09-28T19:28:55.638Z",
    "notes": "",
    "id": "sched-1790623735638-0wjuv",
    "startTime": "06:00",
    "technicianName": "Adrián Arturo",
    "technicianId": "usr-1790620816372",
    "endTime": "14:00",
    "shiftType": "manana",
    "technicianRole": "Técnico de Mantenimiento",
    "date": "2026-10-06",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "shiftType": "manana",
    "endTime": "14:00",
    "breakDurationMinutes": 60,
    "technicianRole": "Técnico de Mantenimiento",
    "technicianName": "Adrián",
    "updatedAt": "2026-09-28T22:37:24.562Z",
    "isOnCall": false,
    "createdAt": "2026-09-28T22:37:24.562Z",
    "date": "2026-10-06",
    "notes": "",
    "id": "sched-1790635044562-j7fa9",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "usr-1790632899774",
    "startTime": "06:00"
  },
  {
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1790635903391-e0pj9",
    "shiftType": "diurno",
    "endTime": "17:00",
    "technicianName": "Juan Mateo Ramos",
    "startTime": "08:00",
    "breakDurationMinutes": 60,
    "technicianRole": "admin",
    "technicianId": "pers-1",
    "createdAt": "2026-09-28T22:51:43.391Z",
    "notes": "",
    "updatedAt": "2026-09-28T22:51:43.391Z",
    "date": "2026-10-06"
  },
  {
    "updatedAt": "2026-09-28T22:56:35.888Z",
    "endTime": "14:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T22:56:35.888Z",
    "technicianRole": "técnico",
    "isOnCall": false,
    "technicianName": "Ferney Machado",
    "startTime": "06:00",
    "shiftType": "manana",
    "notes": "",
    "breakDurationMinutes": 60,
    "technicianId": "pers-2",
    "date": "2026-10-06",
    "id": "sched-1790636195888-sqc56"
  },
  {
    "startTime": "13:00",
    "technicianId": "pers-3",
    "notes": "",
    "createdAt": "2026-09-28T23:00:04.703Z",
    "updatedAt": "2026-09-28T23:00:04.703Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Carlos Manuel",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "endTime": "22:00",
    "date": "2026-10-06",
    "id": "sched-1790636404703-nxq39",
    "shiftType": "tarde"
  },
  {
    "shiftType": "descanso",
    "notes": "",
    "breakDurationMinutes": 60,
    "technicianName": "Alonso Supervisor",
    "isOnCall": false,
    "technicianRole": "técnico",
    "endTime": "00:00",
    "updatedAt": "2026-09-28T23:09:25.831Z",
    "createdAt": "2026-09-28T23:09:25.831Z",
    "startTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-06",
    "id": "sched-1790636965831-12oze",
    "technicianId": "pers-4"
  },
  {
    "shiftType": "manana",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-5",
    "updatedAt": "2026-09-28T23:14:22.387Z",
    "id": "sched-1790637262387-3pp42",
    "endTime": "14:00",
    "date": "2026-10-06",
    "createdAt": "2026-09-28T23:14:22.387Z",
    "isOnCall": false,
    "notes": "",
    "technicianRole": "Técnico de Mantenimiento",
    "breakDurationMinutes": 60,
    "startTime": "06:00",
    "technicianName": "Adrián"
  },
  {
    "endTime": "14:00",
    "createdAt": "2026-09-28T19:28:51.565Z",
    "updatedAt": "2026-09-28T19:28:51.565Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "usr-1790620816372",
    "technicianName": "Adrián Arturo",
    "startTime": "06:00",
    "breakDurationMinutes": 60,
    "notes": "",
    "technicianRole": "Técnico de Mantenimiento",
    "id": "sched-1790623731565-9v8tq",
    "shiftType": "manana",
    "date": "2026-10-07",
    "isOnCall": false
  },
  {
    "shiftType": "manana",
    "id": "sched-1790635048793-na4gv",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "endTime": "14:00",
    "breakDurationMinutes": 60,
    "date": "2026-10-07",
    "technicianId": "usr-1790632899774",
    "startTime": "06:00",
    "technicianRole": "Técnico de Mantenimiento",
    "updatedAt": "2026-09-28T22:37:28.793Z",
    "notes": "",
    "technicianName": "Adrián",
    "createdAt": "2026-09-28T22:37:28.793Z"
  },
  {
    "createdAt": "2026-09-28T22:51:48.134Z",
    "endTime": "17:00",
    "technicianRole": "admin",
    "technicianName": "Juan Mateo Ramos",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-09-28T22:51:52.514Z",
    "startTime": "08:00",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "id": "sched-1790635908134-dx848",
    "notes": "",
    "shiftType": "diurno",
    "technicianId": "pers-1",
    "date": "2026-10-07"
  },
  {
    "technicianId": "pers-2",
    "shiftType": "manana",
    "id": "sched-1790636198752-m12zv",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T22:56:38.752Z",
    "notes": "",
    "updatedAt": "2026-09-28T22:56:38.752Z",
    "technicianName": "Ferney Machado",
    "isOnCall": false,
    "endTime": "14:00",
    "startTime": "06:00",
    "date": "2026-10-07"
  },
  {
    "technicianName": "Carlos Manuel",
    "createdAt": "2026-09-28T23:00:14.967Z",
    "updatedAt": "2026-09-28T23:00:14.967Z",
    "technicianRole": "técnico",
    "isOnCall": false,
    "startTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-07",
    "notes": "",
    "endTime": "00:00",
    "shiftType": "descanso",
    "technicianId": "pers-3",
    "breakDurationMinutes": 60,
    "id": "sched-1790636414967-rlo2j"
  },
  {
    "createdAt": "2026-09-28T23:09:41.592Z",
    "notes": "",
    "isOnCall": false,
    "updatedAt": "2026-09-28T23:09:41.592Z",
    "startTime": "13:00",
    "technicianRole": "técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Alonso Supervisor",
    "date": "2026-10-07",
    "breakDurationMinutes": 60,
    "id": "sched-1790636981592-zex9t",
    "shiftType": "tarde",
    "technicianId": "pers-4",
    "endTime": "22:00"
  },
  {
    "updatedAt": "2026-09-28T23:14:25.198Z",
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T23:14:25.198Z",
    "notes": "",
    "isOnCall": false,
    "startTime": "06:00",
    "shiftType": "manana",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Adrián",
    "technicianRole": "Técnico de Mantenimiento",
    "date": "2026-10-07",
    "id": "sched-1790637265198-394ny",
    "endTime": "14:00",
    "technicianId": "pers-5"
  },
  {
    "date": "2026-10-08",
    "technicianId": "usr-1790620816372",
    "createdAt": "2026-09-28T19:28:38.375Z",
    "endTime": "00:00",
    "updatedAt": "2026-09-28T19:28:38.375Z",
    "startTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "technicianRole": "Técnico de Mantenimiento",
    "id": "sched-1790623718375-0698n",
    "technicianName": "Adrián Arturo",
    "shiftType": "descanso",
    "notes": "",
    "breakDurationMinutes": 60
  },
  {
    "technicianRole": "Técnico de Mantenimiento",
    "endTime": "00:00",
    "id": "sched-1790635055934-0q5d4",
    "technicianName": "Adrián",
    "technicianId": "usr-1790632899774",
    "shiftType": "descanso",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "notes": "",
    "startTime": "00:00",
    "date": "2026-10-08",
    "createdAt": "2026-09-28T22:37:35.934Z",
    "updatedAt": "2026-09-28T22:37:35.934Z",
    "breakDurationMinutes": 60
  },
  {
    "technicianId": "pers-1",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "17:00",
    "id": "sched-1790635918280-a2f8d",
    "technicianRole": "admin",
    "technicianName": "Juan Mateo Ramos",
    "isOnCall": false,
    "shiftType": "diurno",
    "startTime": "08:00",
    "createdAt": "2026-09-28T22:51:58.280Z",
    "notes": "",
    "breakDurationMinutes": 60,
    "date": "2026-10-08",
    "updatedAt": "2026-09-28T22:51:58.280Z"
  },
  {
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "descanso",
    "technicianId": "pers-2",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-09-28T22:56:44.334Z",
    "technicianName": "Ferney Machado",
    "technicianRole": "técnico",
    "createdAt": "2026-09-28T22:56:44.334Z",
    "endTime": "00:00",
    "date": "2026-10-08",
    "isOnCall": false,
    "startTime": "00:00",
    "id": "sched-1790636204334-us3xh"
  },
  {
    "breakDurationMinutes": 60,
    "technicianId": "pers-3",
    "isOnCall": false,
    "id": "sched-1790636422912-dkcdj",
    "shiftType": "tarde",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-08",
    "startTime": "13:00",
    "notes": "",
    "updatedAt": "2026-09-28T23:00:22.912Z",
    "endTime": "22:00",
    "technicianRole": "técnico",
    "technicianName": "Carlos Manuel",
    "createdAt": "2026-09-28T23:00:22.912Z"
  },
  {
    "notes": "",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "shiftType": "manana",
    "id": "sched-1790636986374-1qtun",
    "technicianName": "Alonso Supervisor",
    "startTime": "06:00",
    "updatedAt": "2026-09-28T23:09:46.374Z",
    "technicianId": "pers-4",
    "createdAt": "2026-09-28T23:09:46.374Z",
    "breakDurationMinutes": 60,
    "date": "2026-10-08",
    "endTime": "14:00"
  },
  {
    "notes": "",
    "shiftType": "descanso",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-5",
    "technicianRole": "Técnico de Mantenimiento",
    "startTime": "00:00",
    "technicianName": "Adrián",
    "date": "2026-10-08",
    "updatedAt": "2026-09-28T23:14:29.541Z",
    "createdAt": "2026-09-28T23:14:29.541Z",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "endTime": "00:00",
    "id": "sched-1790637269541-okpva"
  },
  {
    "shiftType": "descanso",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-09-28T19:28:31.230Z",
    "id": "sched-1790623711230-xd5ue",
    "date": "2026-10-09",
    "technicianRole": "Técnico de Mantenimiento",
    "endTime": "00:00",
    "technicianName": "Adrián Arturo",
    "createdAt": "2026-09-28T19:28:31.230Z",
    "isOnCall": false,
    "notes": "",
    "technicianId": "usr-1790620816372",
    "startTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "updatedAt": "2026-09-28T22:37:39.489Z",
    "endTime": "00:00",
    "isOnCall": false,
    "createdAt": "2026-09-28T22:37:39.489Z",
    "breakDurationMinutes": 60,
    "id": "sched-1790635059489-r05g4",
    "startTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "shiftType": "descanso",
    "technicianRole": "Técnico de Mantenimiento",
    "technicianName": "Adrián",
    "date": "2026-10-09",
    "technicianId": "usr-1790632899774"
  },
  {
    "isOnCall": false,
    "endTime": "14:00",
    "technicianId": "pers-1",
    "date": "2026-10-09",
    "notes": "",
    "shiftType": "manana",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "06:00",
    "updatedAt": "2026-09-28T22:52:06.256Z",
    "technicianRole": "admin",
    "breakDurationMinutes": 60,
    "technicianName": "Juan Mateo Ramos",
    "id": "sched-1790635926256-xtur1",
    "createdAt": "2026-09-28T22:52:06.256Z"
  },
  {
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T22:56:49.819Z",
    "updatedAt": "2026-09-28T22:56:49.819Z",
    "notes": "",
    "endTime": "00:00",
    "technicianName": "Ferney Machado",
    "isOnCall": false,
    "startTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-09",
    "technicianRole": "técnico",
    "shiftType": "descanso",
    "id": "sched-1790636209819-nvgol",
    "technicianId": "pers-2"
  },
  {
    "date": "2026-10-09",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "06:00",
    "shiftType": "noche",
    "startTime": "09:00",
    "id": "sched-1790636436505-osg5c",
    "technicianId": "pers-3",
    "createdAt": "2026-09-28T23:00:36.505Z",
    "technicianRole": "técnico",
    "notes": "",
    "technicianName": "Carlos Manuel",
    "updatedAt": "2026-09-28T23:22:49.167Z",
    "breakDurationMinutes": 60
  },
  {
    "isOnCall": false,
    "technicianName": "Alonso Supervisor",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T23:09:52.423Z",
    "updatedAt": "2026-09-28T23:09:52.423Z",
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "notes": "",
    "startTime": "13:00",
    "date": "2026-10-09",
    "technicianId": "pers-4",
    "shiftType": "tarde",
    "endTime": "22:00",
    "id": "sched-1790636992423-gl72o"
  },
  {
    "createdAt": "2026-09-28T23:14:37.069Z",
    "technicianName": "Adrián",
    "technicianRole": "Técnico de Mantenimiento",
    "updatedAt": "2026-09-28T23:14:37.069Z",
    "endTime": "00:00",
    "startTime": "00:00",
    "technicianId": "pers-5",
    "shiftType": "descanso",
    "id": "sched-1790637277069-3obtn",
    "date": "2026-10-09",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "notes": "",
    "breakDurationMinutes": 60
  },
  {
    "createdAt": "2026-09-28T18:55:01.603Z",
    "updatedAt": "2026-09-28T18:55:01.603Z",
    "date": "2026-10-10",
    "id": "sched-1790621701603-9e0sd",
    "isOnCall": false,
    "startTime": "08:00",
    "notes": "",
    "endTime": "17:00",
    "shiftType": "diurno",
    "technicianId": "usr-1790620816372",
    "breakDurationMinutes": 60,
    "technicianRole": "Técnico de Mantenimiento",
    "technicianName": "Adrián Arturo",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "createdAt": "2026-09-28T22:37:56.242Z",
    "updatedAt": "2026-09-28T22:37:56.242Z",
    "date": "2026-10-10",
    "startTime": "08:00",
    "endTime": "17:00",
    "notes": "",
    "id": "sched-1790635076242-g5k9a",
    "shiftType": "diurno",
    "breakDurationMinutes": 60,
    "technicianId": "usr-1790632899774",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Adrián",
    "isOnCall": false,
    "technicianRole": "Técnico de Mantenimiento"
  },
  {
    "technicianRole": "admin",
    "shiftType": "supervisor",
    "technicianId": "pers-1",
    "technicianName": "Juan Mateo Ramos",
    "id": "sched-1790635930182-2useb",
    "isOnCall": false,
    "notes": "",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-10-06T16:57:09.105Z",
    "createdAt": "2026-09-28T22:52:10.182Z",
    "date": "2026-10-10",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "19:00",
    "startTime": "10:00"
  },
  {
    "createdAt": "2026-09-28T22:56:56.928Z",
    "updatedAt": "2026-09-28T22:56:56.928Z",
    "endTime": "22:00",
    "technicianId": "pers-2",
    "startTime": "13:00",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-10",
    "shiftType": "tarde",
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "isOnCall": false,
    "id": "sched-1790636216928-ch2f4",
    "technicianName": "Ferney Machado"
  },
  {
    "createdAt": "2026-09-28T23:00:40.194Z",
    "technicianName": "Carlos Manuel",
    "technicianRole": "técnico",
    "updatedAt": "2026-09-28T23:23:14.377Z",
    "notes": "",
    "isOnCall": false,
    "startTime": "09:00",
    "technicianId": "pers-3",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1790636440194-4czg4",
    "shiftType": "noche",
    "date": "2026-10-10",
    "breakDurationMinutes": 60,
    "endTime": "06:00"
  },
  {
    "startTime": "06:00",
    "id": "sched-1790636997815-qsya8",
    "isOnCall": false,
    "createdAt": "2026-09-28T23:09:57.815Z",
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "technicianName": "Alonso Supervisor",
    "endTime": "14:30",
    "updatedAt": "2026-10-16T13:30:20.376Z",
    "date": "2026-10-10",
    "technicianId": "pers-4",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "manana"
  },
  {
    "date": "2026-10-10",
    "shiftType": "diurno",
    "technicianName": "Adrián",
    "technicianId": "pers-5",
    "technicianRole": "Técnico de Mantenimiento",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1790637283670-bjyrh",
    "updatedAt": "2026-09-28T23:14:43.670Z",
    "notes": "",
    "endTime": "17:00",
    "createdAt": "2026-09-28T23:14:43.670Z",
    "breakDurationMinutes": 60,
    "startTime": "08:00"
  },
  {
    "createdAt": "2026-09-28T19:28:07.238Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-09-28T19:28:22.949Z",
    "isOnCall": false,
    "startTime": "08:00",
    "id": "sched-1790623687238-547mb",
    "technicianId": "usr-1790620816372",
    "notes": "",
    "shiftType": "diurno",
    "technicianName": "Adrián Arturo",
    "endTime": "17:00",
    "date": "2026-10-11",
    "technicianRole": "Técnico de Mantenimiento",
    "breakDurationMinutes": 60
  },
  {
    "createdAt": "2026-09-28T22:38:03.642Z",
    "technicianId": "usr-1790632899774",
    "updatedAt": "2026-09-28T22:38:03.642Z",
    "endTime": "17:00",
    "startTime": "08:00",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "diurno",
    "date": "2026-10-11",
    "isOnCall": false,
    "technicianRole": "Técnico de Mantenimiento",
    "breakDurationMinutes": 60,
    "technicianName": "Adrián",
    "id": "sched-1790635083642-d2bwn"
  },
  {
    "id": "sched-1790635935863-0tgje",
    "endTime": "00:00",
    "startTime": "00:00",
    "isOnCall": false,
    "updatedAt": "2026-09-28T22:52:15.863Z",
    "createdAt": "2026-09-28T22:52:15.863Z",
    "technicianRole": "admin",
    "technicianName": "Juan Mateo Ramos",
    "breakDurationMinutes": 60,
    "shiftType": "descanso",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-11",
    "notes": "",
    "technicianId": "pers-1"
  },
  {
    "shiftType": "tarde",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-09-28T22:57:01.991Z",
    "isOnCall": false,
    "id": "sched-1790636221991-xy29g",
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "technicianName": "Ferney Machado",
    "endTime": "22:00",
    "createdAt": "2026-09-28T22:57:01.991Z",
    "date": "2026-10-11",
    "technicianId": "pers-2",
    "startTime": "13:00",
    "notes": ""
  },
  {
    "isOnCall": false,
    "startTime": "09:00",
    "date": "2026-10-11",
    "endTime": "06:00",
    "notes": "",
    "createdAt": "2026-09-28T23:00:43.519Z",
    "updatedAt": "2026-09-28T23:23:26.480Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-3",
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "technicianName": "Carlos Manuel",
    "shiftType": "noche",
    "id": "sched-1790636443519-katxq"
  },
  {
    "createdAt": "2026-09-28T23:10:01.024Z",
    "updatedAt": "2026-10-16T15:26:52.250Z",
    "technicianId": "pers-4",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "startTime": "06:00",
    "technicianName": "Alonso Supervisor",
    "date": "2026-10-11",
    "isOnCall": false,
    "endTime": "14:30",
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "shiftType": "manana",
    "id": "sched-1790637001024-wro2p"
  },
  {
    "endTime": "17:00",
    "isOnCall": false,
    "id": "sched-1790637327594-ze2mh",
    "startTime": "08:00",
    "technicianId": "pers-5",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T23:15:27.594Z",
    "notes": "",
    "updatedAt": "2026-09-28T23:15:27.594Z",
    "technicianRole": "Técnico de Mantenimiento",
    "date": "2026-10-11",
    "technicianName": "Adrián",
    "breakDurationMinutes": 60,
    "shiftType": "diurno"
  },
  {
    "startTime": "08:00",
    "updatedAt": "2026-09-28T19:32:39.789Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Adrián Arturo",
    "technicianRole": "Técnico de Mantenimiento",
    "endTime": "17:00",
    "notes": "",
    "createdAt": "2026-09-28T19:29:19.380Z",
    "breakDurationMinutes": 60,
    "id": "sched-1790623759380-h9reo",
    "shiftType": "diurno",
    "technicianId": "usr-1790620816372",
    "date": "2026-10-12",
    "isOnCall": false
  },
  {
    "createdAt": "2026-09-28T22:38:11.366Z",
    "notes": "",
    "technicianId": "usr-1790632899774",
    "updatedAt": "2026-09-28T22:38:11.366Z",
    "startTime": "08:00",
    "isOnCall": false,
    "technicianName": "Adrián",
    "date": "2026-10-12",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "diurno",
    "technicianRole": "Técnico de Mantenimiento",
    "id": "sched-1790635091366-pmw0s",
    "endTime": "17:00",
    "breakDurationMinutes": 60
  },
  {
    "isOnCall": false,
    "startTime": "06:00",
    "technicianId": "pers-1",
    "date": "2026-10-12",
    "updatedAt": "2026-09-28T22:52:26.934Z",
    "createdAt": "2026-09-28T22:52:26.934Z",
    "technicianRole": "admin",
    "id": "sched-1790635946934-vz7xg",
    "breakDurationMinutes": 60,
    "technicianName": "Juan Mateo Ramos",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "manana",
    "endTime": "14:00",
    "notes": ""
  },
  {
    "technicianName": "Ferney Machado",
    "shiftType": "tarde",
    "technicianId": "pers-2",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "date": "2026-10-12",
    "updatedAt": "2026-09-28T22:57:13.526Z",
    "breakDurationMinutes": 60,
    "notes": "",
    "createdAt": "2026-09-28T22:57:13.526Z",
    "isOnCall": false,
    "endTime": "22:00",
    "id": "sched-1790636233526-j6js2",
    "startTime": "13:00"
  },
  {
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-12",
    "endTime": "06:00",
    "breakDurationMinutes": 60,
    "shiftType": "noche",
    "id": "sched-1790636448200-ihq92",
    "isOnCall": false,
    "technicianId": "pers-3",
    "startTime": "09:00",
    "updatedAt": "2026-09-28T23:23:37.434Z",
    "technicianName": "Carlos Manuel",
    "createdAt": "2026-09-28T23:00:48.200Z",
    "technicianRole": "técnico"
  },
  {
    "date": "2026-10-12",
    "isOnCall": false,
    "startTime": "00:00",
    "breakDurationMinutes": 60,
    "endTime": "00:00",
    "createdAt": "2026-09-28T23:10:08.576Z",
    "updatedAt": "2026-09-28T23:10:08.576Z",
    "technicianId": "pers-4",
    "id": "sched-1790637008576-3w8m3",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Alonso Supervisor",
    "notes": "",
    "technicianRole": "técnico",
    "shiftType": "descanso"
  },
  {
    "id": "sched-1790637334393-zpaf9",
    "createdAt": "2026-09-28T23:15:34.393Z",
    "technicianId": "pers-5",
    "updatedAt": "2026-09-28T23:15:34.393Z",
    "startTime": "08:00",
    "breakDurationMinutes": 60,
    "technicianName": "Adrián",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "17:00",
    "technicianRole": "Técnico de Mantenimiento",
    "isOnCall": false,
    "date": "2026-10-12",
    "shiftType": "diurno",
    "notes": ""
  },
  {
    "createdAt": "2026-09-28T19:29:45.662Z",
    "isOnCall": false,
    "updatedAt": "2026-09-28T19:29:45.662Z",
    "startTime": "06:00",
    "notes": "",
    "breakDurationMinutes": 60,
    "shiftType": "manana",
    "technicianId": "usr-1790620816372",
    "technicianRole": "Técnico de Mantenimiento",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1790623785662-hmopy",
    "endTime": "14:00",
    "date": "2026-10-13",
    "technicianName": "Adrián Arturo"
  },
  {
    "shiftType": "manana",
    "date": "2026-10-13",
    "id": "sched-1790635126078-xytes",
    "endTime": "14:00",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "technicianRole": "Técnico de Mantenimiento",
    "updatedAt": "2026-09-28T22:38:46.078Z",
    "createdAt": "2026-09-28T22:38:46.078Z",
    "technicianId": "usr-1790632899774",
    "technicianName": "Adrián",
    "isOnCall": false,
    "startTime": "06:00"
  },
  {
    "updatedAt": "2026-09-28T22:52:30.673Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T22:52:30.673Z",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "startTime": "06:00",
    "technicianName": "Juan Mateo Ramos",
    "id": "sched-1790635950673-ki0y5",
    "shiftType": "manana",
    "date": "2026-10-13",
    "technicianRole": "admin",
    "notes": "",
    "technicianId": "pers-1",
    "endTime": "14:00"
  },
  {
    "createdAt": "2026-09-28T22:57:19.185Z",
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-13",
    "updatedAt": "2026-09-28T22:57:24.267Z",
    "startTime": "13:00",
    "technicianId": "pers-2",
    "technicianName": "Ferney Machado",
    "technicianRole": "técnico",
    "shiftType": "tarde",
    "notes": "",
    "endTime": "22:00",
    "id": "sched-1790636239185-xmjiz",
    "isOnCall": false
  },
  {
    "updatedAt": "2026-09-28T23:00:59.879Z",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T23:00:59.879Z",
    "date": "2026-10-13",
    "breakDurationMinutes": 60,
    "startTime": "00:00",
    "technicianName": "Carlos Manuel",
    "id": "sched-1790636459879-i86nt",
    "shiftType": "descanso",
    "notes": "",
    "technicianRole": "técnico",
    "endTime": "00:00",
    "technicianId": "pers-3"
  },
  {
    "date": "2026-10-13",
    "shiftType": "descanso",
    "id": "sched-1790637021324-g976t",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-4",
    "updatedAt": "2026-09-28T23:10:21.324Z",
    "createdAt": "2026-09-28T23:10:21.324Z",
    "technicianName": "Alonso Supervisor",
    "notes": "",
    "breakDurationMinutes": 60,
    "endTime": "00:00",
    "technicianRole": "técnico",
    "isOnCall": false,
    "startTime": "00:00"
  },
  {
    "technicianId": "pers-5",
    "technicianName": "Adrián",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "06:00",
    "date": "2026-10-13",
    "technicianRole": "Técnico de Mantenimiento",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-09-28T23:15:42.144Z",
    "createdAt": "2026-09-28T23:15:42.144Z",
    "id": "sched-1790637342144-wlk5w",
    "isOnCall": false,
    "endTime": "14:00",
    "notes": "",
    "shiftType": "manana"
  },
  {
    "date": "2026-10-14",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "shiftType": "manana",
    "endTime": "14:00",
    "technicianId": "usr-1790620816372",
    "startTime": "06:00",
    "id": "sched-1790623795175-7k248",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T19:29:55.175Z",
    "technicianName": "Adrián Arturo",
    "technicianRole": "Técnico de Mantenimiento",
    "updatedAt": "2026-09-28T19:29:55.175Z",
    "notes": ""
  },
  {
    "technicianName": "Adrián",
    "shiftType": "manana",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "Técnico de Mantenimiento",
    "technicianId": "usr-1790632899774",
    "date": "2026-10-14",
    "id": "sched-1790635129559-q78r4",
    "createdAt": "2026-09-28T22:38:49.560Z",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-09-28T22:38:49.560Z",
    "isOnCall": false,
    "notes": "",
    "startTime": "06:00",
    "endTime": "14:00"
  },
  {
    "technicianName": "Juan Mateo Ramos",
    "shiftType": "descanso",
    "endTime": "00:00",
    "technicianRole": "admin",
    "date": "2026-10-14",
    "technicianId": "pers-1",
    "updatedAt": "2026-10-09T15:01:06.995Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1790635954014-15iy0",
    "createdAt": "2026-09-28T22:52:34.014Z",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "startTime": "00:00",
    "notes": ""
  },
  {
    "technicianName": "Ferney Machado",
    "createdAt": "2026-09-28T22:57:30.667Z",
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "updatedAt": "2026-09-28T22:57:30.667Z",
    "startTime": "13:00",
    "isOnCall": false,
    "notes": "",
    "date": "2026-10-14",
    "shiftType": "tarde",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "22:00",
    "technicianId": "pers-2",
    "id": "sched-1790636250667-ofqp4"
  },
  {
    "updatedAt": "2026-09-28T23:01:04.121Z",
    "createdAt": "2026-09-28T23:01:04.121Z",
    "date": "2026-10-14",
    "notes": "",
    "startTime": "00:00",
    "technicianRole": "técnico",
    "shiftType": "descanso",
    "technicianId": "pers-3",
    "technicianName": "Carlos Manuel",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "endTime": "00:00",
    "isOnCall": false,
    "id": "sched-1790636464121-9e7pm"
  },
  {
    "date": "2026-10-14",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "shiftType": "manana",
    "endTime": "15:00",
    "technicianId": "pers-4",
    "startTime": "06:00",
    "id": "sched-1790637031207-kedq3",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T23:10:31.207Z",
    "technicianName": "Alonso Supervisor",
    "technicianRole": "técnico",
    "updatedAt": "2026-10-09T15:01:23.495Z",
    "notes": ""
  },
  {
    "date": "2026-10-14",
    "breakDurationMinutes": 60,
    "endTime": "14:00",
    "isOnCall": false,
    "notes": "",
    "shiftType": "manana",
    "id": "sched-1790637350857-nh0d0",
    "createdAt": "2026-09-28T23:15:50.857Z",
    "updatedAt": "2026-09-28T23:15:50.857Z",
    "technicianId": "pers-5",
    "startTime": "06:00",
    "technicianRole": "Técnico de Mantenimiento",
    "technicianName": "Adrián",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "createdAt": "2026-09-28T19:29:59.759Z",
    "notes": "",
    "technicianName": "Adrián Arturo",
    "date": "2026-10-15",
    "technicianRole": "Técnico de Mantenimiento",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-09-28T19:29:59.759Z",
    "endTime": "00:00",
    "startTime": "00:00",
    "isOnCall": false,
    "shiftType": "descanso",
    "id": "sched-1790623799759-zr40u",
    "technicianId": "usr-1790620816372",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "technicianRole": "Técnico de Mantenimiento",
    "updatedAt": "2026-09-28T22:38:55.257Z",
    "endTime": "00:00",
    "technicianName": "Adrián",
    "createdAt": "2026-09-28T22:38:55.257Z",
    "breakDurationMinutes": 60,
    "startTime": "00:00",
    "technicianId": "usr-1790632899774",
    "isOnCall": false,
    "shiftType": "descanso",
    "id": "sched-1790635135257-faiyf",
    "date": "2026-10-15",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "technicianName": "Juan Mateo Ramos",
    "isOnCall": false,
    "shiftType": "descanso",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "admin",
    "date": "2026-10-15",
    "createdAt": "2026-09-28T22:52:37.582Z",
    "endTime": "00:00",
    "technicianId": "pers-1",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-10-09T15:01:13.775Z",
    "startTime": "00:00",
    "notes": "",
    "id": "sched-1790635957581-m3rgu"
  },
  {
    "endTime": "00:00",
    "breakDurationMinutes": 60,
    "technicianName": "Ferney Machado",
    "shiftType": "descanso",
    "notes": "",
    "technicianRole": "técnico",
    "technicianId": "pers-2",
    "id": "sched-1790636256871-xhufc",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-15",
    "startTime": "00:00",
    "updatedAt": "2026-10-12T19:16:33.131Z",
    "createdAt": "2026-09-28T22:57:36.871Z"
  },
  {
    "technicianRole": "técnico",
    "technicianName": "Carlos Manuel",
    "endTime": "22:00",
    "shiftType": "tarde",
    "notes": "",
    "isOnCall": false,
    "technicianId": "pers-3",
    "id": "sched-1790636480243-4n9ob",
    "startTime": "13:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "updatedAt": "2026-09-28T23:01:20.243Z",
    "createdAt": "2026-09-28T23:01:20.243Z",
    "date": "2026-10-15"
  },
  {
    "endTime": "15:00",
    "isOnCall": false,
    "date": "2026-10-15",
    "breakDurationMinutes": 60,
    "startTime": "06:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T23:10:35.742Z",
    "updatedAt": "2026-10-09T15:01:37.039Z",
    "technicianRole": "técnico",
    "notes": "",
    "shiftType": "manana",
    "id": "sched-1790637035742-b2vg1",
    "technicianId": "pers-4",
    "technicianName": "Alonso Supervisor"
  },
  {
    "shiftType": "descanso",
    "technicianId": "pers-5",
    "technicianName": "Adrián",
    "date": "2026-10-15",
    "id": "sched-1790637346446-jllx1",
    "technicianRole": "Técnico de Mantenimiento",
    "endTime": "00:00",
    "updatedAt": "2026-09-28T23:15:46.446Z",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T23:15:46.446Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "startTime": "00:00"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "manana",
    "technicianRole": "técnico",
    "createdAt": "2026-10-01T18:42:42.457Z",
    "notes": "",
    "endTime": "15:00",
    "startTime": "06:00",
    "updatedAt": "2026-10-12T19:17:39.201Z",
    "technicianId": "pers-2",
    "technicianName": "Ferney Machado",
    "date": "2026-10-16",
    "breakDurationMinutes": 60,
    "id": "sched-1790880162457-yvkul",
    "isOnCall": false
  },
  {
    "notes": "",
    "date": "2026-10-16",
    "shiftType": "diurno",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1791236046879-2fm2t",
    "technicianRole": "admin",
    "technicianId": "pers-1",
    "technicianName": "Juan Mateo",
    "updatedAt": "2026-10-13T18:58:39.927Z",
    "startTime": "08:00",
    "createdAt": "2026-10-05T21:34:06.879Z",
    "endTime": "17:00"
  },
  {
    "updatedAt": "2026-10-12T18:33:47.686Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "admin",
    "technicianName": "Juan Mateo",
    "notes": "",
    "technicianId": "pers-1",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "startTime": "08:00",
    "createdAt": "2026-10-05T21:34:57.815Z",
    "id": "sched-1791236097815-56qah",
    "endTime": "17:00",
    "date": "2026-10-17",
    "shiftType": "diurno"
  },
  {
    "updatedAt": "2026-10-14T13:56:40.327Z",
    "notes": "",
    "breakDurationMinutes": 60,
    "id": "sched-1791236100790-70kwt",
    "technicianId": "pers-1",
    "createdAt": "2026-10-05T21:35:00.790Z",
    "startTime": "00:00",
    "isOnCall": false,
    "endTime": "00:00",
    "date": "2026-10-18",
    "technicianName": "Juan Mateo",
    "technicianRole": "admin",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "descanso"
  },
  {
    "id": "sched-1790557885227-3onsu",
    "createdAt": "2026-09-28T01:11:25.227Z",
    "breakDurationMinutes": 60,
    "technicianId": "usr-1789230683226",
    "startTime": "13:00",
    "technicianRole": "admin",
    "notes": "",
    "isOnCall": false,
    "updatedAt": "2026-09-28T01:11:25.227Z",
    "technicianName": "Juan Mateo Ramos",
    "date": "2026-09-01",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "22:00",
    "shiftType": "tarde"
  },
  {
    "startTime": "13:00",
    "technicianId": "usr-1789246875257",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T18:42:53.246Z",
    "notes": "",
    "id": "sched-1790620973246-oj48x",
    "shiftType": "tarde",
    "technicianName": "Ferney Machado",
    "updatedAt": "2026-09-28T18:42:53.246Z",
    "technicianRole": "técnico",
    "date": "2026-10-09",
    "endTime": "22:00"
  },
  {
    "notes": "",
    "date": "2026-10-01",
    "endTime": "19:00",
    "createdAt": "2026-09-28T18:44:20.160Z",
    "startTime": "10:00",
    "id": "sched-1790621060159-41hmm",
    "updatedAt": "2026-09-28T18:44:20.160Z",
    "isOnCall": false,
    "technicianRole": "técnico",
    "technicianId": "usr-1789246875257",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "shiftType": "supervisor",
    "technicianName": "Ferney Machado"
  },
  {
    "startTime": "10:00",
    "date": "2026-10-02",
    "createdAt": "2026-09-28T18:45:31.255Z",
    "shiftType": "supervisor",
    "notes": "",
    "technicianRole": "técnico",
    "technicianId": "usr-1789246875257",
    "updatedAt": "2026-09-28T18:45:31.255Z",
    "technicianName": "Ferney Machado",
    "endTime": "19:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "id": "sched-1790621131255-9rtdp"
  },
  {
    "updatedAt": "2026-09-28T18:46:03.438Z",
    "technicianId": "usr-1789230683226",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "shiftType": "diurno",
    "breakDurationMinutes": 60,
    "date": "2026-10-05",
    "technicianRole": "admin",
    "createdAt": "2026-09-28T18:45:49.842Z",
    "startTime": "08:00",
    "id": "sched-1790621149842-t22sv",
    "endTime": "17:00",
    "technicianName": "Juan Mateo Ramos",
    "isOnCall": false
  },
  {
    "startTime": "08:00",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-06",
    "notes": "",
    "createdAt": "2026-09-28T18:46:25.196Z",
    "breakDurationMinutes": 60,
    "shiftType": "diurno",
    "technicianId": "usr-1789230683226",
    "id": "sched-1790621185196-bibz4",
    "endTime": "17:00",
    "technicianRole": "admin",
    "updatedAt": "2026-09-28T18:47:13.735Z",
    "technicianName": "Juan Mateo Ramos"
  },
  {
    "notes": "",
    "id": "sched-1790621240302-rc0c1",
    "shiftType": "diurno",
    "updatedAt": "2026-09-28T18:47:20.302Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "08:00",
    "technicianId": "usr-1789230683226",
    "date": "2026-10-07",
    "technicianName": "Juan Mateo Ramos",
    "endTime": "17:00",
    "createdAt": "2026-09-28T18:47:20.302Z",
    "isOnCall": false,
    "technicianRole": "admin",
    "breakDurationMinutes": 60
  },
  {
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "08:00",
    "technicianName": "Juan Mateo Ramos",
    "technicianId": "usr-1789230683226",
    "createdAt": "2026-09-28T18:47:25.492Z",
    "endTime": "17:00",
    "technicianRole": "admin",
    "date": "2026-10-08",
    "shiftType": "diurno",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "id": "sched-1790621245492-p8nnb",
    "updatedAt": "2026-09-28T18:47:25.492Z"
  },
  {
    "updatedAt": "2026-09-28T19:03:03.918Z",
    "breakDurationMinutes": 60,
    "shiftType": "tarde",
    "technicianId": "usr-1789437863324",
    "id": "sched-1790622183918-g6x5a",
    "date": "2026-10-07",
    "technicianName": "Ferney Alonso/Supervisor",
    "isOnCall": false,
    "endTime": "22:00",
    "createdAt": "2026-09-28T19:03:03.918Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "startTime": "13:00",
    "notes": ""
  },
  {
    "technicianId": "usr-1789230683226",
    "shiftType": "manana",
    "technicianName": "Juan Mateo/Técnico",
    "technicianRole": "admin",
    "endTime": "14:00",
    "date": "2026-10-12",
    "updatedAt": "2026-09-28T19:30:31.597Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "startTime": "06:00",
    "notes": "",
    "createdAt": "2026-09-28T19:30:31.597Z",
    "breakDurationMinutes": 60,
    "id": "sched-1790623831597-8xsse"
  },
  {
    "shiftType": "noche",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Carlos Manuel",
    "updatedAt": "2026-09-28T23:00:43.430Z",
    "technicianId": "pers-3",
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "endTime": "06:00",
    "notes": "",
    "startTime": "22:00",
    "date": "2026-10-11",
    "isOnCall": false,
    "id": "sched-1790636443430-l63bc",
    "createdAt": "2026-09-28T23:00:43.430Z"
  },
  {
    "isOnCall": false,
    "id": "sched-1790636448120-vmhaw",
    "startTime": "22:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-09-28T23:00:48.120Z",
    "technicianName": "Carlos Manuel",
    "breakDurationMinutes": 60,
    "endTime": "06:00",
    "shiftType": "noche",
    "date": "2026-10-12",
    "technicianRole": "técnico",
    "notes": "",
    "technicianId": "pers-3",
    "updatedAt": "2026-09-28T23:00:48.120Z"
  },
  {
    "startTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Juan Mateo Ramos",
    "department": "Mantenimiento e Ingeniería",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "endTime": "00:00",
    "status": "programado",
    "technicianRole": "admin",
    "technicianId": "usr-1789230683226",
    "breakDurationMinutes": 60,
    "date": "2026-10-05",
    "shiftType": "descanso",
    "isOnCall": false,
    "id": "sched-usr-1789230683226-2026-10-05"
  },
  {
    "department": "Mantenimiento e Ingeniería",
    "updatedAt": "2026-09-28T15:54:55.147Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "technicianName": "Juan Mateo Ramos",
    "date": "2026-10-06",
    "shiftType": "manana",
    "technicianRole": "admin",
    "endTime": "14:00",
    "id": "sched-usr-1789230683226-2026-10-06",
    "status": "programado",
    "technicianId": "usr-1789230683226",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "startTime": "06:00",
    "breakDurationMinutes": 60,
    "isOnCall": false
  },
  {
    "date": "2026-10-07",
    "updatedAt": "2026-09-28T15:55:00.831Z",
    "technicianId": "usr-1789230683226",
    "isOnCall": false,
    "shiftType": "manana",
    "notes": "",
    "department": "Mantenimiento e Ingeniería",
    "technicianName": "Juan Mateo Ramos",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "endTime": "14:00",
    "breakDurationMinutes": 60,
    "id": "sched-usr-1789230683226-2026-10-07",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "06:00",
    "status": "programado",
    "technicianRole": "admin"
  },
  {
    "technicianId": "usr-1789230683226",
    "endTime": "14:00",
    "date": "2026-10-08",
    "shiftType": "manana",
    "id": "sched-usr-1789230683226-2026-10-08",
    "department": "Mantenimiento e Ingeniería",
    "updatedAt": "2026-09-28T15:55:04.313Z",
    "breakDurationMinutes": 60,
    "status": "programado",
    "isOnCall": false,
    "technicianName": "Juan Mateo Ramos",
    "startTime": "06:00",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "admin",
    "createdAt": "2026-09-28T14:40:41.365Z"
  },
  {
    "createdAt": "2026-09-28T14:40:41.365Z",
    "id": "sched-usr-1789230683226-2026-10-09",
    "department": "Mantenimiento e Ingeniería",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "06:00",
    "notes": "",
    "date": "2026-10-09",
    "technicianRole": "admin",
    "updatedAt": "2026-09-28T15:55:08.986Z",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "technicianId": "usr-1789230683226",
    "status": "programado",
    "shiftType": "manana",
    "endTime": "14:00",
    "technicianName": "Juan Mateo Ramos"
  },
  {
    "status": "programado",
    "shiftType": "descanso",
    "breakDurationMinutes": 60,
    "id": "sched-usr-1789230683226-2026-10-10",
    "department": "Mantenimiento e Ingeniería",
    "isOnCall": false,
    "notes": "",
    "updatedAt": "2026-09-28T15:55:56.189Z",
    "technicianId": "usr-1789230683226",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "00:00",
    "date": "2026-10-10",
    "technicianRole": "admin",
    "startTime": "00:00",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "technicianName": "Juan Mateo Ramos"
  },
  {
    "updatedAt": "2026-09-28T03:54:12.189Z",
    "technicianId": "usr-1789230683226",
    "breakDurationMinutes": 60,
    "date": "2026-10-11",
    "id": "sched-usr-1789230683226-2026-10-11",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "descanso",
    "department": "Mantenimiento e Ingeniería",
    "status": "programado",
    "endTime": "00:00",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "technicianRole": "admin",
    "notes": "",
    "isOnCall": false,
    "startTime": "00:00",
    "technicianName": "Juan Mateo Ramos"
  },
  {
    "status": "programado",
    "endTime": "22:00",
    "updatedAt": "2026-09-28T15:55:22.656Z",
    "department": "Mantenimiento e Ingeniería",
    "date": "2026-10-12",
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "shiftType": "tarde",
    "isOnCall": false,
    "technicianRole": "admin",
    "id": "sched-usr-1789230683226-2026-10-12",
    "technicianId": "usr-1789230683226",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "technicianName": "Juan Mateo Ramos",
    "startTime": "13:00"
  },
  {
    "technicianId": "usr-1789230683226",
    "notes": "",
    "isOnCall": false,
    "endTime": "22:00",
    "updatedAt": "2026-09-28T15:55:30.000Z",
    "department": "Mantenimiento e Ingeniería",
    "shiftType": "tarde",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "technicianName": "Juan Mateo Ramos",
    "date": "2026-10-13",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "technicianRole": "admin",
    "id": "sched-usr-1789230683226-2026-10-13",
    "status": "programado",
    "startTime": "13:00"
  },
  {
    "id": "sched-usr-1789230683226-2026-10-14",
    "technicianRole": "admin",
    "isOnCall": false,
    "startTime": "13:00",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-14",
    "technicianId": "usr-1789230683226",
    "technicianName": "Juan Mateo Ramos",
    "department": "Mantenimiento e Ingeniería",
    "breakDurationMinutes": 60,
    "notes": "",
    "shiftType": "tarde",
    "endTime": "22:00",
    "status": "programado",
    "updatedAt": "2026-09-28T15:55:34.222Z"
  },
  {
    "date": "2026-10-15",
    "id": "sched-usr-1789230683226-2026-10-15",
    "shiftType": "tarde",
    "status": "programado",
    "endTime": "22:00",
    "updatedAt": "2026-09-28T15:55:38.359Z",
    "technicianId": "usr-1789230683226",
    "technicianRole": "admin",
    "isOnCall": false,
    "startTime": "13:00",
    "notes": "",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Juan Mateo Ramos",
    "breakDurationMinutes": 60,
    "department": "Mantenimiento e Ingeniería"
  },
  {
    "technicianName": "Ferney Machado",
    "breakDurationMinutes": 60,
    "technicianId": "usr-1789246875257",
    "endTime": "00:00",
    "shiftType": "descanso",
    "id": "sched-usr-1789246875257-2026-10-01",
    "technicianRole": "técnico",
    "isOnCall": false,
    "date": "2026-10-01",
    "department": "Mantenimiento e Ingeniería",
    "notes": "",
    "updatedAt": "2026-09-28T14:42:59.198Z",
    "startTime": "00:00",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "status": "programado",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "technicianRole": "técnico",
    "isOnCall": false,
    "department": "Mantenimiento e Ingeniería",
    "breakDurationMinutes": 60,
    "endTime": "00:00",
    "shiftType": "descanso",
    "status": "programado",
    "technicianName": "Ferney Machado",
    "notes": "",
    "technicianId": "usr-1789246875257",
    "updatedAt": "2026-09-28T14:43:03.712Z",
    "date": "2026-10-02",
    "startTime": "00:00",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "id": "sched-usr-1789246875257-2026-10-02",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "technicianId": "usr-1789246875257",
    "technicianName": "Ferney Machado",
    "shiftType": "tarde",
    "department": "Mantenimiento e Ingeniería",
    "isOnCall": false,
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-09-28T14:46:17.928Z",
    "notes": "",
    "id": "sched-usr-1789246875257-2026-10-03",
    "startTime": "13:00",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "status": "programado",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-03",
    "endTime": "22:00"
  },
  {
    "shiftType": "tarde",
    "department": "Mantenimiento e Ingeniería",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "22:00",
    "updatedAt": "2026-09-28T14:46:05.218Z",
    "isOnCall": false,
    "date": "2026-10-04",
    "notes": "",
    "id": "sched-usr-1789246875257-2026-10-04",
    "status": "programado",
    "startTime": "13:00",
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "technicianId": "usr-1789246875257",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "technicianName": "Ferney Machado"
  },
  {
    "isOnCall": false,
    "endTime": "22:00",
    "date": "2026-10-05",
    "technicianId": "usr-1789246875257",
    "shiftType": "tarde",
    "id": "sched-usr-1789246875257-2026-10-05",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "department": "Mantenimiento e Ingeniería",
    "updatedAt": "2026-09-28T15:52:53.205Z",
    "status": "programado",
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "startTime": "13:00",
    "technicianName": "Ferney Machado",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "notes": ""
  },
  {
    "isOnCall": false,
    "technicianId": "usr-1789246875257",
    "id": "sched-usr-1789246875257-2026-10-06",
    "updatedAt": "2026-09-28T15:53:44.594Z",
    "date": "2026-10-06",
    "shiftType": "tarde",
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T14:40:41.365Z",
    "technicianRole": "técnico",
    "notes": "",
    "department": "Mantenimiento e Ingeniería",
    "endTime": "22:00",
    "technicianName": "Ferney Machado",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "status": "programado",
    "startTime": "13:00"
  },
  {
    "date": "2026-10-07",
    "shiftType": "diurno",
    "department": "Mantenimiento e Ingeniería",
    "technicianId": "usr-1789246875257",
    "id": "sched-usr-1789246875257-2026-10-07",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "startTime": "08:00",
    "endTime": "17:00",
    "technicianRole": "técnico",
    "isOnCall": false,
    "createdAt": "2026-09-28T14:40:41.365Z",
    "status": "programado",
    "technicianName": "Ferney Machado"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-08",
    "breakDurationMinutes": 60,
    "technicianName": "Ferney Machado",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "id": "sched-usr-1789246875257-2026-10-08",
    "technicianId": "usr-1789246875257",
    "startTime": "08:00",
    "status": "programado",
    "isOnCall": false,
    "technicianRole": "técnico",
    "notes": "",
    "updatedAt": "2026-09-28T14:33:03.912Z",
    "department": "Mantenimiento e Ingeniería",
    "shiftType": "diurno",
    "endTime": "17:00"
  },
  {
    "isOnCall": false,
    "updatedAt": "2026-09-28T14:33:12.890Z",
    "notes": "",
    "shiftType": "diurno",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "endTime": "17:00",
    "technicianId": "usr-1789246875257",
    "breakDurationMinutes": 60,
    "technicianName": "Ferney Machado",
    "id": "sched-usr-1789246875257-2026-10-09",
    "department": "Mantenimiento e Ingeniería",
    "startTime": "08:00",
    "date": "2026-10-09",
    "status": "programado"
  },
  {
    "id": "sched-usr-1789246875257-2026-10-10",
    "technicianId": "usr-1789246875257",
    "startTime": "00:00",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "createdAt": "2026-09-28T00:13:51.714Z",
    "date": "2026-10-10",
    "notes": "",
    "status": "programado",
    "shiftType": "descanso",
    "department": "Mantenimiento e Ingeniería",
    "technicianName": "Ferney Machado",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "00:00",
    "updatedAt": "2026-09-28T14:36:36.494Z",
    "technicianRole": "técnico"
  },
  {
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "descanso",
    "department": "Mantenimiento e Ingeniería",
    "id": "sched-usr-1789246875257-2026-10-11",
    "endTime": "00:00",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "technicianName": "Ferney Machado",
    "date": "2026-10-11",
    "startTime": "00:00",
    "technicianRole": "técnico",
    "status": "programado",
    "technicianId": "usr-1789246875257"
  },
  {
    "endTime": "00:00",
    "technicianName": "Ferney Machado",
    "isOnCall": false,
    "department": "Mantenimiento e Ingeniería",
    "technicianId": "usr-1789246875257",
    "date": "2026-10-12",
    "status": "programado",
    "shiftType": "descanso",
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T00:13:51.714Z",
    "id": "sched-usr-1789246875257-2026-10-12",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "00:00"
  },
  {
    "endTime": "17:00",
    "technicianRole": "técnico",
    "status": "programado",
    "startTime": "08:00",
    "date": "2026-10-13",
    "technicianId": "usr-1789246875257",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "technicianName": "Ferney Machado",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "diurno",
    "id": "sched-usr-1789246875257-2026-10-13",
    "department": "Mantenimiento e Ingeniería"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "diurno",
    "technicianName": "Ferney Machado",
    "technicianId": "usr-1789246875257",
    "endTime": "17:00",
    "isOnCall": false,
    "technicianRole": "técnico",
    "status": "programado",
    "id": "sched-usr-1789246875257-2026-10-14",
    "startTime": "08:00",
    "department": "Mantenimiento e Ingeniería",
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T00:13:51.714Z",
    "date": "2026-10-14"
  },
  {
    "status": "programado",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "usr-1789246875257",
    "id": "sched-usr-1789246875257-2026-10-15",
    "shiftType": "diurno",
    "isOnCall": false,
    "createdAt": "2026-09-28T00:13:51.714Z",
    "endTime": "17:00",
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "department": "Mantenimiento e Ingeniería",
    "startTime": "08:00",
    "date": "2026-10-15",
    "technicianName": "Ferney Machado"
  },
  {
    "isOnCall": false,
    "status": "programado",
    "endTime": "14:00",
    "startTime": "06:00",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "id": "sched-usr-1789435937593-2026-10-01",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "shiftType": "manana",
    "technicianId": "usr-1789435937593",
    "date": "2026-10-01",
    "breakDurationMinutes": 60,
    "technicianName": "Carlos Manuel",
    "updatedAt": "2026-09-28T14:46:38.644Z",
    "notes": "",
    "department": "Mantenimiento e Ingeniería"
  },
  {
    "isOnCall": false,
    "technicianRole": "técnico",
    "endTime": "14:00",
    "startTime": "06:00",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "status": "programado",
    "breakDurationMinutes": 60,
    "technicianName": "Carlos Manuel",
    "id": "sched-usr-1789435937593-2026-10-02",
    "date": "2026-10-02",
    "shiftType": "manana",
    "notes": "",
    "department": "Mantenimiento e Ingeniería",
    "technicianId": "usr-1789435937593",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-09-28T14:46:43.467Z"
  },
  {
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "technicianId": "usr-1789435937593",
    "startTime": "06:00",
    "technicianName": "Carlos Manuel",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "id": "sched-usr-1789435937593-2026-10-03",
    "endTime": "14:00",
    "department": "Mantenimiento e Ingeniería",
    "shiftType": "manana",
    "notes": "",
    "status": "programado",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "updatedAt": "2026-09-28T14:51:47.402Z",
    "date": "2026-10-03"
  },
  {
    "updatedAt": "2026-09-28T14:51:53.597Z",
    "technicianRole": "técnico",
    "shiftType": "manana",
    "id": "sched-usr-1789435937593-2026-10-04",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "technicianName": "Carlos Manuel",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "status": "programado",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "date": "2026-10-04",
    "startTime": "06:00",
    "endTime": "14:00",
    "department": "Mantenimiento e Ingeniería",
    "technicianId": "usr-1789435937593"
  },
  {
    "breakDurationMinutes": 60,
    "startTime": "06:00",
    "endTime": "14:00",
    "isOnCall": false,
    "createdAt": "2026-09-28T14:40:41.365Z",
    "notes": "",
    "shiftType": "manana",
    "department": "Mantenimiento e Ingeniería",
    "technicianRole": "técnico",
    "date": "2026-10-05",
    "status": "programado",
    "updatedAt": "2026-09-28T14:52:02.440Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Carlos Manuel",
    "id": "sched-usr-1789435937593-2026-10-05",
    "technicianId": "usr-1789435937593"
  },
  {
    "id": "sched-usr-1789435937593-2026-10-06",
    "technicianId": "usr-1789435937593",
    "isOnCall": false,
    "shiftType": "diurno",
    "breakDurationMinutes": 60,
    "date": "2026-10-06",
    "updatedAt": "2026-09-28T15:53:51.872Z",
    "department": "Mantenimiento e Ingeniería",
    "startTime": "08:00",
    "technicianRole": "técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "17:00",
    "status": "programado",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "notes": "",
    "technicianName": "Carlos Manuel"
  },
  {
    "technicianName": "Carlos Manuel",
    "department": "Mantenimiento e Ingeniería",
    "endTime": "00:00",
    "status": "programado",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "technicianRole": "técnico",
    "startTime": "00:00",
    "technicianId": "usr-1789435937593",
    "breakDurationMinutes": 60,
    "date": "2026-10-07",
    "updatedAt": "2026-09-28T14:52:30.970Z",
    "id": "sched-usr-1789435937593-2026-10-07",
    "isOnCall": false,
    "shiftType": "descanso",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": ""
  },
  {
    "shiftType": "tarde",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "date": "2026-10-08",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "id": "sched-usr-1789435937593-2026-10-08",
    "updatedAt": "2026-09-28T13:50:20.885Z",
    "notes": "",
    "technicianId": "usr-1789435937593",
    "technicianName": "Carlos Manuel",
    "endTime": "22:00",
    "department": "Mantenimiento e Ingeniería",
    "startTime": "13:00",
    "status": "programado",
    "createdAt": "2026-09-28T00:13:51.714Z"
  },
  {
    "breakDurationMinutes": 60,
    "notes": "",
    "shiftType": "tarde",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-usr-1789435937593-2026-10-09",
    "endTime": "22:00",
    "updatedAt": "2026-09-28T13:50:44.323Z",
    "status": "programado",
    "department": "Mantenimiento e Ingeniería",
    "technicianId": "usr-1789435937593",
    "technicianRole": "técnico",
    "startTime": "13:00",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "date": "2026-10-09",
    "isOnCall": false,
    "technicianName": "Carlos Manuel"
  },
  {
    "breakDurationMinutes": 60,
    "startTime": "00:00",
    "notes": "",
    "date": "2026-10-10",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "technicianId": "usr-1789435937593",
    "id": "sched-usr-1789435937593-2026-10-10",
    "isOnCall": false,
    "shiftType": "descanso",
    "endTime": "00:00",
    "technicianName": "Carlos Manuel",
    "department": "Mantenimiento e Ingeniería",
    "updatedAt": "2026-09-28T15:54:40.544Z",
    "technicianRole": "técnico",
    "status": "programado",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "date": "2026-10-11",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "status": "programado",
    "breakDurationMinutes": 60,
    "startTime": "06:00",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Carlos Manuel",
    "notes": "",
    "updatedAt": "2026-09-28T04:11:59.796Z",
    "endTime": "14:00",
    "department": "Mantenimiento e Ingeniería",
    "technicianRole": "técnico",
    "shiftType": "manana",
    "technicianId": "usr-1789435937593",
    "id": "sched-usr-1789435937593-2026-10-11"
  },
  {
    "technicianRole": "técnico",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "notes": "",
    "department": "Mantenimiento e Ingeniería",
    "status": "programado",
    "technicianName": "Carlos Manuel",
    "startTime": "06:00",
    "technicianId": "usr-1789435937593",
    "isOnCall": false,
    "id": "sched-usr-1789435937593-2026-10-12",
    "endTime": "14:00",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-09-28T04:12:03.559Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "manana",
    "date": "2026-10-12"
  },
  {
    "notes": "",
    "date": "2026-10-13",
    "updatedAt": "2026-09-28T04:12:10.909Z",
    "status": "programado",
    "technicianRole": "técnico",
    "isOnCall": false,
    "shiftType": "manana",
    "endTime": "14:00",
    "technicianName": "Carlos Manuel",
    "department": "Mantenimiento e Ingeniería",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-usr-1789435937593-2026-10-13",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "startTime": "06:00",
    "technicianId": "usr-1789435937593",
    "breakDurationMinutes": 60
  },
  {
    "startTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "status": "programado",
    "technicianRole": "técnico",
    "date": "2026-10-14",
    "technicianName": "Carlos Manuel",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "shiftType": "descanso",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "id": "sched-usr-1789435937593-2026-10-14",
    "technicianId": "usr-1789435937593",
    "updatedAt": "2026-09-28T04:13:49.810Z",
    "endTime": "00:00",
    "department": "Mantenimiento e Ingeniería"
  },
  {
    "breakDurationMinutes": 60,
    "shiftType": "descanso",
    "department": "Mantenimiento e Ingeniería",
    "id": "sched-usr-1789435937593-2026-10-15",
    "technicianId": "usr-1789435937593",
    "updatedAt": "2026-09-28T04:13:55.474Z",
    "startTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "isOnCall": false,
    "technicianName": "Carlos Manuel",
    "status": "programado",
    "date": "2026-10-15",
    "notes": "",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "endTime": "00:00"
  },
  {
    "createdAt": "2026-09-28T14:40:41.365Z",
    "date": "2026-10-01",
    "startTime": "10:00",
    "id": "sched-usr-1789437863324-2026-10-01",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "endTime": "19:00",
    "technicianName": "Ferney Alonso",
    "technicianId": "usr-1789437863324",
    "breakDurationMinutes": 60,
    "department": "Mantenimiento e Ingeniería",
    "updatedAt": "2026-09-28T14:42:43.916Z",
    "notes": "",
    "status": "programado",
    "technicianRole": "técnico",
    "shiftType": "supervisor"
  },
  {
    "breakDurationMinutes": 60,
    "startTime": "10:00",
    "technicianRole": "técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "19:00",
    "id": "sched-usr-1789437863324-2026-10-02",
    "date": "2026-10-02",
    "isOnCall": false,
    "createdAt": "2026-09-28T14:40:41.365Z",
    "notes": "",
    "technicianId": "usr-1789437863324",
    "technicianName": "Ferney Alonso",
    "shiftType": "supervisor",
    "status": "programado",
    "updatedAt": "2026-09-28T14:42:48.107Z",
    "department": "Mantenimiento e Ingeniería"
  },
  {
    "updatedAt": "2026-09-28T14:45:41.448Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-usr-1789437863324-2026-10-03",
    "shiftType": "descanso",
    "department": "Mantenimiento e Ingeniería",
    "endTime": "00:00",
    "notes": "",
    "status": "programado",
    "technicianId": "usr-1789437863324",
    "technicianRole": "técnico",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "startTime": "00:00",
    "date": "2026-10-03",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "technicianName": "Ferney Alonso"
  },
  {
    "status": "programado",
    "startTime": "00:00",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "isOnCall": false,
    "date": "2026-10-04",
    "department": "Mantenimiento e Ingeniería",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "technicianId": "usr-1789437863324",
    "shiftType": "descanso",
    "id": "sched-usr-1789437863324-2026-10-04",
    "technicianName": "Ferney Alonso",
    "endTime": "00:00"
  },
  {
    "isOnCall": false,
    "endTime": "19:00",
    "shiftType": "supervisor",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-09-28T15:53:14.208Z",
    "date": "2026-10-05",
    "technicianId": "usr-1789437863324",
    "technicianRole": "técnico",
    "startTime": "10:00",
    "id": "sched-usr-1789437863324-2026-10-05",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "notes": "",
    "status": "programado",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Ferney Alonso",
    "department": "Mantenimiento e Ingeniería"
  },
  {
    "technicianName": "Ferney Alonso",
    "createdAt": "2026-09-28T14:40:41.365Z",
    "breakDurationMinutes": 60,
    "startTime": "10:00",
    "technicianRole": "técnico",
    "isOnCall": false,
    "updatedAt": "2026-09-28T15:54:04.879Z",
    "notes": "",
    "id": "sched-usr-1789437863324-2026-10-06",
    "technicianId": "usr-1789437863324",
    "date": "2026-10-06",
    "shiftType": "supervisor",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "department": "Mantenimiento e Ingeniería",
    "endTime": "19:00",
    "status": "programado"
  },
  {
    "status": "programado",
    "technicianRole": "técnico",
    "startTime": "10:00",
    "date": "2026-10-07",
    "technicianName": "Ferney Alonso",
    "isOnCall": false,
    "createdAt": "2026-09-28T14:40:41.365Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "endTime": "19:00",
    "shiftType": "supervisor",
    "id": "sched-usr-1789437863324-2026-10-07",
    "technicianId": "usr-1789437863324",
    "notes": "",
    "department": "Mantenimiento e Ingeniería",
    "updatedAt": "2026-09-28T17:07:23.526Z"
  },
  {
    "status": "programado",
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T00:13:51.714Z",
    "startTime": "10:00",
    "notes": "",
    "technicianId": "usr-1789437863324",
    "updatedAt": "2026-09-28T04:21:00.968Z",
    "technicianName": "Ferney Alonso",
    "isOnCall": false,
    "id": "sched-usr-1789437863324-2026-10-08",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "supervisor",
    "date": "2026-10-08",
    "technicianRole": "técnico",
    "endTime": "19:00",
    "department": "Mantenimiento e Ingeniería"
  },
  {
    "isOnCall": false,
    "shiftType": "supervisor",
    "notes": "",
    "id": "sched-usr-1789437863324-2026-10-09",
    "updatedAt": "2026-09-28T04:21:07.826Z",
    "date": "2026-10-09",
    "status": "programado",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "10:00",
    "endTime": "19:00",
    "breakDurationMinutes": 60,
    "technicianId": "usr-1789437863324",
    "department": "Mantenimiento e Ingeniería",
    "technicianRole": "técnico",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "technicianName": "Ferney Alonso"
  },
  {
    "technicianId": "usr-1789437863324",
    "notes": "",
    "technicianName": "Ferney Alonso",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "startTime": "00:00",
    "id": "sched-usr-1789437863324-2026-10-10",
    "department": "Mantenimiento e Ingeniería",
    "isOnCall": false,
    "technicianRole": "técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-09-28T13:48:43.234Z",
    "breakDurationMinutes": 60,
    "date": "2026-10-10",
    "shiftType": "descanso",
    "endTime": "00:00",
    "status": "programado"
  },
  {
    "isOnCall": false,
    "date": "2026-10-11",
    "endTime": "00:00",
    "breakDurationMinutes": 60,
    "technicianId": "usr-1789437863324",
    "startTime": "00:00",
    "createdAt": "2026-09-28T00:13:51.714Z",
    "status": "programado",
    "id": "sched-usr-1789437863324-2026-10-11",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Ferney Alonso",
    "shiftType": "descanso",
    "department": "Mantenimiento e Ingeniería",
    "technicianRole": "técnico"
  },
  {
    "isOnCall": false,
    "technicianRole": "técnico",
    "endTime": "00:00",
    "shiftType": "descanso",
    "id": "sched-usr-1789437863324-2026-10-12",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Ferney Alonso",
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T00:13:51.714Z",
    "status": "programado",
    "technicianId": "usr-1789437863324",
    "date": "2026-10-12",
    "startTime": "00:00",
    "department": "Mantenimiento e Ingeniería"
  },
  {
    "startTime": "08:00",
    "isOnCall": false,
    "createdAt": "2026-09-28T00:13:51.714Z",
    "date": "2026-10-13",
    "status": "programado",
    "shiftType": "diurno",
    "department": "Mantenimiento e Ingeniería",
    "technicianName": "Ferney Alonso",
    "id": "sched-usr-1789437863324-2026-10-13",
    "endTime": "17:00",
    "technicianId": "usr-1789437863324",
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "shiftType": "diurno",
    "technicianRole": "técnico",
    "id": "sched-usr-1789437863324-2026-10-14",
    "technicianId": "usr-1789437863324",
    "breakDurationMinutes": 60,
    "technicianName": "Ferney Alonso",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-14",
    "department": "Mantenimiento e Ingeniería",
    "status": "programado",
    "isOnCall": false,
    "startTime": "08:00",
    "endTime": "17:00",
    "createdAt": "2026-09-28T00:13:51.714Z"
  },
  {
    "department": "Mantenimiento e Ingeniería",
    "date": "2026-10-15",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-usr-1789437863324-2026-10-15",
    "shiftType": "diurno",
    "technicianRole": "técnico",
    "technicianId": "usr-1789437863324",
    "breakDurationMinutes": 60,
    "createdAt": "2026-09-28T00:13:51.714Z",
    "status": "programado",
    "technicianName": "Ferney Alonso",
    "endTime": "17:00",
    "startTime": "08:00",
    "isOnCall": false
  },
  {
    "id": "sched-1791746345333-6bttf",
    "updatedAt": "2026-10-11T19:19:05.333Z",
    "technicianRole": "técnico",
    "technicianName": "Alonso Supervisor",
    "createdAt": "2026-10-11T19:19:05.333Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-16",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "notes": "",
    "endTime": "19:00",
    "shiftType": "supervisor",
    "technicianId": "pers-4",
    "startTime": "10:00"
  },
  {
    "notes": "",
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1791746688390-egs7y",
    "technicianRole": "técnico",
    "technicianName": "Carlos Manuel",
    "endTime": "22:00",
    "shiftType": "tarde",
    "startTime": "13:00",
    "date": "2026-10-16",
    "updatedAt": "2026-10-12T19:12:52.136Z",
    "isOnCall": false,
    "createdAt": "2026-10-11T19:24:48.390Z",
    "technicianId": "pers-3"
  },
  {
    "technicianId": "pers-5",
    "shiftType": "descanso",
    "isOnCall": false,
    "startTime": "00:00",
    "notes": "",
    "technicianName": "Adrián",
    "endTime": "00:00",
    "technicianRole": "Técnico de Mantenimiento",
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-10-11T19:25:51.648Z",
    "date": "2026-10-16",
    "id": "sched-1791746751648-c9m67",
    "updatedAt": "2026-10-12T18:23:58.205Z"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-10-16T13:55:38.325Z",
    "createdAt": "2026-10-11T19:19:12.405Z",
    "technicianName": "Alonso Supervisor",
    "notes": "",
    "technicianId": "pers-4",
    "technicianRole": "técnico",
    "isOnCall": false,
    "date": "2026-10-17",
    "breakDurationMinutes": 60,
    "endTime": "19:00",
    "shiftType": "supervisor",
    "startTime": "10:00",
    "id": "sched-1791746352405-0bwmu"
  },
  {
    "technicianId": "pers-2",
    "date": "2026-10-17",
    "shiftType": "manana",
    "startTime": "06:00",
    "id": "sched-1791746540946-q6zbc",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-10-11T19:22:20.946Z",
    "isOnCall": false,
    "technicianName": "Ferney Machado",
    "breakDurationMinutes": 60,
    "notes": "",
    "technicianRole": "técnico",
    "updatedAt": "2026-10-16T13:28:33.712Z",
    "endTime": "14:30"
  },
  {
    "date": "2026-10-17",
    "id": "sched-1791746722927-ncx6k",
    "technicianName": "Carlos Manuel",
    "technicianRole": "técnico",
    "startTime": "13:00",
    "shiftType": "tarde",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "endTime": "22:00",
    "notes": "",
    "updatedAt": "2026-10-13T18:45:19.884Z",
    "isOnCall": false,
    "technicianId": "pers-3",
    "createdAt": "2026-10-11T19:25:22.927Z"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "technicianId": "pers-5",
    "endTime": "17:00",
    "id": "sched-1791829116218-d2zsr",
    "notes": "",
    "technicianName": "Adrián",
    "startTime": "08:00",
    "date": "2026-10-17",
    "technicianRole": "Técnico de Mantenimiento",
    "updatedAt": "2026-10-13T18:45:44.167Z",
    "isOnCall": false,
    "createdAt": "2026-10-12T18:18:36.218Z",
    "shiftType": "diurno"
  },
  {
    "startTime": "00:00",
    "endTime": "00:00",
    "isOnCall": false,
    "shiftType": "descanso",
    "notes": "",
    "technicianRole": "técnico",
    "date": "2026-10-18",
    "technicianName": "Alonso Supervisor",
    "id": "sched-1791746365858-sx6ri",
    "createdAt": "2026-10-11T19:19:25.858Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-4",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-10-12T19:23:53.662Z"
  },
  {
    "createdAt": "2026-10-11T19:22:34.531Z",
    "breakDurationMinutes": 60,
    "notes": "",
    "technicianName": "Ferney Machado",
    "updatedAt": "2026-10-11T19:22:34.531Z",
    "technicianRole": "técnico",
    "id": "sched-1791746554531-z1cmu",
    "startTime": "06:00",
    "date": "2026-10-18",
    "endTime": "15:00",
    "shiftType": "manana",
    "isOnCall": false,
    "technicianId": "pers-2",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "technicianRole": "Técnico de Mantenimiento",
    "technicianId": "pers-5",
    "id": "sched-1791829123027-9q5ya",
    "endTime": "17:00",
    "createdAt": "2026-10-12T18:18:43.027Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "diurno",
    "breakDurationMinutes": 60,
    "startTime": "08:00",
    "technicianName": "Adrián",
    "isOnCall": false,
    "updatedAt": "2026-10-13T18:45:48.464Z",
    "notes": "",
    "date": "2026-10-18"
  },
  {
    "technicianName": "Alonso Supervisor",
    "technicianRole": "técnico",
    "breakDurationMinutes": 60,
    "id": "sched-1791746390748-83kmz",
    "shiftType": "descanso",
    "technicianId": "pers-4",
    "startTime": "00:00",
    "isOnCall": false,
    "date": "2026-10-19",
    "notes": "",
    "updatedAt": "2026-10-14T13:53:26.939Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-10-11T19:19:50.748Z",
    "endTime": "00:00"
  },
  {
    "notes": "",
    "shiftType": "manana",
    "startTime": "06:00",
    "endTime": "15:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "id": "sched-1791746575740-h06ty",
    "isOnCall": false,
    "technicianId": "pers-2",
    "date": "2026-10-19",
    "createdAt": "2026-10-11T19:22:55.740Z",
    "technicianName": "Ferney Machado",
    "technicianRole": "técnico",
    "updatedAt": "2026-10-11T19:22:55.740Z"
  },
  {
    "startTime": "08:00",
    "updatedAt": "2026-10-14T13:26:13.874Z",
    "id": "sched-1791829147156-2417v",
    "createdAt": "2026-10-12T18:19:07.156Z",
    "technicianName": "Adrián",
    "shiftType": "diurno",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "17:00",
    "date": "2026-10-19",
    "technicianRole": "Técnico de Mantenimiento",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "technicianId": "pers-5"
  },
  {
    "notes": "",
    "technicianRole": "admin",
    "id": "sched-1791830000928-s6h50",
    "technicianId": "pers-1",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "08:00",
    "date": "2026-10-19",
    "breakDurationMinutes": 60,
    "endTime": "17:00",
    "updatedAt": "2026-10-14T13:30:04.225Z",
    "isOnCall": false,
    "createdAt": "2026-10-12T18:33:20.928Z",
    "technicianName": "Juan Mateo",
    "shiftType": "diurno"
  },
  {
    "notes": "",
    "updatedAt": "2026-10-12T19:23:12.671Z",
    "technicianId": "pers-4",
    "endTime": "19:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "createdAt": "2026-10-11T19:20:03.842Z",
    "date": "2026-10-20",
    "technicianRole": "técnico",
    "technicianName": "Alonso Supervisor",
    "breakDurationMinutes": 60,
    "startTime": "10:00",
    "id": "sched-1791746403842-6wre2",
    "shiftType": "supervisor"
  },
  {
    "technicianId": "pers-2",
    "technicianName": "Ferney Machado",
    "shiftType": "manana",
    "startTime": "06:00",
    "technicianRole": "técnico",
    "date": "2026-10-20",
    "notes": "",
    "id": "sched-1791746581244-fqvw4",
    "createdAt": "2026-10-11T19:23:01.244Z",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "15:00",
    "updatedAt": "2026-10-11T19:23:01.244Z",
    "breakDurationMinutes": 60
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "Técnico de Mantenimiento",
    "endTime": "22:00",
    "technicianId": "pers-5",
    "breakDurationMinutes": 60,
    "startTime": "13:00",
    "notes": "",
    "date": "2026-10-20",
    "updatedAt": "2026-10-14T13:31:12.468Z",
    "createdAt": "2026-10-12T18:19:18.582Z",
    "id": "sched-1791829158582-rp1ty",
    "technicianName": "Adrián",
    "shiftType": "tarde",
    "isOnCall": false
  },
  {
    "breakDurationMinutes": 60,
    "id": "sched-1791830037749-65aop",
    "endTime": "17:00",
    "technicianName": "Juan Mateo",
    "updatedAt": "2026-10-14T13:30:13.463Z",
    "isOnCall": false,
    "technicianRole": "admin",
    "startTime": "08:00",
    "notes": "",
    "technicianId": "pers-1",
    "shiftType": "diurno",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-20",
    "createdAt": "2026-10-12T18:33:57.749Z"
  },
  {
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "date": "2026-10-21",
    "shiftType": "manana",
    "startTime": "06:00",
    "technicianId": "pers-2",
    "endTime": "15:00",
    "updatedAt": "2026-10-12T19:20:12.525Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-10-11T19:23:09.279Z",
    "technicianRole": "técnico",
    "technicianName": "Ferney Machado",
    "notes": "",
    "id": "sched-1791746589279-8h26y"
  },
  {
    "id": "sched-1791829173813-8a8ht",
    "date": "2026-10-21",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "technicianName": "Adrián",
    "technicianId": "pers-5",
    "createdAt": "2026-10-12T18:19:33.813Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "technicianRole": "Técnico de Mantenimiento",
    "shiftType": "tarde",
    "startTime": "13:00",
    "updatedAt": "2026-10-14T13:30:46.415Z",
    "endTime": "22:00"
  },
  {
    "technicianRole": "admin",
    "startTime": "00:00",
    "updatedAt": "2026-10-14T13:30:51.443Z",
    "breakDurationMinutes": 60,
    "date": "2026-10-21",
    "isOnCall": false,
    "endTime": "00:00",
    "notes": "",
    "createdAt": "2026-10-12T18:34:08.391Z",
    "technicianId": "pers-1",
    "shiftType": "descanso",
    "technicianName": "Juan Mateo",
    "id": "sched-1791830048391-se5pc",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "notes": "",
    "startTime": "10:00",
    "id": "sched-1791830777223-09kyk",
    "endTime": "19:00",
    "updatedAt": "2026-10-12T18:46:17.223Z",
    "createdAt": "2026-10-12T18:46:17.223Z",
    "technicianName": "Alonso Supervisor",
    "shiftType": "supervisor",
    "technicianId": "pers-4",
    "technicianRole": "técnico",
    "date": "2026-10-21",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "isOnCall": false,
    "id": "sched-1791829323212-4lbc3",
    "technicianRole": "Técnico de Mantenimiento",
    "breakDurationMinutes": 60,
    "createdAt": "2026-10-12T18:22:03.212Z",
    "technicianId": "pers-5",
    "shiftType": "descanso",
    "technicianName": "Adrián",
    "startTime": "00:00",
    "endTime": "00:00",
    "updatedAt": "2026-10-14T13:26:56.896Z",
    "date": "2026-10-22"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Ferney Machado",
    "date": "2026-10-22",
    "notes": "",
    "breakDurationMinutes": 60,
    "createdAt": "2026-10-12T18:32:50.295Z",
    "technicianId": "pers-2",
    "endTime": "00:00",
    "shiftType": "descanso",
    "id": "sched-1791829970295-n6aif",
    "startTime": "00:00",
    "technicianRole": "técnico",
    "isOnCall": false,
    "updatedAt": "2026-10-12T18:32:50.295Z"
  },
  {
    "technicianName": "Alonso Supervisor",
    "notes": "",
    "date": "2026-10-22",
    "id": "sched-1791830787528-3ysqw",
    "isOnCall": false,
    "createdAt": "2026-10-12T18:46:27.528Z",
    "endTime": "19:00",
    "technicianId": "pers-4",
    "shiftType": "supervisor",
    "breakDurationMinutes": 60,
    "startTime": "10:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "updatedAt": "2026-10-12T18:46:27.528Z"
  },
  {
    "date": "2026-10-23",
    "startTime": "00:00",
    "endTime": "00:00",
    "updatedAt": "2026-10-14T13:29:17.950Z",
    "technicianName": "Adrián",
    "createdAt": "2026-10-12T18:24:19.307Z",
    "isOnCall": false,
    "shiftType": "descanso",
    "notes": "",
    "technicianRole": "Técnico de Mantenimiento",
    "id": "sched-1791829459307-a7ol2",
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-5"
  },
  {
    "createdAt": "2026-10-12T18:33:03.653Z",
    "shiftType": "descanso",
    "startTime": "00:00",
    "technicianName": "Ferney Machado",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-10-12T18:33:03.653Z",
    "id": "sched-1791829983653-mut2d",
    "technicianRole": "técnico",
    "endTime": "00:00",
    "breakDurationMinutes": 60,
    "technicianId": "pers-2",
    "date": "2026-10-23",
    "isOnCall": false
  },
  {
    "technicianId": "pers-4",
    "isOnCall": false,
    "technicianRole": "técnico",
    "notes": "",
    "breakDurationMinutes": 60,
    "date": "2026-10-23",
    "startTime": "10:00",
    "endTime": "19:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-10-12T19:24:42.979Z",
    "createdAt": "2026-10-12T18:46:36.240Z",
    "id": "sched-1791830796240-b0ohc",
    "shiftType": "supervisor",
    "technicianName": "Alonso Supervisor"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-4",
    "endTime": "19:00",
    "date": "2026-10-24",
    "technicianName": "Alonso Supervisor",
    "notes": "",
    "id": "sched-1791830802981-z1h00",
    "isOnCall": false,
    "createdAt": "2026-10-12T18:46:42.981Z",
    "shiftType": "supervisor",
    "breakDurationMinutes": 60,
    "technicianRole": "técnico",
    "startTime": "10:00",
    "updatedAt": "2026-10-12T19:25:51.955Z"
  },
  {
    "notes": "",
    "id": "sched-1791830810017-2gx6t",
    "technicianId": "pers-4",
    "date": "2026-10-25",
    "technicianName": "Alonso Supervisor",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "startTime": "00:00",
    "isOnCall": false,
    "updatedAt": "2026-10-12T19:26:10.688Z",
    "technicianRole": "técnico",
    "createdAt": "2026-10-12T18:46:50.017Z",
    "endTime": "00:00",
    "shiftType": "descanso"
  },
  {
    "startTime": "00:00",
    "endTime": "00:00",
    "date": "2026-10-26",
    "updatedAt": "2026-10-14T13:51:53.512Z",
    "createdAt": "2026-10-12T18:47:04.243Z",
    "technicianName": "Alonso Supervisor",
    "notes": "",
    "technicianId": "pers-4",
    "isOnCall": false,
    "shiftType": "descanso",
    "id": "sched-1791830824243-p1ds1",
    "technicianRole": "técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60
  },
  {
    "technicianRole": "técnico",
    "endTime": "19:00",
    "isOnCall": false,
    "notes": "",
    "date": "2026-10-27",
    "createdAt": "2026-10-12T18:47:11.989Z",
    "shiftType": "supervisor",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "10:00",
    "technicianName": "Alonso Supervisor",
    "technicianId": "pers-4",
    "id": "sched-1791830831989-0e6au",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-10-12T19:26:21.532Z"
  },
  {
    "createdAt": "2026-10-12T18:47:38.942Z",
    "technicianName": "Alonso Supervisor",
    "breakDurationMinutes": 60,
    "shiftType": "supervisor",
    "isOnCall": false,
    "startTime": "10:00",
    "updatedAt": "2026-10-12T18:47:49.521Z",
    "technicianId": "pers-4",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1791830858942-kvbh2",
    "technicianRole": "técnico",
    "date": "2026-10-28",
    "endTime": "19:00"
  },
  {
    "createdAt": "2026-10-12T18:48:01.533Z",
    "id": "sched-1791830881533-rpmji",
    "shiftType": "supervisor",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "technicianId": "pers-4",
    "isOnCall": false,
    "startTime": "10:00",
    "endTime": "19:00",
    "updatedAt": "2026-10-12T18:48:01.533Z",
    "breakDurationMinutes": 60,
    "technicianName": "Alonso Supervisor",
    "notes": "",
    "date": "2026-10-29"
  },
  {
    "technicianName": "Alonso Supervisor",
    "shiftType": "supervisor",
    "createdAt": "2026-10-12T18:48:23.801Z",
    "updatedAt": "2026-10-12T18:49:07.163Z",
    "startTime": "10:00",
    "endTime": "19:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "técnico",
    "date": "2026-10-30",
    "technicianId": "pers-4",
    "id": "sched-1791830903801-l8p67",
    "breakDurationMinutes": 60,
    "notes": "",
    "isOnCall": false
  },
  {
    "shiftType": "tarde",
    "notes": "",
    "date": "2026-10-18",
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1791831905277-tsiry",
    "endTime": "22:00",
    "startTime": "13:00",
    "isOnCall": false,
    "createdAt": "2026-10-12T19:05:05.277Z",
    "technicianId": "pers-3",
    "updatedAt": "2026-10-13T18:45:25.489Z",
    "technicianName": "Carlos Manuel",
    "technicianRole": "técnico"
  },
  {
    "notes": "",
    "date": "2026-10-19",
    "id": "sched-1791831918999-nkb4q",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "13:00",
    "technicianId": "pers-3",
    "shiftType": "tarde",
    "technicianName": "Carlos Manuel",
    "technicianRole": "técnico",
    "isOnCall": false,
    "createdAt": "2026-10-12T19:05:18.999Z",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-10-13T18:45:39.120Z",
    "endTime": "22:00"
  },
  {
    "breakDurationMinutes": 60,
    "createdAt": "2026-10-12T19:05:27.904Z",
    "notes": "",
    "updatedAt": "2026-10-12T19:05:27.904Z",
    "technicianId": "pers-3",
    "date": "2026-10-20",
    "id": "sched-1791831927904-hqegy",
    "endTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "descanso",
    "technicianRole": "técnico",
    "technicianName": "Carlos Manuel",
    "isOnCall": false,
    "startTime": "00:00"
  },
  {
    "technicianName": "Carlos Manuel",
    "breakDurationMinutes": 60,
    "endTime": "00:00",
    "isOnCall": false,
    "technicianRole": "técnico",
    "date": "2026-10-21",
    "updatedAt": "2026-10-12T19:05:46.531Z",
    "id": "sched-1791831936744-ku1z3",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-10-12T19:05:36.744Z",
    "startTime": "00:00",
    "notes": "",
    "technicianId": "pers-3",
    "shiftType": "descanso"
  },
  {
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "00:00",
    "date": "2026-10-22",
    "technicianRole": "admin",
    "updatedAt": "2026-10-12T18:56:49.180Z",
    "createdAt": "2026-10-12T18:56:49.180Z",
    "technicianId": "pers-1",
    "technicianName": "Juan Mateo",
    "breakDurationMinutes": 60,
    "startTime": "00:00",
    "id": "sched-1791831409180-ed294",
    "isOnCall": false,
    "shiftType": "descanso"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "06:00",
    "id": "sched-1791831965696-3dp1b",
    "breakDurationMinutes": 60,
    "shiftType": "manana",
    "notes": "",
    "isOnCall": false,
    "technicianId": "pers-3",
    "technicianRole": "técnico",
    "endTime": "15:00",
    "technicianName": "Carlos Manuel",
    "date": "2026-10-22",
    "createdAt": "2026-10-12T19:06:05.696Z",
    "updatedAt": "2026-10-12T19:06:05.696Z"
  },
  {
    "startTime": "13:00",
    "technicianId": "pers-1",
    "notes": "",
    "id": "sched-1791831426841-628z7",
    "isOnCall": false,
    "shiftType": "tarde",
    "technicianName": "Juan Mateo",
    "endTime": "22:00",
    "date": "2026-10-23",
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "admin",
    "updatedAt": "2026-10-14T13:32:01.078Z",
    "createdAt": "2026-10-12T18:57:06.841Z"
  },
  {
    "isOnCall": false,
    "shiftType": "manana",
    "breakDurationMinutes": 60,
    "startTime": "06:00",
    "technicianId": "pers-3",
    "updatedAt": "2026-10-12T19:06:17.814Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-10-12T19:06:17.814Z",
    "id": "sched-1791831977814-uy3le",
    "technicianRole": "técnico",
    "date": "2026-10-23",
    "notes": "",
    "endTime": "15:00",
    "technicianName": "Carlos Manuel"
  },
  {
    "breakDurationMinutes": 60,
    "technicianId": "pers-5",
    "isOnCall": false,
    "createdAt": "2026-10-12T18:50:52.032Z",
    "endTime": "17:00",
    "notes": "",
    "updatedAt": "2026-10-12T18:55:35.300Z",
    "technicianName": "Adrián",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "08:00",
    "technicianRole": "Técnico de Mantenimiento",
    "id": "sched-1791831052032-8qjzm",
    "shiftType": "diurno",
    "date": "2026-10-24"
  },
  {
    "startTime": "13:00",
    "endTime": "22:00",
    "date": "2026-10-24",
    "breakDurationMinutes": 60,
    "notes": "",
    "shiftType": "tarde",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "admin",
    "technicianName": "Juan Mateo",
    "updatedAt": "2026-10-12T18:57:33.451Z",
    "technicianId": "pers-1",
    "id": "sched-1791831453451-x3mik",
    "isOnCall": false,
    "createdAt": "2026-10-12T18:57:33.451Z"
  },
  {
    "date": "2026-10-24",
    "shiftType": "diurno",
    "technicianId": "pers-2",
    "technicianName": "Ferney Machado",
    "startTime": "08:00",
    "endTime": "17:00",
    "technicianRole": "técnico",
    "isOnCall": false,
    "updatedAt": "2026-10-13T18:55:05.880Z",
    "id": "sched-1791831712240-i9n22",
    "createdAt": "2026-10-12T19:01:52.240Z",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60
  },
  {
    "id": "sched-1791831985463-epph2",
    "shiftType": "manana",
    "date": "2026-10-24",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "06:00",
    "endTime": "15:00",
    "isOnCall": false,
    "notes": "",
    "updatedAt": "2026-10-12T19:06:25.463Z",
    "createdAt": "2026-10-12T19:06:25.463Z",
    "technicianId": "pers-3",
    "technicianRole": "técnico",
    "technicianName": "Carlos Manuel",
    "breakDurationMinutes": 60
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-10-12T18:51:06.998Z",
    "id": "sched-1791831066998-uswf7",
    "technicianId": "pers-5",
    "notes": "",
    "updatedAt": "2026-10-12T18:51:06.998Z",
    "isOnCall": false,
    "startTime": "08:00",
    "breakDurationMinutes": 60,
    "shiftType": "diurno",
    "endTime": "17:00",
    "date": "2026-10-25",
    "technicianRole": "Técnico de Mantenimiento",
    "technicianName": "Adrián"
  },
  {
    "endTime": "22:00",
    "shiftType": "tarde",
    "breakDurationMinutes": 60,
    "notes": "",
    "id": "sched-1791831465031-odl36",
    "startTime": "13:00",
    "technicianRole": "admin",
    "technicianId": "pers-1",
    "technicianName": "Juan Mateo",
    "date": "2026-10-25",
    "updatedAt": "2026-10-12T18:57:45.031Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-10-12T18:57:45.031Z",
    "isOnCall": false
  },
  {
    "technicianRole": "técnico",
    "endTime": "15:00",
    "isOnCall": false,
    "shiftType": "manana",
    "technicianName": "Ferney Machado",
    "id": "sched-1791831723671-s5v3u",
    "startTime": "06:00",
    "notes": "",
    "updatedAt": "2026-10-14T13:55:05.497Z",
    "technicianId": "pers-2",
    "breakDurationMinutes": 60,
    "createdAt": "2026-10-12T19:02:03.671Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-25"
  },
  {
    "updatedAt": "2026-10-14T13:47:33.587Z",
    "id": "sched-1791831993257-t9gr5",
    "notes": "",
    "technicianId": "pers-3",
    "date": "2026-10-25",
    "createdAt": "2026-10-12T19:06:33.257Z",
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "descanso",
    "technicianRole": "técnico",
    "isOnCall": false,
    "startTime": "00:00",
    "endTime": "00:00",
    "technicianName": "Carlos Manuel"
  },
  {
    "date": "2026-10-26",
    "startTime": "13:00",
    "technicianId": "pers-5",
    "breakDurationMinutes": 60,
    "id": "sched-1791831078462-gm8az",
    "endTime": "22:00",
    "shiftType": "tarde",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "technicianName": "Adrián",
    "technicianRole": "Técnico de Mantenimiento",
    "notes": "",
    "updatedAt": "2026-10-14T13:41:56.913Z",
    "createdAt": "2026-10-12T18:51:18.462Z"
  },
  {
    "technicianName": "Juan Mateo",
    "technicianRole": "admin",
    "breakDurationMinutes": 60,
    "endTime": "00:00",
    "technicianId": "pers-1",
    "updatedAt": "2026-10-14T13:37:04.203Z",
    "notes": "",
    "createdAt": "2026-10-12T18:58:09.381Z",
    "id": "sched-1791831489381-kd4le",
    "startTime": "00:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-26",
    "isOnCall": false,
    "shiftType": "descanso"
  },
  {
    "id": "sched-1791831767613-5cpyb",
    "endTime": "17:00",
    "breakDurationMinutes": 60,
    "notes": "",
    "technicianId": "pers-2",
    "technicianName": "Ferney Machado",
    "createdAt": "2026-10-12T19:02:47.613Z",
    "updatedAt": "2026-10-12T19:48:38.797Z",
    "date": "2026-10-26",
    "technicianRole": "técnico",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "startTime": "08:00",
    "shiftType": "diurno"
  },
  {
    "technicianRole": "técnico",
    "id": "sched-1791832004382-kig8y",
    "technicianName": "Carlos Manuel",
    "createdAt": "2026-10-12T19:06:44.382Z",
    "updatedAt": "2026-10-14T13:48:59.972Z",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "00:00",
    "shiftType": "descanso",
    "date": "2026-10-26",
    "endTime": "00:00",
    "notes": "",
    "technicianId": "pers-3"
  },
  {
    "updatedAt": "2026-10-14T13:47:44.956Z",
    "technicianId": "pers-5",
    "isOnCall": false,
    "createdAt": "2026-10-12T18:51:33.796Z",
    "endTime": "00:00",
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "notes": "",
    "id": "sched-1791831093796-ucp5q",
    "date": "2026-10-27",
    "shiftType": "descanso",
    "technicianName": "Adrián",
    "startTime": "00:00",
    "technicianRole": "Técnico de Mantenimiento"
  },
  {
    "breakDurationMinutes": 60,
    "createdAt": "2026-10-12T18:58:40.954Z",
    "updatedAt": "2026-10-14T13:37:08.251Z",
    "endTime": "00:00",
    "technicianName": "Juan Mateo",
    "technicianId": "pers-1",
    "id": "sched-1791831520954-lnnvc",
    "technicianRole": "admin",
    "notes": "",
    "shiftType": "descanso",
    "date": "2026-10-27",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "00:00"
  },
  {
    "technicianName": "Ferney Machado",
    "createdAt": "2026-10-12T19:03:08.183Z",
    "endTime": "15:00",
    "updatedAt": "2026-10-12T19:03:08.183Z",
    "notes": "",
    "technicianRole": "técnico",
    "id": "sched-1791831788183-ufp8s",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "manana",
    "date": "2026-10-27",
    "technicianId": "pers-2",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "startTime": "06:00"
  },
  {
    "updatedAt": "2026-10-14T13:47:40.003Z",
    "createdAt": "2026-10-12T19:06:58.726Z",
    "endTime": "22:00",
    "id": "sched-1791832018726-nmuo7",
    "breakDurationMinutes": 60,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianId": "pers-3",
    "shiftType": "tarde",
    "date": "2026-10-27",
    "isOnCall": false,
    "technicianRole": "técnico",
    "startTime": "13:00",
    "notes": "",
    "technicianName": "Carlos Manuel"
  },
  {
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "08:00",
    "notes": "",
    "breakDurationMinutes": 60,
    "shiftType": "diurno",
    "date": "2026-10-28",
    "technicianId": "pers-5",
    "id": "sched-1791831103945-hyidg",
    "createdAt": "2026-10-12T18:51:43.945Z",
    "technicianRole": "Técnico de Mantenimiento",
    "endTime": "17:00",
    "technicianName": "Adrián",
    "updatedAt": "2026-10-12T18:51:43.945Z"
  },
  {
    "notes": "",
    "date": "2026-10-28",
    "id": "sched-1791831544121-oytl6",
    "endTime": "06:00",
    "isOnCall": false,
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "updatedAt": "2026-10-14T13:35:39.662Z",
    "technicianRole": "admin",
    "breakDurationMinutes": 60,
    "technicianName": "Juan Mateo",
    "createdAt": "2026-10-12T18:59:04.121Z",
    "startTime": "21:00",
    "technicianId": "pers-1",
    "shiftType": "noche"
  },
  {
    "technicianName": "Ferney Machado",
    "endTime": "15:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-10-12T19:03:16.465Z",
    "id": "sched-1791831796465-gto9e",
    "updatedAt": "2026-10-12T19:03:16.465Z",
    "technicianRole": "técnico",
    "technicianId": "pers-2",
    "breakDurationMinutes": 60,
    "shiftType": "manana",
    "notes": "",
    "isOnCall": false,
    "date": "2026-10-28",
    "startTime": "06:00"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "13:00",
    "shiftType": "tarde",
    "technicianRole": "técnico",
    "id": "sched-1791832029475-a4f01",
    "technicianName": "Carlos Manuel",
    "date": "2026-10-28",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "createdAt": "2026-10-12T19:07:09.475Z",
    "technicianId": "pers-3",
    "updatedAt": "2026-10-14T13:48:49.242Z",
    "endTime": "22:00",
    "notes": ""
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "date": "2026-10-29",
    "startTime": "06:00",
    "shiftType": "manana",
    "isOnCall": false,
    "technicianRole": "Técnico de Mantenimiento",
    "id": "sched-1791831146995-jkt4a",
    "notes": "",
    "technicianId": "pers-5",
    "technicianName": "Adrián",
    "createdAt": "2026-10-12T18:52:26.995Z",
    "endTime": "15:00",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-10-13T19:13:53.695Z"
  },
  {
    "shiftType": "noche",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianRole": "admin",
    "breakDurationMinutes": 60,
    "technicianName": "Juan Mateo",
    "notes": "",
    "endTime": "06:00",
    "startTime": "21:00",
    "createdAt": "2026-10-12T18:59:17.593Z",
    "id": "sched-1791831557593-alpqu",
    "technicianId": "pers-1",
    "updatedAt": "2026-10-14T13:35:43.684Z",
    "date": "2026-10-29",
    "isOnCall": false
  },
  {
    "technicianName": "Ferney Machado",
    "isOnCall": false,
    "technicianRole": "técnico",
    "shiftType": "descanso",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "00:00",
    "date": "2026-10-29",
    "notes": "",
    "updatedAt": "2026-10-13T18:54:29.911Z",
    "endTime": "00:00",
    "technicianId": "pers-2",
    "createdAt": "2026-10-12T19:03:28.992Z",
    "breakDurationMinutes": 60,
    "id": "sched-1791831808992-t55cb"
  },
  {
    "breakDurationMinutes": 60,
    "id": "sched-1791832046284-d1346",
    "startTime": "13:00",
    "technicianId": "pers-3",
    "shiftType": "tarde",
    "endTime": "22:00",
    "isOnCall": false,
    "date": "2026-10-29",
    "createdAt": "2026-10-12T19:07:26.284Z",
    "technicianName": "Carlos Manuel",
    "notes": "",
    "technicianRole": "técnico",
    "updatedAt": "2026-10-12T19:07:26.284Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "updatedAt": "2026-10-13T19:13:57.303Z",
    "createdAt": "2026-10-12T18:52:39.973Z",
    "technicianId": "pers-5",
    "technicianName": "Adrián",
    "date": "2026-10-30",
    "technicianRole": "Técnico de Mantenimiento",
    "endTime": "15:00",
    "shiftType": "manana",
    "isOnCall": false,
    "id": "sched-1791831159973-jxznc",
    "startTime": "06:00",
    "breakDurationMinutes": 60,
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "updatedAt": "2026-10-14T13:35:47.985Z",
    "technicianName": "Juan Mateo",
    "id": "sched-1791831637237-ge7tt",
    "endTime": "06:00",
    "notes": "",
    "createdAt": "2026-10-12T19:00:37.237Z",
    "technicianRole": "admin",
    "date": "2026-10-30",
    "technicianId": "pers-1",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "shiftType": "noche",
    "startTime": "21:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ]
  },
  {
    "shiftType": "descanso",
    "technicianId": "pers-2",
    "startTime": "00:00",
    "createdAt": "2026-10-12T19:03:42.531Z",
    "technicianName": "Ferney Machado",
    "id": "sched-1791831822531-4qqk9",
    "endTime": "00:00",
    "date": "2026-10-30",
    "technicianRole": "técnico",
    "updatedAt": "2026-10-12T19:03:42.531Z",
    "notes": "",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "breakDurationMinutes": 60,
    "isOnCall": false
  },
  {
    "isOnCall": false,
    "technicianName": "Carlos Manuel",
    "id": "sched-1791832056121-xljov",
    "technicianId": "pers-3",
    "technicianRole": "técnico",
    "date": "2026-10-30",
    "createdAt": "2026-10-12T19:07:36.121Z",
    "endTime": "22:00",
    "updatedAt": "2026-10-12T19:07:36.121Z",
    "notes": "",
    "startTime": "13:00",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "shiftType": "tarde",
    "breakDurationMinutes": 60
  },
  {
    "isOnCall": false,
    "notes": "",
    "breakDurationMinutes": 60,
    "updatedAt": "2026-10-14T13:52:10.637Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "createdAt": "2026-10-12T18:49:25.928Z",
    "endTime": "19:00",
    "technicianName": "Alonso Supervisor",
    "startTime": "10:00",
    "technicianRole": "técnico",
    "technicianId": "pers-4",
    "date": "2026-10-31",
    "id": "sched-1791830965928-adbo1",
    "shiftType": "supervisor"
  },
  {
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "isOnCall": false,
    "startTime": "06:00",
    "technicianId": "pers-5",
    "shiftType": "manana",
    "id": "sched-1791831184117-ga92d",
    "breakDurationMinutes": 60,
    "endTime": "15:00",
    "notes": "",
    "technicianRole": "Técnico de Mantenimiento",
    "createdAt": "2026-10-12T18:53:04.117Z",
    "updatedAt": "2026-10-12T18:53:04.117Z",
    "date": "2026-10-31",
    "technicianName": "Adrián"
  },
  {
    "technicianId": "pers-1",
    "endTime": "06:00",
    "updatedAt": "2026-10-14T13:35:53.958Z",
    "createdAt": "2026-10-12T19:01:02.127Z",
    "technicianRole": "admin",
    "technicianName": "Juan Mateo",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "id": "sched-1791831662127-lj9kp",
    "shiftType": "noche",
    "date": "2026-10-31",
    "isOnCall": false,
    "breakDurationMinutes": 60,
    "startTime": "21:00",
    "notes": ""
  },
  {
    "shiftType": "descanso",
    "notes": "",
    "date": "2026-10-31",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "startTime": "00:00",
    "technicianId": "pers-2",
    "breakDurationMinutes": 60,
    "createdAt": "2026-10-12T19:04:08.249Z",
    "technicianName": "Ferney Machado",
    "technicianRole": "técnico",
    "updatedAt": "2026-10-12T19:29:12.363Z",
    "id": "sched-1791831848249-vtsij",
    "isOnCall": false,
    "endTime": "00:00"
  },
  {
    "technicianId": "pers-3",
    "technicianRole": "técnico",
    "technicianName": "Carlos Manuel",
    "notes": "",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "createdAt": "2026-10-12T19:08:59.173Z",
    "updatedAt": "2026-10-12T19:08:59.173Z",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "endTime": "22:00",
    "id": "sched-1791832139173-5jcjh",
    "startTime": "13:00",
    "shiftType": "tarde",
    "date": "2026-10-31"
  },
  {
    "updatedAt": "2026-10-13T18:57:43.160Z",
    "endTime": "22:00",
    "createdAt": "2026-10-13T18:57:43.160Z",
    "technicianId": "pers-2",
    "notes": "",
    "date": "2026-11-21",
    "breakDurationMinutes": 60,
    "isOnCall": false,
    "shiftType": "tarde",
    "assignedAreas": [
      "Toda la Infraestructura"
    ],
    "technicianName": "Ferney Machado",
    "startTime": "13:00",
    "technicianRole": "técnico",
    "id": "sched-1791917863160-r70uj"
  }
];

export const SNAPSHOT_REQUESTS: HotelRequest[] = [
  {
    "id": "req-1791398775271-397ncoz",
    "requestedBy": "Mauricio",
    "description": "por favor revisar y ajustar las bisagras de los locker de la zona humeda",
    "requestedById": "usr-1789488926722",
    "priority": "urgente",
    "createdAt": "2026-10-07 13:43",
    "requestedByEmail": "mauricio.marin@wake.com.co",
    "resolvedAt": "2026-10-07 21:36",
    "location": "Zona Humeda",
    "category": "mobiliario",
    "updatedAt": "2026-10-07T18:46:15.271Z",
    "status": "resuelto",
    "title": "Locker, revisión bisagras",
    "assignedTo": "Ferney Machado/Técnico"
  },
  {
    "category": "mobiliario",
    "status": "resuelto",
    "createdAt": "2026-09-19 14:06",
    "requestedByEmail": "mauricio.marin@wake.com.co",
    "location": "Taller de mantenimiento",
    "assignedTo": "Ferney Alonso",
    "requestedBy": "Mauricio",
    "description": "Organización de herramientas, llaves, repuestos etc del taller \n\nEncargados Mateo y Alonso",
    "priority": "media",
    "title": "Organización del taller de mantenimiento",
    "id": "req-1789844885776-sdjq1kf",
    "requestedById": "usr-1789488926722",
    "resolvedAt": "2026-10-13 12:05"
  },
  {
    "requestedByEmail": "mauricio.marin@wake.com.co",
    "id": "req-1789844781683-txcxfnz",
    "requestedBy": "Mauricio",
    "description": "Instalar en su totalidad los filtros de agua entrada a cada apartamento",
    "category": "plomeria",
    "location": "Zona Apartamentos",
    "priority": "urgente",
    "assignedTo": "Carlos Manuel",
    "status": "en_proceso",
    "requestedById": "usr-1789488926722",
    "title": "Instalación de filtros apartamentos",
    "createdAt": "2026-09-19 14:04"
  },
  {
    "priority": "alta",
    "assignedTo": "Ferney Alonso",
    "status": "resuelto",
    "requestedByEmail": "mauricio.marin@wake.com.co",
    "id": "req-1789691714957-6wugspm",
    "resolvedAt": "2026-09-25 18:28",
    "requestedBy": "Mauricio",
    "description": "Reubicación de extintores en apartamentos y hotel",
    "createdAt": "2026-09-18 19:35",
    "requestedById": "usr-1789488926722",
    "title": "Recarga de extintores",
    "category": "otro",
    "location": "Hotel"
  },
  {
    "assignedTo": "Carlos Manuel",
    "requestedById": "usr-1789488926722",
    "requestedByEmail": "mauricio.marin@wake.com.co",
    "resolvedAt": "2026-10-03 13:47",
    "location": "Apartamentos",
    "category": "otro",
    "status": "resuelto",
    "priority": "media",
    "id": "req-1789756178090-2k6obxy",
    "createdAt": "2026-09-18 13:28",
    "title": "Limpieza cuartos técnicos jacuzzi",
    "description": "Por favor hacer aseo en la zona de los jacuzzi donde está la condensadoras",
    "requestedBy": "Mauricio"
  },
  {
    "id": "req-1789749894428-zotpwk7",
    "createdAt": "2026-09-18 11:41",
    "requestedByEmail": "mauricio.marin@wake.com.co",
    "assignedTo": "Ferney Machado",
    "title": "Mantenimiento de duchas, desagüe",
    "category": "plomeria",
    "location": "Pisos de Hotel",
    "requestedById": "usr-1789488926722",
    "status": "en_proceso",
    "priority": "alta",
    "description": "Tu objetivo es realizar el mantenimiento completo de las habitaciones del hotel, debes hacer duchas, desagües,",
    "requestedBy": "Mauricio"
  }
];

export const SNAPSHOT_INCIDENTS: Incident[] = [
  {
    "resolvedAt": "2026-09-24 06:38",
    "area": "Bombas De Impulción S3",
    "description": "Botón de alarma activado: \"Nivel Bajo\".\nNotas: Sin comentarios adicionales.",
    "status": "solucionado",
    "resolvedBy": "Juan Mateo/Técnico",
    "severity": "alta",
    "resolutionNotes": "Se revisa tanques de agua potable S3 que no tuviera el nivel bajo está todo ok ",
    "id": "inc-1790217910794-i4u9k",
    "registeredBy": "Juan Mateo/Técnico",
    "timestamp": "2026-09-23 21:45",
    "title": "Alarma en: Tanques De Agua Potable"
  },
  {
    "description": "Valor 0 A inferior al mínimo (12).\nNotas: Sin comentarios adicionales.",
    "resolutionNotes": "Se presentó el inconveniente por qué en la ronda se colocó un registro que no debía ",
    "status": "solucionado",
    "id": "inc-1790045900214-vrwhh",
    "registeredBy": "Ferney Machado/Técnico",
    "area": "Bombas De Impulción S3",
    "resolvedAt": "2026-09-22 20:20",
    "severity": "alta",
    "title": "Alarma en: BOM-1-S3",
    "resolvedBy": "Juan Mateo/Técnico",
    "timestamp": "2026-09-21 21:58"
  },
  {
    "description": "Valor 5.5 PSI inferior al mínimo (42).\nNotas: En buen estado ",
    "resolutionNotes": "Se presentó el inconveniente por qué el compañero puso en la precion de la bomba 5.5 y tenía que pone 55 sin el punto ",
    "status": "solucionado",
    "id": "inc-1790045900218-lgiqh",
    "registeredBy": "Ferney Machado/Técnico",
    "area": "Terraza Piso 18",
    "resolvedAt": "2026-09-22 20:21",
    "severity": "alta",
    "title": "Alarma en: Bombas De Presión",
    "resolvedBy": "Juan Mateo/Técnico",
    "timestamp": "2026-09-21 21:58"
  },
  {
    "timestamp": "2026-09-21 06:31",
    "registeredBy": "Juan Mateo/Técnico",
    "resolvedAt": "2026-09-21 22:43",
    "description": "Valor 73.3 °C superior al máximo (50).\nNotas: Defrost",
    "severity": "alta",
    "area": "Cocina S4",
    "resolvedBy": "Juan Mateo/Técnico",
    "status": "solucionado",
    "title": "Alarma en: Cava De Congelación",
    "resolutionNotes": "Estaba en defrost ",
    "id": "inc-1789990278160-gj2mc"
  },
  {
    "timestamp": "2026-09-17 23:03",
    "area": "Planta RCI S3",
    "id": "inc-1789617826284-mxa5x",
    "resolutionNotes": "Llegó el ACPM y se llenó el tanque  de la RCI  dejándolo en 100%",
    "status": "solucionado",
    "severity": "alta",
    "description": "Botón de alarma activado: \"Sensor Alarmado\".\nNotas: alarma por vajo acpm ya  se realizo la solicitud ",
    "title": "Alarma en: Combustible",
    "resolvedBy": "Ferney Alonso/Supervisor",
    "resolvedAt": "2026-09-18 19:38",
    "registeredBy": "Ferney Alonso/Supervisor"
  },
  {
    "resolutionNotes": "El martes 15  de septiembre  llega el ACPM  y se llena el tanque de la RCI dejándolo al 100% ",
    "title": "Alarma en: Combustible",
    "description": "Botón de alarma activado: \"Sensor Alarmado\".\nNotas: Alarma por bajo co",
    "area": "Planta RCI S3",
    "resolvedAt": "2026-09-18 19:41",
    "timestamp": "2026-09-17 07:10",
    "resolvedBy": "Ferney Alonso/Supervisor",
    "id": "inc-1789647000266-k0ogc",
    "severity": "alta",
    "status": "solucionado",
    "registeredBy": "Carlos Manuel/Técnico"
  },
  {
    "description": "Botón de alarma activado: \"Sensor Alarmado\".\nNotas: Se alarma por bajo combustible ",
    "resolutionNotes": "\nEl martes 15 de septiembre llega el ACPM y se llena el tanque de la RCI dejándolo al 100%",
    "title": "Alarma en: Combustible",
    "area": "Planta RCI S3",
    "timestamp": "2026-09-16 21:27",
    "resolvedAt": "2026-09-18 19:42",
    "registeredBy": "Carlos mercado/Técnico",
    "resolvedBy": "Ferney Alonso/Supervisor",
    "severity": "alta",
    "status": "solucionado",
    "id": "inc-1789525663358-c3mmn"
  },
  {
    "area": "Planta RCI S3",
    "timestamp": "2026-09-16 06:42",
    "severity": "alta",
    "registeredBy": "Juan Mateo/Técnico",
    "description": "Botón de alarma activado: \"Sensor Alarmado\".\nNotas: Sin comentarios adicionales.",
    "resolutionNotes": " Registrada:\nEl martes 15 de septiembre llega el ACPM y se llena el tanque de la RCI dejándolo al 100%",
    "title": "Alarma en: Combustible",
    "id": "inc-1789558924973-m8oie",
    "status": "solucionado",
    "resolvedBy": "Ferney Alonso/Supervisor",
    "resolvedAt": "2026-09-18 19:43"
  },
  {
    "area": "Planta RCI S3",
    "status": "solucionado",
    "registeredBy": "Juan Mateo/Técnico",
    "resolutionNotes": "\nEl martes 15 de septiembre llega el ACPM y se llena el tanque de la RCI dejándolo al 100%",
    "description": "Botón de alarma activado: \"Sensor Alarmado\".\nNotas: Sin comentarios adicionales.",
    "resolvedBy": "Ferney Alonso/Supervisor",
    "title": "Alarma en: Combustible",
    "resolvedAt": "2026-09-18 19:43",
    "severity": "alta",
    "id": "inc-1789474138830-6b0c6",
    "timestamp": "2026-09-15 07:08"
  }
];

export const SNAPSHOT_METERS: MeterDefinition[] = [
  {
    "type": "energia",
    "areaTag": "general",
    "updatedAt": "2026-10-08T14:39:55.036Z",
    "id": "med-1791223488578-zr9be",
    "location": "Sótano 1",
    "status": "activo",
    "createdAt": "2026-10-05T18:04:48.578Z",
    "currentReading": 341950,
    "name": "Contador Principal 180 Activa",
    "code": "MED-ENERG-PRINC",
    "isMainMeter": true,
    "lastReadingDate": "2026-10-08",
    "initialReading": 0,
    "unit": "kWh",
    "lastReadingTime": "06:17"
  },
  {
    "currentReading": 0,
    "areaTag": "general",
    "id": "med-1791230379855-kf4bl",
    "type": "energia",
    "updatedAt": "2026-10-05T19:59:39.855Z",
    "location": "Sótano 1",
    "createdAt": "2026-10-05T19:59:39.855Z",
    "status": "activo",
    "isMainMeter": true,
    "code": "MED-ENER",
    "unit": "kWh",
    "name": "Energía 380 Reactiva",
    "initialReading": 0
  },
  {
    "areaTag": "general",
    "type": "gas",
    "updatedAt": "2026-10-08T14:39:55.154Z",
    "currentReading": 18215,
    "name": "Gas Principal Hotel",
    "location": "Sótano 2",
    "createdAt": "2026-10-05T18:13:34.081Z",
    "lastReadingTime": "06:17",
    "initialReading": 0,
    "lastReadingDate": "2026-10-08",
    "code": "MED-GAS-PRINC",
    "id": "med-1791224014081-c8v51",
    "unit": "m³",
    "isMainMeter": true,
    "status": "activo"
  },
  {
    "name": "Contador Agua Pergamino",
    "initialReading": 0,
    "status": "activo",
    "isMainMeter": false,
    "areaTag": "general",
    "location": "Área Técnica",
    "createdAt": "2026-10-06T23:31:45.191Z",
    "unit": "m³",
    "currentReading": 0,
    "code": "MED-AGU-13",
    "updatedAt": "2026-10-06T23:31:45.191Z",
    "id": "med-1791329505191-a0db1",
    "type": "agua"
  },
  {
    "location": "Piso 6",
    "type": "agua",
    "status": "activo",
    "areaTag": "general",
    "currentReading": 0,
    "name": "Contador De Agua - Cold plunge",
    "isMainMeter": false,
    "id": "med-1791300727325-1n5jz",
    "createdAt": "2026-10-06T15:32:07.325Z",
    "unit": "m³",
    "updatedAt": "2026-10-06T15:32:07.325Z",
    "code": "MED-AGU-10",
    "initialReading": 0
  },
  {
    "location": "Piso 6",
    "id": "med-1791300591605-dbaxw",
    "currentReading": 0,
    "updatedAt": "2026-10-06T15:29:51.605Z",
    "unit": "m³",
    "status": "activo",
    "code": "MED-AGU-09",
    "createdAt": "2026-10-06T15:29:51.605Z",
    "name": "Contador De Agua - Sastra",
    "areaTag": "general",
    "isMainMeter": false,
    "type": "agua",
    "initialReading": 0
  },
  {
    "type": "agua",
    "location": "Lavandería  S4",
    "areaTag": "general",
    "status": "activo",
    "code": "MED-AGUA",
    "createdAt": "2026-10-06T15:01:43.256Z",
    "initialReading": 0,
    "unit": "m³",
    "id": "med-1791298903256-534ns",
    "updatedAt": "2026-10-06T23:08:27.732Z",
    "isMainMeter": false,
    "currentReading": 0,
    "name": "Contador De Agua Lavandería"
  },
  {
    "initialReading": 0,
    "id": "med-1791300206870-me6fx",
    "type": "agua",
    "currentReading": 0,
    "createdAt": "2026-10-06T15:23:26.870Z",
    "location": "Sótano S4 Taller",
    "isMainMeter": false,
    "code": "MED-AGU",
    "unit": "m³",
    "status": "activo",
    "areaTag": "general",
    "updatedAt": "2026-10-06T23:09:55.259Z",
    "name": "Contador De Agua S4"
  },
  {
    "updatedAt": "2026-10-06T23:10:12.145Z",
    "unit": "m³",
    "location": "Silo Piso 6",
    "isMainMeter": false,
    "name": "Contador De Agua Silo",
    "type": "agua",
    "id": "med-1791300423086-3bmse",
    "initialReading": 0,
    "createdAt": "2026-10-06T15:27:03.086Z",
    "currentReading": 0,
    "code": "MED-AGU-08",
    "status": "activo",
    "areaTag": "general"
  },
  {
    "unit": "m³",
    "initialReading": 0,
    "id": "med-1791230770959-6zj45",
    "areaTag": "general",
    "createdAt": "2026-10-05T20:06:10.959Z",
    "name": "Contador De Gas Lavandería",
    "isMainMeter": false,
    "brandModel": "Sótano 4",
    "currentReading": 0,
    "type": "gas",
    "location": "Lavandería S4",
    "status": "activo",
    "updatedAt": "2026-10-06T23:23:02.918Z",
    "code": "MED-GAS"
  },
  {
    "currentReading": 0,
    "name": "Contador Gas pergamino",
    "createdAt": "2026-10-06T23:25:50.619Z",
    "areaTag": "general",
    "location": "Sótano 2",
    "initialReading": 0,
    "isMainMeter": false,
    "unit": "m³",
    "code": "MED-GAS-11",
    "status": "activo",
    "updatedAt": "2026-10-06T23:25:50.620Z",
    "type": "gas",
    "id": "med-1791329150619-pw59p"
  },
  {
    "areaTag": "general",
    "unit": "kWh",
    "location": "Sotano 1",
    "createdAt": "2026-10-09T23:05:55.342Z",
    "name": "Contador Pergamino Energia",
    "initialReading": 0,
    "updatedAt": "2026-10-09T23:05:55.342Z",
    "isMainMeter": false,
    "code": "MED-ENE-14",
    "id": "med-1791587155342-24mgn",
    "type": "energia",
    "currentReading": 0,
    "status": "activo"
  },
  {
    "id": "med-1791329299655-und25",
    "areaTag": "general",
    "currentReading": 0,
    "code": "MED-AGU-12",
    "initialReading": 0,
    "type": "agua",
    "isMainMeter": false,
    "createdAt": "2026-10-06T23:28:19.656Z",
    "location": "Piso 5",
    "name": "Contador Piscina Y Jacuzzis",
    "status": "activo",
    "unit": "m³",
    "updatedAt": "2026-10-06T23:28:19.656Z"
  }
];

export const SNAPSHOT_METER_READINGS: MeterReadingRecord[] = [
  {
    "currentValue": 341950,
    "recognitionMethod": "manual",
    "intervalHours": 10.8,
    "unit": "kWh",
    "time": "06:57",
    "createdAt": "2026-10-07T12:33:10.751Z",
    "technicianName": "Adrián Barrera/Tecnico",
    "timestamp": "2026-10-07T06:57:00",
    "meterId": "med-1791223488578-zr9be",
    "meterName": "Contador Principal 180 Activa",
    "consumption": 0,
    "meterType": "energia",
    "notes": "Lectura registrada en Ronda Diaria (Turno Mañana)",
    "previousValue": 341950,
    "id": "rd-1791376390751-8kllx",
    "date": "2026-10-07"
  },
  {
    "meterName": "Gas Principal Hotel",
    "consumption": 0,
    "time": "06:57",
    "notes": "Lectura registrada en Ronda Diaria (Turno Mañana)",
    "technicianName": "Adrián Barrera/Tecnico",
    "unit": "m³",
    "previousValue": 18215,
    "meterType": "gas",
    "timestamp": "2026-10-07T06:57:00",
    "recognitionMethod": "manual",
    "date": "2026-10-07",
    "id": "rd-1791376391627-cdb8n",
    "intervalHours": 10.8,
    "createdAt": "2026-10-07T12:33:11.627Z",
    "currentValue": 18215,
    "meterId": "med-1791224014081-c8v51"
  }
];

export const SNAPSHOT_USERS: User[] = [
  {
    "createdAt": "2026-09-12T16:31:23.226Z",
    "role": "admin",
    "visibleSections": [
      "dashboard",
      "rondas",
      "bombas",
      "hojas_vida",
      "incidencias",
      "preventivo",
      "usuarios",
      "configuraciones",
      "solicitudes",
      "tareas"
    ],
    "displayName": "Juan Mateo Ramos",
    "id": "usr-1789230683226",
    "status": "active",
    "notifyRoundInProgress": true,
    "email": "juanmateoramosramos44@gmail.com",
    "department": "Mantenimiento e Ingeniería",
    "permissions": {
      "canEditSettings": true,
      "canManageUsers": true,
      "notifyRequests": true,
      "notifyRounds": true,
      "canDeleteRecords": true,
      "notifyIncidents": true,
      "canStartRounds": true,
      "notifyTasks": true,
      "notifyRoundInProgress": true
    },
    "canStartRounds": true,
    "password": "Juanmateo12",
    "lastSeenAt": "2026-10-16T17:15:58.943Z",
    "isOnline": true,
    "notifyRounds": true,
    "notifyRequests": true,
    "updatedAt": "2026-10-04T01:52:02.179Z",
    "notifyIncidents": true,
    "notifyTasks": true
  },
  {
    "id": "usr-1789246875257",
    "email": "ferneymachado@gmail.com",
    "displayName": "Ferney Machado/Técnico",
    "role": "técnico",
    "department": "",
    "visibleSections": [
      "dashboard",
      "rondas",
      "incidencias",
      "solicitudes",
      "tareas",
      "horarios"
    ],
    "permissions": {
      "canStartRounds": true,
      "notifyTasks": true,
      "notifyIncidents": true,
      "notifyRounds": false,
      "notifyRoundInProgress": false,
      "canManageUsers": false,
      "notifyRequests": true,
      "canEditSettings": false,
      "canDeleteRecords": false
    },
    "status": "active",
    "createdAt": "2026-09-12T21:01:15.257Z",
    "notifyRoundInProgress": false,
    "notifyRequests": true,
    "notifyIncidents": true,
    "notifyTasks": true,
    "notifyRounds": false,
    "updatedAt": "2026-10-09T01:16:50.541Z",
    "canStartRounds": true,
    "password": "123456",
    "isOnline": true,
    "lastSeenAt": "2026-10-14T22:11:56.620Z"
  },
  {
    "id": "usr-1789435937593",
    "email": "carlosmanuel@gmail.com",
    "displayName": "Carlos Manuel/ Técnico",
    "role": "técnico",
    "department": "",
    "visibleSections": [
      "dashboard",
      "rondas",
      "incidencias",
      "solicitudes",
      "horarios",
      "tareas"
    ],
    "permissions": {
      "canDeleteRecords": false,
      "notifyTasks": true,
      "notifyRounds": false,
      "notifyRoundInProgress": false,
      "canEditSettings": false,
      "notifyIncidents": true,
      "canManageUsers": false,
      "notifyRequests": true
    },
    "status": "active",
    "createdAt": "2026-09-15T01:32:17.593Z",
    "notifyRoundInProgress": false,
    "notifyTasks": true,
    "notifyRequests": true,
    "notifyRounds": false,
    "notifyIncidents": true,
    "updatedAt": "2026-10-01T03:19:55.239Z",
    "canStartRounds": true,
    "password": "123456",
    "isOnline": true,
    "lastSeenAt": "2026-10-16T02:03:42.264Z"
  },
  {
    "role": "técnico",
    "displayName": "Ferney Alonso/Supervisor",
    "status": "active",
    "notifyTasks": true,
    "notifyRounds": false,
    "createdAt": "2026-09-15T02:04:23.324Z",
    "department": "",
    "notifyRequests": true,
    "visibleSections": [
      "rondas",
      "incidencias",
      "solicitudes",
      "dashboard",
      "horarios",
      "tareas"
    ],
    "email": "ferneyalonso44@gmail.com",
    "isOnline": true,
    "lastSeenAt": "2026-10-05T02:07:19.314Z",
    "id": "usr-1789437863324",
    "notifyIncidents": true,
    "permissions": {
      "notifyRoundInProgress": false,
      "notifyRequests": true,
      "notifyRounds": false,
      "notifyTasks": true,
      "canDeleteRecords": false,
      "canManageUsers": false,
      "notifyIncidents": true,
      "canEditSettings": false
    },
    "notifyRoundInProgress": false,
    "updatedAt": "2026-10-03T16:06:15.673Z",
    "canStartRounds": true,
    "password": "123456"
  },
  {
    "email": "carlos.fernández@wake.com.co",
    "id": "usr-1790639954575-671",
    "status": "active",
    "department": "Mantenimiento e Ingeniería",
    "role": "admin",
    "displayName": "Carlos Fernández",
    "notifyRoundInProgress": false,
    "permissions": {
      "canManageUsers": false,
      "notifyRoundInProgress": false,
      "canDeleteRecords": false,
      "canStartRounds": false,
      "canEditSettings": false
    },
    "visibleSections": [
      "rondas",
      "incidencias",
      "solicitudes",
      "tareas"
    ],
    "createdAt": "2026-09-28T23:59:14.575Z",
    "canStartRounds": false,
    "password": "123456",
    "updatedAt": "2026-10-04T01:27:48.331Z",
    "lastSeenAt": "2026-10-08T20:30:41.718Z",
    "isOnline": true
  },
  {
    "role": "técnico",
    "notifyRoundInProgress": false,
    "permissions": {
      "notifyRequests": true,
      "notifyTasks": true,
      "canManageUsers": false,
      "notifyRounds": false,
      "canEditSettings": false,
      "notifyIncidents": true,
      "canDeleteRecords": false,
      "notifyRoundInProgress": false
    },
    "notifyTasks": true,
    "department": "Mantenimiento e Ingeniería",
    "id": "usr-1790809958615-592",
    "notifyRequests": true,
    "notifyRounds": false,
    "email": "adrianbarrera@gmail.com",
    "visibleSections": [
      "dashboard",
      "rondas",
      "incidencias",
      "solicitudes",
      "horarios",
      "tareas"
    ],
    "createdAt": "2026-09-30T23:12:38.615Z",
    "status": "active",
    "notifyIncidents": true,
    "displayName": "Adrián Barrera/Tecnico",
    "updatedAt": "2026-10-04T01:31:38.876Z",
    "canStartRounds": true,
    "password": "123456",
    "lastSeenAt": "2026-10-14T11:29:34.358Z",
    "isOnline": true
  },
  {
    "id": "usr-1789488926722",
    "email": "mauricio.marin@wake.com.co",
    "displayName": "Mauricio",
    "role": "admin",
    "department": "Recepción & Operaciones",
    "visibleSections": [
      "dashboard",
      "rondas",
      "bombas",
      "hojas_vida",
      "incidencias",
      "preventivo",
      "solicitudes",
      "tareas",
      "horarios"
    ],
    "permissions": {
      "canDeleteRecords": false,
      "canManageUsers": false,
      "notifyRequests": true,
      "notifyRoundInProgress": false,
      "canEditSettings": false,
      "canStartRounds": false,
      "notifyIncidents": true,
      "notifyRounds": true,
      "notifyTasks": true
    },
    "status": "active",
    "createdAt": "2026-09-14T10:00:00.000Z",
    "notifyRounds": true,
    "notifyIncidents": true,
    "notifyRoundInProgress": false,
    "updatedAt": "2026-10-04T01:37:29.196Z",
    "notifyRequests": true,
    "notifyTasks": true,
    "password": "123456",
    "canStartRounds": false,
    "lastSeenAt": "2026-10-13T19:43:23.248Z",
    "isOnline": true
  }
];

export const SNAPSHOT_ROUND_TEMPLATE: RoundCheckpoint[] = [
  {
    "buttonActions": {},
    "title": "Cava De Congelación",
    "category": "refrigeracion",
    "isCritical": false,
    "unit": "°C",
    "allowNotes": true,
    "minValue": -25,
    "includeStatusButtons": false,
    "allowPhoto": true,
    "requireNotesOnFailure": false,
    "photoMode": "normal",
    "id": "chk-tpl-1788985535314-nua3",
    "measurementFields": [
      {
        "minValue": -25,
        "allowPhoto": true,
        "includeButtons": false,
        "unit": "°C",
        "id": "1",
        "maxValue": 80,
        "name": "Cava Congelación",
        "photoMode": "normal"
      }
    ],
    "maxValue": 80,
    "type": "numeric",
    "area": "Cocina S4",
    "photoRequired": false
  },
  {
    "unit": "°C",
    "buttonActions": {},
    "maxValue": 50,
    "includeStatusButtons": false,
    "title": "Cava De Refrigeración",
    "photoMode": "normal",
    "isCritical": false,
    "allowNotes": true,
    "allowPhoto": true,
    "minValue": 0,
    "type": "numeric",
    "area": "Cocina S4",
    "photoRequired": false,
    "requireNotesOnFailure": false,
    "category": "refrigeracion",
    "id": "chk-tpl-1788988056429-c66o",
    "measurementFields": [
      {
        "photoMode": "normal",
        "allowPhoto": true,
        "unit": "°C",
        "includeButtons": false,
        "maxValue": 50,
        "name": "Cava Refrigeracion",
        "id": "1",
        "minValue": 0
      }
    ]
  },
  {
    "buttonActions": {},
    "allowNotes": true,
    "category": "refrigeracion",
    "isCritical": false,
    "allowPhoto": true,
    "id": "chk-tpl-1788988080039-nkgi",
    "minValue": 0,
    "unit": "°C",
    "measurementFields": [
      {
        "photoMode": "normal",
        "maxValue": 50,
        "allowPhoto": true,
        "unit": "°C",
        "id": "1",
        "name": "Cava Refrigeracion",
        "minValue": 0,
        "includeButtons": false
      }
    ],
    "requireNotesOnFailure": false,
    "photoMode": "normal",
    "title": "Cava De Refrigeración",
    "maxValue": 50,
    "includeStatusButtons": false,
    "area": "Cocina S4",
    "type": "numeric",
    "photoRequired": false
  },
  {
    "buttonActions": {},
    "id": "chk-tpl-1788989380312-s3ia",
    "category": "extraccion",
    "title": "Extracción",
    "requireNotesOnFailure": false,
    "options": [
      "Encendido",
      "Apagado",
      "Alarmado"
    ],
    "allowPhoto": true,
    "isCritical": false,
    "allowNotes": true,
    "photoMode": "normal",
    "type": "ok_nok",
    "area": "Cocina S4",
    "photoRequired": false
  },
  {
    "requireNotesOnFailure": false,
    "photoMode": "normal",
    "photoRequired": false,
    "unit": "PSI",
    "includeStatusButtons": false,
    "allowPhoto": true,
    "isCritical": false,
    "allowNotes": true,
    "buttonActions": {},
    "title": "Bomba Jockey",
    "measurementFields": [
      {
        "id": "1",
        "includeButtons": false,
        "allowPhoto": true,
        "unit": "PSI",
        "photoMode": "normal"
      }
    ],
    "id": "chk-tpl-1789054060776-tynz",
    "category": "hidraulico",
    "type": "numeric",
    "area": "Planta RCI S3"
  },
  {
    "photoRequired": false,
    "requireNotesOnFailure": false,
    "includeStatusButtons": false,
    "area": "Planta RCI S3",
    "type": "numeric",
    "id": "chk-tpl-1789058977130-dsm2",
    "measurementFields": [
      {
        "id": "1",
        "photoMode": "normal",
        "name": "Bateria 1",
        "includeButtons": false,
        "allowPhoto": true,
        "unit": "VDC"
      },
      {
        "allowPhoto": true,
        "id": "1789059243278",
        "photoMode": "normal",
        "includeButtons": false,
        "name": "Bateria 2",
        "unit": "VDC"
      }
    ],
    "photoMode": "normal",
    "title": "Baterias",
    "allowPhoto": true,
    "buttonActions": {},
    "allowNotes": true,
    "unit": "VDC",
    "category": "bateria",
    "isCritical": false
  },
  {
    "id": "chk-tpl-1789060493962-91iv",
    "photoRequired": false,
    "type": "numeric",
    "area": "Planta RCI S3",
    "maxValue": 100,
    "includeStatusButtons": true,
    "options": [
      "Sin Alarma",
      "Sensor Alarmado"
    ],
    "measurementFields": [
      {
        "maxValue": 100,
        "includeButtons": false,
        "minValue": 61,
        "unit": "%",
        "photoMode": "normal",
        "id": "1",
        "name": "Nivel Combustible",
        "allowPhoto": true
      }
    ],
    "unit": "%",
    "allowNotes": true,
    "minValue": 61,
    "title": "Combustible",
    "isCritical": false,
    "photoMode": "normal",
    "allowPhoto": true,
    "category": "combustible",
    "buttonActions": {},
    "requireNotesOnFailure": false
  },
  {
    "id": "chk-tpl-1789066766097-j1e5",
    "photoRequired": false,
    "minValue": 250,
    "requireNotesOnFailure": false,
    "unit": "PSI",
    "category": "manometro",
    "measurementFields": [
      {
        "name": "Manometro 1",
        "maxValue": 300,
        "allowPhoto": true,
        "unit": "PSI",
        "minValue": 250,
        "includeButtons": false,
        "photoMode": "normal",
        "id": "1"
      },
      {
        "id": "1789066651541",
        "photoMode": "normal",
        "maxValue": 180,
        "includeButtons": false,
        "minValue": 160,
        "unit": "PSI",
        "allowPhoto": true,
        "name": "Manometro 2"
      }
    ],
    "isCritical": false,
    "allowNotes": true,
    "includeStatusButtons": false,
    "allowPhoto": true,
    "photoMode": "normal",
    "title": "Manometros Principales",
    "maxValue": 300,
    "area": "Planta RCI S3",
    "type": "numeric",
    "buttonActions": {}
  },
  {
    "type": "numeric",
    "area": "Bombas De Impulción S3",
    "photoMode": "normal",
    "photoRequired": false,
    "maxValue": 20,
    "options": [
      "Encendido",
      "Apagado"
    ],
    "measurementFields": [
      {
        "unit": "A",
        "maxValue": 20,
        "id": "1",
        "includeButtons": false,
        "name": "BOM-1",
        "photoMode": "normal",
        "allowPhoto": true,
        "minValue": 12
      }
    ],
    "category": "hidraulico",
    "unit": "A",
    "title": "BOM-1-S3",
    "buttonActions": {
      "Encendido": {
        "actionType": "turn_on",
        "color": "emerald"
      },
      "Apagado": {
        "actionType": "turn_off",
        "color": "slate"
      }
    },
    "id": "chk-tpl-1789071231392-wx5f",
    "minValue": 12,
    "requireNotesOnFailure": false,
    "isCritical": false,
    "includeStatusButtons": true,
    "allowNotes": true,
    "allowPhoto": true
  },
  {
    "allowPhoto": true,
    "unit": "A",
    "isCritical": false,
    "allowNotes": true,
    "title": "BOM-2-S3",
    "category": "hidraulico",
    "requireNotesOnFailure": false,
    "measurementFields": [
      {
        "name": "BOM-2",
        "minValue": 12,
        "includeButtons": false,
        "unit": "A",
        "id": "1",
        "photoMode": "normal",
        "allowPhoto": true,
        "maxValue": 20
      }
    ],
    "minValue": 12,
    "buttonActions": {},
    "photoMode": "normal",
    "options": [
      "Encendido",
      "Apagado"
    ],
    "photoRequired": false,
    "area": "Bombas De Impulción S3",
    "type": "numeric",
    "maxValue": 20,
    "id": "chk-tpl-1789072528074-19rc",
    "includeStatusButtons": true
  },
  {
    "unit": "VDC",
    "id": "chk-tpl-1789072918083-tj8j",
    "title": "Batería",
    "includeStatusButtons": false,
    "photoRequired": false,
    "requireNotesOnFailure": false,
    "measurementFields": [
      {
        "allowPhoto": true,
        "photoMode": "normal",
        "id": "1",
        "includeButtons": false,
        "unit": "VDC",
        "name": "Bateria-"
      }
    ],
    "photoMode": "normal",
    "type": "numeric",
    "area": "Planta De Emergencia S2",
    "buttonActions": {},
    "category": "bateria",
    "allowNotes": true,
    "isCritical": false,
    "allowPhoto": true
  },
  {
    "title": "Combustible",
    "measurementFields": [
      {
        "id": "1",
        "photoMode": "normal",
        "unit": "%",
        "allowPhoto": true,
        "includeButtons": false,
        "name": "Combustible"
      }
    ],
    "photoMode": "normal",
    "id": "chk-tpl-1789082124733-70s2",
    "unit": "%",
    "photoRequired": false,
    "buttonActions": {},
    "requireNotesOnFailure": false,
    "allowPhoto": true,
    "category": "combustible",
    "isCritical": false,
    "allowNotes": true,
    "type": "numeric",
    "area": "Planta De Emergencia S2",
    "includeStatusButtons": false
  },
  {
    "id": "chk-tpl-1789082328250-puzo",
    "requireNotesOnFailure": false,
    "area": "Planta De Emergencia S2",
    "type": "numeric",
    "allowPhoto": true,
    "isCritical": false,
    "title": "Temperatura",
    "category": "temperatura",
    "allowNotes": true,
    "photoMode": "normal",
    "photoRequired": false,
    "includeStatusButtons": false,
    "unit": "°C",
    "buttonActions": {},
    "measurementFields": [
      {
        "allowPhoto": true,
        "name": "Temperatura",
        "includeButtons": false,
        "photoMode": "normal",
        "id": "1",
        "unit": "°C"
      }
    ]
  },
  {
    "photoMode": "normal",
    "title": "Tanques",
    "includeStatusButtons": false,
    "unit": "m³",
    "buttonActions": {},
    "id": "chk-tpl-1789181196563-joap",
    "photoRequired": false,
    "requireNotesOnFailure": false,
    "allowPhoto": true,
    "isCritical": false,
    "allowNotes": true,
    "type": "numeric",
    "area": "Terraza Piso 18",
    "measurementFields": [
      {
        "allowPhoto": true,
        "includeButtons": false,
        "id": "1",
        "unit": "m³",
        "photoMode": "normal",
        "name": "Tanques Hotel"
      },
      {
        "allowPhoto": true,
        "photoMode": "normal",
        "id": "1789181031815",
        "unit": "m³",
        "includeButtons": false,
        "name": "Tanques Apto"
      }
    ],
    "category": "tanque"
  },
  {
    "category": "condensador",
    "photoMode": "normal",
    "id": "chk-tpl-1789181948808-tk08",
    "unit": "FP",
    "buttonActions": {},
    "measurementFields": [
      {
        "includeButtons": false,
        "allowPhoto": true,
        "photoMode": "normal",
        "id": "1",
        "name": "Condensadores",
        "unit": "FP"
      }
    ],
    "area": "Planta De Emergencia S2",
    "type": "numeric",
    "requireNotesOnFailure": false,
    "photoRequired": false,
    "allowPhoto": true,
    "includeStatusButtons": false,
    "allowNotes": true,
    "title": "Condensadores",
    "isCritical": false
  },
  {
    "unit": "PSI",
    "photoRequired": false,
    "measurementFields": [
      {
        "photoMode": "normal",
        "includeButtons": true,
        "options": [
          "Encendido",
          "Apagado",
          "Alarmado"
        ],
        "buttonActions": {
          "Encendido": {
            "color": "emerald",
            "actionType": "default"
          },
          "Apagado": {
            "actionType": "default",
            "color": "slate"
          }
        },
        "maxValue": 60,
        "statusValue": "Encendido",
        "id": "1",
        "unit": "PSI",
        "name": "Precion",
        "allowPhoto": true,
        "minValue": 42
      }
    ],
    "category": "hidraulico",
    "includeStatusButtons": false,
    "minValue": 42,
    "photoMode": "normal",
    "id": "chk-tpl-1789183131928-5ogv",
    "maxValue": 60,
    "requireNotesOnFailure": false,
    "type": "numeric",
    "area": "Terraza Piso 18",
    "allowNotes": true,
    "isCritical": false,
    "allowPhoto": true,
    "title": "Bombas De Presión",
    "buttonActions": {}
  },
  {
    "area": "Zona Húmeda/Piso 6",
    "type": "numeric",
    "buttonActions": {},
    "title": "Sauna/Cold Plungue",
    "measurementFields": [
      {
        "id": "1",
        "allowPhoto": true,
        "statusValue": "Encendido",
        "unit": "°C",
        "photoMode": "normal",
        "name": "Temperatura/Sauna",
        "includeButtons": true,
        "options": [
          "Encendido",
          "Apagado"
        ],
        "buttonActions": {
          "Apagado": {
            "actionType": "turn_off",
            "color": "slate"
          },
          "Encendido": {
            "actionType": "default",
            "color": "emerald"
          }
        }
      },
      {
        "photoMode": "normal",
        "includeButtons": true,
        "name": "Cold Plungue",
        "unit": "°C",
        "id": "1789184871874",
        "allowPhoto": true,
        "statusValue": "Encendido",
        "options": [
          "Encendido",
          "Apagado"
        ],
        "buttonActions": {
          "Encendido": {
            "color": "emerald",
            "actionType": "default"
          },
          "Apagado": {
            "color": "slate",
            "actionType": "default"
          }
        }
      }
    ],
    "category": "sauna_cold_plunge",
    "unit": "°C",
    "includeStatusButtons": false,
    "photoMode": "normal",
    "id": "chk-tpl-1789184914843-8qeh",
    "photoRequired": false,
    "isCritical": false,
    "allowNotes": true,
    "requireNotesOnFailure": false,
    "allowPhoto": true
  },
  {
    "suggestedNotes": [
      "Musica Ascensores Ok",
      "Musica Gym Ok",
      "Televisor Gym Ok",
      "Musica Piscina Ok",
      "Musica Silo Ok",
      "Musica Sastra Ok",
      "Musica Sauna Ok"
    ],
    "photoRequired": false,
    "type": "ok_nok",
    "area": "Zona Húmeda/Piso 6",
    "id": "chk-tpl-1789186187266-j679",
    "category": "musica",
    "photoMode": "normal",
    "title": "Musica",
    "allowPhoto": true,
    "isCritical": false,
    "allowNotes": true,
    "requireNotesOnFailure": false,
    "options": [
      "Todo Ok",
      "NO OK"
    ],
    "buttonActions": {}
  },
  {
    "id": "chk-tpl-1789227609185-rbqi",
    "includeStatusButtons": false,
    "category": "refrigeracion",
    "photoRequired": false,
    "photoMode": "normal",
    "measurementFields": [
      {
        "photoMode": "normal",
        "options": [
          "OK",
          "NO OK"
        ],
        "id": "1",
        "statusValue": "OK",
        "unit": "°C",
        "name": "Botellero Ventanal",
        "allowPhoto": true,
        "includeButtons": true,
        "buttonActions": {
          "Apagado": {
            "color": "slate",
            "actionType": "turn_off"
          },
          "Encendido": {
            "actionType": "turn_on",
            "color": "emerald"
          }
        }
      },
      {
        "includeButtons": true,
        "allowPhoto": true,
        "id": "1789227261860",
        "photoMode": "normal",
        "statusValue": "OK",
        "unit": "°C",
        "name": "Nevera Cafetera",
        "options": [
          "OK",
          "NO OK"
        ],
        "buttonActions": {
          "Apagado": {
            "actionType": "turn_off",
            "color": "slate"
          },
          "Encendido": {
            "color": "emerald",
            "actionType": "turn_on"
          }
        }
      },
      {
        "allowPhoto": true,
        "includeButtons": true,
        "options": [
          "OK",
          "NO OK"
        ],
        "id": "1789227309459",
        "statusValue": "OK",
        "photoMode": "normal",
        "unit": "°F",
        "name": "Botellero Entrada Derecha",
        "buttonActions": {
          "Encendido": {
            "actionType": "turn_on",
            "color": "emerald"
          },
          "Apagado": {
            "color": "slate",
            "actionType": "turn_off"
          }
        }
      },
      {
        "statusValue": "OK",
        "id": "1789227538808",
        "options": [
          "OK",
          "NO OK"
        ],
        "allowPhoto": true,
        "unit": "°F",
        "name": "Botellero Entrada Izquierda",
        "photoMode": "normal",
        "buttonActions": {
          "Encendido": {
            "color": "emerald",
            "actionType": "turn_on"
          },
          "Apagado": {
            "actionType": "turn_off",
            "color": "slate"
          }
        },
        "includeButtons": true
      }
    ],
    "area": "Bar/ Piso 6",
    "type": "numeric",
    "title": "Equipos Del Bar",
    "requireNotesOnFailure": false,
    "unit": "°C",
    "buttonActions": {},
    "allowPhoto": true,
    "isCritical": false,
    "allowNotes": true
  },
  {
    "measurementFields": [
      {
        "name": "Bombas/Presurisacion",
        "photoMode": "normal",
        "unit": "°C",
        "allowPhoto": true,
        "options": [
          "OK",
          "NO OK"
        ],
        "statusValue": "OK",
        "id": "1",
        "buttonActions": {
          "Encendido": {
            "color": "emerald",
            "actionType": "turn_on"
          },
          "Apagado": {
            "color": "slate",
            "actionType": "turn_off"
          }
        },
        "includeButtons": true
      },
      {
        "statusValue": "OK",
        "id": "1789240544706",
        "unit": "°C",
        "name": "Bomba/Resirculacion",
        "photoMode": "normal",
        "options": [
          "OK",
          "NO OK"
        ],
        "buttonActions": {
          "Apagado": {
            "actionType": "turn_off",
            "color": "slate"
          },
          "Encendido": {
            "color": "emerald",
            "actionType": "turn_on"
          }
        },
        "allowPhoto": true,
        "includeButtons": true
      },
      {
        "photoMode": "normal",
        "name": "Manometros De Bombas",
        "id": "1789240600468",
        "unit": "PSI",
        "allowPhoto": true,
        "includeButtons": false
      },
      {
        "unit": "PSI",
        "name": "Manometros Tanques",
        "allowPhoto": true,
        "includeButtons": false,
        "photoMode": "normal",
        "id": "1789240637614"
      }
    ],
    "allowPhoto": true,
    "isCritical": false,
    "id": "chk-tpl-1789240659096-ji6y",
    "allowNotes": true,
    "requireNotesOnFailure": false,
    "buttonActions": {},
    "type": "numeric",
    "area": "Cuarto De Bombas",
    "includeStatusButtons": false,
    "title": "Sistema De Agua Caliente",
    "photoRequired": false,
    "category": "caldera",
    "unit": "°C",
    "photoMode": "normal"
  },
  {
    "title": "Ascensor Apto",
    "allowNotes": true,
    "isCritical": false,
    "allowPhoto": true,
    "options": [
      "Operativo",
      "Bloqueado"
    ],
    "buttonActions": {},
    "requireNotesOnFailure": false,
    "category": "extraccion",
    "photoMode": "normal",
    "id": "chk-tpl-1789423733318-xfh6",
    "photoRequired": false,
    "type": "ok_nok",
    "area": "Ascensores"
  },
  {
    "photoMode": "normal",
    "title": "Tanques De Agua Potable",
    "id": "chk-tpl-1789428026446-qnuc",
    "category": "tanque",
    "photoRequired": false,
    "requireNotesOnFailure": false,
    "buttonActions": {
      "Nivel Bajo": {
        "actionType": "failure",
        "color": "auto"
      }
    },
    "options": [
      "Nivel Bajo",
      "Nivel Medio",
      "Nivel Alto"
    ],
    "type": "ok_nok",
    "area": "Bombas De Impulción S3",
    "isCritical": false,
    "allowNotes": true,
    "allowPhoto": true
  },
  {
    "category": "extraccion",
    "area": "Ascensores",
    "type": "ok_nok",
    "allowPhoto": true,
    "allowNotes": true,
    "isCritical": false,
    "buttonActions": {},
    "title": "Ascensor Hotel",
    "photoMode": "normal",
    "photoRequired": false,
    "id": "chk-tpl-1789428185062-g11h",
    "options": [
      "Operativo",
      "Bloqueado"
    ],
    "requireNotesOnFailure": false
  },
  {
    "requireNotesOnFailure": false,
    "buttonActions": {},
    "photoMode": "normal",
    "options": [
      "Operativo",
      "Bloqueado"
    ],
    "allowPhoto": true,
    "allowNotes": true,
    "isCritical": false,
    "category": "extraccion",
    "id": "chk-tpl-1789428511011-x67z",
    "title": "Ascensor De Servicio",
    "photoRequired": false,
    "area": "Ascensores",
    "type": "ok_nok"
  },
  {
    "id": "chk-tpl-1789435170225-zr6y",
    "category": "subestacion",
    "photoRequired": false,
    "title": "Transferencia De Energia",
    "allowNotes": true,
    "isCritical": false,
    "buttonActions": {
      "Bloqueado": {
        "actionType": "failure",
        "color": "auto"
      }
    },
    "allowPhoto": true,
    "requireNotesOnFailure": false,
    "area": "Planta De Emergencia S2",
    "type": "ok_nok",
    "options": [
      "Energía EPM",
      "Energia/Planta",
      "Bloqueado"
    ],
    "photoMode": "normal"
  },
  {
    "measurementFields": [
      {
        "statusValue": "OK",
        "options": [
          "OK",
          "NO OK"
        ],
        "id": "1",
        "photoMode": "normal",
        "buttonActions": {
          "Encendido": {
            "actionType": "turn_on",
            "color": "emerald"
          },
          "Apagado": {
            "color": "slate",
            "actionType": "turn_off"
          }
        },
        "unit": "°C",
        "name": "Nevera 1",
        "includeButtons": true,
        "allowPhoto": true
      },
      {
        "allowPhoto": true,
        "options": [
          "OK",
          "NO OK"
        ],
        "includeButtons": true,
        "name": "Nevera 2",
        "unit": "°C",
        "id": "1789470556027",
        "buttonActions": {
          "Encendido": {
            "color": "emerald",
            "actionType": "turn_on"
          },
          "Apagado": {
            "actionType": "turn_off",
            "color": "slate"
          }
        },
        "photoMode": "normal",
        "statusValue": "OK"
      },
      {
        "includeButtons": true,
        "id": "1789470602027",
        "options": [
          "OK",
          "NO OK"
        ],
        "photoMode": "normal",
        "allowPhoto": true,
        "statusValue": "OK",
        "buttonActions": {
          "Apagado": {
            "color": "slate",
            "actionType": "turn_off"
          },
          "Encendido": {
            "actionType": "turn_on",
            "color": "emerald"
          }
        },
        "unit": "°C",
        "name": "Nevera 3"
      },
      {
        "includeButtons": true,
        "unit": "°F",
        "buttonActions": {
          "Encendido": {
            "actionType": "turn_on",
            "color": "emerald"
          },
          "Apagado": {
            "actionType": "turn_off",
            "color": "slate"
          }
        },
        "name": "Base Chef",
        "id": "1789470634919",
        "options": [
          "OK",
          "NO OK"
        ],
        "allowPhoto": true,
        "statusValue": "OK",
        "photoMode": "normal"
      },
      {
        "buttonActions": {
          "Encendido": {
            "color": "emerald",
            "actionType": "turn_on"
          },
          "Apagado": {
            "color": "slate",
            "actionType": "turn_off"
          }
        },
        "id": "1789470671546",
        "photoMode": "normal",
        "statusValue": "OK",
        "options": [
          "OK",
          "NO OK"
        ],
        "includeButtons": true,
        "allowPhoto": true,
        "unit": "°F",
        "name": "Nevera De Entrada"
      }
    ],
    "photoMode": "normal",
    "requireNotesOnFailure": false,
    "category": "refrigeracion",
    "unit": "°C",
    "buttonActions": {},
    "photoRequired": false,
    "id": "chk-tpl-1789470717933-t9gy",
    "allowPhoto": true,
    "allowNotes": true,
    "isCritical": false,
    "includeStatusButtons": false,
    "title": "Neveras",
    "type": "numeric",
    "area": "Cocina/Silo"
  }
];
