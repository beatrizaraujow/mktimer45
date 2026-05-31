async function login(event) {
  event.preventDefault();

  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  const name = document.getElementById('name').value.trim();
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, password }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Erro no login.');
    }

    localStorage.setItem('mktimer_token', payload.token);
    localStorage.setItem('mktimer_user', JSON.stringify(payload.user));
    window.location.href = '/app.html';
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

document.getElementById('loginForm').addEventListener('submit', login);
