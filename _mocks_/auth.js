// __mocks__/auth.js
export const optionalAuth = (req, _res, next) => {
  // leave unauth by default in tests unless set by the test
  next();
};

export const requireAuth = (req, res, next) => {
  // in tests we’ll set req.testUser = {...} before hitting routes
  if (req.testUser) {
    req.user = req.testUser;
    return next();
  }
  // fallback: pretend signed-in with a fixed uid
  req.user = { uid: 'test-uid' };
  next();
};
