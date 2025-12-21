// Simple test script for Auth API
// Usage: node tests/auth.test.js

const API_URL = 'http://localhost:5000/api/auth';
const TEST_USER = {
  username: 'testuser_' + Date.now(),
  email: `test_${Date.now()}@example.com`,
  password: 'password123'
};

async function runTests() {
  console.log('Starting Auth Tests...');

  // 1. Register
  console.log('\nTesting Register...');
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    const data = await res.json();
    if (res.status === 201) {
      console.log('✅ Register Success:', data.user.username);
    } else {
      console.error('❌ Register Failed:', data);
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Register Error:', e.message);
    process.exit(1);
  }

  // 2. Login
  let token = '';
  console.log('\nTesting Login...');
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: TEST_USER.email,
        password: TEST_USER.password
      })
    });
    const data = await res.json();
    if (res.status === 200) {
      console.log('✅ Login Success. Token received.');
      token = data.token;
    } else {
      console.error('❌ Login Failed:', data);
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Login Error:', e.message);
    process.exit(1);
  }

  // 3. Me (Protected Route)
  console.log('\nTesting Protected Route (/me)...');
  try {
    const res = await fetch(`${API_URL}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (res.status === 200) {
      console.log('✅ Protected Route Success:', data.username);
    } else {
      console.error('❌ Protected Route Failed:', data);
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Protected Route Error:', e.message);
    process.exit(1);
  }

  console.log('\nAll Tests Passed! 🎉');
}

runTests();
