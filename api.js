const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxkv_XK88x1bDUDQzQKkdbXG8FuTdCaPzAkqzNeEA30aN2YuFLIxsfQNZTYJm50V3Bw/exec';

const API = {
  // ฟังก์ชัน GET สำหรับดึงข้อมูล
  async get(action, params = {}) {
    const url = new URL(SCRIPT_URL);
    url.searchParams.append('action', action);
    
    // แนบ Token อัตโนมัติถ้ามีใน localStorage
    const token = localStorage.getItem('token');
    if (token) url.searchParams.append('token', token);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  // ฟังก์ชัน POST (สำคัญ: ส่งแบบ text/plain เพื่อเลี่ยง CORS Preflight บน GitHub)
  async post(action, payload = {}) {
    const token = localStorage.getItem('token');
    const bodyData = {
      action: action,
      token: token,
      ...payload
    };

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow', // จำเป็นสำหรับ Apps Script Web App
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // ข้ามขั้นตอน OPTIONS preflight
      },
      body: JSON.stringify(bodyData)
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  }
};
