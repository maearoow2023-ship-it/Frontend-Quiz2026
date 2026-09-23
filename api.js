/*************************************************
 * QUIZ SYSTEM - api.js
 * Generic API Caller (GET / POST -> Google Apps Script)
 *************************************************/

const API_URL = 'https://script.google.com/macros/s/AKfycbxkv_XK88x1bDUDQzQKkdbXG8FuTdCaPzAkqzNeEA30aN2YuFLIxsfQNZTYJm50V3Bw/exec';

async function apiGet(params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}?${query}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'เกิดข้อผิดพลาด');
  return json.data;
}

async function apiPost(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'เกิดข้อผิดพลาด');
  return json.data;
}
