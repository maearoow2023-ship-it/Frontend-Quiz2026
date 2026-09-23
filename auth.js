/*************************************************
 * QUIZ SYSTEM - auth.js
 * Login / Logout / Session Guard / Change & Reset Password
 *************************************************/

const SESSION_KEY = 'quiz_session';

async function doLogin(username, password) {
  const session = await apiPost({ action: 'login', data: { username, password } });
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function checkSession() {
  const session = getSession();
  if (!session) return null;
  try {
    const valid = await apiGet({ action: 'validateSession', token: session.token });
    localStorage.setItem(SESSION_KEY, JSON.stringify(valid));
    return valid;
  } catch (e) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

async function requireAuth(allowedRoles = []) {
  const session = await checkSession();
  if (!session) { window.location.href = 'login.html'; return null; }
  if (allowedRoles.length && !allowedRoles.includes(session.role)) {
    Swal.fire('ไม่มีสิทธิ์เข้าถึง', 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 'error').then(() => window.location.href = 'login.html');
    return null;
  }
  return session;
}

async function doLogout() {
  const session = getSession();
  if (session) { try { await apiPost({ action: 'logout', token: session.token }); } catch (e) {} }
  localStorage.removeItem(SESSION_KEY);
  window.location.href = 'login.html';
}

async function doChangePassword(oldPassword, newPassword) {
  const session = getSession();
  return apiPost({ action: 'changePassword', data: { token: session.token, oldPassword, newPassword } });
}

async function doForgotPassword(email) {
  return apiPost({ action: 'forgotPassword', data: { email } });
}

async function doResetPassword(token, newPassword) {
  return apiPost({ action: 'resetPassword', data: { token, newPassword } });
}

function redirectByRole(role) {
  switch (role) {
    case 'Admin': case 'Teacher': case 'Student':
      window.location.href = 'dashboard.html'; break;
    default: window.location.href = 'login.html';
  }
}
