// ID ของ Google Sheet ที่ใช้เก็บข้อมูล
const SPREADSHEET_ID = 'ใส่ ID ของ Google Sheet'; // <-- ใส่ ID ของ Google Sheet ของคุณที่นี่
const SHEET_NAME = 'ใส่ชื่อชีตของคุณ';

// ฟังก์ชันหลักที่ทำงานเมื่อผู้ใช้เปิด Web App
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('ระบบรายงานการอบรมครู')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// --- API Functions (เรียกจากหน้าเว็บ) ---

// 1. ดึงข้อมูลทั้งหมด
function getTrainings() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let ws = ss.getSheetByName(SHEET_NAME);
  
  // ถ้ายังไม่มี Sheet ให้สร้างใหม่และใส่ Header (เพิ่ม reporter, bookNumber, locationDetail, benefits)
  if (!ws) {
    ws = ss.insertSheet(SHEET_NAME);
    ws.appendRow(['id', 'dateStart', 'dateEnd', 'title', 'type', 'location', 'organizer', 'hours', 'status', 'evidence', 'year', 'knowledge', 'images', 'reporter', 'bookNumber', 'locationDetail', 'benefits']);
    return [];
  }

  const data = ws.getDataRange().getValues();
  if (data.length <= 1) return []; // มีแค่ Header

  const headers = data.shift();
  
  // แปลง Array เป็น Array of Objects
  return data.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      // แปลง images string กลับเป็น array
      if (header === 'images') {
        obj[header] = row[i] ? JSON.parse(row[i]) : [];
      } else {
        obj[header] = row[i];
      }
    });
    // แปลงวันที่เป็น string format YYYY-MM-DD เพื่อให้ input type="date" อ่านรู้เรื่อง
    if (obj.dateStart instanceof Date) obj.dateStart = formatDate(obj.dateStart);
    if (obj.dateEnd instanceof Date) obj.dateEnd = formatDate(obj.dateEnd);
    return obj;
  }).filter(item => item.id); // กรองแถวว่าง
}

// 2. บันทึกข้อมูล (เพิ่มใหม่ หรือ อัปเดต)
function saveTraining(formObject) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ws = ss.getSheetByName(SHEET_NAME);
  const data = ws.getDataRange().getValues();
  
  // แปลง images array เป็น string เพื่อเก็บใน cell เดียว
  const imagesString = JSON.stringify(formObject.images || []);

  // กรณีแก้ไข (มี ID เดิม)
  if (formObject.id) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === formObject.id.toString()) {
        // อัปเดตแถวเดิม
        const rowToUpdate = [
          formObject.id,
          formObject.dateStart,
          formObject.dateEnd,
          formObject.title,
          formObject.type,
          formObject.location,
          formObject.organizer,
          formObject.hours,
          formObject.status,
          formObject.evidence,
          formObject.year,
          formObject.knowledge,
          imagesString,
          formObject.reporter,
          formObject.bookNumber,
          formObject.locationDetail,
          formObject.benefits // <-- เพิ่มใหม่
        ];
        ws.getRange(i + 1, 1, 1, rowToUpdate.length).setValues([rowToUpdate]);
        return { success: true, message: 'อัปเดตข้อมูลสำเร็จ' };
      }
    }
  }

  // กรณีเพิ่มใหม่
  const newId = new Date().getTime().toString();
  const newRow = [
    newId,
    formObject.dateStart,
    formObject.dateEnd,
    formObject.title,
    formObject.type,
    formObject.location,
    formObject.organizer,
    formObject.hours,
    'pending', // Default status
    formObject.evidence,
    formObject.year,
    formObject.knowledge,
    imagesString,
    formObject.reporter,
    formObject.bookNumber, 
    formObject.locationDetail,
    formObject.benefits // <-- เพิ่มใหม่
  ];
  ws.appendRow(newRow);
  return { success: true, message: 'บันทึกข้อมูลสำเร็จ' };
}

// 3. ลบข้อมูล
function deleteTraining(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ws = ss.getSheetByName(SHEET_NAME);
  const data = ws.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === id.toString()) {
      ws.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'ไม่พบข้อมูลที่ต้องการลบ' };
}

// 4. ฟังก์ชันอัปโหลดรูปภาพ
function uploadImageToDrive(base64Data, filename, mimeType) {
  const folderId = "1hWef8deZAgcgPkptOgtJvuPglYsWyG94"; 
  try {
    const folder = DriveApp.getFolderById(folderId);
    const decodedBlob = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedBlob, mimeType, filename);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getId();
  } catch (e) {
    return "Error: " + e.toString();
  }
}

// Helper: แปลงวันที่เป็น YYYY-MM-DD
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}
