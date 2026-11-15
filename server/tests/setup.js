// Import this FIRST in any test that loads the app: it provides the environment the app requires.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-secret-test-secret-test-secret-12345';
process.env.MONGODB_URI ||= process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/gate_cbt_test';
